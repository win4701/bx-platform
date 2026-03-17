"use strict"

const db = require("../database")
const ledger = require("../core/ledger")
const tradesFeed = require("./tradesFeed")

const PAIR = "BX_USDT"
const FEE = 0.002 // 0.2%

/* =========================================
MATCH ONE STEP
========================================= */

async function matchOrders(pair){

const client = await db.pool.connect()

try{

await client.query("BEGIN")

/* lock best buy */

const buy = await client.query(`
SELECT * FROM orders
WHERE pair=$1 AND side='buy' AND amount > 0
ORDER BY price DESC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
`,[pair])

/* lock best sell */

const sell = await client.query(`
SELECT * FROM orders
WHERE pair=$1 AND side='sell' AND amount > 0
ORDER BY price ASC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
`,[pair])

if(!buy.rows.length || !sell.rows.length){

await client.query("COMMIT")
return false

}

const b = buy.rows[0]
const s = sell.rows[0]

if(Number(b.price) < Number(s.price)){

await client.query("COMMIT")
return false

}

/* execution */

const price = Number(s.price)

const amount = Math.min(
Number(b.amount),
Number(s.amount)
)

const value = price * amount

/* fees */

const feeBuy = amount * FEE
const feeSell = value * FEE

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

/* ledger */

await ledger.trade({
userId:b.user_id,
assetIn:"USDT",
assetOut:"BX",
amountIn:value,
amountOut:amount - feeBuy
})

await ledger.trade({
userId:s.user_id,
assetIn:"BX",
assetOut:"USDT",
amountIn:amount,
amountOut:value - feeSell
})

/* insert trade */

await client.query(`
INSERT INTO trades(pair,price,amount,side,user_id)
VALUES($1,$2,$3,$4,$5)
`,[
pair,
price,
amount,
"match",
b.user_id
])

await client.query("COMMIT")

/* broadcast */

await tradesFeed.publishTrade({
pair,
price,
amount,
type:"match"
})

return true

}catch(e){

await client.query("ROLLBACK")
console.error("Matching error:",e)

return false

}finally{

client.release()

}

}

/* =========================================
SAFE LOOP (Render Safe)
========================================= */

let running = false

async function runMatching(){

if(running) return
running = true

console.log("✅ Matching engine running...")

while(running){

try{

const didMatch = await matchOrders(PAIR)

/* important: prevent CPU burn */

await new Promise(r=>setTimeout(r, didMatch ? 10 : 100))

}catch(e){

console.error("Loop error:",e)
await new Promise(r=>setTimeout(r,500))

}

}

}

/* =========================================
START / STOP
========================================= */

function startMatching(){

runMatching()

}

function stopMatching(){

running = false

}

/* =========================================
EXPORT
========================================= */

module.exports = {
startMatching,
stopMatching,
matchOrders
  }
