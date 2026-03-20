"use strict";

const db = require("../database");
const wsHub = require("../ws/wsHub");

/* =========================================
GET ORDERBOOK
========================================= */

async function getOrderbook(pair){

  if(!pair) throw new Error("pair_required");

  /* ===== BIDS ===== */
  const bids = await db.query(`
    SELECT price, SUM(amount) as amount
    FROM orders
    WHERE pair=$1
      AND side='buy'
      AND amount > 0
    GROUP BY price
    ORDER BY price DESC
    LIMIT 20
  `,[pair]);

  /* ===== ASKS ===== */
  const asks = await db.query(`
    SELECT price, SUM(amount) as amount
    FROM orders
    WHERE pair=$1
      AND side='sell'
      AND amount > 0
    GROUP BY price
    ORDER BY price ASC
    LIMIT 20
  `,[pair]);

  return {
    pair,
    bids: bids.rows.map(b => ({
      price: Number(b.price),
      amount: Number(b.amount)
    })),
    asks: asks.rows.map(a => ({
      price: Number(a.price),
      amount: Number(a.amount)
    }))
  };

}

/* =========================================
BROADCAST ORDERBOOK (🔥 مهم)
========================================= */

async function broadcastOrderbook(pair){

  try{

    const ob = await getOrderbook(pair);

    wsHub.broadcast("market", {
      type: "orderbook",
      pair: ob.pair,
      bids: ob.bids,
      asks: ob.asks
    });

  }catch(e){

    console.error("Orderbook error:", e.message);

  }

}

/* =========================================
AUTO LOOP (اختياري)
========================================= */

let running = false;

function startOrderbookFeed(pair){

  if(running) return;

  running = true;

  console.log("📊 Orderbook Feed started");

  setInterval(()=>{

    broadcastOrderbook(pair);

  }, 1000);

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  getOrderbook,
  broadcastOrderbook,
  startOrderbookFeed
};
