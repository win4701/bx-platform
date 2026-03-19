"use strict";

const db = require("../database");
const ledger = require("../core/ledger");
const tradesFeed = require("./tradesFeed");
const candleEngine = require("./candleEngine");
const wsHub = require("../ws/wsHub");

const FEE = 0.002;

/* =========================================
MATCH STEP
========================================= */

async function matchOrders(pair){

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    const buy = await client.query(`
      SELECT * FROM orders
      WHERE pair=$1 AND side='buy' AND amount > 0
      ORDER BY price DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `,[pair]);

    const sell = await client.query(`
      SELECT * FROM orders
      WHERE pair=$1 AND side='sell' AND amount > 0
      ORDER BY price ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `,[pair]);

    if(!buy.rows.length || !sell.rows.length){
      await client.query("COMMIT");
      return false;
    }

    const b = buy.rows[0];
    const s = sell.rows[0];

    if(Number(b.price) < Number(s.price)){
      await client.query("COMMIT");
      return false;
    }

    /* ================= EXECUTION ================= */

    const price = Number(s.price);
    const amount = Math.min(Number(b.amount), Number(s.amount));
    const value = price * amount;

    const feeBuy = amount * FEE;
    const feeSell = value * FEE;

    /* ================= UPDATE ORDERS ================= */

    await client.query(`
      UPDATE orders
      SET amount = amount - $1,
          filled = filled + $1,
          status = CASE 
            WHEN amount - $1 <= 0 THEN 'filled' 
            ELSE 'partial' 
          END
      WHERE id=$2
    `,[amount,b.id]);

    await client.query(`
      UPDATE orders
      SET amount = amount - $1,
          filled = filled + $1,
          status = CASE 
            WHEN amount - $1 <= 0 THEN 'filled' 
            ELSE 'partial' 
          END
      WHERE id=$2
    `,[amount,s.id]);

    /* ❌ حذف محذوف → تم إلغاء DELETE */

    /* ================= LEDGER ================= */

    await ledger.trade({
      userId: b.user_id,
      assetIn: "USDT",
      assetOut: "BX",
      amountIn: value,
      amountOut: amount - feeBuy
    });

    await ledger.trade({
      userId: s.user_id,
      assetIn: "BX",
      assetOut: "USDT",
      amountIn: amount,
      amountOut: value - feeSell
    });

    /* ================= TRADE ================= */

    const tradeRes = await client.query(`
      INSERT INTO trades
      (pair,price,amount,buyer_id,seller_id,side)
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *
    `,[
      pair,
      price,
      amount,
      b.user_id,
      s.user_id,
      "buy"
    ]);

    await client.query("COMMIT");

    const trade = tradeRes.rows[0];

    /* ================= REALTIME ================= */

    await tradesFeed.publishTrade(trade);

    candleEngine.updateCandle(pair, price, amount);

    wsHub.broadcast("market", {
      type:"trade",
      price,
      amount,
      pair
    });

    /* ================= ORDERBOOK ================= */

    const ob = await db.query(`
      SELECT side, price, SUM(amount) as volume
      FROM orders
      WHERE pair=$1 AND amount > 0
      GROUP BY side, price
    `,[pair]);

    const bids = ob.rows
      .filter(o=>o.side==="buy")
      .sort((a,b)=>b.price-a.price)
      .slice(0,10);

    const asks = ob.rows
      .filter(o=>o.side==="sell")
      .sort((a,b)=>a.price-b.price)
      .slice(0,10);

    wsHub.broadcast("market", {
      type:"orderbook",
      bids,
      asks
    });

    return true;

  }catch(e){

    await client.query("ROLLBACK");
    console.error("Matching error:", e);
    return false;

  }finally{
    client.release();
  }

}

/* =========================================
ENGINE LOOP (MULTI PAIR)
========================================= */

let running = false;

const PAIRS = ["BX_USDT"];

async function runMatching(){

  if(running) return;
  running = true;

  console.log("🚀 Matching Engine LIVE");

  while(running){

    try{

      for(const pair of PAIRS){
        await matchOrders(pair);
      }

      await new Promise(r=>setTimeout(r,10));

    }catch(e){

      console.error("Loop error:", e);
      await new Promise(r=>setTimeout(r,200));

    }

  }

}

/* =========================================
CONTROL
========================================= */

function startMatching(){
  runMatching();
}

function stopMatching(){
  running = false;
}

module.exports = {
  startMatching,
  stopMatching,
  matchOrders
};
