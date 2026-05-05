"use strict";

/* =========================================================
   BLOXIO WITHDRAW FRAUD ENGINE — ULTRA PROTECTION
========================================================= */

const config = require("../config");

/* =========================================================
   CACHE (ANTI DB LOAD)
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
   ENGINE
========================================================= */

class WithdrawFraud{

  constructor(db){
    this.db = db;
  }

  /* =========================================================
     MAIN CHECK
  ========================================================= */

  async check({ userId, amount, ip }){

    if(!userId || amount <= 0){
      throw new Error("invalid_data");
    }

    /* ================= HARD LIMIT ================= */

    if(amount > config.withdraw.max){
      return this.block("max_limit");
    }

    /* ================= USER RISK ================= */

    const risk = await this.getRiskScore(userId);

    if(risk > 10 && amount > 1000){
      return this.block("high_risk_user");
    }

    /* ================= VELOCITY ================= */

    const velocity = await this.checkVelocity(userId);

    if(velocity){
      return velocity;
    }

    /* ================= DAILY LIMIT ================= */

    const daily = await this.checkDaily(userId, amount);

    if(daily){
      return daily;
    }

    /* ================= IP ANOMALY ================= */

    const ipCheck = await this.checkIP(userId, ip);

    if(ipCheck){
      return ipCheck;
    }

    /* ================= BLACKLIST ================= */

    const black = await this.checkBlacklist(userId);

    if(black){
      return black;
    }

    return { blocked:false };

  }

  /* =========================================================
     BLOCK RESPONSE
  ========================================================= */

  block(reason){
    return {
      blocked:true,
      reason
    };
  }

  /* =========================================================
     USER RISK SCORE
  ========================================================= */

  async getRiskScore(userId){

    const key = `risk:${userId}`;
    const cached = cacheGet(key);
    if(cached !== null) return cached;

    const r = await this.db.query(`
      SELECT COUNT(*) as c
      FROM fraud_logs
      WHERE user_id=$1
    `,[userId]);

    const score = Number(r.rows[0].c);

    cacheSet(key,score,10000);

    return score;

  }

  /* =========================================================
     VELOCITY (🔥 مهم)
  ========================================================= */

  async checkVelocity(userId){

    const r = await this.db.query(`
      SELECT COUNT(*) as c
      FROM withdrawals
      WHERE user_id=$1
      AND created_at > NOW() - INTERVAL '1 minute'
    `,[userId]);

    if(Number(r.rows[0].c) > 3){
      return this.block("velocity_attack");
    }

  }

  /* =========================================================
     DAILY LIMIT
  ========================================================= */

  async checkDaily(userId, amount){

    const r = await this.db.query(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM withdrawals
      WHERE user_id=$1
      AND created_at > NOW() - INTERVAL '1 day'
    `,[userId]);

    const total = Number(r.rows[0].total);

    if(total + amount > config.withdraw.dailyLimit){
      return this.block("daily_limit");
    }

  }

  /* =========================================================
     IP CHECK
  ========================================================= */

  async checkIP(userId, ip){

    if(!ip) return;

    const r = await this.db.query(`
      SELECT COUNT(*) as c
      FROM user_ips
      WHERE user_id=$1 AND ip=$2
    `,[userId,ip]);

    if(Number(r.rows[0].c) === 0){
      return this.block("new_ip");
    }

  }

  /* =========================================================
     BLACKLIST
  ========================================================= */

  async checkBlacklist(userId){

    const r = await this.db.query(`
      SELECT blocked FROM users
      WHERE id=$1
    `,[userId]);

    if(r.rows[0]?.blocked){
      return this.block("blacklisted");
    }

  }

}

module.exports = WithdrawFraud;
