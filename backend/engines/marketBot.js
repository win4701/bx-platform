"use strict";

const marketEngine = require("./marketEngine");

const PAIR = "BX_USDT";
const BOT_USER = 999; // ⚠️ لازم يكون له wallet

let running = false;

/* =========================================
CONFIG
========================================= */

const CONFIG = {
  interval: 1500,
  spread: 0.2,      // فرق السعر
  depthLevels: 3,   // عدد مستويات orderbook
  baseAmount: 2
};

/* =========================================
UTILS
========================================= */

function rand(min, max){
  return Math.random() * (max - min) + min;
}

/* =========================================
CREATE LIQUIDITY
========================================= */

async function createLiquidity(){

  const basePrice = await marketEngine.getPrice(PAIR);

  for(let i=1; i<=CONFIG.depthLevels; i++){

    const spread = CONFIG.spread * i;

    const buyPrice = basePrice - spread;
    const sellPrice = basePrice + spread;

    const amount = rand(CONFIG.baseAmount, CONFIG.baseAmount * 2);

    /* BUY */

    await marketEngine.placeOrder({
      userId: BOT_USER,
      side: "buy",
      price: buyPrice,
      amount,
      pair: PAIR
    });

    /* SELL */

    await marketEngine.placeOrder({
      userId: BOT_USER,
      side: "sell",
      price: sellPrice,
      amount,
      pair: PAIR
    });

  }

}

/* =========================================
PRICE SUPPORT (🔥 مهم)
========================================= */

async function stabilizePrice(){

  const price = await marketEngine.getPrice(PAIR);

  /* منع انهيار السعر */

  if(price < 40){

    await marketEngine.placeOrder({
      userId: BOT_USER,
      side: "buy",
      price: price + 1,
      amount: rand(5,10),
      pair: PAIR
    });

  }

  /* منع التضخم */

  if(price > 60){

    await marketEngine.placeOrder({
      userId: BOT_USER,
      side: "sell",
      price: price - 1,
      amount: rand(5,10),
      pair: PAIR
    });

  }

}

/* =========================================
BOT LOOP
========================================= */

async function loop(){

  if(!running) return;

  try{

    await createLiquidity();

    await stabilizePrice();

  }catch(e){

    console.error("BOT ERROR:", e.message);

  }

  setTimeout(loop, CONFIG.interval);

}

/* =========================================
START / STOP
========================================= */

function start(){

  if(running){
    console.log(" Market Bot already running");
    return;
  }

  running = true;

  console.log(" Market Maker Bot STARTED");

  loop();

}

function stop(){

  running = false;

  console.log(" Market Bot STOPPED");

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  start,
  stop
};
