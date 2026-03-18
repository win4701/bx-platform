"use strict";

const express = require("express");
const router = express.Router();

const engine = require("../engines/marketEngine");
const tradesFeed = require("../engines/tradesFeed");

/* =========================================
AUTH CHECK
========================================= */

function requireAuth(req,res){
  const userId = req.user?.id;

  if(!userId){
    res.status(401).json({ error:"unauthorized" });
    return null;
  }

  return userId;
}

/* =========================================
PLACE LIMIT ORDER
========================================= */

router.post("/order", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    let { side, price, amount } = req.body;

    const result = await engine.placeOrder({
      userId,
      side,
      price,
      amount
    });

    res.json({
      success:true,
      order: result
    });

  }catch(e){

    console.error("order error", e);

    res.status(500).json({
      error:"order_failed"
    });

  }

});

/* =========================================
MARKET ORDER
========================================= */

router.post("/market", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    let { side, amount } = req.body;

    const result = await engine.marketOrder({
      userId,
      side,
      amount
    });

    res.json({
      success:true,
      order: result
    });

  }catch(e){

    console.error("market order error", e);

    res.status(500).json({
      error:"market_order_failed"
    });

  }

});

/* =========================================
ORDERBOOK
========================================= */

router.get("/orderbook", async (req,res)=>{

  try{

    const ob = await engine.orderbook();
    res.json(ob);

  }catch(e){

    res.status(500).json({
      error:"orderbook_failed"
    });

  }

});

/* =========================================
PRICE
========================================= */

router.get("/price", async (req,res)=>{

  try{

    const price = await engine.getPrice();

    res.json({
      pair:"BX_USDT",
      price
    });

  }catch(e){

    res.status(500).json({
      error:"price_failed"
    });

  }

});

/* =========================================
TRADES
========================================= */

router.get("/trades", (req,res)=>{

  try{

    const trades = tradesFeed.getTrades("BX_USDT");

    res.json(trades);

  }catch(e){

    res.status(500).json({
      error:"trades_failed"
    });

  }

});

/* =========================================
CANDLES
========================================= */

router.get("/candles", (req,res)=>{

  try{

    const candles = tradesFeed.getCandles(100);

    res.json(candles);

  }catch(e){

    res.status(500).json({
      error:"candles_failed"
    });

  }

});

/* =========================================
STATS
========================================= */

router.get("/stats", async (req,res)=>{

  try{

    const s = await engine.stats();
    res.json(s);

  }catch(e){

    res.status(500).json({
      error:"stats_failed"
    });

  }

});

module.exports = router;
