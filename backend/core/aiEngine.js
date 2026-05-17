"use strict";

/* =========================================================
   BXS AI ENGINE — ENTERPRISE PLAYER INTELLIGENCE
========================================================= */

const crypto = require("crypto");

const redis =
  require("../core/redis");

const adaptiveRTP =
  require("./adaptiveRTP");

/* =========================================================
   CONFIG
========================================================= */

const SESSION_TTL = 86400;

const MAX_HISTORY = 100;

const BASE_RTP = 0.94;

/* =========================================================
   GET PLAYER PROFILE
========================================================= */

async function getProfile(userId){

  let profile =
    await redis.getCache(
      `ai:${userId}`
    );

  if(profile){
    return profile;
  }

  profile = {

    bets: [],
    wins: 0,
    losses: 0,

    totalBet: 0,

    totalWin: 0,

    streak: 0,

    risk: "normal",

    confidence: 0,

    createdAt: Date.now()

  };

  await saveProfile(
    userId,
    profile
  );

  return profile;

}

/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile(userId,profile){

  await redis.setCache(
    `ai:${userId}`,
    profile,
    SESSION_TTL
  );

}

/* =========================================================
   RECORD GAME
========================================================= */

async function recordGame({

  userId,
  game,
  bet,
  payout

}){

  const p =
    await getProfile(userId);

  p.bets.push({

    game,
    bet,
    payout,
    time:Date.now()

  });

  if(p.bets.length > MAX_HISTORY){
    p.bets.shift();
  }

  p.totalBet += bet;

  if(payout > 0){

    p.wins++;

    p.totalWin += payout;

    p.streak =
      p.streak >= 0
        ? p.streak + 1
        : 1;

  }else{

    p.losses++;

    p.streak =
      p.streak <= 0
        ? p.streak - 1
        : -1;

  }

  /* =====================================
     RISK SCORE
  ===================================== */

  p.risk =
    calculateRisk(p);

  /* =====================================
     CONFIDENCE
  ===================================== */

  const total =
    p.wins + p.losses;

  p.confidence =
    Math.min(1,total / 100);

  await saveProfile(
    userId,
    p
  );

  return p;

}

/* =========================================================
   ANALYZE
========================================================= */

async function analyze(userId){

  const p =
    await getProfile(userId);

  const total =
    p.wins + p.losses;

  const winRate =
    total
      ? p.wins / total
      : 0;

  const avgBet =
    total
      ? p.totalBet / total
      : 0;

  return {

    total,

    winRate,

    avgBet,

    streak:p.streak,

    risk:p.risk,

    confidence:p.confidence

  };

}

/* =========================================================
   DECISION ENGINE
========================================================= */

async function decide(user,game){

  const profile =
    await analyze(user.id);

  let rtp =
    await adaptiveRTP
      .getAdaptiveRTP(
        user,
        game
      );

  /* =====================================
     NEW PLAYER BOOST
  ===================================== */

  if(profile.total < 10){
    rtp += 0.02;
  }

  /* =====================================
     LOSING RECOVERY
  ===================================== */

  if(profile.streak <= -5){
    rtp += 0.01;
  }

  /* =====================================
     WINNING CONTROL
  ===================================== */

  if(profile.streak >= 5){
    rtp -= 0.01;
  }

  /* =====================================
     HIGH RISK
  ===================================== */

  if(profile.risk === "high"){
    rtp -= 0.005;
  }

  rtp =
    clamp(rtp);

  return {

    rtp,

    profile

  };

}

/* =========================================================
   PROVABLY FAIR RNG
========================================================= */

function roll({

  serverSeed,
  clientSeed,
  nonce

}){

  const hmac = crypto
    .createHmac(
      "sha256",
      serverSeed
    )
    .update(
      `${clientSeed}:${nonce}`
    )
    .digest("hex");

  const num =
    parseInt(
      hmac.substring(0,8),
      16
    );

  return num / 0xffffffff;

}

/* =========================================================
   SHOULD WIN
========================================================= */

function shouldWin({

  rtp,
  serverSeed,
  clientSeed,
  nonce

}){

  const value =
    roll({
      serverSeed,
      clientSeed,
      nonce
    });

  return value < rtp;

}

/* =========================================================
   RISK
========================================================= */

function calculateRisk(p){

  const total =
    p.wins + p.losses;

  if(total < 20){
    return "normal";
  }

  const avg =
    p.totalBet / total;

  const ratio =
    p.totalWin /
    Math.max(1,p.totalBet);

  if(avg > 1000 && ratio > 1.5){
    return "high";
  }

  if(avg < 20){
    return "low";
  }

  return "normal";

}

/* =========================================================
   CLAMP
========================================================= */

function clamp(v){

  return Math.max(
    0.88,
    Math.min(0.98,v)
  );

}

/* =========================================================
   RESET SESSION
========================================================= */

async function reset(userId){

  await redis.delCache(
    `ai:${userId}`
  );

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  getProfile,

  recordGame,

  analyze,

  decide,

  shouldWin,

  reset

};
