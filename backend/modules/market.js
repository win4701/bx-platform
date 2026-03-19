"use strict";

const express = require("express");
const router = express.Router();

const engine = require("../engines/marketEngine");
const tradesFeed = require("../engines/tradesFeed");

/* =========================================
UTILS
========================================= */

function requireAuth(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success:false, error: "unauthorized" });
    return null;
  }

  return userId;
}

function parseNumber(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ok(res, data = {}){
  res.json({ success:true, ...data });
}

function fail(res, error="error"){
  res.status(400).json({ success:false, error });
}

/* =========================================
PLACE LIMIT ORDER
========================================= */

router.post("/order", async (req, res) => {

  try {

    const userId = requireAuth(req, res);
    if (!userId) return;

    let { side, price, amount, pair } = req.body;

    if (!side || !["buy","sell"].includes(side)) {
      return fail(res, "invalid_side");
    }

    price = parseNumber(price);
    amount = parseNumber(amount);
    pair = pair || "BX_USDT";

    if (!price || price <= 0) {
      return fail(res, "invalid_price");
    }

    if (!amount || amount <= 0) {
      return fail(res, "invalid_amount");
    }

    const order = await engine.placeOrder({
      userId,
      side,
      price,
      amount,
      pair
    });

    return ok(res, { order });

  } catch (e) {

    console.error("order error", e);
    return fail(res, "order_failed");

  }

});

/* =========================================
MARKET ORDER
========================================= */

router.post("/market", async (req, res) => {

  try {

    const userId = requireAuth(req, res);
    if (!userId) return;

    let { side, amount, pair } = req.body;

    if (!side || !["buy","sell"].includes(side)) {
      return fail(res, "invalid_side");
    }

    amount = parseNumber(amount);
    pair = pair || "BX_USDT";

    if (!amount || amount <= 0) {
      return fail(res, "invalid_amount");
    }

    const order = await engine.marketOrder({
      userId,
      side,
      amount,
      pair
    });

    return ok(res, { order });

  } catch (e) {

    console.error("market order error", e);
    return fail(res, "market_order_failed");

  }

});

/* =========================================
ORDERBOOK
========================================= */

router.get("/orderbook", async (req, res) => {

  try {

    const pair = req.query.pair || "BX_USDT";

    const ob = await engine.orderbook(pair);

    return ok(res, ob);

  } catch (e) {

    console.error(e);
    return fail(res, "orderbook_failed");

  }

});

/* =========================================
PRICE
========================================= */

router.get("/price", async (req, res) => {

  try {

    const pair = req.query.pair || "BX_USDT";

    const price = await engine.getPrice(pair);

    return ok(res, { pair, price });

  } catch (e) {

    return fail(res, "price_failed");

  }

});

/* =========================================
TRADES
========================================= */

router.get("/trades", (req, res) => {

  try {

    const pair = req.query.pair || "BX_USDT";

    const trades = tradesFeed.getTrades(pair);

    return ok(res, { trades });

  } catch (e) {

    return fail(res, "trades_failed");

  }

});

/* =========================================
CANDLES
========================================= */

router.get("/candles", (req, res) => {

  try {

    const limit = parseNumber(req.query.limit) || 100;

    const candles = tradesFeed.getCandles(limit);

    return ok(res, { candles });

  } catch (e) {

    return fail(res, "candles_failed");

  }

});

/* =========================================
STATS
========================================= */

router.get("/stats", async (req, res) => {

  try {

    const pair = req.query.pair || "BX_USDT";

    const stats = await engine.stats(pair);

    return ok(res, { stats });

  } catch (e) {

    return fail(res, "stats_failed");

  }

});

/* =========================================
CANCEL ORDER (🔥 مهم)
========================================= */

router.post("/cancel", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const orderId = parseNumber(req.body.orderId);

    if(!orderId){
      return fail(res,"invalid_order_id");
    }

    await engine.cancelOrder({
      userId,
      orderId
    });

    return ok(res,{ message:"order_cancelled" });

  }catch(e){

    return fail(res,"cancel_failed");

  }

});

module.exports = router;
