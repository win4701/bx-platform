"use strict";

const db = require("../database");
const ledger = require("./ledger");

/* =========================================
CONFIG
========================================= */

const MAX_SUPPLY = 5_000_000; // 5M BX
const MINING_DAILY_CAP = 50000;

/* =========================================
GET TOTAL SUPPLY
========================================= */

async function getTotalSupply(){

  const r = await db.query(`
    SELECT COALESCE(SUM(balance),0) as total
    FROM wallet_balances
    WHERE asset='BX'
  `);

  return Number(r.rows[0].total);

}

/* =========================================
REWARD (SAFE)
========================================= */

async function rewardBX(userId, amount, reason){

  if(amount <= 0){
    throw new Error("invalid_reward");
  }

  const total = await getTotalSupply();

  if(total + amount > MAX_SUPPLY){
    throw new Error("MAX_SUPPLY_REACHED");
  }

  await ledger.credit({
    userId,
    asset: "BX",
    amount,
    reason
  });

}

/* =========================================
BURN (SAFE)
========================================= */

async function burnBX(userId, amount){

  if(amount <= 0){
    throw new Error("invalid_burn");
  }

  await ledger.debit({
    userId,
    asset: "BX",
    amount,
    reason: "burn"
  });

}

/* =========================================
TRANSFER WITH FEE (ECONOMY CONTROL)
========================================= */

async function transferBX(fromUser, toUser, amount){

  const FEE = amount * 0.01; // 1%
  const net = amount - FEE;

  if(net <= 0){
    throw new Error("invalid_transfer");
  }

  /* transfer */
  await ledger.transfer({
    fromUser,
    toUser,
    asset: "BX",
    amount: net
  });

  /* burn fee */
  await ledger.debit({
    userId: fromUser,
    asset: "BX",
    amount: FEE,
    reason: "tx_fee_burn"
  });

}

/* =========================================
MINING LIMIT CONTROL
========================================= */

async function checkMiningLimit(userId, amount){

  const r = await db.query(`
    SELECT COALESCE(SUM(amount),0) as total
    FROM wallet_transactions
    WHERE user_id=$1
    AND reason='mining_reward'
    AND created_at > NOW() - INTERVAL '1 day'
  `,[userId]);

  const total = Number(r.rows[0].total);

  if(total + amount > MINING_DAILY_CAP){
    throw new Error("MINING_DAILY_LIMIT");
  }

}

/* =========================================
STATS
========================================= */

async function getStats(){

  const total = await getTotalSupply();

  const r = await db.query(`
    SELECT COUNT(*) as users
    FROM users
  `);

  return {
    totalSupply: total,
    maxSupply: MAX_SUPPLY,
    users: Number(r.rows[0].users)
  };

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  rewardBX,
  burnBX,
  transferBX,
  checkMiningLimit,
  getTotalSupply,
  getStats
};
