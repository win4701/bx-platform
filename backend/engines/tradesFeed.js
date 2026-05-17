"use strict";

/* =========================================================
   BXS TRADES FEED — ENTERPRISE MARKET STREAM
========================================================= */

const crypto =
  require("crypto");

const redis =
  require("./core/redis");

const ws =
  require("./ws/wsHub");

const candle =
  require("./candleEngine");

/* =========================================================
   CONFIG
========================================================= */

const MAX_TRADES = 500;

const FEED_TTL = 86400;

/* =========================================================
   TRADE ID
========================================================= */

function tradeId(){

  return crypto
    .randomBytes(12)
    .toString("hex");

}

/* =========================================================
   PUBLISH TRADE
========================================================= */

async function publishTrade({

  pair,
  price,
  amount,
  side="buy",

  buyer=null,
  seller=null

}){

  const trade = {

    id:tradeId(),

    pair,

    price:Number(price),

    amount:Number(amount),

    side,

    buyer,

    seller,

    timestamp:Date.now()

  };

  /* =====================================
     STORE
  ===================================== */

  await redis.lPush(

    `trades:${pair}`,

    JSON.stringify(trade)

  );

  await redis.lTrim(

    `trades:${pair}`,

    0,

    MAX_TRADES

  );

  await redis.expire(

    `trades:${pair}`,

    FEED_TTL

  );

  /* =====================================
     STREAM
  ===================================== */

  await redis.publish(

    `stream:trades:${pair}`,

    JSON.stringify(trade)

  );

  /* =====================================
     CANDLES
  ===================================== */

  await candle.updateCandle({

    pair,

    price,

    amount

  });

  /* =====================================
     REALTIME
  ===================================== */

  await ws.publish(

    `trades:${pair}`,

    {

      type:"trade",

      ...trade

    }

  );

  /* =====================================
     TICKER
  ===================================== */

  await ws.publish(

    `ticker:${pair}`,

    {

      type:"ticker",

      pair,

      price,

      volume:amount,

      timestamp:
        trade.timestamp

    }

  );

  return trade;

}

/* =========================================================
   GET TRADES
========================================================= */

async function getTrades({

  pair,

  limit=100

}){

  const data =
    await redis.lRange(

      `trades:${pair}`,

      0,

      limit - 1

    );

  return data.map(x=>
    JSON.parse(x)
  );

}

/* =========================================================
   LAST PRICE
========================================================= */

async function lastPrice(pair){

  const trades =
    await getTrades({

      pair,

      limit:1

    });

  return (
    trades[0]?.price
  ) || 0;

}

/* =========================================================
   TICKER
========================================================= */

async function ticker(pair){

  const trades =
    await getTrades({

      pair,

      limit:100

    });

  if(!trades.length){

    return null;

  }

  const prices =
    trades.map(
      t=>t.price
    );

  const volumes =
    trades.map(
      t=>t.amount
    );

  return {

    pair,

    last:
      prices[0],

    high:
      Math.max(...prices),

    low:
      Math.min(...prices),

    volume:
      volumes.reduce(
        (a,b)=>a+b,
        0
      ),

    trades:
      trades.length

  };

}

/* =========================================================
   SNAPSHOT
========================================================= */

async function snapshot(pair){

  return {

    ticker:
      await ticker(pair),

    trades:
      await getTrades({

        pair,

        limit:50

      })

  };

}

/* =========================================================
   START
========================================================= */

function start(){

  console.log(
    "📡 BXS Trades Feed LIVE"
  );

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  start,

  publishTrade,

  getTrades,

  lastPrice,

  ticker,

  snapshot

};
