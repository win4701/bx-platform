"use strict";

/* =========================================================
   BLOXIO MARKET WS — ULTRA REALTIME ENGINE
========================================================= */

const wsHub = require("./wsHub");
const tradesFeed = require("./engines/tradesFeed");
const marketEngine = require("./engines/marketEngine");
const redis = require("./core/redis");

/* =========================================================
   INIT
========================================================= */

function initMarketWS(){

  console.log("📡 Market WS initialized");

  tradesFeed.attachWS(wsHub);

  /* 🔥 Redis sync */
  redis.subscribe("market_trade", (msg)=>{
    wsHub.broadcast(`market:${msg.symbol}`, msg);
  });

}

/* =========================================================
   SNAPSHOT
========================================================= */

async function sendSnapshot(ws, symbol){

  try{

    const price = await marketEngine.getPrice(symbol);
    const orderbook = await marketEngine.orderbook(symbol);
    const trades = tradesFeed.getTrades(symbol);

    ws.send(JSON.stringify({
      type: "snapshot",
      symbol,
      data: {
        price,
        orderbook,
        trades
      }
    }));

  }catch(e){
    console.error("Snapshot error:", e.message);
  }

}

/* =========================================================
   SUBSCRIBE SYSTEM (🔥 مهم)
========================================================= */

function handleConnection(ws){

  console.log("📡 Market client connected");

  ws.on("message",(msg)=>{

    try{

      const data = JSON.parse(msg);

      switch(data.type){

        /* ================= SUBSCRIBE ================= */
        case "subscribe":

          if(!data.symbol) return;

          ws.symbol = data.symbol;

          wsHub.subscribe(ws, `market:${data.symbol}`);

          sendSnapshot(ws, data.symbol);

          break;

        /* ================= UNSUBSCRIBE ================= */
        case "unsubscribe":

          if(ws.symbol){
            wsHub.unsubscribe(ws, `market:${ws.symbol}`);
          }

          break;

      }

    }catch(e){
      console.error("WS message error:", e.message);
    }

  });

}

/* =========================================================
   PUSH TRADE (REALTIME)
========================================================= */

async function pushTrade(trade){

  /* 🔥 Redis broadcast */
  await redis.publish("market_trade", trade);

}

/* =========================================================
   PUSH ORDERBOOK UPDATE (DELTA)
========================================================= */

function pushOrderbook(symbol, data){

  wsHub.broadcast(`market:${symbol}`, {
    type:"orderbook_update",
    symbol,
    data
  });

}

/* =========================================================
   PUSH PRICE UPDATE
========================================================= */

function pushPrice(symbol, price){

  wsHub.broadcast(`market:${symbol}`, {
    type:"price",
    symbol,
    price
  });

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  initMarketWS,
  handleConnection,
  pushTrade,
  pushOrderbook,
  pushPrice
};
