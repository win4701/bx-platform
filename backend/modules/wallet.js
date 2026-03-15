"use strict"

const express = require("express")
const router = express.Router()

const db = require("../database")
const ledger = require("../core/ledger")

/* =============================
   SUPPORTED COINS
============================= */

const COINS = [
"BX",
"USDT",
"TON",
"BTC",
"ETH",
"BNB",
"SOL",
"TRX",
"USDC",
"LTC"
]

/* =============================
   WALLET BALANCE
============================= */

router.get("/wallet", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const r = await db.query(
`SELECT * FROM wallets WHERE user_id=$1`,
[userId]
)

if(!r.rows.length){
return res.json({})
}

const wallet = {}
const w = r.rows[0]

for(const c of COINS){

const col = c.toLowerCase()+"_balance"
wallet[c] = Number(w[col] || 0)

}

res.json(wallet)

}catch(e){

console.error("wallet error",e)

res.status(500).json({
error:"wallet_load_failed"
})

}

})

/* =============================
   TRANSFER BX
============================= */

router.post("/transfer", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let {to_user,amount} = req.body

amount = Number(amount)

if(!to_user || !amount || amount <= 0){

return res.status(400).json({
error:"invalid_request"
})

}

await ledger.transfer({

fromUser:userId,
toUser:to_user,
asset:"BX",
amount

})

res.json({
status:"ok"
})

}catch(e){

console.error("transfer error",e)

res.status(400).json({
error:e.message
})

}

})

/* =============================
   WALLET CONNECT
============================= */

router.post("/wallet/connect", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const {type,address} = req.body

if(!address){

return res.status(400).json({
error:"invalid_address"
})

}

await db.query(

`UPDATE users
SET wallet_type=$1,
wallet_address=$2
WHERE id=$3`,

[type,address,userId]

)

res.json({
status:"connected",
address
})

}catch(e){

console.error("wallet connect error",e)

res.status(500).json({
error:"wallet_connect_failed"
})

}

})

/* =============================
   DEPOSIT ADDRESS
============================= */

router.get("/deposit/:asset", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const {asset} = req.params

if(!COINS.includes(asset)){

return res.status(400).json({
error:"unsupported_asset"
})

}

/* demo address */

const address = `BX_${asset}_${userId}`

res.json({
asset,
address
})

}catch(e){

console.error("deposit error",e)

res.status(500).json({
error:"deposit_failed"
})

}

})

/* =============================
   BINANCE PAY
============================= */

router.post("/binance/pay", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let {amount} = req.body

amount = Number(amount)

if(!amount || amount <= 0){

return res.status(400).json({
error:"invalid_amount"
})

}

const order = await db.query(

`INSERT INTO binance_deposits
(user_id,amount,status)
VALUES($1,$2,'pending')
RETURNING id`,

[userId,amount]

)

res.json({
status:"created",
order_id:order.rows[0].id
})

}catch(e){

console.error("binance pay error",e)

res.status(500).json({
error:"binance_pay_failed"
})

}

})

/* =============================
   WITHDRAW
============================= */

router.post("/withdraw", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let {asset,amount,address} = req.body

amount = Number(amount)

if(!COINS.includes(asset)){

return res.status(400).json({
error:"unsupported_asset"
})

}

if(!amount || amount <= 0){

return res.status(400).json({
error:"invalid_amount"
})

}

await db.query(

`INSERT INTO withdraw_requests
(user_id,asset,amount,address)
VALUES($1,$2,$3,$4)`,

[userId,asset,amount,address]

)

res.json({
status:"submitted"
})

}catch(e){

console.error("withdraw error",e)

res.status(500).json({
error:"withdraw_failed"
})

}

})

/* =============================
   WALLET HISTORY
============================= */

router.get("/history", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const r = await db.query(

`SELECT asset,amount,type,created_at
FROM wallet_transactions
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 50`,

[userId]

)

res.json(r.rows)

}catch(e){

console.error("wallet history error",e)

res.status(500).json({
error:"history_failed"
})

}

})

module.exports = router
