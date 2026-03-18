"use strict";

const crypto = require("crypto");
const db = require("../database");
const ledger = require("../core/ledger");
const wsHub = require("../ws/wsHub");

/* =========================================
STATE
========================================= */

let currentRound = null;
let players = new Map();

/* =========================================
GENERATE CRASH POINT
========================================= */

function generateCrash(){

  const r = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;

  const crash = Math.max(1, (1 / (1 - r)));

  return Number(crash.toFixed(2));
}

/* =========================================
START ROUND
========================================= */

function startRound(){

  const crashPoint = generateCrash();

  currentRound = {
    id: Date.now(),
    crashPoint,
    multiplier: 1,
    active: true
  };

  players.clear();

  wsHub.broadcast("casino", {
    type:"crash_start",
    round: currentRound.id
  });

  runRound();

}

/* =========================================
RUN LOOP
========================================= */

function runRound(){

  const interval = setInterval(()=>{

    if(!currentRound || !currentRound.active){
      clearInterval(interval);
      return;
    }

    currentRound.multiplier += 0.02;

    wsHub.broadcast("casino", {
      type:"crash_tick",
      multiplier: currentRound.multiplier
    });

    if(currentRound.multiplier >= currentRound.crashPoint){

      endRound();
      clearInterval(interval);

    }

  }, 100);

}

/* =========================================
JOIN
========================================= */

async function join(userId, bet){

  if(!currentRound || !currentRound.active){
    throw new Error("round_not_active");
  }

  await ledger.debit({
    userId,
    asset:"BX",
    amount: bet,
    reason:"crash_bet"
  });

  players.set(userId, {
    bet,
    cashed:false
  });

  wsHub.broadcast("casino", {
    type:"player_join",
    user:userId,
    bet
  });

}

/* =========================================
CASHOUT
========================================= */

async function cashout(userId){

  const p = players.get(userId);

  if(!p || p.cashed) return;

  p.cashed = true;

  const payout = p.bet * currentRound.multiplier;

  await ledger.credit({
    userId,
    asset:"BX",
    amount:payout,
    reason:"crash_win"
  });

  wsHub.broadcast("casino", {
    type:"cashout",
    user:userId,
    multiplier: currentRound.multiplier,
    payout
  });

}

/* =========================================
END ROUND
========================================= */

function endRound(){

  currentRound.active = false;

  wsHub.broadcast("casino", {
    type:"crash_end",
    crash: currentRound.crashPoint
  });

  setTimeout(startRound, 3000);

}

/* =========================================
START ENGINE
========================================= */

function startCrash(){

  console.log("💥 Crash Engine LIVE");

  setTimeout(startRound, 2000);

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  startCrash,
  join,
  cashout
};
