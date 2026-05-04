"use strict";

const express = require("express");
const router = express.Router();

const axios = require("axios");
const crypto = require("crypto");

const db = require("../database");
const ledger = require("../core/ledger");

const NOWPAY_API = "https://api.nowpayments.io/v1";

const NOWPAY_KEY = process.env.NOWPAY_API_KEY;
const NOWPAY_IPN = process.env.NOWPAY_IPN_SECRET;

/* =====================================================
SECURITY MIDDLEWARE (RAW BODY FOR WEBHOOK)
===================================================== */

const rawBodyParser = express.raw({ type: "application/json" });

/* =====================================================
SUPPORTED COINS
===================================================== */

const SUPPORTED = [
  "USDT","USDC","BTC","ETH","BNB","AVAX","SOL","LTC","TON","ZEC"
];

/* =====================================================
HELPERS
===================================================== */

function auth(req){
  if(!req.user?.id){
    const e = new Error("unauthorized");
    e.status = 401;
    throw e;
  }
  return req.user.id;
}

function validateAmount(v){
  const n = Number(v);
  if(!n || n <= 0) throw new Error("invalid_amount");
  return n;
}

/* =====================================================
RATE LIMIT (BASIC)
===================================================== */

const rateMap = new Map();

function rateLimit(key, limit = 5, window = 60000){

  const now = Date.now();

  if(!rateMap.has(key)){
    rateMap.set(key, []);
  }

  const logs = rateMap.get(key).filter(t => now - t < window);

  if(logs.length >= limit){
    throw new Error("rate_limit");
  }

  logs.push(now);
  rateMap.set(key, logs);
}

/* =====================================================
CREATE DEPOSIT
===================================================== */

router.post("/create", async (req,res)=>{

  try{

    const userId = auth(req);

    rateLimit(userId + "_deposit");

    let { amount, asset="USDT" } = req.body;

    amount = validateAmount(amount);
    asset = String(asset).toUpperCase();

    if(!SUPPORTED.includes(asset)){
      return res.status(400).json({error:"unsupported_coin"});
    }

    const orderId = `${userId}_${Date.now()}`;

    const r = await axios.post(
      `${NOWPAY_API}/payment`,
      {
        price_amount: amount,
        price_currency: "usd",
        pay_currency: asset,
        order_id: orderId,
        ipn_callback_url: "https://api.bloxio.online/payments/webhook"
      },
      {
        headers:{ "x-api-key": NOWPAY_KEY }
      }
    );

    const p = r.data;

    await db.query(`
      INSERT INTO payments
      (user_id,type,provider,amount,asset,status,external_id,meta)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    `,[
      userId,
      "deposit",
      "nowpayments",
      amount,
      asset,
      "pending",
      p.payment_id,
      JSON.stringify({orderId})
    ]);

    res.json({
      payment_id: p.payment_id,
      address: p.pay_address,
      amount: p.pay_amount,
      currency: p.pay_currency
    });

  }catch(e){
    res.status(400).json({error:e.message});
  }

});

/* =====================================================
WEBHOOK (SECURE + VERIFIED + IDEMPOTENT)
===================================================== */

router.post("/webhook", rawBodyParser, async (req,res)=>{

  try{

    const sig = req.headers["x-nowpayments-sig"];
    const raw = req.body.toString();

    const hash = crypto
      .createHmac("sha512", NOWPAY_IPN)
      .update(raw)
      .digest("hex");

    if(hash !== sig){
      return res.status(401).send("invalid_signature");
    }

    const payment = JSON.parse(raw);

    if(payment.payment_status !== "finished"){
      return res.send("ignored");
    }

    const r = await db.query(`
      SELECT * FROM payments WHERE external_id=$1
      FOR UPDATE
    `,[payment.payment_id]);

    if(!r.rows.length){
      return res.send("not_found");
    }

    const p = r.rows[0];

    /* ========= IDMP ========= */

    if(p.status === "completed"){
      return res.send("already_done");
    }

    /* ========= VALIDATION ========= */

    if(payment.pay_currency !== p.asset){
      return res.status(400).send("currency_mismatch");
    }

    if(Number(payment.price_amount) !== Number(p.amount)){
      return res.status(400).send("amount_mismatch");
    }

    if(Number(payment.pay_amount) <= 0){
      return res.status(400).send("invalid_amount");
    }

    /* ========= ATOMIC CREDIT ========= */

    await db.transaction(async (tx)=>{

      await ledger.credit({
        user_id: p.user_id,
        asset: p.asset,
        amount: Number(payment.pay_amount),
        reason: "deposit",
        tx
      });

      await tx.query(`
        UPDATE payments
        SET status='completed', confirmed_at=NOW()
        WHERE id=$1
      `,[p.id]);

    });

    res.send("ok");

  }catch(e){
    console.error("WEBHOOK ERROR", e);
    res.status(500).send("error");
  }

});

/* =====================================================
WITHDRAW (SAFE — QUEUE ONLY)
===================================================== */

router.post("/withdraw", async (req,res)=>{

  try{

    const userId = auth(req);

    rateLimit(userId + "_withdraw");

    let { amount, asset, address } = req.body;

    amount = validateAmount(amount);
    asset = String(asset).toUpperCase();

    if(!SUPPORTED.includes(asset)){
      return res.status(400).json({error:"unsupported_coin"});
    }

    if(!address){
      return res.status(400).json({error:"invalid_address"});
    }

    await db.transaction(async (tx)=>{

      const w = await tx.query(`
        SELECT balance FROM wallet_balances
        WHERE user_id=$1 AND asset=$2
        FOR UPDATE
      `,[userId,asset]);

      if(!w.rows.length || Number(w.rows[0].balance) < amount){
        throw new Error("insufficient_balance");
      }

      /* debit */
      await ledger.debit({
        user_id:userId,
        asset,
        amount,
        reason:"withdraw_request",
        tx
      });

      /* queue (NOT sending payout here) */
      await tx.query(`
        INSERT INTO withdrawals
        (user_id,asset,amount,address,status)
        VALUES($1,$2,$3,$4,'pending')
      `,[userId,asset,amount,address]);

    });

    res.json({status:"pending_review"});

  }catch(e){
    res.status(400).json({error:e.message});
  }

});

/* =====================================================
PAYMENT HISTORY
===================================================== */

router.get("/history", async (req,res)=>{

  try{

    const userId = auth(req);

    const r = await db.query(`
      SELECT id,provider,amount,asset,status,created_at
      FROM payments
      WHERE user_id=$1
      ORDER BY created_at DESC
      LIMIT 50
    `,[userId]);

    res.json(r.rows);

  }catch(e){
    res.status(500).json({error:"history_failed"});
  }

});

module.exports = router;
