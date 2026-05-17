"use strict";

/* =========================================================
   BXS MARKET API — ENTERPRISE EXCHANGE GATEWAY
========================================================= */

const express =
  require("express");

const Joi =
  require("joi");

const crypto =
  require("crypto");

const router =
  express.Router();

const market =
  require("./engines/marketEngine");

const tradesFeed =
  require("./engines/tradesFeed");

const orderbook =
  require("./engines/orderbookEngine");

const candle =
  require("./engines/candleEngine");

const auth =
  require("./middleware/auth");

const redis =
  require("./core/redis");

const ws =
  require("./ws/wsHub");

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_PAIR =
  "BX_USDT";

const MAX_ORDER_SIZE =
  1_000_000;

/* =========================================================
   SCHEMAS
========================================================= */

const orderSchema =
  Joi.object({

    side:
      Joi.string()
      .valid("buy","sell")
      .required(),

    pair:
      Joi.string()
      .default(DEFAULT_PAIR),

    price:
      Joi.number()
      .positive()
      .required(),

    amount:
      Joi.number()
      .positive()
      .max(MAX_ORDER_SIZE)
      .required()

  });

const marketSchema =
  Joi.object({

    side:
      Joi.string()
      .valid("buy","sell")
      .required(),

    pair:
      Joi.string()
      .default(DEFAULT_PAIR),

    amount:
      Joi.number()
      .positive()
      .max(MAX_ORDER_SIZE)
      .required()

  });

/* =========================================================
   IDEMPOTENCY
========================================================= */

async function idempotency(

  req,
  res,
  next

){

  const key =
    req.headers[
      "x-idempotency-key"
    ];

  if(!key){
    return next();
  }

  const exists =
    await redis.getCache(
      `market:idem:${key}`
    );

  if(exists){

    return res.status(409)
      .json({

        success:false,

        error:
          "duplicate_request"

      });

  }

  await redis.setCache(

    `market:idem:${key}`,

    true,

    60

  );

  next();

}

/* =========================================================
   RATE LIMIT
========================================================= */

async function rateLimit(

  req,
  res,
  next

){

  const key =
    `market:rl:${req.user.id}`;

  const count =
    await redis.incr(key);

  if(count === 1){

    await redis.expire(
      key,
      1
    );

  }

  if(count > 15){

    return res.status(429)
      .json({

        success:false,

        error:
          "rate_limited"

      });

  }

  next();

}

/* =========================================================
   RESPONSE
========================================================= */

function ok(res,data={}){

  return res.json({

    success:true,

    ...data

  });

}

function fail(

  res,
  error="error",
  code=400

){

  return res.status(code)
    .json({

      success:false,

      error

    });

}

/* =========================================================
   PLACE LIMIT ORDER
========================================================= */

router.post(

  "/order",

  auth,

  idempotency,

  rateLimit,

  async(req,res)=>{

    try{

      const {

        error,

        value

      } =
        orderSchema.validate(
          req.body
        );

      if(error){

        return fail(

          res,

          error.details[0]
            .message

        );

      }

      const order =
        await market.placeOrder({

          userId:
            req.user.id,

          side:
            value.side,

          pair:
            value.pair,

          price:
            value.price,

          amount:
            value.amount

        });

      await ws.sendToUser(

        req.user.id,

        {

          type:"order_created",

          orderId:
            order.id

        }

      );

      return ok(res,{

        order

      });

    }catch(e){

      console.error(
        "Order:",
        e.message
      );

      return fail(
        res,
        e.message
      );

    }

  }

);

/* =========================================================
   MARKET ORDER
========================================================= */

router.post(

  "/market",

  auth,

  idempotency,

  rateLimit,

  async(req,res)=>{

    try{

      const {

        error,

        value

      } =
        marketSchema.validate(
          req.body
        );

      if(error){

        return fail(

          res,

          error.details[0]
            .message

        );

      }

      const order =
        await market.marketOrder({

          userId:
            req.user.id,

          side:
            value.side,

          amount:
            value.amount,

          pair:
            value.pair

        });

      return ok(res,{

        order

      });

    }catch(e){

      return fail(
        res,
        e.message
      );

    }

  }

);

/* =========================================================
   ORDERBOOK
========================================================= */

router.get(

  "/orderbook",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const depth =
        orderbook.snapshot(
          pair
        );

      return ok(res,{

        depth

      });

    }catch(e){

      return fail(
        res,
        "orderbook_failed"
      );

    }

  }

);

/* =========================================================
   TRADES
========================================================= */

router.get(

  "/trades",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const limit =
        Math.min(

          Number(
            req.query.limit
          ) || 100,

          500

        );

      const trades =
        await tradesFeed
          .getTrades({

            pair,

            limit

          });

      return ok(res,{

        trades

      });

    }catch(e){

      return fail(
        res,
        "trades_failed"
      );

    }

  }

);

/* =========================================================
   CANDLES
========================================================= */

router.get(

  "/candles",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const timeframe =
        req.query.timeframe
        || "1m";

      const limit =
        Math.min(

          Number(
            req.query.limit
          ) || 100,

          500

        );

      const candles =
        await candle
          .getCandles({

            pair,

            timeframe,

            limit

          });

      return ok(res,{

        candles

      });

    }catch(e){

      return fail(
        res,
        "candles_failed"
      );

    }

  }

);

/* =========================================================
   PRICE
========================================================= */

router.get(

  "/price",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const price =
        await market
          .getPrice(pair);

      return ok(res,{

        pair,

        price

      });

    }catch(e){

      return fail(
        res,
        "price_failed"
      );

    }

  }

);

/* =========================================================
   STATS
========================================================= */

router.get(

  "/stats",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const stats =
        await market
          .stats(pair);

      return ok(res,{

        stats

      });

    }catch(e){

      return fail(
        res,
        "stats_failed"
      );

    }

  }

);

/* =========================================================
   CANCEL ORDER
========================================================= */

router.post(

  "/cancel",

  auth,

  async(req,res)=>{

    try{

      const orderId =
        Number(
          req.body.orderId
        );

      if(!orderId){

        return fail(

          res,

          "invalid_order_id"

        );

      }

      await market
        .cancelOrder({

          userId:
            req.user.id,

          orderId

        });

      return ok(res,{

        cancelled:true

      });

    }catch(e){

      return fail(
        res,
        e.message
      );

    }

  }

);

/* =========================================================
   TICKER
========================================================= */

router.get(

  "/ticker",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const ticker =
        await tradesFeed
          .ticker(pair);

      return ok(res,{

        ticker

      });

    }catch(e){

      return fail(
        res,
        "ticker_failed"
      );

    }

  }

);

/* =========================================================
   SNAPSHOT
========================================================= */

router.get(

  "/snapshot",

  async(req,res)=>{

    try{

      const pair =
        req.query.pair
        || DEFAULT_PAIR;

      const snapshot =
        await tradesFeed
          .snapshot(pair);

      return ok(res,{

        snapshot

      });

    }catch(e){

      return fail(
        res,
        "snapshot_failed"
      );

    }

  }

);

/* =========================================================
   HEALTH
========================================================= */

router.get(

  "/health",

  async(req,res)=>{

    return ok(res,{

      status:"ok",

      ws:
        ws.getStats(),

      time:
        Date.now()

    });

  }

);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
