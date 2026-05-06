"use strict";

/* =========================================================
   BXS WHALE TRACKER — ENTERPRISE ENGINE
========================================================= */

const redis =
  require("../core/redis");

/* =========================================================
   CONFIG
========================================================= */

const SESSION_TTL = 86400;

const HISTORY_LIMIT = 100;

const LEVELS = {

  normal: 0,

  mini: 10_000,

  whale: 50_000,

  mega: 250_000,

  titan: 1_000_000

};

/* =========================================================
   GET PROFILE
========================================================= */

async function getProfile(userId){

  let p =
    await redis.getCache(
      `whale:${userId}`
    );

  if(p){
    return p;
  }

  p = {

    totalVolume:0,

    totalWins:0,

    totalLosses:0,

    netProfit:0,

    avgBet:0,

    maxBet:0,

    games:{},

    history:[],

    sessions:0,

    createdAt:Date.now()

  };

  await saveProfile(
    userId,
    p
  );

  return p;

}

/* =========================================================
   SAVE
========================================================= */

async function saveProfile(userId,p){

  await redis.setCache(

    `whale:${userId}`,

    p,

    SESSION_TTL

  );

}

/* =========================================================
   TRACK
========================================================= */

async function track({

  userId,
  game,
  bet,
  payout

}){

  const p =
    await getProfile(userId);

  p.totalVolume += bet;

  if(payout > 0){

    p.totalWins += payout;

    p.netProfit += (
      payout - bet
    );

  }else{

    p.totalLosses += bet;

    p.netProfit -= bet;

  }

  p.maxBet =
    Math.max(
      p.maxBet,
      bet
    );

  /* =====================================
     GAME ANALYTICS
  ===================================== */

  if(!p.games[game]){

    p.games[game] = {

      volume:0,

      bets:0

    };

  }

  p.games[game].volume += bet;

  p.games[game].bets++;

  /* =====================================
     HISTORY
  ===================================== */

  p.history.push({

    game,

    bet,

    payout,

    time:Date.now()

  });

  if(
    p.history.length >
    HISTORY_LIMIT
  ){
    p.history.shift();
  }

  /* =====================================
     AVG BET
  ===================================== */

  p.avgBet =
    p.totalVolume /
    Math.max(
      1,
      p.history.length
    );

  await saveProfile(
    userId,
    p
  );

  return p;

}

/* =========================================================
   LEVEL
========================================================= */

async function getLevel(userId){

  const p =
    await getProfile(userId);

  const volume =
    p.totalVolume;

  if(volume >= LEVELS.titan){

    return "titan";

  }

  if(volume >= LEVELS.mega){

    return "mega";

  }

  if(volume >= LEVELS.whale){

    return "whale";

  }

  if(volume >= LEVELS.mini){

    return "mini";

  }

  return "normal";

}

/* =========================================================
   IS WHALE
========================================================= */

async function isWhale(userId){

  const level =
    await getLevel(userId);

  return level !== "normal";

}

/* =========================================================
   RISK ENGINE
========================================================= */

async function getRiskLevel(userId){

  const p =
    await getProfile(userId);

  /* =====================================
     PROFIT RATIO
  ===================================== */

  const ratio =
    p.netProfit /
    Math.max(
      1,
      p.totalVolume
    );

  /* =====================================
     HIGH BETS
  ===================================== */

  if(
    p.avgBet > 5000 &&
    ratio > 0.5
  ){
    return "critical";
  }

  if(
    p.avgBet > 1000
  ){
    return "high";
  }

  if(
    p.avgBet > 200
  ){
    return "medium";
  }

  return "low";

}

/* =========================================================
   TREASURY IMPACT
========================================================= */

async function treasuryImpact(userId){

  const p =
    await getProfile(userId);

  if(
    p.netProfit > 100000
  ){
    return "danger";
  }

  if(
    p.netProfit > 25000
  ){
    return "warning";
  }

  return "safe";

}

/* =========================================================
   SEGMENT
========================================================= */

async function segment(userId){

  const level =
    await getLevel(userId);

  const risk =
    await getRiskLevel(userId);

  if(
    level === "titan" &&
    risk === "critical"
  ){
    return "vip_high_risk";
  }

  if(
    level === "mega"
  ){
    return "mega_whale";
  }

  if(
    level === "whale"
  ){
    return "standard_whale";
  }

  return "retail";

}

/* =========================================================
   LEADERBOARD
========================================================= */

async function leaderboard(){

  // future Redis sorted-set

  return [];

}

/* =========================================================
   RESET
========================================================= */

async function reset(userId){

  await redis.delCache(
    `whale:${userId}`
  );

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  track,

  isWhale,

  getRiskLevel,

  getLevel,

  treasuryImpact,

  segment,

  leaderboard,

  reset

};
