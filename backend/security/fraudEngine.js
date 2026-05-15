"use strict";

/* =========================================================
   BLOXIO FRAUD ENGINE
========================================================= */

const db =
  require("../database");

/* =========================================================
   CONFIG
========================================================= */

const MAX_WITHDRAW =
  Number(
    process.env
      .FRAUD_MAX_WITHDRAW ||
    5
  );

const MAX_AMOUNT =
  Number(
    process.env
      .FRAUD_MAX_AMOUNT ||
    50000
  );

/* =========================================================
   CHECK
========================================================= */

async function check({

  userId,

  amount = 0,

  wallet = "",

  ip = "",

  deviceId = ""

}){

  try{

    let score = 0;

    let blocked = false;

    const reasons = [];

    /* ===== AMOUNT ===== */

    if(
      Number(amount) >
      MAX_AMOUNT
    ){

      score += 60;

      reasons.push(
        "high_amount"
      );

    }

    /* ===== RECENT WITHDRAW ===== */

    const recent =
      await db.query(`
        SELECT COUNT(*)::int AS total
        FROM withdrawals
        WHERE user_id=$1
        AND created_at >
        NOW() - INTERVAL '1 hour'
      `,[userId]);

    const total =
      recent.rows[0]
      ?.total || 0;

    if(
      total >= MAX_WITHDRAW
    ){

      score += 40;

      reasons.push(
        "withdraw_rate"
      );

    }

    /* ===== INVALID WALLET ===== */

    if(
      wallet &&
      wallet.length < 12
    ){

      score += 30;

      reasons.push(
        "wallet_invalid"
      );

    }

    /* ===== DEVICE ===== */

    if(!deviceId){

      score += 10;

      reasons.push(
        "missing_device"
      );

    }

    /* ===== IP ===== */

    if(!ip){

      score += 10;

      reasons.push(
        "missing_ip"
      );

    }

    /* ===== BLOCK ===== */

    if(score >= 80){

      blocked = true;

    }

    return {

      blocked,

      score,

      reasons

    };

  }catch(err){

    console.error(

      "FRAUD:",

      err.message

    );

    return {

      blocked:false,

      score:0,

      reasons:[]

    };

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  check

};
