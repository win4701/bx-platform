"use strict";

const axios = require("axios");

/* =========================================================
   CONFIG
========================================================= */

const BASE_URL = "https://api.nowpayments.io/v1";

const API_KEY = process.env.NOWPAY_API_KEY;

if(!API_KEY){
  throw new Error("NOWPAY_API_KEY missing");
}

/* =========================================================
   SUPPORTED COINS
========================================================= */

const SUPPORTED = [
  "USDT","USDC","BTC","ETH","BNB","AVAX","SOL","LTC","TON","ZEC"
];

/* =========================================================
   CLIENT
========================================================= */

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers:{
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
  }
});

/* =========================================================
   RETRY ENGINE
========================================================= */

async function retry(fn, attempts = 3){

  let lastError;

  for(let i=0;i<attempts;i++){
    try{
      return await fn();
    }catch(e){
      lastError = e;
      await new Promise(r=>setTimeout(r, 500 * (i+1)));
    }
  }

  throw lastError;

}

/* =========================================================
   VALIDATORS
========================================================= */

function validateAmount(amount){

  const n = Number(amount);

  if(!n || n <= 0){
    throw new Error("invalid_amount");
  }

  return n;

}

function validateCurrency(c){

  const coin = String(c).toUpperCase();

  if(!SUPPORTED.includes(coin)){
    throw new Error("unsupported_coin");
  }

  return coin;

}

/* =========================================================
   SERVICE CLASS
========================================================= */

class NowPayments{

  /* =========================================================
     CREATE PAYMENT
  ========================================================= */

  async createPayment({ amount, currency, userId }){

    amount = validateAmount(amount);
    currency = validateCurrency(currency);

    const orderId = `BX-${userId}-${Date.now()}`;

    const res = await retry(()=>client.post("/payment",{
      price_amount: amount,
      price_currency: "usd",
      pay_currency: currency,
      order_id: orderId,
      ipn_callback_url: process.env.NOWPAY_WEBHOOK
    }));

    return this.normalizePayment(res.data);

  }

  /* =========================================================
     GET PAYMENT STATUS
  ========================================================= */

  async getPayment(paymentId){

    if(!paymentId){
      throw new Error("missing_payment_id");
    }

    const res = await retry(()=>client.get(`/payment/${paymentId}`));

    return res.data;

  }

  /* =========================================================
     CREATE PAYOUT (ADMIN ONLY)
  ========================================================= */

  async createPayout({ address, amount, currency }){

    amount = validateAmount(amount);
    currency = validateCurrency(currency);

    if(!address){
      throw new Error("invalid_address");
    }

    const res = await retry(()=>client.post("/payout",{
      address,
      currency,
      amount
    }));

    return {
      payout_id: res.data.id,
      status: res.data.status
    };

  }

  /* =========================================================
     ESTIMATE (optional)
  ========================================================= */

  async estimate({ amount, from="usd", to="btc" }){

    const res = await retry(()=>client.get("/estimate",{
      params:{
        amount,
        currency_from: from,
        currency_to: to
      }
    }));

    return res.data;

  }

  /* =========================================================
     NORMALIZER
  ========================================================= */

  normalizePayment(p){

    return {
      payment_id: p.payment_id,
      pay_address: p.pay_address,
      pay_amount: Number(p.pay_amount),
      pay_currency: p.pay_currency,
      price_amount: Number(p.price_amount),
      status: p.payment_status,
      invoice_url: p.invoice_url || null
    };

  }

}

/* =========================================================
   EXPORT SINGLETON
========================================================= */

module.exports = new NowPayments();
