"use strict";

/* =========================================================
   BXS ADAPTIVE RTP ENGINE — ENTERPRISE
========================================================= */

const crypto = require("crypto");

const { getVIP, getBenefits } =
  require("./vipSystem");

const whale =
  require("./whaleTracker");

const redis =
  require("../core/redis");

/* =========================================================
   CONFIG
========================================================= */

const RTP_MIN = 0.88;
const RTP_MAX = 0.98;

const HOUSE_TARGET = 0.94;

/* =========================================================
   MAIN
========================================================= */

async function getAdaptiveRTP(user, game){

  if(!user){
    return HOUSE_TARGET;
  }

  let rtp =
    await baseRTP(user);

  /* =========================================
     SESSION ANALYSIS
  ========================================= */

  rtp += await sessionModifier(user);

  /* =========================================
     WHALE ENGINE
  ========================================= */

  rtp += await whaleModifier(user);

  /* =========================================
     VOLATILITY ENGINE
  ========================================= */

  rtp += volatilityModifier(game);

  /* =========================================
     LOSS RECOVERY
  ========================================= */

  rtp += await recoveryModifier(user);

  /* =========================================
     HOUSE BALANCER
  ========================================= */

  rtp += await houseBalancer();

  /* =========================================
     CLAMP
  ========================================= */

  rtp = clamp(rtp);

  /* =========================================
     AUDIT
  ========================================= */

  await audit(user,game,rtp);

  return rtp;

}

/* =========================================================
   BASE RTP
========================================================= */

async function baseRTP(user){

  const vip =
    getVIP(user.total_wager || 0);

  const benefits =
    getBenefits(vip.level);

  return benefits.rtp || HOUSE_TARGET;

}

/* =========================================================
   SESSION ANALYSIS
========================================================= */

async function sessionModifier(user){

  const session =
    await getSession(user.id);

  let mod = 0;

  /* losing streak */

  if(session.losses >= 5){
    mod += 0.01;
  }

  /* win streak */

  if(session.wins >= 5){
    mod -= 0.005;
  }

  return mod;

}

/* =========================================================
   WHALE ENGINE
========================================================= */

async function whaleModifier(user){

  if(!whale.isWhale(user.id)){
    return 0;
  }

  const risk =
    whale.getRiskLevel(user.id);

  switch(risk){

    case "high":
      return -0.01;

    case "medium":
      return -0.005;

    case "low":
      return 0;

    default:
      return 0;

  }

}

/* =========================================================
   VOLATILITY
========================================================= */

function volatilityModifier(game){

  const v =
    game?.volatility || "medium";

  switch(v){

    case "high":
      return -0.01;

    case "low":
      return 0.01;

    default:
      return 0;

  }

}

/* =========================================================
   RECOVERY
========================================================= */

async function recoveryModifier(user){

  const stats =
    await getDailyStats(user.id);

  if(stats.netLoss > 500){
    return 0.015;
  }

  return 0;

}

/* =========================================================
   HOUSE BALANCER
========================================================= */

async function houseBalancer(){

  const stats =
    await getGlobalHouseStats();

  if(stats.rtp > 0.96){
    return -0.01;
  }

  if(stats.rtp < 0.92){
    return 0.005;
  }

  return 0;

}

/* =========================================================
   SESSION CACHE
========================================================= */

async function getSession(userId){

  const data =
    await redis.getCache(
      `session:${userId}`
    );

  return data || {

    wins:0,
    losses:0

  };

}

/* =========================================================
   DAILY STATS
========================================================= */

async function getDailyStats(userId){

  const data =
    await redis.getCache(
      `daily:${userId}`
    );

  return data || {

    netLoss:0

  };

}

/* =========================================================
   HOUSE STATS
========================================================= */

async function getGlobalHouseStats(){

  const data =
    await redis.getCache(
      "house:stats"
    );

  return data || {

    rtp:HOUSE_TARGET

  };

}

/* =========================================================
   PROVABLY FAIR SEED
========================================================= */

function generateSeed(){

  return crypto
    .randomBytes(32)
    .toString("hex");

}

/* =========================================================
   CLAMP
========================================================= */

function clamp(v){

  return Math.max(
    RTP_MIN,
    Math.min(RTP_MAX,v)
  );

}

/* =========================================================
   AUDIT
========================================================= */

async function audit(user,game,rtp){

  try{

    console.log(
      "[RTP]",
      user.id,
      game?.id,
      rtp
    );

  }catch(e){}

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  getAdaptiveRTP,

  generateSeed

};
