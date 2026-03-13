const db = require("../database")
const ledger = require("../core/ledger")

/* =========================
   CONSTANT PRICE
========================= */

const BX_PRICE = 45

/* =========================
   BUY BX
========================= */

async function buyBX(userId, amount){

const total = amount * BX_PRICE

await db.transaction(async()=>{

/* deduct USDT */

await ledger.adjustBalance({
userId,
asset:"USDT",
amount:-total,
type:"market_buy"
})

/* give BX */

await ledger.adjustBalance({
userId,
asset:"BX",
amount:amount,
type:"market_buy"
})

/* trade log */

await db.query(
`INSERT INTO market_trades
(user_id,side,price,amount)
VALUES($1,'buy',$2,$3)`,
[userId,BX_PRICE,amount]
)

})

return {
price:BX_PRICE,
amount,
total
}

}

/* =========================
   SELL BX
========================= */

async function sellBX(userId, amount){

const total = amount * BX_PRICE

await db.transaction(async()=>{

/* deduct BX */

await ledger.adjustBalance({
userId,
asset:"BX",
amount:-amount,
type:"market_sell"
})

/* give USDT */

await ledger.adjustBalance({
userId,
asset:"USDT",
amount:total,
type:"market_sell"
})

await db.query(
`INSERT INTO market_trades
(user_id,side,price,amount)
VALUES($1,'sell',$2,$3)`,
[userId,BX_PRICE,amount]
)

})

return {
price:BX_PRICE,
amount,
total
}

}

/* =========================
   MARKET STATS
========================= */

async function stats(){

const r = await db.query(

`SELECT
COUNT(*) as trades,
SUM(amount) as volume
FROM market_trades`

)

return {

price:BX_PRICE,
trades:Number(r.rows[0].trades||0),
volume:Number(r.rows[0].volume||0)

}

}

/* =========================
   TRADE HISTORY
========================= */

async function history(limit=50){

const r = await db.query(

`SELECT side,price,amount,created_at
FROM market_trades
ORDER BY created_at DESC
LIMIT $1`,

[limit]

)

return r.rows

}

module.exports={

BX_PRICE,
buyBX,
sellBX,
stats,
history

 }
