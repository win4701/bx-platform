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

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let { amount, asset="USDT" } = req.body

amount = Number(amount)

if(!amount || amount <= 0){
return res.status(400).json({error:"invalid_amount"})
}

const orderId = "BNP_" + Date.now()

const payUrl = `${BINANCE_PUBLIC}/order/${orderId}`

await db.query(

`INSERT INTO payments
(user_id,type,provider,amount,asset,status,external_id)
VALUES($1,$2,$3,$4,$5,$6,$7)`,

[
userId,
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
error:"binance_payment_failed"
})

}

})

/* =========================================
   EXECUTE TOPUP
   POST /topup/execute
========================================= */

router.post("/topup/execute", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

let {
usdt,
bx,
rate,
fiat,
country,
provider,
phone
} = req.body

usdt = Number(usdt)
bx = Number(bx)

if(!bx || !usdt){
return res.status(400).json({
error:"invalid_topup"
})
}

/* CREDIT BX */

await ledger.credit({
user_id:userId,
asset:"BX",
amount:bx,
reason:"topup"
})

/* SAVE TOPUP */

await db.query(

`INSERT INTO topups
(user_id,usdt,bx,rate,fiat,country,provider,phone)
VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,

[
userId,
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
error:"topup_failed"
})

}

})

/* =========================================
   WALLETCONNECT SYNC
========================================= */

router.post("/wallet/connect", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

const { type,address } = req.body

if(!address){
return res.status(400).json({
error:"invalid_wallet"
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
userId
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
error:"wallet_connect_failed"
})

}

})

/* =========================================
   PAYMENT STATUS
========================================= */

router.get("/status/:id", async (req,res)=>{

try{

const id = req.params.id

const r = await db.query(

`SELECT *
FROM payments
WHERE external_id=$1`,

[id]

)

if(!r.rows.length){

return res.status(404).json({
error:"payment_not_found"
})

}

res.json(r.rows[0])

}catch(e){

console.error("payment status error",e)

res.status(500).json({
error:"payment_status_failed"
})

}

})

/* =========================================
   PAYMENT HISTORY
========================================= */

router.get("/history", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

const r = await db.query(

`SELECT id,type,provider,amount,asset,status,created_at
FROM payments
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 50`,

[userId]

)

res.json(r.rows)

}catch(e){

console.error("payment history error",e)

res.status(500).json({
error:"payment_history_failed"
})

}

})

module.exports = router
