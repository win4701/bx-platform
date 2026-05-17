"use strict";

/* =========================================================
   BXS ECONOMY ENGINE — ENTERPRISE MONETARY SYSTEM
========================================================= */

const db =
  require("./database");

const ledger =
  require("./ledger");

const redis =
  require("./redis");

/* =========================================================
   CONFIG
========================================================= */

const DECIMALS = 8;

const MAX_SUPPLY =
  1_000_000_000;

const UNIT =
  100000000;

/* =========================================
SUPPLY ALLOCATION
========================================= */

const ALLOCATION = {

  ecosystem: 350_000_000,

  validators: 200_000_000,

  liquidity: 150_000_000,

  treasury: 100_000_000,

  team: 100_000_000,

  airdrop: 50_000_000,

  reserve: 50_000_000

};

/* =========================================
ECONOMY CONFIG
========================================= */

const CONFIG = {

  txFee: 0.001,

  burnPercent: 0.25,

  treasuryPercent: 0.25,

  validatorPercent: 0.50,

  miningDailyCap: 500000,

  whaleLimit: 5_000_000,

  stakingAPR: 0.12

};

/* =========================================================
   TOTAL SUPPLY
========================================================= */

async function getTotalSupply(){

  const cached =
    await redis.getCache(
      "bx:supply"
    );

  if(cached){
    return cached;
  }

  const r = await db.query(`
    SELECT
      COALESCE(
        SUM(balance),
        0
      ) total
    FROM wallet_balances
    WHERE asset='BX'
  `);

  const total =
    Number(r.rows[0].total);

  await redis.setCache(
    "bx:supply",
    total,
    60
  );

  return total;

}

/* =========================================================
   CIRCULATING SUPPLY
========================================================= */

async function getCirculatingSupply(){

  const total =
    await getTotalSupply();

  const locked =
    await getLockedSupply();

  return total - locked;

}

/* =========================================================
   LOCKED SUPPLY
========================================================= */

async function getLockedSupply(){

  const r = await db.query(`
    SELECT
      COALESCE(
        SUM(amount),
        0
      ) total
    FROM locked_balances
    WHERE asset='BX'
  `);

  return Number(
    r.rows[0].total
  );

}

/* =========================================================
   MINT
========================================================= */

async function mint({

  userId,
  amount,
  reason

}){

  validateAmount(amount);

  const total =
    await getTotalSupply();

  if(
    total + amount >
    MAX_SUPPLY
  ){
    throw new Error(
      "MAX_SUPPLY_REACHED"
    );
  }

  await ledger.credit({

    userId,

    asset:"BX",

    amount,

    type:"mint",

    reason

  });

  await invalidate();

}

/* =========================================================
   BURN
========================================================= */

async function burn({

  userId,
  amount,
  reason="burn"

}){

  validateAmount(amount);

  await ledger.debit({

    userId,

    asset:"BX",

    amount,

    type:"burn",

    reason

  });

  await invalidate();

}

/* =========================================================
   TRANSFER
========================================================= */

async function transfer({

  fromUser,
  toUser,
  amount

}){

  validateAmount(amount);

  /* =====================================
     WHALE PROTECTION
  ===================================== */

  if(amount > CONFIG.whaleLimit){

    throw new Error(
      "WHALE_LIMIT"
    );

  }

  const fee =
    amount *
    CONFIG.txFee;

  const burnFee =
    fee *
    CONFIG.burnPercent;

  const treasuryFee =
    fee *
    CONFIG.treasuryPercent;

  const validatorFee =
    fee *
    CONFIG.validatorPercent;

  const net =
    amount - fee;

  if(net <= 0){
    throw new Error(
      "INVALID_TRANSFER"
    );
  }

  /* =====================================
     TRANSFER
  ===================================== */

  await ledger.transfer({

    fromUser,
    toUser,

    asset:"BX",

    amount:net

  });

  /* =====================================
     BURN
  ===================================== */

  await burn({

    userId:fromUser,

    amount:burnFee,

    reason:"tx_burn"

  });

  /* =====================================
     TREASURY
  ===================================== */

  await ledger.transfer({

    fromUser,

    toUser:0,

    asset:"BX",

    amount:treasuryFee

  });

  /* =====================================
     VALIDATORS
  ===================================== */

  await validatorPool(
    validatorFee
  );

}

/* =========================================================
   VALIDATOR REWARDS
========================================================= */

async function validatorPool(amount){

  await redis.incrByFloat(
    "bx:validator_pool",
    amount
  );

}

/* =========================================================
   MINING CONTROL
========================================================= */

async function checkMiningLimit(

  userId,
  amount

){

  const r = await db.query(`
    SELECT
      COALESCE(
        SUM(amount),
        0
      ) total
    FROM wallet_transactions
    WHERE user_id=$1
    AND reason='mining_reward'
    AND created_at >
      NOW() - INTERVAL '1 day'
  `,[userId]);

  const total =
    Number(r.rows[0].total);

  if(
    total + amount >
    CONFIG.miningDailyCap
  ){
    throw new Error(
      "MINING_LIMIT"
    );
  }

}

/* =========================================================
   HALVING
========================================================= */

function currentEmission(){

  const years =
    Math.floor(
      Date.now() /
      (365*24*60*60*1000)
    );

  return Math.max(
    0.1,
    1 / (years + 1)
  );

}

/* =========================================================
   STATS
========================================================= */

async function getStats(){

  const [

    totalSupply,

    circulating,

    locked

  ] = await Promise.all([

    getTotalSupply(),

    getCirculatingSupply(),

    getLockedSupply()

  ]);

  return {

    name:"BXS Network",

    symbol:"BX",

    decimals:DECIMALS,

    totalSupply,

    maxSupply:MAX_SUPPLY,

    circulatingSupply:
      circulating,

    lockedSupply:
      locked,

    emission:
      currentEmission(),

    allocation:
      ALLOCATION

  };

}

/* =========================================================
   VALIDATION
========================================================= */

function validateAmount(a){

  if(
    !a ||
    isNaN(a) ||
    a <= 0
  ){
    throw new Error(
      "INVALID_AMOUNT"
    );
  }

}

/* =========================================================
   CACHE INVALIDATION
========================================================= */

async function invalidate(){

  await redis.delCache(
    "bx:supply"
  );

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  DECIMALS,

  MAX_SUPPLY,

  ALLOCATION,

  CONFIG,

  mint,

  burn,

  transfer,

  checkMiningLimit,

  getTotalSupply,

  getCirculatingSupply,

  getLockedSupply,

  getStats

};
