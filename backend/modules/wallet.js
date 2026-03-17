"use strict"

const express = require("express")
const router = express.Router()

const db = require("../database")
const ledger = require("../core/ledger")

/* =====================================
SUPPORTED COINS
===================================== */

const COINS = [
"BX",
"USDT",
"TON",
"BTC",
"ETH",
"BNB",
"SOL",
"ZEC",
"TRX",
"USDC",
"LTC"
]

/* =====================================
GET BALANCES
===================================== */

router.get("/balance", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const r = await db.query(

`SELECT asset,balance
FROM wallet_balances
WHERE user_id=$1`,

[userId]

)

const balances = {}

for(const row of r.rows){
balances[row.asset] = Number(row.balance)
}

res.json(balances)

}catch(e){

console.error("wallet balance error",e)

res.status(500).json({
error:"wallet_load_failed"
})

}

})

/* =====================================
TRANSFER BX
===================================== */

router.post("/transfer", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let {to_user,amount} = req.body

amount = Number(amount)

if(!to_user || amount <= 0){

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

/* =====================================
DEPOSIT ADDRESS
===================================== */

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

let r = await db.query(

`SELECT deposit_address
FROM wallets
WHERE user_id=$1 AND asset=$2`,

[userId,asset]

)

if(!r.rows.length){

const address = "ADDR_"+asset+"_"+userId

await db.query(

`INSERT INTO wallets
(user_id,asset,deposit_address)
VALUES($1,$2,$3)`,

[userId,asset,address]

)

return res.json({
asset,
address
})

}

res.json({
asset,
address:r.rows[0].deposit_address
})

}catch(e){

console.error("deposit address error",e)

res.status(500).json({
error:"deposit_failed"
})

}

})

/* =====================================
WITHDRAW
===================================== */

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

/* debit wallet */

await ledger.debit({

user_id:userId,
asset,
amount,
reason:"withdraw_request"

})

/* save withdraw request */

await db.query(

`INSERT INTO withdraw_requests
(user_id,asset,amount,address,status)
VALUES($1,$2,$3,$4,'pending')`,

[userId,asset,amount,address]

)

res.json({
status:"submitted"
})

}catch(e){

console.error("withdraw error",e)

res.status(500).json({
error:e.message
})

}

})

/* =====================================
TRANSACTION HISTORY
===================================== */

router.get("/history", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const r = await db.query(

`SELECT asset,amount,type,reason,created_at
FROM wallet_transactions
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 100`,

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
