"use strict";

const db = require("../database");
const tradesFeed = require("./tradesFeed");

const PAIR = "BX_USDT";

/* =========================================
GET PRICE
========================================= */

async function getPrice(){

  const r = await db.query(`
    SELECT price FROM trades
    WHERE pair=$1
    ORDER BY id DESC LIMIT 1
  `,[PAIR]);

  if(!r.rows.length) return 45;

  return Number(r.rows[0].price);
}

/* =========================================
PLACE ORDER (REAL)
========================================= */

async function placeOrder({ userId, side, price, amount }){

  if(!userId) throw new Error("invalid_user");
  if(!side || !["buy","sell"].includes(side)) throw new Error("invalid_side");

  price = Number(price);
  amount = Number(amount);

  if(price <= 0 || amount <= 0){
    throw new Error("invalid_values");
  }

  await db.query(`
    INSERT INTO orders (pair,side,price,amount,user_id)
    VALUES ($1,$2,$3,$4,$5)
  `,[
    PAIR,
    side,
    price,
    amount,
    userId
  ]);

  return {
    success:true,
    pair:PAIR,
    side,
    price,
    amount
  };
}

/* =========================================
MARKET ORDER (SIMULATED LIMIT)
========================================= */

async function marketOrder({ userId, side, amount }){

  const price = await getPrice();

  // نحط order قريب من السوق
  const finalPrice = side === "buy"
    ? price * 1.01
    : price * 0.99;

  return placeOrder({
    userId,
    side,
    price: finalPrice,
    amount
  });
}

/* =========================================
ORDERBOOK
========================================= */

async function orderbook(){

  const bids = await db.query(`
    SELECT price, SUM(amount) as amount
    FROM orders
    WHERE pair=$1 AND side='buy' AND amount > 0
    GROUP BY price
    ORDER BY price DESC
    LIMIT 20
  `,[PAIR]);

  const asks = await db.query(`
    SELECT price, SUM(amount) as amount
    FROM orders
    WHERE pair=$1 AND side='sell' AND amount > 0
    GROUP BY price
    ORDER BY price ASC
    LIMIT 20
  `,[PAIR]);

  return {
    pair:PAIR,
    bids:bids.rows,
    asks:asks.rows
  };
}

/* =========================================
TRADES HISTORY
========================================= */

async function history(){

  const r = await db.query(`
    SELECT price,amount,side,created_at
    FROM trades
    WHERE pair=$1
    ORDER BY id DESC
    LIMIT 100
  `,[PAIR]);

  return r.rows;
}

/* =========================================
STATS
========================================= */

async function stats(){

  const r = await db.query(`
    SELECT
    COUNT(*) as trades,
    SUM(amount) as volume,
    MAX(price) as high,
    MIN(price) as low
    FROM trades
    WHERE pair=$1
    AND created_at > NOW() - INTERVAL '24 hours'
  `,[PAIR]);

  const price = await getPrice();

  return {
    pair:PAIR,
    price,
    volume:Number(r.rows[0].volume || 0),
    high:Number(r.rows[0].high || price),
    low:Number(r.rows[0].low || price),
    trades:Number(r.rows[0].trades || 0)
  };
}

/* =========================================
CANCEL ORDER
========================================= */

async function cancelOrder(userId, orderId){

  await db.query(`
    UPDATE orders
    SET amount = 0
    WHERE id=$1 AND user_id=$2
  `,[orderId,userId]);

  return { success:true };
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  placeOrder,
  marketOrder,
  orderbook,
  history,
  stats,
  getPrice,
  cancelOrder
};
