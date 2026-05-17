"use strict";

/* =========================================================
   BXS FRAUD ENGINE — ENTERPRISE RISK SYSTEM
========================================================= */

const crypto =
  require("crypto");

const redis =
  require("./core/redis");

const geoip =
  require("geoip-lite");

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

  txLimit: 100000,

  txPerMinute: 10,

  ipBurst: 30,

  highRiskScore: 80,

  mediumRiskScore: 50,

  vpnPenalty: 25,

  torPenalty: 40,

  multiAccountPenalty: 35

};

/* =========================================================
   MAIN
========================================================= */

class FraudEngine {

  constructor(db){

    this.db = db;

  }

  /* =======================================================
     CHECK
  ======================================================= */

  async check(data){

    const {

      userId,
      amount,
      ip,
      wallet,
      deviceId

    } = data;

    let score = 0;

    const reasons = [];

    /* =====================================
       AMOUNT
    ===================================== */

    if(amount > CONFIG.txLimit){

      score += 40;

      reasons.push(
        "large_transaction"
      );

    }

    /* =====================================
       VELOCITY
    ===================================== */

    const velocity =
      await this.velocityCheck(
        userId
      );

    score += velocity.score;

    reasons.push(
      ...velocity.reasons
    );

    /* =====================================
       IP ANALYSIS
    ===================================== */

    const ipRisk =
      await this.ipCheck(ip);

    score += ipRisk.score;

    reasons.push(
      ...ipRisk.reasons
    );

    /* =====================================
       GEO RISK
    ===================================== */

    const geo =
      this.geoCheck(ip);

    score += geo.score;

    reasons.push(
      ...geo.reasons
    );

    /* =====================================
       DEVICE FINGERPRINT
    ===================================== */

    const device =
      await this.deviceCheck(
        userId,
        deviceId
      );

    score += device.score;

    reasons.push(
      ...device.reasons
    );

    /* =====================================
       WALLET ANALYSIS
    ===================================== */

    const walletRisk =
      await this.walletCheck(
        wallet
      );

    score += walletRisk.score;

    reasons.push(
      ...walletRisk.reasons
    );

    /* =====================================
       SEGMENT
    ===================================== */

    const level =
      this.level(score);

    /* =====================================
       AUDIT
    ===================================== */

    await this.audit({

      userId,
      score,
      reasons,
      level

    });

    return {

      blocked:
        score >=
        CONFIG.highRiskScore,

      review:
        score >=
        CONFIG.mediumRiskScore,

      risk:score,

      level,

      reasons

    };

  }

  /* =======================================================
     VELOCITY
  ======================================================= */

  async velocityCheck(userId){

    const key =
      `fraud:tx:${userId}`;

    const count =
      await redis.incr(key);

    if(count === 1){

      await redis.expire(
        key,
        60
      );

    }

    if(
      count >
      CONFIG.txPerMinute
    ){

      return {

        score:30,

        reasons:[
          "velocity_limit"
        ]

      };

    }

    return {

      score:0,

      reasons:[]

    };

  }

  /* =======================================================
     IP CHECK
  ======================================================= */

  async ipCheck(ip){

    const key =
      `fraud:ip:${ip}`;

    const count =
      await redis.incr(key);

    if(count === 1){

      await redis.expire(
        key,
        10
      );

    }

    let score = 0;

    const reasons = [];

    if(
      count >
      CONFIG.ipBurst
    ){

      score += 25;

      reasons.push(
        "ip_burst"
      );

    }

    /* =====================================
       VPN/TOR PLACEHOLDER
    ===================================== */

    if(await this.isVPN(ip)){

      score += CONFIG.vpnPenalty;

      reasons.push(
        "vpn_detected"
      );

    }

    return {

      score,
      reasons

    };

  }

  /* =======================================================
     GEO
  ======================================================= */

  geoCheck(ip){

    const geo =
      geoip.lookup(ip);

    if(!geo){

      return {

        score:0,

        reasons:[]

      };

    }

    const highRisk = [

      "KP",
      "IR"

    ];

    if(
      highRisk.includes(
        geo.country
      )
    ){

      return {

        score:40,

        reasons:[
          "high_risk_country"
        ]

      };

    }

    return {

      score:0,

      reasons:[]

    };

  }

  /* =======================================================
     DEVICE
  ======================================================= */

  async deviceCheck(

    userId,
    deviceId

  ){

    if(!deviceId){

      return {

        score:10,

        reasons:[
          "missing_device"
        ]

      };

    }

    const key =
      `device:${deviceId}`;

    const users =
      await redis.getCache(
        key
      ) || [];

    if(
      !users.includes(userId)
    ){

      users.push(userId);

      await redis.setCache(
        key,
        users,
        86400
      );

    }

    if(users.length > 3){

      return {

        score:
          CONFIG.multiAccountPenalty,

        reasons:[
          "multi_account_device"
        ]

      };

    }

    return {

      score:0,

      reasons:[]

    };

  }

  /* =======================================================
     WALLET
  ======================================================= */

  async walletCheck(wallet){

    if(!wallet){

      return {

        score:0,

        reasons:[]

      };

    }

    /* future AML/KYT */

    return {

      score:0,

      reasons:[]

    };

  }

  /* =======================================================
     LEVEL
  ======================================================= */

  level(score){

    if(score >= 80){
      return "critical";
    }

    if(score >= 50){
      return "high";
    }

    if(score >= 25){
      return "medium";
    }

    return "low";

  }

  /* =======================================================
     VPN
  ======================================================= */

  async isVPN(ip){

    // integrate future VPN API

    return false;

  }

  /* =======================================================
     AUDIT
  ======================================================= */

  async audit(data){

    try{

      console.log(
        "[FRAUD]",
        data
      );

    }catch(e){}

  }

  /* =======================================================
     SCORE USER
  ======================================================= */

  async scoreUser(userId){

    const key =
      `fraud:score:${userId}`;

    return (
      await redis.getCache(key)
    ) || 0;

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  FraudEngine;
