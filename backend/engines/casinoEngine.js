"use strict";

const crypto = require("crypto");
const db = require("../database");
const ledger = require("../core/ledger");
const casinoFeed = require("../services/casinoFeed");

/* =========================================
CONFIG
========================================= */

const HOUSE_EDGE = 0.01;

/* =========================================
PROVABLY FAIR CORE
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
GAME LOGIC
========================================= */

function gameLogic(game, r){

  switch(game){

    case "coinflip":
      return {
        result: r > 0.5 ? "heads" : "tails",
        multiplier: 2 * (1 - HOUSE_EDGE)
      };

    case "dice":
      const roll = Number((r * 100).toFixed(2));
      return {
        result: roll,
        win: roll > 50,
        multiplier: 2 * (1 - HOUSE_EDGE)
      };

    case "crash":
    case "limbo":
      const m = Number((1 / (1 - r)).toFixed(2));
      return {
        result: m,
        multiplier: m * (1 - HOUSE_EDGE)
      };

    default:
      throw new Error("unsupported_game");
  }

}

/* =========================================
GET USER SEED + NONCE
========================================= */

async function getUserState(userId){

  let r = await db.query(`
    SELECT server_seed, client_seed, nonce
    FROM casino_users
    WHERE user_id=$1
  `,[userId]);

  if(!r.rows.length){

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const clientSeed = crypto.randomBytes(16).toString("hex");

    await db.query(`
      INSERT INTO casino_users(user_id,server_seed,client_seed,nonce)
      VALUES($1,$2,$3,0)
    `,[userId,serverSeed,clientSeed]);

    return {
      serverSeed,
      clientSeed,
      nonce:0
    };

  }

  return {
    serverSeed: r.rows[0].server_seed,
    clientSeed: r.rows[0].client_seed,
    nonce: Number(r.rows[0].nonce)
  };

}

/* =========================================
PLAY GAME (REAL)
========================================= */

async function play({ userId, game, bet }){

  if(!userId) throw new Error("unauthorized");
  if(!bet || bet <= 0) throw new Error("invalid_bet");

  const state = await getUserState(userId);

  const r = rng(state.serverSeed, state.clientSeed, state.nonce);

  const g = gameLogic(game, r);

  let payout = 0;

  if(g.win === undefined){
    payout = bet * g.multiplier;
  }else{
    payout = g.win ? bet * g.multiplier : 0;
  }

  /* ================= LEDGER ================= */

  await ledger.trade({
    userId,
    assetIn: "BX",
    assetOut: "BX",
    amountIn: bet,
    amountOut: payout
  });

  /* ================= SAVE ================= */

  await db.query(`
    INSERT INTO casino_bets
    (user_id,game,bet,payout,result,nonce)
    VALUES($1,$2,$3,$4,$5,$6)
  `,[
    userId,
    game,
    bet,
    payout,
    JSON.stringify(g.result),
    state.nonce
  ]);

  /* ================= UPDATE NONCE ================= */

  await db.query(`
    UPDATE casino_users
    SET nonce = nonce + 1
    WHERE user_id=$1
  `,[userId]);

  /* ================= FEED ================= */

  casinoFeed.broadcastBet(userId, game, bet);

  if(payout > 0){
    casinoFeed.broadcastWin(userId, game, payout, g.multiplier);
  }

  return {
    game,
    result: g.result,
    payout,
    multiplier: g.multiplier,
    nonce: state.nonce
  };

}

/* =========================================
SEED ROTATION
========================================= */

async function rotateSeed(userId){

  const newSeed = crypto.randomBytes(32).toString("hex");

  await db.query(`
    UPDATE casino_users
    SET server_seed=$1, nonce=0
    WHERE user_id=$2
  `,[newSeed,userId]);

  return { success:true };

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  play,
  rotateSeed
};
