const db = require("../database")
const ledger = require("../core/ledger")

/* =========================
   MATCH ORDERS
========================= */

async function matchOrders(pair){

const buys = await db.query(

`SELECT * FROM market_orders
WHERE pair=$1
AND side='buy'
AND status='open'
ORDER BY price DESC
LIMIT 50`,

[pair]

)

const sells = await db.query(

`SELECT * FROM market_orders
WHERE pair=$1
AND side='sell'
AND status='open'
ORDER BY price ASC
LIMIT 50`,

[pair]

)

for(const buy of buys.rows){

for(const sell of sells.rows){

if(buy.price < sell.price)
continue

const amount = Math.min(buy.amount,sell.amount)

await executeTrade({

buy,
sell,
amount,
price:sell.price

})

}

}

}

/* =========================
   EXECUTE TRADE
========================= */

async function executeTrade({

buy,
sell,
amount,
price

}){

await db.transaction(async(client)=>{

/* buyer receives BX */

await ledger.adjustBalance({

userId:buy.user_id,
asset:"BX",
amount:amount,
type:"trade_buy",
reference:buy.id

})

/* seller receives quote */

const quote = buy.pair.split("_")[1]

await ledger.adjustBalance({

userId:sell.user_id,
asset:quote,
amount:price*amount,
type:"trade_sell",
reference:sell.id

})

await client.query(

`INSERT INTO market_trades
(pair,buy_order_id,sell_order_id,price,amount)
VALUES($1,$2,$3,$4,$5)`,

[
buy.pair,
buy.id,
sell.id,
price,
amount
]

)

await client.query(

`UPDATE market_orders
SET status='filled'
WHERE id=$1`,

[buy.id]

)

await client.query(

`UPDATE market_orders
SET status='filled'
WHERE id=$1`,

[sell.id]

)

})

}

/* =========================
   ORDERBOOK
========================= */

async function orderbook(pair){

const bids = await db.query(

`SELECT price,SUM(amount) as amount
FROM market_orders
WHERE pair=$1
AND side='buy'
AND status='open'
GROUP BY price
ORDER BY price DESC
LIMIT 20`,

[pair]

)

const asks = await db.query(

`SELECT price,SUM(amount) as amount
FROM market_orders
WHERE pair=$1
AND side='sell'
AND status='open'
GROUP BY price
ORDER BY price ASC
LIMIT 20`,

[pair]

)

return {

bids:bids.rows,
asks:asks.rows

}

}

/* =========================
   MARKET STATS
========================= */

async function stats(pair){

const r = await db.query(

`SELECT
COUNT(*) as trades,
SUM(amount) as volume
FROM market_trades
WHERE pair=$1`,

[pair]

)

return r.rows[0]

}

module.exports={

matchOrders,
orderbook,
stats

  }
