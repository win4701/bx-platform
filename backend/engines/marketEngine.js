const db = require("../database")
const ledger = require("../core/ledger")

async function matchOrders(pair){

const buys = await db.query(
`SELECT * FROM market_orders
WHERE pair=$1
AND side='buy'
AND status='open'
ORDER BY price DESC`,
[pair]
)

const sells = await db.query(
`SELECT * FROM market_orders
WHERE pair=$1
AND side='sell'
AND status='open'
ORDER BY price ASC`,
[pair]
)

for(const buy of buys.rows){

for(const sell of sells.rows){

if(buy.price < sell.price)
continue

const amount = Math.min(buy.amount,sell.amount)

const price = sell.price

await executeTrade(buy,sell,price,amount)

}

}

}

async function executeTrade(buy,sell,price,amount){

await db.query("BEGIN")

try{

await ledger.adjustBalance({

userId:buy.user_id,
asset:"BX",
amount:amount,
type:"trade_buy"

})

await ledger.adjustBalance({

userId:sell.user_id,
asset:"USDT",
amount:price*amount,
type:"trade_sell"

})

await db.query(
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

await db.query(
`UPDATE market_orders
SET status='filled'
WHERE id=$1`,
[buy.id]
)

await db.query(
`UPDATE market_orders
SET status='filled'
WHERE id=$1`,
[sell.id]
)

await db.query("COMMIT")

}catch(e){

await db.query("ROLLBACK")
throw e

}

}

module.exports = {

matchOrders

  }
