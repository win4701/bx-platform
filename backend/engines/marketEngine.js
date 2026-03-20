"use strict";

const db = require("../database");
const ledger = require("../core/ledger");

const DEFAULT_PAIR = "BX_USDT";

/* =========================================
UTILS
========================================= */

function parseNumber(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* =========================================
GET PRICE
========================================= */

async function getPrice(pair = DEFAULT_PAIR){

  const r = await db.query(`
    SELECT price FROM trades
    WHERE pair=$1
    ORDER BY id DESC LIMIT 1
  `,[pair]);

  if(!r.rows.length) return 45;

  return Number(r.rows[0].price);
}

/* =========================================
PLACE ORDER (🔥 FIXED)
========================================= */

async function placeOrder({ userId, side, price, amount, pair }){

  if(!userId) throw new Error("invalid_user");

  if(!["buy","sell"].includes(side)){
    throw new Error("invalid_side");
  }

  price = parseNumber(price);
  amount = parseNumber(amount);
  pair = pair || DEFAULT_PAIR;

  if(!price || price <= 0) throw new Error("invalid_price");
  if(!amount || amount <= 0) throw new Error("invalid_amount");

  /* =========================================
  🔥 FREEZE FUNDS
  ========================================= */

  if(side === "buy"){
    await ledger.freeze({
      userId,
      asset:"USDT",
      amount: price * amount
    });
  }

  if(side === "sell"){
    await ledger.freeze({
      userId,
      asset:"BX",
      amount
    });
  }

  /* =========================================
  INSERT ORDER
  ========================================= */

  const r = await db.query(`
    INSERT INTO orders (pair,side,price,amount,user_id,status)
    VALUES ($1,$2,$3,$4,$5,'open')
    RETURNING *
  `,[
    pair,
    side,
    price,
    amount,
    userId
  ]);

  return r.rows[0];
}

/* =========================================
MARKET ORDER (🔥 REAL)
========================================= */

async function marketOrder({ userId, side, amount, pair }){

  pair = pair || DEFAULT_PAIR;

  const price = await getPrice(pair);

  return placeOrder({
    userId,
    side,
    price,
    amount,
    pair
  });

}

/* =========================================
ORDERBOOK
========================================= */

async function orderbook(pair = DEFAULT_PAIR){

  const bids = await db.query(`
    SELECT price, SUM(amount) as amount
    FROM orders
    WHERE pair=$1 AND side='buy' AND amount > 0
    GROUP BY price
    ORDER BY price DESC
    LIMIT 20
  `,[pair]);

  const asks = await db.query(`
    SELECT price, SUM(amount) as amount
    FROM orders
    WHERE pair=$1 AND side='sell' AND amount > 0
    GROUP BY price
    ORDER BY price ASC
    LIMIT 20
  `,[pair]);

  return {
    pair,
    bids: bids.rows,
    asks: asks.rows
  };
}

/* =========================================
CANCEL ORDER (🔥 FIXED)
========================================= */

async function cancelOrder({ userId, orderId }){

  const r = await db.query(`
    SELECT * FROM orders
    WHERE id=$1 AND user_id=$2 AND amount > 0
  `,[orderId,userId]);

  if(!r.rows.length){
    throw new Error("order_not_found");
  }

  const o = r.rows[0];

  /* =========================================
  🔥 UNFREEZE
  ========================================= */

  if(o.side === "buy"){
    await ledger.unfreeze({
      userId,
      asset:"USDT",
      amount: o.price * o.amount
    });
  }

  if(o.side === "sell"){
    await ledger.unfreeze({
      userId,
      asset:"BX",
      amount: o.amount
    });
  }

  await db.query(`
    UPDATE orders
    SET amount=0, status='cancelled'
    WHERE id=$1
  `,[orderId]);

  return { success:true };
}

/* =========================================
STATS
========================================= */

async function stats(pair = DEFAULT_PAIR){

  const r = await db.query(`
    SELECT
    COUNT(*) as trades,
    SUM(amount) as volume,
    MAX(price) as high,
    MIN(price) as low
    FROM trades
    WHERE pair=$1
    AND created_at > NOW() - INTERVAL '24 hours'
  `,[pair]);

  const price = await getPrice(pair);

  return {
    pair,
    price,
    volume:Number(r.rows[0].volume || 0),
    high:Number(r.rows[0].high || price),
    low:Number(r.rows[0].low || price),
    trades:Number(r.rows[0].trades || 0)
  };
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  placeOrder,
  marketOrder,
  orderbook,
  getPrice,
  stats,
  cancelOrder
};
