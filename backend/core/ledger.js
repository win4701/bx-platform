"use strict"

const db = require("../database")

/* =========================================
   GET BALANCE
========================================= */

async function getBalance(userId, asset){

const r = await db.query(

`SELECT balance
FROM wallet_balances
WHERE user_id=$1 AND asset=$2`,

[userId,asset]

)

if(!r.rows.length) return 0

return Number(r.rows[0].balance)

}

/* =========================================
   CREDIT
========================================= */

async function credit({user_id,asset,amount,reason}){

if(amount <= 0){
throw new Error("invalid_amount")
}

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

/* =========================================
   DEBIT
========================================= */

async function debit({user_id,asset,amount,reason}){

if(amount <= 0){
throw new Error("invalid_amount")
}

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

/* =========================================
   TRANSFER
========================================= */

async function transfer({fromUser,toUser,asset,amount}){

if(amount <= 0){
throw new Error("invalid_amount")
}

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

/* transactions */

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

/* =========================================
   CASINO BET
========================================= */

async function placeBet(userId,amount){

await debit({

user_id:userId,
asset:"BX",
amount,
reason:"casino_bet"

})

}

/* =========================================
   CASINO WIN
========================================= */

async function payout(userId,amount){

await credit({

user_id:userId,
asset:"BX",
amount,
reason:"casino_win"

})

}

/* =========================================
   MARKET TRADE
========================================= */

async function trade({userId,assetIn,assetOut,amountIn,amountOut}){

await db.query("BEGIN")

try{

await debit({

user_id:userId,
asset:assetIn,
amount:amountIn,
reason:"trade_sell"

})

await credit({

user_id:userId,
asset:assetOut,
amount:amountOut,
reason:"trade_buy"

})

await db.query("COMMIT")

}catch(e){

await db.query("ROLLBACK")

throw e

}

}

/* =========================================
   EXPORT
========================================= */

module.exports = {

getBalance,
credit,
debit,
transfer,
placeBet,
payout,
trade

   }
