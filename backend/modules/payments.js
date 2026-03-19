"use strict"

const express = require("express")
const router = express.Router()

const axios = require("axios")
const crypto = require("crypto")

const db = require("../database")
const ledger = require("../core/ledger")

const NOWPAY_API = "https://api.nowpayments.io/v1"

const BINANCE_API = "https://bpay.binanceapi.com"

const NOWPAY_KEY = process.env.NOWPAY_API_KEY
const NOWPAY_IPN = process.env.NOWPAY_IPN_SECRET

/* =====================================================
SUPPORTED COINS
===================================================== */

const SUPPORTED_COINS = [
"USDT",
"USDC",
"BTC",
"ETH",
"BNB",
"AVAX",
"SOL",
"LTC",
"TON",
"ZEC"
]

/* =====================================================
CREATE CRYPTO PAYMENT
POST /payments/create
===================================================== */

router.post("/create", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let { amount, asset } = req.body

amount = Number(amount)
asset = String(asset || "USDT").toUpperCase()

if(!SUPPORTED_COINS.includes(asset)){
return res.status(400).json({error:"unsupported_coin"})
}

if(!amount || amount <= 0){
return res.status(400).json({error:"invalid_amount"})
}

/* create payment */

const payment = await axios.post(

`${NOWPAY_API}/payment`,

{
price_amount: amount,
price_currency: "usd",
pay_currency: asset,
order_id: "BX_" + Date.now()
},

{
headers:{
"x-api-key": NOWPAY_KEY
}
}

)

const p = payment.data

/* save payment */

await db.query(

`INSERT INTO payments
(user_id,type,provider,amount,asset,status,external_id)
VALUES($1,$2,$3,$4,$5,$6,$7)`,

[
userId,
"deposit",
"nowpayments",
amount,
asset,
"pending",
p.payment_id
]

)

res.json({

payment_id: p.payment_id,
pay_address: p.pay_address,
amount: p.pay_amount,
currency: p.pay_currency

})

}catch(e){

console.error("create payment error",e)

res.status(500).json({error:"payment_create_failed"})

}

})

/* =====================================================
NOWPAYMENTS WEBHOOK
POST /payments/webhook
===================================================== */

router.post("/webhook", async (req,res)=>{

try{

const signature = req.headers["x-nowpayments-sig"]

const hash = crypto
.createHmac("sha512", NOWPAY_IPN)
.update(JSON.stringify(req.body))
.digest("hex")

if(hash !== signature){
return res.status(401).send("invalid_signature")
}

const payment = req.body

if(payment.payment_status !== "finished"){
return res.send("pending")
}

/* find payment */

const r = await db.query(

`SELECT * FROM payments
WHERE external_id=$1`,

[payment.payment_id]

)

if(!r.rows.length){
return res.send("payment_not_found")
}

const p = r.rows[0]

if(p.status === "completed"){
return res.send("already_processed")
}

/* credit wallet */

await ledger.credit({

user_id: p.user_id,
asset: p.asset,
amount: payment.price_amount,
reason: "deposit"

})

/* update payment */

await db.query(

`UPDATE payments
SET status='completed'
WHERE id=$1`,

[p.id]

)

res.send("ok")

}catch(e){

console.error("webhook error",e)

res.status(500).send("webhook_failed")

}

})

/* =====================================================
BINANCE PAY (SIMPLIFIED)
POST /payments/binance/create
===================================================== */

router.post("/binance/create", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let { amount } = req.body

amount = Number(amount)

if(!amount){
return res.status(400).json({error:"invalid_amount"})
}

const orderId = "BNP_" + Date.now()

await db.query(

`INSERT INTO payments
(user_id,type,provider,amount,asset,status,external_id)
VALUES($1,$2,$3,$4,$5,$6,$7)`,

[
userId,
"deposit",
"binance",
amount,
"USDT",
"pending",
orderId
]

)

res.json({

order_id:orderId,
pay_url:`https://pay.binance.com/order/${orderId}`

})

}catch(e){

console.error("binance pay error",e)

res.status(500).json({error:"binance_failed"})

}

})

/* =====================================================
WALLET CONNECT
POST /payments/wallet/connect
===================================================== */

router.post("/wallet/connect", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const { type,address } = req.body

if(!address){
return res.status(400).json({error:"invalid_wallet"})
}

await db.query(

`UPDATE users
SET wallet_type=$1,
wallet_address=$2
WHERE id=$3`,

[
type,
address,
userId
]

)

res.json({
status:"connected",
address
})

}catch(e){

console.error("wallet connect error",e)

res.status(500).json({error:"wallet_connect_failed"})

}

})

/* =====================================================
PAYMENT HISTORY
===================================================== */

router.get("/history", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const r = await db.query(

`SELECT id,provider,amount,asset,status,created_at
FROM payments
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 50`,

[userId]

)

res.json(r.rows)

}catch(e){

console.error("payment history error",e)

res.status(500).json({error:"history_failed"})

}

})

module.exports = router
