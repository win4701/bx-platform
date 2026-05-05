"use strict";

module.exports = (db) => ({

  async getBalance(userId, asset){
    const r = await db.query(`
      SELECT balance, locked
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
    `,[userId, asset]);

    return r.rows[0] || { balance:0, locked:0 };
  },

  async lock(userId, asset, amount, tx){
    await tx.query(`
      UPDATE wallet_balances
      SET balance = balance - $1,
          locked  = locked + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);
  },

  async unlock(userId, asset, amount, tx){
    await tx.query(`
      UPDATE wallet_balances
      SET locked = locked - $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);
  },

  async credit(userId, asset, amount, tx){
    await tx.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);
  }

});
