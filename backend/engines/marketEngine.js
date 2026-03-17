"use strict"

const db = require("../database")
const ledger = require("../core/ledger")
const tradesFeed = require("./tradesFeed")

/* =========================================
CONFIG
========================================= */

const PAIR = "BX_USDT"
const FEE = 0.002 // 0.2%

/* =========================================
GET PRICE
========================================= */

async function getPrice(){

const r = await db.query(
`SELECT price FROM trades
WHERE pair=$1
ORDER BY id DESC LIMIT 1`,
[PAIR]
)

if(!r.rows.length) return 45

return Number(r.rows[0].price)

}

/* =========================================
EXECUTE TRADE
========================================= */

async function executeTrade({ userId, side, amount }){

amount = Number(amount)

if(amount <= 0){
throw new Error("invalid_amount")
}

const price = await getPrice()

let result

if(side === "buy"){

const cost = amount
const bx = (cost / price) * (1 - FEE)

await ledger.trade({
userId,
assetIn:"USDT",
assetOut:"BX",
amountIn:cost,
amountOut:bx
})

result = { amount: bx }

}else{

const usdt = (amount * price) * (1 - FEE)

await ledger.trade({
userId,
assetIn:"BX",
assetOut:"USDT",
amountIn:amount,
amountOut:usdt
})

result = { amount: usdt }

}

/* store trade */

await db.query(
`INSERT INTO trades
(pair,price,amount,side,user_id)
VALUES($1,$2,$3,$4,$5)`,
[
PAIR,
price,
amount,
side,
userId
]
)

/* publish real-time */

await tradesFeed.publishTrade({
pair:PAIR,
price,
amount,
side
})

return {
pair:PAIR,
price,
side,
...result
}

}

/* =========================================
PUBLIC API
========================================= */

async function buyBX(userId, usdt){

return executeTrade({
userId,
side:"buy",
amount:usdt
})

}

async function sellBX(userId, bx){

return executeTrade({
userId,
side:"sell",
amount:bx
})

}

/* =========================================
STATS
========================================= */

async function stats(){

const r = await db.query(
`SELECT
COUNT(*) as trades,
SUM(amount) as volume,
MAX(price) as high,
MIN(price) as low
FROM trades
WHERE pair=$1
AND created_at > NOW() - INTERVAL '24 hours'`,
[PAIR]
)

const price = await getPrice()

return {
pair:PAIR,
price,
volume:Number(r.rows[0].volume || 0),
high:Number(r.rows[0].high || price),
low:Number(r.rows[0].low || price),
trades:Number(r.rows[0].trades || 0)
}

}

/* =========================================
HISTORY
========================================= */

async function history(){

const r = await db.query(
`SELECT price,amount,side,created_at
FROM trades
WHERE pair=$1
ORDER BY id DESC
LIMIT 100`,
[PAIR]
)

return r.rows

}

/* =========================================
ORDERBOOK (REAL)
========================================= */

async function orderbook(){

const bids = await db.query(
`SELECT price, SUM(amount) as amount
FROM orders
WHERE pair=$1 AND side='buy'
GROUP BY price
ORDER BY price DESC
LIMIT 20`,
[PAIR]
)

const asks = await db.query(
`SELECT price, SUM(amount) as amount
FROM orders
WHERE pair=$1 AND side='sell'
GROUP BY price
ORDER BY price ASC
LIMIT 20`,
[PAIR]
)

return {
pair:PAIR,
bids:bids.rows,
asks:asks.rows
}

}

/* =========================================
EXPORT
========================================= */

module.exports = {
buyBX,
sellBX,
stats,
history,
orderbook,
getPrice,
executeTrade
   }
