"use strict";

/* =========================================================
   BLOXIO TRADES REPO — ULTRA EXCHANGE LEVEL
========================================================= */

module.exports = (db, redis = null) => ({

  /* =========================================================
     CREATE TRADE
  ========================================================= */

  async create(trade, tx){

    const client = tx || db;

    if(!trade.price || !trade.amount){
      throw new Error("invalid_trade");
    }

    const r = await client.query(`
      INSERT INTO trades
      (symbol,price,amount,side,buy_user,sell_user,fee,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
      RETURNING id, symbol, price, amount, side, created_at
    `,[
      trade.symbol || "BX_USDT",
      trade.price,
      trade.amount,
      trade.side || "buy",
      trade.buy,
      trade.sell,
      trade.fee || 0
    ]);

    const result = r.rows[0];

    /* 🔥 cache invalidation */
    if(redis){
      await redis.delCache(`trades:${trade.symbol}`);
    }

    return result;

  },

  /* =========================================================
     USER TRADES (PAGINATED)
  ========================================================= */

  async userTrades(userId, { limit=50, offset=0 } = {}){

    const r = await db.query(`
      SELECT id, symbol, price, amount, side, created_at
      FROM trades
      WHERE buy_user=$1 OR sell_user=$1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,[userId,limit,offset]);

    return r.rows;

  },

  /* =========================================================
     GET TRADES BY SYMBOL (CACHE)
  ========================================================= */

  async getBySymbol(symbol, { limit=50 } = {}){

    const cacheKey = `trades:${symbol}`;

    if(redis){
      const cached = await redis.getCache(cacheKey);
      if(cached) return cached;
    }

    const r = await db.query(`
      SELECT price, amount, side, created_at
      FROM trades
      WHERE symbol=$1
      ORDER BY created_at DESC
      LIMIT $2
    `,[symbol,limit]);

    const result = r.rows;

    if(redis){
      await redis.setCache(cacheKey, result, 3);
    }

    return result;

  },

  /* =========================================================
     MARKET STATS (🔥 مهم)
  ========================================================= */

  async getStats(symbol){

    const r = await db.query(`
      SELECT
        COUNT(*) as trades,
        COALESCE(SUM(amount),0) as volume,
        COALESCE(AVG(price),0) as avg_price,
        MAX(price) as high,
        MIN(price) as low
      FROM trades
      WHERE symbol=$1
      AND created_at > NOW() - INTERVAL '24 hours'
    `,[symbol]);

    return r.rows[0];

  },

  /* =========================================================
     LAST PRICE (🔥 مهم جداً)
  ========================================================= */

  async getLastPrice(symbol){

    const r = await db.query(`
      SELECT price
      FROM trades
      WHERE symbol=$1
      ORDER BY created_at DESC
      LIMIT 1
    `,[symbol]);

    return r.rows[0]?.price || 0;

  },

  /* =========================================================
     ORDER BOOK SNAPSHOT (SIMPLIFIED)
  ========================================================= */

  async getOrderBook(symbol){

    const r = await db.query(`
      SELECT price, amount, side
      FROM trades
      WHERE symbol=$1
      ORDER BY created_at DESC
      LIMIT 100
    `,[symbol]);

    return r.rows;

  }

});
