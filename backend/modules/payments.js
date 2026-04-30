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
  if(!n || n<=0) throw new Error("invalid_amount");
  return n;
}

/* =====================================================
CREATE DEPOSIT (NowPayments)
===================================================== */

router.post("/create", async (req,res)=>{

try{

const userId = auth(req);

let { amount, asset="USDT" } = req.body;

amount = validateAmount(amount);
asset = String(asset).toUpperCase();

if(!SUPPORTED.includes(asset)){
return res.status(400).json({error:"unsupported_coin"});
}

/* unique order */
const orderId = `${userId}_${Date.now()}`;

/* create payment */

const r = await axios.post(
`${NOWPAY_API}/payment`,
{
price_amount: amount,
price_currency: "usd",
pay_currency: asset,
order_id: orderId
},
{
headers:{ "x-api-key": NOWPAY_KEY }
}
);

const p = r.data;

/* save */

await db.query(
`INSERT INTO payments
(user_id,type,provider,amount,asset,status,external_id,meta)
VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
[
userId,
"deposit",
"nowpayments",
amount,
asset,
"pending",
p.payment_id,
JSON.stringify({orderId})
],
{tag:"payment_create"}
);

res.json({
payment_id: p.payment_id,
address: p.pay_address,
amount: p.pay_amount,
currency: p.pay_currency
});

}catch(e){
res.status(e.status||500).json({error:e.message});
}

});

/* =====================================================
WEBHOOK (SECURE + IDEMPOTENT)
===================================================== */

router.post("/webhook", async (req,res)=>{

try{

const sig = req.headers["x-nowpayments-sig"];

const hash = crypto
.createHmac("sha512", NOWPAY_IPN)
.update(JSON.stringify(req.body))
.digest("hex");

if(hash !== sig){
return res.status(401).send("invalid_signature");
}

const payment = req.body;

/* only finished */
if(payment.payment_status !== "finished"){
return res.send("pending");
}

/* find */

const r = await db.query(
`SELECT * FROM payments WHERE external_id=$1`,
[payment.payment_id]
);

if(!r.rows.length){
return res.send("not_found");
}

const p = r.rows[0];

if(p.status === "completed"){
return res.send("already_done");
}

/* atomic credit */

await db.transaction(async (tx)=>{

await ledger.credit({
user_id: p.user_id,
asset: p.asset,
amount: Number(payment.pay_amount),
reason: "deposit",
tx
});

await tx.query(
`UPDATE payments SET status='completed' WHERE id=$1`,
[p.id]
);

});

res.send("ok");

}catch(e){
console.error("webhook error",e);
res.status(500).send("error");
}

});

/* =====================================================
WITHDRAW (NowPayments Payout)
===================================================== */

router.post("/withdraw", async (req,res)=>{

try{

const userId = auth(req);

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

/* 🔒 lock */
const w = await tx.query(
`SELECT balance FROM wallet_balances
 WHERE user_id=$1 AND asset=$2
 FOR UPDATE`,
[userId,asset]
);

if(!w.rows.length || Number(w.rows[0].balance) < amount){
throw new Error("insufficient_balance");
}

/* debit */
await ledger.debit({
user_id:userId,
asset,
amount,
reason:"withdraw",
tx
});

/* payout */

const payout = await axios.post(
`${NOWPAY_API}/payout`,
{
address,
currency: asset,
amount
},
{
headers:{ "x-api-key": NOWPAY_KEY }
}
);

/* save */

await tx.query(
`INSERT INTO withdrawals
(user_id,asset,amount,address,tx_hash,status)
VALUES($1,$2,$3,$4,$5,'sent')`,
[
userId,
asset,
amount,
address,
payout.data.id
]
);

});

res.json({status:"sent"});

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

const r = await db.query(
`SELECT id,provider,amount,asset,status,created_at
 FROM payments
 WHERE user_id=$1
 ORDER BY created_at DESC
 LIMIT 50`,
[userId],
{tag:"payment_history"}
);

res.json(r.rows);

}catch(e){
res.status(500).json({error:"history_failed"});
}

});

module.exports = router;
