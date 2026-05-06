"use strict";

/* =========================================================
   BXS LIQUIDITY ENGINE — ENTERPRISE MARKET MAKER
========================================================= */

const redis =
  require("../core/redis");

const db =
  require("../database");

const ws =
  require("../ws/wsHub");

const market =
  require("./marketEngine");

/* =========================================================
   CONFIG
========================================================= */

const PAIRS = [

  "BX_USDT"

];

const BOT_ID = 0;

const LEVELS = 20;

const BASE_SPREAD = 0.002;

const MAX_EXPOSURE =
  500_000;

const REFRESH_MS = 2000;

/* =========================================================
   STATE
========================================================= */

const state = {

  inventory:{},

  lastPrice:{},

  volatility:{}

};

/* =========================================================
   RANDOM NORMAL
========================================================= */

function gaussian(){

  let u = 0;
  let v = 0;

  while(u === 0){
    u = Math.random();
  }

  while(v === 0){
    v = Math.random();
  }

  return Math.sqrt(
    -2 * Math.log(u)
  ) *
  Math.cos(
    2 * Math.PI * v
  );

}

/* =========================================================
   PRICE ENGINE
========================================================= */

async function nextPrice(pair){

  const current =
    state.lastPrice[pair]
    || await market.getPrice(pair);

  const volatility =
    state.volatility[pair]
    || 0.002;

  const drift =
    gaussian() *
    volatility;

  let next =
    current *
    (1 + drift);

  /* =====================================
     CLAMP
  ===================================== */

  next =
    Math.max(1,next);

  state.lastPrice[pair] =
    next;

  return Number(
    next.toFixed(4)
  );

}

/* =========================================================
   INVENTORY
========================================================= */

function inventory(pair){

  return state.inventory[pair]
    || 0;

}

/* =========================================================
   SPREAD
========================================================= */

function spread(pair){

  const inv =
    inventory(pair);

  let spread =
    BASE_SPREAD;

  /* =====================================
     INVENTORY RISK
  ===================================== */

  if(
    Math.abs(inv) >
    MAX_EXPOSURE * 0.5
  ){

    spread *= 2;

  }

  return spread;

}

/* =========================================================
   DEPTH SIZE
========================================================= */

function size(level){

  return Number(
    (
      5 +
      Math.random() * 20
    ).toFixed(4)
  );

}

/* =========================================================
   CLEAR OLD
========================================================= */

async function clearOld(pair){

  await db.query(`
    DELETE FROM orders
    WHERE user_id=$1
    AND pair=$2
    AND status='open'
  `,[BOT_ID,pair]);

}

/* =========================================================
   GENERATE BOOK
========================================================= */

async function generate(pair){

  const price =
    await nextPrice(pair);

  const s =
    spread(pair);

  /* =====================================
     CLEAR
  ===================================== */

  await clearOld(pair);

  /* =====================================
     LEVELS
  ===================================== */

  for(let i=1;i<=LEVELS;i++){

    const bid =
      price -
      (price * s * i);

    const ask =
      price +
      (price * s * i);

    const bidSize =
      size(i);

    const askSize =
      size(i);

    /* ===================================
       BUY
    =================================== */

    await db.query(`
      INSERT INTO orders
      (
        user_id,
        pair,
        side,
        price,
        amount,
        remaining,
        status,
        is_bot
      )
      VALUES(
        $1,$2,'buy',
        $3,$4,$4,
        'open',true
      )
    `,[

      BOT_ID,

      pair,

      bid,

      bidSize

    ]);

    /* ===================================
       SELL
    =================================== */

    await db.query(`
      INSERT INTO orders
      (
        user_id,
        pair,
        side,
        price,
        amount,
        remaining,
        status,
        is_bot
      )
      VALUES(
        $1,$2,'sell',
        $3,$4,$4,
        'open',true
      )
    `,[

      BOT_ID,

      pair,

      ask,

      askSize

    ]);

  }

  /* =====================================
     CACHE MID PRICE
  ===================================== */

  await redis.setCache(

    `mid:${pair}`,

    price,

    5

  );

  /* =====================================
     WS
  ===================================== */

  await ws.publish(

    `market:${pair}`,

    {

      type:"liquidity",

      pair,

      price

    }

  );

  return price;

}

/* =========================================================
   LOOP
========================================================= */

async function loop(){

  for(const pair of PAIRS){

    try{

      const price =
        await generate(pair);

      console.log(

        "💧 MM",

        pair,

        price

      );

    }catch(e){

      console.error(

        "Liquidity:",

        e.message

      );

    }

  }

}

/* =========================================================
   START
========================================================= */

function start(){

  console.log(
    "💧 BXS Market Maker LIVE"
  );

  setInterval(

    loop,

    REFRESH_MS

  );

}

/* =========================================================
   STATS
========================================================= */

function stats(){

  return {

    pairs:PAIRS,

    inventory:
      state.inventory,

    volatility:
      state.volatility

  };

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  start,

  stats

};
