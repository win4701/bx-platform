"use strict"

const db = require("../database")
const marketWS = require("../ws/marketWS")
const ledger = require("../core/ledger")

const PAIR = "BX_USDT"

/* =========================================
MATCH ENGINE
========================================= */

async function matchOrders(pair){

const client = await db.pool.connect()

try{

await client.query("BEGIN")

/* best buy */

const buy = await client.query(`
SELECT * FROM orders
WHERE pair=$1 AND side='buy' AND amount > 0
ORDER BY price DESC, created_at ASC
LIMIT 1
`,[pair])

/* best sell */

const sell = await client.query(`
SELECT * FROM orders
WHERE pair=$1 AND side='sell' AND amount > 0
ORDER BY price ASC, created_at ASC
LIMIT 1
`,[pair])

if(!buy.rows.length || !sell.rows.length){

await client.query("COMMIT")
return

}

const b = buy.rows[0]
const s = sell.rows[0]

/* price mismatch */

if(Number(b.price) < Number(s.price)){

await client.query("COMMIT")
return

}

/* trade execution */

const price = Number(s.price)

const amount = Math.min(
Number(b.amount),
Number(s.amount)
)

const value = price * amount

/* insert trade */

await client.query(`
INSERT INTO trades(pair,price,amount,buy_user,sell_user)
VALUES($1,$2,$3,$4,$5)
`,[
pair,
price,
amount,
b.user_id,
s.user_id
])

/* update orders */

await client.query(`
UPDATE orders
SET amount = amount - $1
WHERE id=$2
`,[amount,b.id])

await client.query(`
UPDATE orders
SET amount = amount - $1
WHERE id=$2
`,[amount,s.id])

/* credit balances */

await ledger.trade({

userId:b.user_id,
assetIn:"USDT",
assetOut:"BX",
amountIn:value,
amountOut:amount

})

await ledger.trade({

userId:s.user_id,
assetIn:"BX",
assetOut:"USDT",
amountIn:amount,
amountOut:value

})

await client.query("COMMIT")

/* broadcast trade */

marketWS.broadcastTrade({
pair,
price,
amount,
buy:b.user_id,
sell:s.user_id
})

}catch(e){

await client.query("ROLLBACK")

console.error("Matching engine error",e)

}finally{

client.release()

}

}

/* =========================================
MATCH LOOP
========================================= */

async function runMatching(){

while(true){

try{

await matchOrders(PAIR)

}catch(e){

console.error("Matching loop error",e)

}

}

}

/* =========================================
START ENGINE
========================================= */

function startMatching(){

console.log("Matching engine started")

runMatching()

}

module.exports = {
startMatching
}
