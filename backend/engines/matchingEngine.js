"use strict";

const db = require("../database");
const ledger = require("../core/ledger");
const tradesFeed = require("./tradesFeed");
const candleEngine = require("./candleEngine");

const PAIR = "BX_USDT";
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

    const side = "buy"; // buyer initiated

    /* ================= UPDATE ORDERS ================= */

    await client.query(`
      UPDATE orders
      SET amount = amount - $1,
          status = CASE WHEN amount - $1 <= 0 THEN 'filled' ELSE 'partial' END
      WHERE id=$2
    `,[amount,b.id]);

    await client.query(`
      UPDATE orders
      SET amount = amount - $1,
          status = CASE WHEN amount - $1 <= 0 THEN 'filled' ELSE 'partial' END
      WHERE id=$2
    `,[amount,s.id]);

    /* ================= CLEAN FILLED ================= */

    await client.query(`
      DELETE FROM orders
      WHERE amount <= 0
    `);

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

    await client.query(`
      INSERT INTO trades
      (pair,price,amount,buyer_id,seller_id,side)
      VALUES($1,$2,$3,$4,$5,$6)
    `,[
      pair,
      price,
      amount,
      b.user_id,
      s.user_id,
      side
    ]);

    await client.query("COMMIT");

    /* ================= REALTIME ================= */

    await tradesFeed.publishTrade({
      pair,
      price,
      amount,
      side,
      buyer: b.user_id,
      seller: s.user_id
    });

    /* ================= CANDLES ================= */

    candleEngine.updateCandle(pair, price, amount);

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
ENGINE LOOP
========================================= */

let running = false;

async function runMatching(){

  if(running) return;
  running = true;

  console.log("🚀 Matching Engine PRO LIVE");

  while(running){

    try{

      const didMatch = await matchOrders(PAIR);

      await new Promise(r =>
        setTimeout(r, didMatch ? 1 : 50)
      );

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
