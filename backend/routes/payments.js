"use strict";

/* =========================================================
   BLOXIO PAYMENTS ROUTES — ULTRA FINAL SECURE
========================================================= */

const express = require("express");
const router = express.Router();

const crypto = require("crypto");

const db = require("./database");
const ledger = require("./core/ledger");

const now = require("./services/nowPayments");

/* ===== CONFIG ===== */

const IPN_SECRET = process.env.NOWPAY_IPN_SECRET;

/* =========================================================
   SUPPORTED COINS
========================================================= */

const SUPPORTED = [
  "USDT","USDC","BTC","ETH","BNB","AVAX","SOL","LTC","TON","ZEC"
];

/* =========================================================
   HELPERS
========================================================= */

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
  if(!n || n <= 0){
    throw new Error("invalid_amount");
  }
  return n;
}

/* =========================================================
   CREATE DEPOSIT (CLEAN + SERVICE BASED)
========================================================= */

router.post("/create", async (req,res)=>{

  try{

    const userId = auth(req);

    let { amount, asset="USDT" } = req.body;

    amount = validateAmount(amount);
    asset = String(asset).toUpperCase();

    if(!SUPPORTED.includes(asset)){
      return res.status(400).json({error:"unsupported_coin"});
    }

    /* ===== SERVICE CALL ===== */
    const payment = await now.createPayment({
      amount,
      currency: asset,
      userId
    });

    /* ===== STORE ===== */
    await db.query(`
      INSERT INTO payments
      (user_id,type,provider,amount,asset,status,external_id,meta)
      VALUES($1,'deposit','nowpayments',$2,$3,'pending',$4,$5)
      ON CONFLICT (external_id) DO NOTHING
    `,[
      userId,
      amount,
      asset,
      payment.payment_id,
      JSON.stringify({
        address: payment.pay_address
      })
    ]);

    res.json({
      payment_id: payment.payment_id,
      address: payment.pay_address,
      amount: payment.pay_amount,
      currency: payment.pay_currency
    });

  }catch(e){

    res.status(e.status || 400).json({
      error: e.message
    });

  }

});

/* =========================================================
   WEBHOOK (ULTRA SECURE)
========================================================= */

router.post("/webhook",
  express.raw({ type:"application/json" }),
  async (req,res)=>{

  try{

    const signature = req.headers["x-nowpayments-sig"];
    const rawBody   = req.body.toString();

    /* ===== VERIFY ===== */
    const hash = crypto
      .createHmac("sha512", IPN_SECRET)
      .update(rawBody)
      .digest("hex");

    if(hash !== signature){
      return res.status(401).send("invalid_signature");
    }

    const payment = JSON.parse(rawBody);

    if(payment.payment_status !== "finished"){
      return res.send("ignored");
    }

    /* =====================================================
       ATOMIC FLOW
    ===================================================== */

    await db.transaction(async (tx)=>{

      /* 🔒 LOCK */
      const r = await tx.query(`
        SELECT * FROM payments
        WHERE external_id=$1
        FOR UPDATE
      `,[payment.payment_id]);

      if(!r.rows.length){
        throw new Error("payment_not_found");
      }

      const p = r.rows[0];

      /* ===== IDEMPOTENT ===== */
      if(p.status === "completed"){
        return;
      }

      /* ===== VALIDATION ===== */

      if(payment.pay_currency !== p.asset){
        throw new Error("currency_mismatch");
      }

      if(Number(payment.price_amount) !== Number(p.amount)){
        throw new Error("amount_mismatch");
      }

      if(Number(payment.pay_amount) <= 0){
        throw new Error("invalid_amount");
      }

      /* ===== CREDIT ===== */

      await ledger.credit({
        user_id: p.user_id,
        asset: p.asset,
        amount: Number(payment.pay_amount),
        reason: "deposit",
        tx
      });

      /* ===== UPDATE ===== */

      await tx.query(`
        UPDATE payments
        SET status='completed',
            confirmed_at=NOW(),
            meta = meta || $2
        WHERE id=$1
      `,[
        p.id,
        JSON.stringify({
          tx_hash: payment.tx_hash || null
        })
      ]);

      /* ===== AUDIT ===== */

      await tx.query(`
        INSERT INTO audit_logs(user_id,action,meta)
        VALUES($1,$2,$3)
      `,[
        p.user_id,
        "deposit_confirmed",
        JSON.stringify({
          amount: payment.pay_amount,
          asset: p.asset
        })
      ]);

    });

    res.send("ok");

  }catch(e){

    console.error("WEBHOOK ERROR:", e);

    await db.query(`
      INSERT INTO fraud_logs(user_id,reason)
      VALUES($1,$2)
    `,[null, e.message]);

    res.status(500).send("error");

  }

});

/* =========================================================
   WITHDRAW (LOCKED + SAFE)
========================================================= */

router.post("/withdraw", async (req,res)=>{

  try{

    const userId = auth(req);

    let { amount, asset, address } = req.body;

    amount = validateAmount(amount);
    asset = String(asset).toUpperCase();

    if(!SUPPORTED.includes(asset)){
      throw new Error("unsupported_coin");
    }

    if(!address){
      throw new Error("invalid_address");
    }

    await db.transaction(async (tx)=>{

      const b = await tx.query(`
        SELECT balance, locked
        FROM wallet_balances
        WHERE user_id=$1 AND asset=$2
        FOR UPDATE
      `,[userId,asset]);

      const balance = Number(b.rows[0]?.balance || 0);

      if(balance < amount){
        throw new Error("insufficient_balance");
      }

      /* 🔒 LOCK FUNDS */
      await tx.query(`
        UPDATE wallet_balances
        SET balance = balance - $1,
            locked  = COALESCE(locked,0) + $1
        WHERE user_id=$2 AND asset=$3
      `,[amount,userId,asset]);

      /* 🧾 QUEUE */
      await tx.query(`
        INSERT INTO withdrawals
        (user_id,asset,amount,address,status)
        VALUES($1,$2,$3,$4,'pending')
      `,[userId,asset,amount,address]);

    });

    res.json({ status:"pending_review" });

  }catch(e){

    res.status(400).json({
      error: e.message
    });

  }

});

/* =========================================================
   HISTORY
========================================================= */

router.get("/history", async (req,res)=>{

  try{

    const userId = auth(req);

    const r = await db.query(`
      SELECT id,type,amount,asset,status,created_at
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
