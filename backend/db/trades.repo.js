"use strict";

module.exports = (db) => ({

  async create(trade, tx){
    await tx.query(`
      INSERT INTO trades(price,amount,buy_user,sell_user)
      VALUES($1,$2,$3,$4)
    `,[trade.price, trade.amount, trade.buy, trade.sell]);
  },

  async userTrades(userId){
    const r = await db.query(`
      SELECT * FROM trades
      WHERE buy_user=$1 OR sell_user=$1
      ORDER BY created_at DESC
    `,[userId]);

    return r.rows;
  }

});
