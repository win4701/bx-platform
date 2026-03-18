"use strict";

const db = require("../database");

const PAIR = "BX_USDT";
const BOT_USER = 0;
const INTERVAL = 1000;

/* ================= RANDOM ================= */

function rand(min, max){
  return Math.random() * (max - min) + min;
}

/* ================= BASE PRICE ================= */

async function getBasePrice(){

  const r = await db.query(`
    SELECT price FROM trades
    WHERE pair=$1
    ORDER BY id DESC LIMIT 1
  `,[PAIR]);

  if(!r.rows.length) return 45;

  return Number(r.rows[0].price);
}

/* ================= PLACE ORDER ================= */

async function placeOrder(side, price, amount){

  await db.query(`
    INSERT INTO orders (pair, side, price, amount, user_id)
    VALUES ($1,$2,$3,$4,$5)
  `,[
    PAIR,
    side,
    price,
    amount,
    BOT_USER
  ]);

}

/* ================= BOT LOOP ================= */

async function runBot(){

  console.log("🤖 REAL Market Bot Started");

  setInterval(async () => {

    try{

      const base = await getBasePrice();

      const spread = rand(0.1, 0.5);

      const buyPrice = base - spread;
      const sellPrice = base + spread;

      const buyAmount = rand(1,5);
      const sellAmount = rand(1,5);

      /* place real orders */

      await placeOrder("buy", buyPrice, buyAmount);
      await placeOrder("sell", sellPrice, sellAmount);

    }catch(e){
      console.error("BOT ERROR:", e.message);
    }

  }, INTERVAL);

}

module.exports = {
  runBot
};
