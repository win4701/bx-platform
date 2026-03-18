"use strict";

/* =========================================
WS HUB
========================================= */

let wsHub = null;

function attachWS(hub){
  wsHub = hub;
}

/* =========================================
STATE
========================================= */

const trades = [];
const candles = {};

const MAX_TRADES = 200;
const CANDLE_INTERVAL = 60 * 1000; // 1 min

/* =========================================
CANDLE HELPER
========================================= */

function getCandleBucket(time){
  return Math.floor(time / CANDLE_INTERVAL) * CANDLE_INTERVAL;
}

function updateCandle(trade){

  const bucket = getCandleBucket(trade.time);

  if(!candles[bucket]){
    candles[bucket] = {
      time: bucket,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.amount
    };
  }else{

    const c = candles[bucket];

    c.high = Math.max(c.high, trade.price);
    c.low = Math.min(c.low, trade.price);
    c.close = trade.price;
    c.volume += trade.amount;
  }

}

/* =========================================
PUBLISH TRADE (UPGRADED)
========================================= */

async function publishTrade(trade){

  try{

    const data = {
      pair: trade.pair,
      price: Number(trade.price),
      amount: Number(trade.amount),
      side: trade.side || "buy",
      buyer: trade.buyer || null,
      seller: trade.seller || null,
      time: Date.now()
    };

    /* store trades */
    trades.unshift(data);

    if(trades.length > MAX_TRADES){
      trades.pop();
    }

    /* update candle */
    updateCandle(data);

    /* broadcast */

    if(wsHub){

      wsHub.broadcast("trade", data);

      wsHub.broadcast("ticker", {
        pair: data.pair,
        price: data.price
      });

    }

    console.log("📊 Trade:", data.price, data.amount);

  }catch(e){
    console.error("Trade publish error:", e);
  }

}

/* =========================================
GET TRADES
========================================= */

function getTrades(pair){
  if(!pair) return trades;
  return trades.filter(t => t.pair === pair);
}

/* =========================================
GET CANDLES
========================================= */

function getCandles(limit = 100){

  const list = Object.values(candles)
    .sort((a,b)=>a.time - b.time);

  return list.slice(-limit);
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  publishTrade,
  getTrades,
  getCandles,
  attachWS
};
