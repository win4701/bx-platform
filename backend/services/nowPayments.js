"use strict";

/* =========================================================
   BXS NOWPAYMENTS ENGINE — ENTERPRISE
========================================================= */

const axios = require("axios");
const crypto = require("crypto");

const db = require("./database");
const redis = require("./core/redis");
const ledger = require("./core/ledger");

const BASE_URL =
  "https://api.nowpayments.io/v1";

const API_KEY =
  process.env.NOWPAY_API_KEY;

const IPN_SECRET =
  process.env.NOWPAY_IPN_SECRET;

/* =========================================================
   SUPPORTED COINS
========================================================= */

const SUPPORTED = [
  "USDT",
  "USDC",
  "BTC",
  "ETH",
  "BNB",
  "TON",
  "SOL",
  "LTC"
];

/* =========================================================
   AXIOS CLIENT
========================================================= */

const client = axios.create({

  baseURL: BASE_URL,

  timeout: 15000,

  headers:{
    "x-api-key": API_KEY,
    "Content-Type":"application/json"
  }

});

/* =========================================================
   RETRY ENGINE
========================================================= */

async function retry(fn, attempts=3){

  let last;

  for(let i=0;i<attempts;i++){

    try{

      return await fn();

    }catch(e){

      last = e;

      await sleep(500 * (i+1));

    }

  }

  throw last;

}

function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

/* =========================================================
   VALIDATION
========================================================= */

function validateAmount(a){

  const n = Number(a);

  if(!n || n <= 0){
    throw new Error("invalid_amount");
  }

  return n;

}

function validateCurrency(c){

  const coin =
    String(c).toUpperCase();

  if(!SUPPORTED.includes(coin)){
    throw new Error("unsupported_coin");
  }

  return coin;

}

/* =========================================================
   MAIN CLASS
========================================================= */

class NowPaymentsEngine {

  /* =======================================================
     CREATE PAYMENT
  ======================================================= */

  async createPayment({

    userId,
    amount,
    currency

  }){

    amount =
      validateAmount(amount);

    currency =
      validateCurrency(currency);

    const orderId =
      `BX-${userId}-${Date.now()}`;

    /* =========================================
       IDEMPOTENCY
    ========================================= */

    const lock =
      await redis.lock(
        `pay:${orderId}`,
        10
      );

    if(!lock){
      throw new Error("duplicate_payment");
    }

    try{

      const res = await retry(()=>

        client.post("/payment",{

          price_amount: amount,

          price_currency: "usd",

          pay_currency: currency,

          order_id: orderId,

          ipn_callback_url:
            process.env.NOWPAY_WEBHOOK

        })

      );

      const payment =
        this.normalize(res.data);

      /* =====================================
         SAVE DB
      ===================================== */

      await db.query(`
        INSERT INTO deposits
        (
          user_id,
          payment_id,
          amount,
          currency,
          address,
          status,
          created_at
        )
        VALUES($1,$2,$3,$4,$5,$6,NOW())
      `,[
        userId,
        payment.payment_id,
        amount,
        currency,
        payment.pay_address,
        payment.status
      ]);

      return payment;

    }finally{

      await redis.unlock(
        `pay:${orderId}`
      );

    }

  }

  /* =======================================================
     GET PAYMENT
  ======================================================= */

  async getPayment(paymentId){

    if(!paymentId){
      throw new Error("missing_payment_id");
    }

    const r = await retry(()=>
      client.get(`/payment/${paymentId}`)
    );

    return this.normalize(r.data);

  }

  /* =======================================================
     WEBHOOK VERIFY
  ======================================================= */

  verifySignature(body, signature){

    const hmac = crypto
      .createHmac("sha512",IPN_SECRET)
      .update(JSON.stringify(body))
      .digest("hex");

    return hmac === signature;

  }

  /* =======================================================
     PROCESS WEBHOOK
  ======================================================= */

  async processWebhook(req){

    const signature =
      req.headers["x-nowpayments-sig"];

    if(
      !this.verifySignature(
        req.body,
        signature
      )
    ){
      throw new Error("invalid_signature");
    }

    const data = req.body;

    /* =====================================
       IDEMPOTENCY
    ===================================== */

    const exists =
      await redis.getCache(
        `np:${data.payment_id}`
      );

    if(exists){
      return;
    }

    await redis.setCache(
      `np:${data.payment_id}`,
      true,
      86400
    );

    /* =====================================
       PAYMENT COMPLETE
    ===================================== */

    if(
      data.payment_status ===
      "finished"
    ){

      const dep = await db.query(`
        SELECT *
        FROM deposits
        WHERE payment_id=$1
      `,[data.payment_id]);

      const deposit =
        dep.rows[0];

      if(!deposit){
        throw new Error("deposit_not_found");
      }

      /* =================================
         UPDATE STATUS
      ================================= */

      await db.query(`
        UPDATE deposits
        SET status='completed'
        WHERE payment_id=$1
      `,[data.payment_id]);

      /* =================================
         CREDIT USER
      ================================= */

      await ledger.credit({

        userId: deposit.user_id,

        asset: "BX",

        amount: deposit.amount,

        type: "deposit"

      });

      /* =================================
         REALTIME
      ================================= */

      this.realtime(
        deposit.user_id,
        {
          type:"deposit_completed",
          amount:deposit.amount
        }
      );

    }

  }

  /* =======================================================
     PAYOUT
  ======================================================= */

  async createPayout({

    address,
    amount,
    currency

  }){

    amount =
      validateAmount(amount);

    currency =
      validateCurrency(currency);

    if(!address){
      throw new Error("invalid_address");
    }

    const res = await retry(()=>

      client.post("/payout",{

        address,
        currency,
        amount

      })

    );

    return {
      payout_id: res.data.id,
      status: res.data.status
    };

  }

  /* =======================================================
     ESTIMATE
  ======================================================= */

  async estimate({

    amount,
    from="usd",
    to="btc"

  }){

    const res = await retry(()=>

      client.get("/estimate",{
        params:{
          amount,
          currency_from:from,
          currency_to:to
        }
      })

    );

    return res.data;

  }

  /* =======================================================
     NORMALIZER
  ======================================================= */

  normalize(p){

    return {

      payment_id:
        p.payment_id,

      pay_address:
        p.pay_address,

      pay_amount:
        Number(p.pay_amount),

      pay_currency:
        p.pay_currency,

      price_amount:
        Number(p.price_amount),

      status:
        p.payment_status,

      invoice_url:
        p.invoice_url || null

    };

  }

  /* =======================================================
     REALTIME
  ======================================================= */

  realtime(userId,payload){

    try{

      const ws =
        global.WS_HUB;

      if(!ws) return;

      ws.sendToUser(
        userId,
        payload
      );

    }catch(e){}

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  new NowPaymentsEngine();
