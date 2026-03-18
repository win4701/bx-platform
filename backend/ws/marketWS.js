"use strict";

const wsHub = require("./wsHub");
const tradesFeed = require("../engines/tradesFeed");
const marketEngine = require("../engines/marketEngine");

/* =========================================
INIT
========================================= */

function initMarketWS(){

  console.log("📡 Market WS initialized");

  /* attach hub to trades feed */
  tradesFeed.attachWS(wsHub);

}

/* =========================================
PUSH SNAPSHOT (on connect)
========================================= */

async function sendSnapshot(ws){

  try{

    const price = await marketEngine.getPrice();
    const orderbook = await marketEngine.orderbook();
    const trades = tradesFeed.getTrades();

    ws.send(JSON.stringify({
      type: "snapshot",
      data: {
        price,
        orderbook,
        trades
      }
    }));

  }catch(e){
    console.error("Snapshot error:", e);
  }

}

/* =========================================
SUBSCRIBE HANDLER
========================================= */

function handleConnection(ws){

  console.log(" WS client connected");

  sendSnapshot(ws);

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  initMarketWS,
  handleConnection
};
