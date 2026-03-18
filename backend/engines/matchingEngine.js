"use strict";

const db = require("../database");
const ledger = require("../core/ledger");
const tradesFeed = require("./tradesFeed");

const PAIR = "BX_USDT";
const FEE = 0.002;

/* =========================================
MATCH STEP
========================================= */

async function matchOrders(pair){

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    /* best buy */
    const buy = await client.query(`
      SELECT * FROM orders
      WHERE pair=$1 AND side='buy' AND amount > 0
      ORDER BY price DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `,[pair]);

    /* best sell */
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

    /* execution */
    const price = Number(s.price);
    const amount = Math.min(Number(b.amount), Number(s.amount));
    const value = price * amount;

    /* fees */
    const feeBuy = amount * FEE;
    const feeSell = value * FEE;

    /* update orders */
    await client.query(`
      UPDATE orders SET amount = amount - $1 WHERE id=$2
    `,[amount,b.id]);

    await client.query(`
      UPDATE orders SET amount = amount - $1 WHERE id=$2
    `,[amount,s.id]);

    /* ledger buyer */
    await ledger.trade({
      userId: b.user_id,
      assetIn: "USDT",
      assetOut: "BX",
      amountIn: value,
      amountOut: amount - feeBuy
    });

    /* ledger seller */
    await ledger.trade({
      userId: s.user_id,
      assetIn: "BX",
      assetOut: "USDT",
      amountIn: amount,
      amountOut: value - feeSell
    });

    /* insert trade (FULL DATA) */
    await client.query(`
      INSERT INTO trades
      (pair,price,amount,buyer_id,seller_id,buy_order_id,sell_order_id,fee_buy,fee_sell)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,[
      pair,
      price,
      amount,
      b.user_id,
      s.user_id,
      b.id,
      s.id,
      feeBuy,
      feeSell
    ]);

    await client.query("COMMIT");

    /* broadcast (FULL) */
    await tradesFeed.publishTrade({
      pair,
      price,
      amount,
      buyer: b.user_id,
      seller: s.user_id
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
ENGINE LOOP
========================================= */

let running = false;

async function runMatching(){

  if(running) return;
  running = true;

  console.log("🚀 Matching Engine LIVE");

  while(running){

    try{

      const didMatch = await matchOrders(PAIR);

      await new Promise(r =>
        setTimeout(r, didMatch ? 5 : 100)
      );

    }catch(e){

      console.error("Loop error:", e);
      await new Promise(r=>setTimeout(r,500));

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
