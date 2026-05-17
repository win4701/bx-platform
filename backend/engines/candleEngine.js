"use strict";

/* =========================================================
   BXS CANDLE ENGINE — ENTERPRISE MARKET DATA
========================================================= */

const db =
  require("./database");

const redis =
  require("./core/redis");

const ws =
  require("./ws/wsHub");

/* =========================================================
   CONFIG
========================================================= */

const TIMEFRAMES = {

  "1m": 60_000,

  "5m": 300_000,

  "15m": 900_000,

  "1h": 3_600_000,

  "4h": 14_400_000,

  "1d": 86_400_000

};

const CACHE_TTL = 86400;

/* =========================================================
   BUCKET
========================================================= */

function bucket(time,tf){

  return (
    Math.floor(time / tf) * tf
  );

}

/* =========================================================
   KEY
========================================================= */

function key(pair,tf,time){

  return `candle:${pair}:${tf}:${time}`;

}

/* =========================================================
   UPDATE
========================================================= */

async function updateCandle({

  pair,
  price,
  amount

}){

  const now = Date.now();

  for(const tfKey in TIMEFRAMES){

    const tf =
      TIMEFRAMES[tfKey];

    const b =
      bucket(now,tf);

    const k =
      key(pair,tfKey,b);

    let candle =
      await redis.getCache(k);

    /* =====================================
       CREATE
    ===================================== */

    if(!candle){

      candle = {

        pair,

        timeframe:tfKey,

        time:b,

        open:price,

        high:price,

        low:price,

        close:price,

        volume:amount,

        trades:1,

        vwapNumerator:
          price * amount

      };

    }else{

      /* ===================================
         UPDATE
      =================================== */

      candle.high =
        Math.max(
          candle.high,
          price
        );

      candle.low =
        Math.min(
          candle.low,
          price
        );

      candle.close =
        price;

      candle.volume +=
        amount;

      candle.trades++;

      candle.vwapNumerator +=
        price * amount;

    }

    /* =====================================
       VWAP
    ===================================== */

    candle.vwap =
      candle.vwapNumerator /
      candle.volume;

    /* =====================================
       CACHE
    ===================================== */

    await redis.setCache(

      k,

      candle,

      CACHE_TTL

    );

    /* =====================================
       REALTIME
    ===================================== */

    await ws.publish(

      `kline:${pair}:${tfKey}`,

      candle

    );

  }

}

/* =========================================================
   PERSIST
========================================================= */

async function persist(){

  const keys =
    await redis.keys(
      "candle:*"
    );

  for(const k of keys){

    const c =
      await redis.getCache(k);

    if(!c) continue;

    await db.query(`
      INSERT INTO candles
      (
        pair,
        timeframe,
        time,
        open,
        high,
        low,
        close,
        volume,
        trades,
        vwap
      )
      VALUES(
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10
      )
      ON CONFLICT
      (
        pair,
        timeframe,
        time
      )
      DO UPDATE SET

        high=EXCLUDED.high,
        low=EXCLUDED.low,
        close=EXCLUDED.close,
        volume=EXCLUDED.volume,
        trades=EXCLUDED.trades,
        vwap=EXCLUDED.vwap
    `,[

      c.pair,
      c.timeframe,
      c.time,

      c.open,
      c.high,
      c.low,
      c.close,

      c.volume,
      c.trades,
      c.vwap

    ]);

  }

}

/* =========================================================
   START
========================================================= */

function start(){

  console.log(
    "📊 BXS Candle Engine started"
  );

  /* =====================================
     PERSIST LOOP
  ===================================== */

  setInterval(

    persist,

    10_000

  );

}

/* =========================================================
   GET CANDLES
========================================================= */

async function getCandles({

  pair,
  timeframe="1m",
  limit=100

}){

  const r =
    await db.query(`
      SELECT
        time,
        open,
        high,
        low,
        close,
        volume,
        trades,
        vwap
      FROM candles
      WHERE pair=$1
      AND timeframe=$2
      ORDER BY time DESC
      LIMIT $3
    `,[

      pair,
      timeframe,
      limit

    ]);

  return r.rows.reverse();

}

/* =========================================================
   MARK PRICE
========================================================= */

async function getMarkPrice(pair){

  const c =
    await getCandles({

      pair,
      timeframe:"1m",
      limit:1

    });

  return c[0]?.close || 0;

}

/* =========================================================
   INDEX PRICE
========================================================= */

async function getIndexPrice(pair){

  // future multi-exchange index

  return getMarkPrice(pair);

}

/* =========================================================
   CLEANUP
========================================================= */

async function cleanup(){

  await db.query(`
    DELETE FROM candles
    WHERE time <
      EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days') * 1000
  `);

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  updateCandle,

  getCandles,

  getMarkPrice,

  getIndexPrice,

  persist,

  cleanup,

  start

};
