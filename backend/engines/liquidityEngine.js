"use strict";

const db = require("../database");
const marketEngine = require("./marketEngine");

const PAIR = "BX_USDT";
const BOT_ID = 0;

/* =========================================
CONFIG
========================================= */

let lastPrice = 45; // start reference
const VOLATILITY = 0.002; // 0.2%

/* =========================================
RANDOM WALK (REAL MARKET)
========================================= */

function nextPrice(){

  const change = (Math.random() - 0.5) * 2 * VOLATILITY;

  lastPrice = lastPrice * (1 + change);

  /* prevent crash */
  if(lastPrice < 30) lastPrice = 30;
  if(lastPrice > 100) lastPrice = 100;

  return Number(lastPrice.toFixed(4));
}

/* =========================================
RANDOM SIZE
========================================= */

function rand(min,max){
  return Math.random() * (max - min) + min;
}

/* =========================================
CLEAR OLD
========================================= */

async function clearOld(){
  await db.query(`
    DELETE FROM orders
    WHERE user_id=$1 AND pair=$2
  `,[BOT_ID,PAIR]);
}

/* =========================================
GENERATE LIQUIDITY
========================================= */

async function generateLiquidity(){

  const price = nextPrice();

  const spread = price * 0.002; // 0.2%

  for(let i=1;i<=10;i++){

    const bid = price - spread * i;
    const ask = price + spread * i;

    const size = rand(1,5);

    await db.query(`
      INSERT INTO orders(user_id,pair,side,price,amount,status)
      VALUES($1,$2,'buy',$3,$4,'open')
    `,[BOT_ID,PAIR,bid,size]);

    await db.query(`
      INSERT INTO orders(user_id,pair,side,price,amount,status)
      VALUES($1,$2,'sell',$3,$4,'open')
    `,[BOT_ID,PAIR,ask,size]);

  }

  return price;
}

/* =========================================
LOOP
========================================= */

async function run(){

  try{

    await clearOld();

    const price = await generateLiquidity();

    console.log("📈 Market Price:", price);

  }catch(e){
    console.error("Liquidity error:", e.message);
  }

}

/* =========================================
START
========================================= */

function startLiquidity(){

  console.log("💧 Smart Liquidity Engine LIVE");

  setInterval(run, 3000);

}

module.exports = {
  startLiquidity
};
