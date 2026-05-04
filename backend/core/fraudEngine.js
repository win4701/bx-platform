"use strict";

class FraudEngine{

  constructor(db){
    this.db = db;
  }

  async check({ userId, amount, ip }){

    /* ===== RULE 1: large transaction ===== */

    if(amount > 10000){
      return { blocked:true, reason:"amount_limit" };
    }

    /* ===== RULE 2: too many transactions ===== */

    const recent = await this.db.query(`
      SELECT COUNT(*) FROM transactions
      WHERE from_id=$1
      AND created_at > NOW() - INTERVAL '1 minute'
    `,[userId]);

    if(Number(recent.rows[0].count) > 5){
      return { blocked:true, reason:"rate_limit" };
    }

    /* ===== RULE 3: suspicious IP ===== */

    const ipCheck = await this.db.query(`
      SELECT COUNT(*) FROM transactions
      WHERE ip=$1
      AND created_at > NOW() - INTERVAL '10 seconds'
    `,[ip]);

    if(Number(ipCheck.rows[0].count) > 10){
      return { blocked:true, reason:"ip_spam" };
    }

    return { blocked:false };

  }

}

module.exports = FraudEngine;
