"use strict";

/* =========================================================
   BLOXIO RISK ENGINE — ULTRA PROTECTION SYSTEM
========================================================= */

const db = require("../database");
const config = require("../config");

/* =========================================================
   BASE LIMITS (FROM CONFIG)
========================================================= */

function limits(){

  return {
    maxBet: config.trading?.maxBet || 500,
    maxWin: config.trading?.maxWin || 5000,
    maxDailyBet: config.trading?.maxDailyBet || 10000,
    maxExposure: config.trading?.maxExposure || 200000
  };

}

/* =========================================================
   USER RISK SCORE (🔥 مهم)
========================================================= */

async function getUserRisk(userId){

  const r = await db.query(`
    SELECT COUNT(*) as total
    FROM fraud_logs
    WHERE user_id=$1
  `,[userId]);

  const score = Number(r.rows[0].total);

  return score;

}

/* =========================================================
   CACHE (ANTI DB OVERLOAD)
========================================================= */

const cache = new Map();

function cacheGet(key){
  const v = cache.get(key);
  if(!v) return null;
  if(Date.now() > v.exp) return null;
  return v.value;
}

function cacheSet(key,value,ttl=5000){
  cache.set(key,{
    value,
    exp: Date.now() + ttl
  });
}

/* =========================================================
   BET CHECK (SMART)
========================================================= */

async function checkBet(userId, bet){

  if(bet <= 0) throw new Error("invalid_bet");

  const l = limits();

  /* ===== risk score ===== */
  const risk = await getUserRisk(userId);

  const dynamicMax = risk > 5
    ? l.maxBet / 2
    : l.maxBet;

  if(bet > dynamicMax){
    throw new Error("BET_LIMIT_EXCEEDED");
  }

  /* ===== daily limit (cached) ===== */

  const cacheKey = `bet:${userId}`;
  let total = cacheGet(cacheKey);

  if(total === null){

    const r = await db.query(`
      SELECT COALESCE(SUM(bet),0) as total
      FROM casino_bets
      WHERE user_id=$1
      AND created_at > NOW() - INTERVAL '1 day'
    `,[userId]);

    total = Number(r.rows[0].total);

    cacheSet(cacheKey,total,5000);
  }

  if(total + bet > l.maxDailyBet){
    throw new Error("DAILY_LIMIT_EXCEEDED");
  }

}

/* =========================================================
   WIN CHECK
========================================================= */

function checkWin(win){

  const l = limits();

  if(win > l.maxWin){
    throw new Error("WIN_LIMIT_EXCEEDED");
  }

}

/* =========================================================
   SYSTEM EXPOSURE (CACHED)
========================================================= */

async function getExposure(){

  const cacheKey = "exposure";

  let exposure = cacheGet(cacheKey);

  if(exposure !== null) return exposure;

  const r = await db.query(`
    SELECT COALESCE(SUM(payout - bet),0) as exposure
    FROM casino_bets
    WHERE created_at > NOW() - INTERVAL '1 hour'
  `);

  exposure = Number(r.rows[0].exposure);

  cacheSet(cacheKey,exposure,3000);

  return exposure;

}

async function checkExposure(amount){

  const l = limits();

  const exposure = await getExposure();

  if(exposure + amount > l.maxExposure){
    throw new Error("HOUSE_RISK_LIMIT");
  }

}

/* =========================================================
   MARKET RISK (TRADING)
========================================================= */

async function checkMarketOrder(userId, amount){

  if(amount <= 0){
    throw new Error("invalid_amount");
  }

  const risk = await getUserRisk(userId);

  if(risk > 10 && amount > 2000){
    throw new Error("RISK_LIMIT");
  }

  if(amount > config.trading.maxOrder){
    throw new Error("ORDER_TOO_LARGE");
  }

}

/* =========================================================
   MINING CONTROL
========================================================= */

function checkMining(hashRate){

  if(hashRate > 1000){
    throw new Error("MINING_LIMIT");
  }

}

/* =========================================================
   ANOMALY DETECTION (🔥 مهم جداً)
========================================================= */

async function detectAnomaly(userId){

  const r = await db.query(`
    SELECT COUNT(*) as c
    FROM casino_bets
    WHERE user_id=$1
    AND created_at > NOW() - INTERVAL '1 minute'
  `,[userId]);

  if(Number(r.rows[0].c) > 20){
    throw new Error("SPAM_ACTIVITY");
  }

}

/* =========================================================
   GLOBAL RISK CHECK
========================================================= */

async function fullCheck({userId, amount, type}){

  await detectAnomaly(userId);

  if(type === "casino"){
    await checkBet(userId, amount);
    await checkExposure(amount);
  }

  if(type === "trade"){
    await checkMarketOrder(userId, amount);
  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  checkBet,
  checkWin,
  checkExposure,
  checkMarketOrder,
  checkMining,
  dynamicMaxBet: ()=>{}, // deprecated
  fullCheck,
  getUserRisk
};
