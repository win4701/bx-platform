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

await executeTrade({

buy,
sell,
amount,
price:sell.price

})

}

}

}

async function executeTrade({

buy,
sell,
amount,
price

}){

await db.transaction(async(client)=>{

await ledger.adjustBalance({

userId:buy.user_id,
asset:"BX",
amount:amount,
type:"trade_buy",
reference:buy.id

})

await ledger.adjustBalance({

userId:sell.user_id,
asset:"USDT",
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

module.exports={

matchOrders

}
