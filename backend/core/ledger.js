"use strict"

const db = require("../database")

/* ========================================
CREATE BALANCE IF NOT EXISTS
======================================== */

async function ensureBalance(userId, asset){

await db.query(

`INSERT INTO wallet_balances (user_id,asset,balance)
VALUES ($1,$2,0)
ON CONFLICT (user_id,asset) DO NOTHING`,

[userId,asset]

)

}

/* ========================================
GET BALANCE
======================================== */

async function getBalance(userId,asset){

await ensureBalance(userId,asset)

const r = await db.query(

`SELECT balance
FROM wallet_balances
WHERE user_id=$1 AND asset=$2`,

[userId,asset]

)

return Number(r.rows[0].balance)

}

/* ========================================
CREDIT
======================================== */

async function credit({user_id,asset,amount,reason}){

if(!amount || amount <= 0){
throw new Error("invalid_amount")
}

await ensureBalance(user_id,asset)

await db.query("BEGIN")

try{

await db.query(

`UPDATE wallet_balances
SET balance = balance + $1
WHERE user_id=$2 AND asset=$3`,

[amount,user_id,asset]

)

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reason)
VALUES($1,$2,$3,'credit',$4)`,

[user_id,asset,amount,reason]

)

await db.query("COMMIT")

}catch(e){

await db.query("ROLLBACK")
throw e

}

}

/* ========================================
DEBIT
======================================== */

async function debit({user_id,asset,amount,reason}){

if(!amount || amount <= 0){
throw new Error("invalid_amount")
}

await ensureBalance(user_id,asset)

await db.query("BEGIN")

try{

const r = await db.query(

`SELECT balance
FROM wallet_balances
WHERE user_id=$1 AND asset=$2
FOR UPDATE`,

[user_id,asset]

)

const balance = Number(r.rows[0].balance)

if(balance < amount){
throw new Error("insufficient_balance")
}

await db.query(

`UPDATE wallet_balances
SET balance = balance - $1
WHERE user_id=$2 AND asset=$3`,

[amount,user_id,asset]

)

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reason)
VALUES($1,$2,$3,'debit',$4)`,

[user_id,asset,amount,reason]

)

await db.query("COMMIT")

}catch(e){

await db.query("ROLLBACK")
throw e

}

}

/* ========================================
TRANSFER
======================================== */

async function transfer({fromUser,toUser,asset,amount}){

if(amount <= 0){
throw new Error("invalid_amount")
}

await ensureBalance(fromUser,asset)
await ensureBalance(toUser,asset)

await db.query("BEGIN")

try{

const r = await db.query(

`SELECT balance
FROM wallet_balances
WHERE user_id=$1 AND asset=$2
FOR UPDATE`,

[fromUser,asset]

)

const balance = Number(r.rows[0].balance)

if(balance < amount){
throw new Error("insufficient_balance")
}

/* debit sender */

await db.query(

`UPDATE wallet_balances
SET balance = balance - $1
WHERE user_id=$2 AND asset=$3`,

[amount,fromUser,asset]

)

/* credit receiver */

await db.query(

`UPDATE wallet_balances
SET balance = balance + $1
WHERE user_id=$2 AND asset=$3`,

[amount,toUser,asset]

)

/* logs */

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reason)
VALUES($1,$2,$3,'transfer_out','transfer')`,

[fromUser,asset,amount]

)

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reason)
VALUES($1,$2,$3,'transfer_in','transfer')`,

[toUser,asset,amount]

)

await db.query("COMMIT")

}catch(e){

await db.query("ROLLBACK")
throw e

}

}

/* ========================================
CASINO
======================================== */

async function placeBet(userId,amount){

await debit({

user_id:userId,
asset:"BX",
amount,
reason:"casino_bet"

})

}

async function payout(userId,amount){

await credit({

user_id:userId,
asset:"BX",
amount,
reason:"casino_win"

})

}

/* ========================================
MARKET TRADE
======================================== */

async function trade({userId,assetIn,assetOut,amountIn,amountOut}){

await ensureBalance(userId,assetIn)
await ensureBalance(userId,assetOut)

await db.query("BEGIN")

try{

/* lock */

const r = await db.query(

`SELECT balance
FROM wallet_balances
WHERE user_id=$1 AND asset=$2
FOR UPDATE`,

[userId,assetIn]

)

const balance = Number(r.rows[0].balance)

if(balance < amountIn){
throw new Error("insufficient_balance")
}

/* sell */

await db.query(

`UPDATE wallet_balances
SET balance = balance - $1
WHERE user_id=$2 AND asset=$3`,

[amountIn,userId,assetIn]

)

/* buy */

await db.query(

`UPDATE wallet_balances
SET balance = balance + $1
WHERE user_id=$2 AND asset=$3`,

[amountOut,userId,assetOut]

)

/* logs */

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reason)
VALUES($1,$2,$3,'trade_sell','market')`,

[userId,assetIn,amountIn]

)

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reason)
VALUES($1,$2,$3,'trade_buy','market')`,

[userId,assetOut,amountOut]

)

await db.query("COMMIT")

}catch(e){

await db.query("ROLLBACK")
throw e

}

}

/* ========================================
EXPORT
======================================== */

module.exports = {

getBalance,
credit,
debit,
transfer,
placeBet,
payout,
trade

   }
