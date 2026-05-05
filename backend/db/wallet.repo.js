"use strict";

/* =========================================================
   BLOXIO WALLET REPO — ULTRA PRO
========================================================= */

module.exports = (db, redis = null) => ({

  /* =========================================================
     ENSURE BALANCE ROW
  ========================================================= */

  async ensure(userId, asset, tx){

    const client = tx || db;

    await client.query(`
      INSERT INTO wallet_balances (user_id, asset, balance, locked)
      VALUES ($1,$2,0,0)
      ON CONFLICT (user_id,asset) DO NOTHING
    `,[userId,asset]);

  },

  /* =========================================================
     GET BALANCE (WITH CACHE)
  ========================================================= */

  async getBalance(userId, asset){

    const cacheKey = `bal:${userId}:${asset}`;

    if(redis){
      const cached = await redis.getCache(cacheKey);
      if(cached) return cached;
    }

    const r = await db.query(`
      SELECT balance, locked
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
    `,[userId,asset]);

    const result = r.rows[0] || { balance:0, locked:0 };

    if(redis){
      await redis.setCache(cacheKey, result, 5);
    }

    return result;

  },

  /* =========================================================
     LOCK (SAFE)
  ========================================================= */

  async lock(userId, asset, amount, tx){

    if(amount <= 0) throw new Error("invalid_amount");

    const client = tx || db;

    await this.ensure(userId, asset, client);

    const r = await client.query(`
      SELECT balance
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    const balance = Number(r.rows[0].balance);

    if(balance < amount){
      throw new Error("insufficient_balance");
    }

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance - $1,
          locked  = locked + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);

  },

  /* =========================================================
     UNLOCK
  ========================================================= */

  async unlock(userId, asset, amount, tx){

    if(amount <= 0) throw new Error("invalid_amount");

    const client = tx || db;

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1,
          locked  = locked - $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);

  },

  /* =========================================================
     CREDIT
  ========================================================= */

  async credit(userId, asset, amount, tx){

    if(amount <= 0) throw new Error("invalid_amount");

    const client = tx || db;

    await this.ensure(userId, asset, client);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);

    if(redis){
      await redis.delCache(`bal:${userId}:${asset}`);
    }

  },

  /* =========================================================
     DEBIT (🔥 مهم جداً)
  ========================================================= */

  async debit(userId, asset, amount, tx){

    if(amount <= 0) throw new Error("invalid_amount");

    const client = tx || db;

    await this.ensure(userId, asset, client);

    const r = await client.query(`
      SELECT balance
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    const balance = Number(r.rows[0].balance);

    if(balance < amount){
      throw new Error("insufficient_balance");
    }

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance - $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);

    if(redis){
      await redis.delCache(`bal:${userId}:${asset}`);
    }

  },

  /* =========================================================
     GET ALL BALANCES
  ========================================================= */

  async getAll(userId){

    const r = await db.query(`
      SELECT asset, balance, locked
      FROM wallet_balances
      WHERE user_id=$1
    `,[userId]);

    return r.rows;

  },

  /* =========================================================
     LOCK ROW (ADVANCED)
  ========================================================= */

  async lockRow(userId, asset, tx){

    const client = tx || db;

    const r = await client.query(`
      SELECT *
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    return r.rows[0];

  }

});
