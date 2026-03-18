"use strict";

const crypto = require("crypto");
const db = require("../database");
const ledger = require("../core/ledger");
const risk = require("../core/riskEngine");
const casinoWS = require("../ws/casinoWS");

/* =========================================
CONFIG
========================================= */

const HOUSE_EDGE = 0.01;

/* =========================================
FAIR RNG
========================================= */

function hash(serverSeed, clientSeed, nonce){
  return crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");
}

function rng(serverSeed, clientSeed, nonce){
  const h = hash(serverSeed, clientSeed, nonce);
  const slice = h.slice(0, 13);
  const num = parseInt(slice, 16);
  return num / 0x1fffffffffffff;
}

/* =========================================
GAMES (12)
========================================= */

function playGame(game, r, data){

  switch(game){

    case "coinflip":
      const side = r > 0.5 ? "heads" : "tails";
      return {
        result: side,
        win: side === data.side,
        multiplier: 2 * (1 - HOUSE_EDGE)
      };

    case "dice":
      const roll = Number((r * 100).toFixed(2));
      const win = roll > (data.target || 50);
      return {
        result: roll,
        win,
        multiplier: 100 / (100 - (data.target || 50)) * (1 - HOUSE_EDGE)
      };

    case "limbo":
      const m = Number((1 / (1 - r)).toFixed(2));
      return {
        result: m,
        win: m >= data.multiplier,
        multiplier: data.multiplier * (1 - HOUSE_EDGE)
      };

    case "crash":
      const crash = Number((1 / (1 - r)).toFixed(2));
      return {
        result: crash,
        win: crash >= data.cashout,
        multiplier: data.cashout * (1 - HOUSE_EDGE)
      };

    case "roulette":
      const num = Math.floor(r * 37);
      return {
        result: num,
        win: num === data.number,
        multiplier: 36
      };

    case "slots":
      const slot = Math.floor(r * 10);
      return {
        result: slot,
        win: slot === 7,
        multiplier: 10
      };

    case "hi-lo":
      return {
        result: r,
        win: data.choice === (r > 0.5 ? "high" : "low"),
        multiplier: 2
      };

    case "wheel":
      const wheel = Math.floor(r * 10);
      return {
        result: wheel,
        win: wheel === data.number,
        multiplier: 5
      };

    case "keno":
      return {
        result: Math.floor(r * 20),
        win: true,
        multiplier: 1 + r
      };

    case "plinko":
      return {
        result: r,
        win: true,
        multiplier: 0.5 + r * 2
      };

    case "mines":
      return {
        result: r,
        win: true,
        multiplier: 1 + r
      };

    case "blackjack":
      return {
        result: r,
        win: r > 0.5,
        multiplier: 2
      };

    default:
      throw new Error("game_not_supported");
  }

}

/* =========================================
USER SEED
========================================= */

async function getUserState(userId){

  let r = await db.query(`
    SELECT server_seed, client_seed, nonce
    FROM casino_seeds
    WHERE user_id=$1
  `,[userId]);

  if(!r.rows.length){

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const clientSeed = crypto.randomBytes(16).toString("hex");

    await db.query(`
      INSERT INTO casino_seeds(user_id,server_seed,client_seed,nonce)
      VALUES($1,$2,$3,0)
    `,[userId,serverSeed,clientSeed]);

    return { serverSeed, clientSeed, nonce:0 };

  }

  return {
    serverSeed: r.rows[0].server_seed,
    clientSeed: r.rows[0].client_seed,
    nonce: Number(r.rows[0].nonce)
  };

}

/* =========================================
PLAY
========================================= */

async function processGame({ userId, game, bet, data }){

  await risk.checkBet(userId, bet);

  const state = await getUserState(userId);

  const r = rng(state.serverSeed, state.clientSeed, state.nonce);

  const g = playGame(game, r, data);

  let payout = g.win ? bet * g.multiplier : 0;

  await risk.checkWin(payout);
  await risk.checkExposure(payout);

  /* ================= LEDGER ================= */

  await ledger.debit({
    userId,
    asset: "BX",
    amount: bet,
    reason: "casino_bet"
  });

  if(payout > 0){
    await ledger.credit({
      userId,
      asset: "BX",
      amount: payout,
      reason: "casino_win"
    });
  }

  /* ================= SAVE ================= */

  await db.query(`
    INSERT INTO casino_sessions
    (user_id,game,bet,result,profit)
    VALUES($1,$2,$3,$4,$5)
  `,[
    userId,
    game,
    bet,
    JSON.stringify(g.result),
    payout - bet
  ]);

  /* ================= NONCE ================= */

  await db.query(`
    UPDATE casino_seeds
    SET nonce = nonce + 1
    WHERE user_id=$1
  `,[userId]);

  /* ================= WS ================= */

  casinoWS.broadcast("casino", {
    type:"game",
    user:userId,
    game,
    bet,
    payout
  });

  return {
    game,
    result: g.result,
    payout,
    multiplier: g.multiplier
  };

}

/* =========================================
SEED ROTATE
========================================= */

async function rotateSeed(userId){

  const newSeed = crypto.randomBytes(32).toString("hex");

  await db.query(`
    UPDATE casino_seeds
    SET server_seed=$1, nonce=0
    WHERE user_id=$2
  `,[newSeed,userId]);

  return { success:true };

}

module.exports = {
  processGame,
  rotateSeed
};
