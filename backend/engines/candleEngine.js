"use strict";

const db = require("../database");
const tradesFeed = require("./tradesFeed");

/* =========================================
CONFIG
========================================= */

const TIMEFRAMES = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000
};

const candles = {}; // { pair: { tf: { bucket: candle } } }

/* =========================================
BUCKET
========================================= */

function getBucket(time, tf){
  return Math.floor(time / tf) * tf;
}

/* =========================================
UPDATE
========================================= */

function updateCandle(pair, price, amount){

  const now = Date.now();

  if(!candles[pair]) candles[pair] = {};

  for(const tfKey in TIMEFRAMES){

    const tf = TIMEFRAMES[tfKey];
    const bucket = getBucket(now, tf);

    if(!candles[pair][tfKey]) candles[pair][tfKey] = {};

    if(!candles[pair][tfKey][bucket]){

      candles[pair][tfKey][bucket] = {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: amount
      };

    }else{

      const c = candles[pair][tfKey][bucket];

      c.high = Math.max(c.high, price);
      c.low = Math.min(c.low, price);
      c.close = price;
      c.volume += amount;
    }

  }

}

/* =========================================
SAVE
========================================= */

async function save(pair, tfKey, candle){

  await db.query(`
    INSERT INTO candles(pair,timeframe,time,open,high,low,close,volume)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
  `,[
    pair,
    tfKey,
    candle.time,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume
  ]);

}

/* =========================================
LOOP
========================================= */

function start(){

  console.log("📊 Candle Engine started");

  setInterval(async ()=>{

    for(const pair in candles){

      for(const tfKey in candles[pair]){

        const tfCandles = candles[pair][tfKey];

        for(const key in tfCandles){

          const candle = tfCandles[key];

          await save(pair, tfKey, candle);

          /* broadcast via tradesFeed */

          tradesFeed.publishTrade({
            pair,
            price: candle.close,
            amount: candle.volume,
            side: "candle"
          });

        }

      }

      /* clear memory */
      candles[pair] = {};

    }

  }, 60 * 1000);

}

/* =========================================
GET CANDLES
========================================= */

async function getCandles(pair, timeframe = "1m", limit = 100){

  const r = await db.query(`
    SELECT time,open,high,low,close,volume
    FROM candles
    WHERE pair=$1 AND timeframe=$2
    ORDER BY time DESC
    LIMIT $3
  `,[pair,timeframe,limit]);

  return r.rows.reverse();
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  updateCandle,
  start,
  getCandles
};
