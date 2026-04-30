"use strict";

const express = require("express");
const router = express.Router();

const db = require("../database");
const ledger = require("../core/ledger");

/* =====================================
SUPPORTED COINS
===================================== */

const COINS = [
"BX","USDT","TON","BTC","ETH","BNB","SOL","ZEC","TRX","USDC","LTC"
];

/* =====================================
HELPERS
===================================== */

function auth(req){
  if(!req.user?.id){
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }
  return req.user.id;
}

/* =====================================
GET BALANCES (WITH LOCKED)
===================================== */

router.get("/balance", async (req,res)=>{

try{

const userId = auth(req);

const r = await db.query(
`SELECT asset,balance,locked
 FROM wallet_balances
 WHERE user_id=$1`,
[userId],
{tag:"wallet_balance"}
);

const balances = {};

for(const row of r.rows){
balances[row.asset] = {
  available: Number(row.balance),
  locked: Number(row.locked || 0)
};
}

res.json({balances});

}catch(e){
res.status(e.status||500).json({error:e.message});
}

});

/* =====================================
TRANSFER (SAFE TX)
===================================== */

router.post("/transfer", async (req,res)=>{

try{

const userId = auth(req);

let {to_user,amount,asset="BX"} = req.body;

amount = Number(amount);
asset = String(asset).toUpperCase();

if(!to_user || amount<=0 || !COINS.includes(asset)){
return res.status(400).json({error:"invalid_request"});
}

await db.transaction(async (tx)=>{

await ledger.transfer({
fromUser:userId,
toUser:to_user,
asset,
amount,
tx
});

});

res.json({status:"ok"});

}catch(e){
res.status(400).json({error:e.message});
}

});

/* =====================================
DEPOSIT ADDRESS (NOWPAY READY)
===================================== */

router.get("/deposit/:asset", async (req,res)=>{

try{

const userId = auth(req);
const {asset} = req.params;

if(!COINS.includes(asset)){
return res.status(400).json({error:"unsupported_asset"});
}

/* use wallets table */

let r = await db.query(
`SELECT deposit_address
 FROM wallets
 WHERE user_id=$1 AND asset=$2`,
[userId,asset],
{tag:"deposit_get"}
);

if(!r.rows.length){

/* 🔥 placeholder — real address via NowPayments */
const address = `${asset}_${userId}_${Date.now()}`;

await db.query(
`INSERT INTO wallets (user_id,asset,deposit_address)
 VALUES($1,$2,$3)`,
[userId,asset,address]
);

return res.json({asset,address});
}

res.json({asset,address:r.rows[0].deposit_address});

}catch(e){
res.status(500).json({error:"deposit_failed"});
}

});

/* =====================================
WITHDRAW (NOWPAY READY + SAFE)
===================================== */

router.post("/withdraw", async (req,res)=>{

try{

const userId = auth(req);

let {asset,amount,address} = req.body;

amount = Number(amount);
asset = String(asset).toUpperCase();

if(!COINS.includes(asset)){
return res.status(400).json({error:"unsupported_asset"});
}

if(!amount || amount<=0 || !address){
return res.status(400).json({error:"invalid_request"});
}

await db.transaction(async (tx)=>{

/* 🔒 lock wallet */
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

/* save request */
await tx.query(
`INSERT INTO withdraw_requests
(user_id,asset,amount,address,status)
VALUES($1,$2,$3,$4,'pending')`,
[userId,asset,amount,address]
);

});

res.json({status:"submitted"});

}catch(e){
res.status(400).json({error:e.message});
}

});

/* =====================================
LOCK / UNLOCK (MARKET)
===================================== */

router.post("/lock", async (req,res)=>{

try{

const userId = auth(req);
const {asset,amount} = req.body;

await db.query(
`UPDATE wallet_balances
 SET balance = balance - $1,
     locked = locked + $1
 WHERE user_id=$2 AND asset=$3`,
[amount,userId,asset]
);

res.json({status:"locked"});

}catch(e){
res.status(400).json({error:e.message});
}

});

router.post("/unlock", async (req,res)=>{

try{

const userId = auth(req);
const {asset,amount} = req.body;

await db.query(
`UPDATE wallet_balances
 SET balance = balance + $1,
     locked = locked - $1
 WHERE user_id=$2 AND asset=$3`,
[amount,userId,asset]
);

res.json({status:"unlocked"});

}catch(e){
res.status(400).json({error:e.message});
}

});

/* =====================================
CONVERT (MINING + AIRDROP)
===================================== */

router.post("/convert", async (req,res)=>{

try{

const userId = auth(req);

await db.transaction(async (tx)=>{

await tx.query(
`UPDATE wallet
 SET balance = balance + mining + bonus,
     mining = 0,
     bonus = 0
 WHERE user_id=$1`,
[userId]
);

});

res.json({status:"converted"});

}catch(e){
res.status(400).json({error:e.message});
}

});

/* =====================================
HISTORY
===================================== */

router.get("/history", async (req,res)=>{

try{

const userId = auth(req);

const r = await db.query(
`SELECT asset,amount,type,reason,created_at
 FROM wallet_transactions
 WHERE user_id=$1
 ORDER BY created_at DESC
 LIMIT 100`,
[userId],
{tag:"wallet_history"}
);

res.json(r.rows);

}catch(e){
res.status(500).json({error:"history_failed"});
}

});

module.exports = router;
