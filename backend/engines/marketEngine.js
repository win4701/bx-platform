"use strict"

const db = require("../database")
const ledger = require("../core/ledger")

/* =========================================
   MARKET CONFIG
========================================= */

const PAIR = "BX_USDT"
const REFERENCE_PRICE = 45

/* =========================================
   GET MARKET PRICE
========================================= */

async function getPrice(){

const r = await db.query(

`SELECT price
FROM trades
WHERE pair=$1
ORDER BY id DESC
LIMIT 1`,

[PAIR]

)

if(!r.rows.length) return REFERENCE_PRICE

return Number(r.rows[0].price)

}

/* =========================================
   BUY BX
========================================= */

async function buyBX(userId, amountUSDT){

amountUSDT = Number(amountUSDT)

if(amountUSDT <= 0){
throw new Error("invalid_amount")
}

const price = await getPrice()

const bx = amountUSDT / price

await ledger.trade({

userId,
assetIn:"USDT",
assetOut:"BX",
amountIn:amountUSDT,
amountOut:bx

})

await db.query(

`INSERT INTO trades
(pair,price,amount,side,user_id)
VALUES($1,$2,$3,'buy',$4)`,

[
PAIR,
price,
bx,
userId
]

)

if(global.broadcast){

global.broadcast({
type:"trade",
pair:PAIR,
side:"buy",
price,
amount:bx
})

}

return {

pair:PAIR,
side:"buy",
price,
amount:bx

}

}

/* =========================================
   SELL BX
========================================= */

async function sellBX(userId, amountBX){

amountBX = Number(amountBX)

if(amountBX <= 0){
throw new Error("invalid_amount")
}

const price = await getPrice()

const usdt = amountBX * price

await ledger.trade({

userId,
assetIn:"BX",
assetOut:"USDT",
amountIn:amountBX,
amountOut:usdt

})

await db.query(

`INSERT INTO trades
(pair,price,amount,side,user_id)
VALUES($1,$2,$3,'sell',$4)`,

[
PAIR,
price,
amountBX,
userId
]

)

if(global.broadcast){

global.broadcast({
type:"trade",
pair:PAIR,
side:"sell",
price,
amount:amountBX
})

}

return {

pair:PAIR,
side:"sell",
price,
amount:amountBX

}

}

/* =========================================
   MARKET STATS
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
   TRADE HISTORY
========================================= */

async function history(){

const r = await db.query(

`SELECT
price,
amount,
side,
created_at
FROM trades
WHERE pair=$1
ORDER BY id DESC
LIMIT 100`,

[PAIR]

)

return r.rows

}

/* =========================================
   ORDERBOOK
========================================= */

async function orderbook(){

const buys = await db.query(

`SELECT price,SUM(amount) as amount
FROM orders
WHERE pair=$1 AND side='buy'
GROUP BY price
ORDER BY price DESC
LIMIT 20`,

[PAIR]

)

const sells = await db.query(

`SELECT price,SUM(amount) as amount
FROM orders
WHERE pair=$1 AND side='sell'
GROUP BY price
ORDER BY price ASC
LIMIT 20`,

[PAIR]

)

return {

pair:PAIR,
bids:buys.rows,
asks:sells.rows

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
getPrice

   }
