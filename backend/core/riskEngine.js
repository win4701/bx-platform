"use strict";

const db = require("../database");

/* =========================================
CONFIG
========================================= */

const LIMITS = {
  maxBet: 500,
  maxWin: 5000,
  maxDailyBet: 10000,
  maxExposure: 200000
};

/* =========================================
CHECK BET
========================================= */

async function checkBet(userId, bet){

  if(bet <= 0) throw new Error("invalid_bet");

  if(bet > LIMITS.maxBet){
    throw new Error("BET_LIMIT_EXCEEDED");
  }

  /* daily limit */

  const r = await db.query(`
    SELECT COALESCE(SUM(bet),0) as total
    FROM casino_bets
    WHERE user_id=$1
    AND created_at > NOW() - INTERVAL '1 day'
  `,[userId]);

  const total = Number(r.rows[0].total);

  if(total + bet > LIMITS.maxDailyBet){
    throw new Error("DAILY_LIMIT_EXCEEDED");
  }

}

/* =========================================
CHECK WIN
========================================= */

function checkWin(win){

  if(win > LIMITS.maxWin){
    throw new Error("WIN_LIMIT_EXCEEDED");
  }

}

/* =========================================
SYSTEM EXPOSURE
========================================= */

async function getExposure(){

  const r = await db.query(`
    SELECT COALESCE(SUM(payout - bet),0) as exposure
    FROM casino_bets
    WHERE created_at > NOW() - INTERVAL '1 hour'
  `);

  return Number(r.rows[0].exposure);
}

async function checkExposure(amount){

  const exposure = await getExposure();

  if(exposure + amount > LIMITS.maxExposure){
    throw new Error("HOUSE_RISK_LIMIT");
  }

}

/* =========================================
MARKET RISK
========================================= */

async function checkMarketOrder(userId, amount){

  if(amount > 10000){
    throw new Error("ORDER_TOO_LARGE");
  }

}

/* =========================================
MINING CONTROL
========================================= */

function checkMining(hashRate){

  if(hashRate > 1000){
    throw new Error("MINING_LIMIT");
  }

}

/* =========================================
DYNAMIC LIMITS (ADVANCED)
========================================= */

function dynamicMaxBet(balance){

  if(balance < 100) return 50;
  if(balance < 1000) return 200;
  return LIMITS.maxBet;

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  checkBet,
  checkWin,
  checkExposure,
  checkMarketOrder,
  checkMining,
  dynamicMaxBet
};
