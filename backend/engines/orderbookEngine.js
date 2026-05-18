"use strict";

/* =========================================================
   BXS ORDERBOOK ENGINE — ENTERPRISE DEPTH SYSTEM
========================================================= */

const redis =
  require("../core/redis");

const ws =
  require("../ws/wsHub");

/* =========================================================
   CONFIG
========================================================= */

const MAX_DEPTH = 50;

/* =========================================================
   MEMORY BOOK
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

    bids:new Map(),

    asks:new Map(),

    sequence:0,

    updatedAt:Date.now()

  };

}

/* =========================================================
   SORT
========================================================= */

function sorted(map,side){

  const arr = [];

  for(const [

    price,
    amount

  ] of map){

    if(amount <= 0){
      continue;
    }

    arr.push({

      price:Number(price),

      amount:Number(amount)

    });

  }

  arr.sort((a,b)=>{

    return side === "bids"
      ? b.price - a.price
      : a.price - b.price;

  });

  return arr.slice(
    0,
    MAX_DEPTH
  );

}

/* =========================================================
   SNAPSHOT
========================================================= */

function snapshot(pair){

  initPair(pair);

  const b = books[pair];

  return {

    pair,

    sequence:b.sequence,

    bids:
      sorted(
        b.bids,
        "bids"
      ),

    asks:
      sorted(
        b.asks,
        "asks"
      ),

    updatedAt:
      b.updatedAt

  };

}

/* =========================================================
   UPDATE LEVEL
========================================================= */

async function update({

  pair,
  side,
  price,
  amount

}){

  initPair(pair);

  const b =
    books[pair];

  const map =
    side === "buy"
      ? b.bids
      : b.asks;

  const p =
    Number(price)
      .toFixed(8);

  const a =
    Number(amount);

  /* =====================================
     REMOVE
  ===================================== */

  if(a <= 0){

    map.delete(p);

  }else{

    map.set(p,a);

  }

  b.sequence++;

  b.updatedAt =
    Date.now();

  /* =====================================
     REDIS
  ===================================== */

  await redis.setCache(

    `orderbook:${pair}`,

    snapshot(pair),

    60

  );

  /* =====================================
     DIFF STREAM
  ===================================== */

  await ws.publish(

    `depth:${pair}`,

    {

      type:"depth",

      pair,

      sequence:
        b.sequence,

      side,

      price:Number(p),

      amount:a

    }

  );

}

/* =========================================================
   LOAD SNAPSHOT
========================================================= */

async function load(pair){

  const cached =
    await redis.getCache(
      `orderbook:${pair}`
    );

  if(cached){

    books[pair] = {

      bids:new Map(
        cached.bids.map(
          x=>[
            String(x.price),
            x.amount
          ]
        )
      ),

      asks:new Map(
        cached.asks.map(
          x=>[
            String(x.price),
            x.amount
          ]
        )
      ),

      sequence:
        cached.sequence,

      updatedAt:
        cached.updatedAt

    };

    return snapshot(pair);

  }

  return snapshot(pair);

}

/* =========================================================
   SPREAD
========================================================= */

function spread(pair){

  const s =
    snapshot(pair);

  if(
    !s.bids.length ||
    !s.asks.length
  ){

    return null;

  }

  return Number(
    (
      s.asks[0].price -
      s.bids[0].price
    ).toFixed(8)
  );

}

/* =========================================================
   MID PRICE
========================================================= */

function mid(pair){

  const s =
    snapshot(pair);

  if(
    !s.bids.length ||
    !s.asks.length
  ){

    return null;

  }

  return Number(
    (
      (
        s.bids[0].price +
        s.asks[0].price
      ) / 2
    ).toFixed(8)
  );

}

/* =========================================================
   IMBALANCE
========================================================= */

function imbalance(pair){

  const s =
    snapshot(pair);

  const bids =
    s.bids.reduce(
      (a,b)=>a+b.amount,
      0
    );

  const asks =
    s.asks.reduce(
      (a,b)=>a+b.amount,
      0
    );

  if(
    bids + asks === 0
  ){

    return 0;

  }

  return Number(
    (
      (
        bids - asks
      ) /
      (
        bids + asks
      )
    ).toFixed(4)
  );

}

/* =========================================================
   BROADCAST SNAPSHOT
========================================================= */

async function broadcast(pair){

  await ws.publish(

    `depth:${pair}`,

    {

      type:"snapshot",

      ...snapshot(pair)

    }

  );

}

/* =========================================================
   START
========================================================= */

function start(){

  console.log(
    "📚 BXS Orderbook Engine LIVE"
  );

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  start,

  update,

  snapshot,

  load,

  spread,

  mid,

  imbalance,

  broadcast

};
