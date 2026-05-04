"use strict";

class WithdrawFraud{

  constructor(db){
    this.db = db;
  }

  async check({ userId, amount, ip }){

    if(amount > 5000){
      return { blocked:true, reason:"limit_exceeded" };
    }

    const r = await this.db.query(`
      SELECT COUNT(*) FROM withdrawals
      WHERE user_id=$1
      AND created_at > NOW() - INTERVAL '1 minute'
    `,[userId]);

    if(Number(r.rows[0].count) > 3){
      return { blocked:true, reason:"spam_detected" };
    }

    return { blocked:false };

  }

}

module.exports = WithdrawFraud;
