"use strict";

/* =========================================================
   BXS MATCHING ENGINE — ENTERPRISE EXCHANGE CORE
========================================================= */

const crypto =
  require("crypto");

const redis =
  require("./core/redis");

const ledger =
  require("./core/ledger");

const ws =
  require("./ws/wsHub");

const candle =
  require("./candleEngine");

const orderbook =
  require("./orderbookEngine");

/* =========================================================
   CONFIG
========================================================= */

const PAIRS = [

  "BX_USDT"

];

const MAKER_FEE = 0.001;

const TAKER_FEE = 0.002;

const LOOP_DELAY = 1;

/* =========================================================
   MEMORY BOOKS
========================================================= */

const books = {};

/* =========================================================
   INIT
========================================================= */

function initPair(pair){

  if(books[pair]){
    return;
  }

  books[pair] = {

    buys:[],

    sells:[],

    sequence:0

  };

}

/* =========================================================
   ORDER ID
========================================================= */

function orderId(){

  return crypto
    .randomBytes(12)
    .toString("hex");

}

/* =========================================================
   LOAD
========================================================= */

async function loadOrders(pair){

  initPair(pair);

  const r =
    await redis.getCache(
      `orders:${pair}`
    );

  if(r){

    books[pair] = r;

    return;

  }

  books[pair] = {

    buys:[],

    sells:[],

    sequence:0

  };

}

/* =========================================================
   SAVE
========================================================= */

async function persist(pair){

  await redis.setCache(

    `orders:${pair}`,

    books[pair],

    3600

  );

}

/* =========================================================
   ADD ORDER
========================================================= */

async function addOrder({

  userId,
  pair,
  side,
  price,
  amount

}){

  initPair(pair);

  const order = {

    id:orderId(),

    userId,

    pair,

    side,

    price:Number(price),

    amount:Number(amount),

    remaining:Number(amount),

    createdAt:Date.now()

  };

  const b =
    books[pair];

  if(side === "buy"){

    b.buys.push(order);

    b.buys.sort((a,b)=>{

      if(b.price !== a.price){

        return b.price - a.price;

      }

      return (
        a.createdAt -
        b.createdAt
      );

    });

  }else{

    b.sells.push(order);

    b.sells.sort((a,b)=>{

      if(a.price !== b.price){

        return a.price - b.price;

      }

      return (
        a.createdAt -
        b.createdAt
      );

    });

  }

  b.sequence++;

  await persist(pair);

  return order;

}

/* =========================================================
   MATCH
========================================================= */

async function match(pair){

  initPair(pair);

  const b =
    books[pair];

  while(

    b.buys.length &&
    b.sells.length

  ){

    const buy =
      b.buys[0];

    const sell =
      b.sells[0];

    /* =====================================
       PRICE CHECK
    ===================================== */

    if(
      buy.price <
      sell.price
    ){

      break;

    }

    /* =====================================
       SELF TRADE PREVENTION
    ===================================== */

    if(
      buy.userId ===
      sell.userId
    ){

      b.sells.shift();

      continue;

    }

    /* =====================================
       MATCH
    ===================================== */

    const fill =
      Math.min(

        buy.remaining,

        sell.remaining

      );

    const price =
      sell.price;

    const value =
      fill * price;

    const makerFee =
      fill *
      MAKER_FEE;

    const takerFee =
      value *
      TAKER_FEE;

    /* =====================================
       UPDATE
    ===================================== */

    buy.remaining -= fill;

    sell.remaining -= fill;

    /* =====================================
       SETTLEMENT
    ===================================== */

    await settle({

      buy,
      sell,
      fill,
      price,

      makerFee,
      takerFee

    });

    /* =====================================
       TRADE STREAM
    ===================================== */

    const trade = {

      pair,

      price,

      amount:fill,

      buyer:
        buy.userId,

      seller:
        sell.userId,

      time:Date.now()

    };

    await ws.publish(

      `market:${pair}`,

      {

        type:"trade",

        ...trade

      }

    );

    /* =====================================
       CANDLES
    ===================================== */

    await candle.updateCandle({

      pair,

      price,

      amount:fill

    });

    /* =====================================
       ORDERBOOK
    ===================================== */

    await orderbook.update({

      pair,

      side:"buy",

      price:
        buy.price,

      amount:
        buy.remaining

    });

    await orderbook.update({

      pair,

      side:"sell",

      price:
        sell.price,

      amount:
        sell.remaining

    });

    /* =====================================
       REMOVE FILLED
    ===================================== */

    if(
      buy.remaining <= 0
    ){

      b.buys.shift();

    }

    if(
      sell.remaining <= 0
    ){

      b.sells.shift();

    }

    b.sequence++;

  }

  await persist(pair);

}

/* =========================================================
   SETTLEMENT
========================================================= */

async function settle({

  buy,
  sell,

  fill,
  price,

  makerFee,
  takerFee

}){

  const total =
    fill * price;

  /* =====================================
     BUYER GETS BX
  ===================================== */

  await ledger.transfer({

    fromUser:
      sell.userId,

    toUser:
      buy.userId,

    asset:"BX",

    amount:
      fill - makerFee

  });

  /* =====================================
     SELLER GETS USDT
  ===================================== */

  await ledger.transfer({

    fromUser:
      buy.userId,

    toUser:
      sell.userId,

    asset:"USDT",

    amount:
      total - takerFee

  });

}

/* =========================================================
   LOOP
========================================================= */

let running = false;

async function loop(){

  if(running){
    return;
  }

  running = true;

  console.log(
    "⚡ BXS Matching Engine LIVE"
  );

  while(running){

    try{

      for(const pair of PAIRS){

        await match(pair);

      }

      await new Promise(r=>
        setTimeout(
          r,
          LOOP_DELAY
        )
      );

    }catch(e){

      console.error(

        "Matching:",

        e.message

      );

      await new Promise(r=>
        setTimeout(r,50)
      );

    }

  }

}

/* =========================================================
   STOP
========================================================= */

function stop(){

  running = false;

}

/* =========================================================
   STATS
========================================================= */

function stats(){

  const s = {};

  for(const pair of PAIRS){

    initPair(pair);

    s[pair] = {

      buys:
        books[pair]
        .buys.length,

      sells:
        books[pair]
        .sells.length,

      sequence:
        books[pair]
        .sequence

    };

  }

  return s;

}

/* =========================================================
   START
========================================================= */

async function start(){

  for(const pair of PAIRS){

    await loadOrders(pair);

  }

  loop();

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  start,

  stop,

  addOrder,

  match,

  stats

};
