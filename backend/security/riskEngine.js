"use strict";

/* =========================================================
   BLOXIO RISK ENGINE
========================================================= */

const db =
  require("../database");

/* =========================================================
   CONFIG
========================================================= */

const MAX_SCORE =
  Number(
    process.env
      .RISK_MAX_SCORE ||
    100
  );

const HIGH_AMOUNT =
  Number(
    process.env
      .RISK_HIGH_AMOUNT ||
    25000
  );

/* =========================================================
   HELPERS
========================================================= */

async function recentWithdraws(
  userId
){

  try{

    const r =
      await db.query(`
        SELECT COUNT(*)::int AS total
        FROM withdrawals
        WHERE user_id=$1
        AND created_at >
        NOW() - INTERVAL '24 hour'
      `,[userId]);

    return (
      r.rows[0]?.total || 0
    );

  }catch{

    return 0;

  }

}

/* =========================================================
   SCORE
========================================================= */

async function analyze({

  userId,

  amount = 0,

  wallet = "",

  ip = "",

  deviceId = ""

}){

  let score = 0;

  const reasons = [];

  /* ===== HIGH AMOUNT ===== */

  if(
    Number(amount) >=
    HIGH_AMOUNT
  ){

    score += 40;

    reasons.push(
      "high_amount"
    );

  }

  /* ===== MANY WITHDRAWS ===== */

  const total =
    await recentWithdraws(
      userId
    );

  if(total >= 5){

    score += 25;

    reasons.push(
      "withdraw_spam"
    );

  }

  /* ===== INVALID WALLET ===== */

  if(
    wallet &&
    wallet.length < 12
  ){

    score += 20;

    reasons.push(
      "wallet_invalid"
    );

  }

  /* ===== NO DEVICE ===== */

  if(!deviceId){

    score += 10;

    reasons.push(
      "missing_device"
    );

  }

  /* ===== NO IP ===== */

  if(!ip){

    score += 5;

    reasons.push(
      "missing_ip"
    );

  }

  return {

    score,

    blocked:
      score >= MAX_SCORE,

    reasons

  };

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  analyze

};
