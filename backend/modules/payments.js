"use strict"

const express = require("express")
const router = express.Router()

const db = require("../database")
const ledger = require("../core/ledger")

/* =========================================
   BINANCE PAY CONFIG
========================================= */

const BINANCE_PUBLIC = "https://pay.binance.com"

/* =========================================
   CREATE BINANCE PAYMENT
   POST /payments/binance/create
========================================= */

router.post("/binance/create", async (req,res)=>{

try{

const { amount, asset="USDT" } = req.body

if(!amount || amount <= 0){
return res.status(400).json({error:"invalid amount"})
}

const orderId = "BNP_" + Date.now()

const payUrl = `${BINANCE_PUBLIC}/order/${orderId}`

await db.query(

`INSERT INTO payments
(user_id,type,provider,amount,asset,status,external_id)
VALUES($1,$2,$3,$4,$5,$6,$7)`,

[
req.user.id,
"deposit",
"binance",
amount,
asset,
"pending",
orderId
]

)

res.json({
order_id:orderId,
pay_url:payUrl,
amount,
asset
})

}catch(e){

console.error("binance pay error",e)

res.status(500).json({
error:"binance payment failed"
})

}

})

/* =========================================
   EXECUTE TOPUP
   POST /topup/execute
========================================= */

router.post("/topup/execute", async (req,res)=>{

try{

const {
usdt,
bx,
rate,
fiat,
country,
provider,
phone
} = req.body

if(!bx || !usdt){

return res.status(400).json({
error:"invalid topup"
})

}

/* CREDIT BX */

await ledger.credit({

user_id:req.user.id,
asset:"BX",
amount:bx,
reason:"topup"

})

await db.query(

`INSERT INTO topups
(user_id,usdt,bx,rate,fiat,country,provider,phone)
VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,

[
req.user.id,
usdt,
bx,
rate,
fiat,
country,
provider,
phone
]

)

res.json({
status:"ok",
bx
})

}catch(e){

console.error("topup failed",e)

res.status(500).json({
error:"topup failed"
})

}

})

/* =========================================
   WALLETCONNECT SYNC
========================================= */

router.post("/wallet/connect", async (req,res)=>{

try{

const { type,address } = req.body

if(!address){

return res.status(400).json({
error:"invalid wallet"
})

}

await db.query(

`UPDATE users
SET wallet_type=$1,
wallet_address=$2
WHERE id=$3`,

[
type,
address,
req.user.id
]

)

res.json({
status:"connected",
type,
address
})

}catch(e){

console.error("wallet connect error",e)

res.status(500).json({
error:"wallet connect failed"
})

}

})

/* =========================================
   PAYMENT STATUS
========================================= */

router.get("/status/:id", async (req,res)=>{

const id = req.params.id

const r = await db.query(

`SELECT *
FROM payments
WHERE external_id=$1`,

[id]

)

if(!r.rows.length){

return res.status(404).json({
error:"payment not found"
})

}

res.json(r.rows[0])

})

/* =========================================
   PAYMENT HISTORY
========================================= */

router.get("/history", async (req,res)=>{

const r = await db.query(

`SELECT id,type,provider,amount,asset,status,created_at
FROM payments
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 50`,

[req.user.id]

)

res.json(r.rows)

})

module.exports = router
