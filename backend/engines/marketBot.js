const db = require("../database")

async function runMarketBot(){

const pair = "BX_USDT"

const price = 45 + (Math.random()-0.5)

const side = Math.random()>0.5?"buy":"sell"

const amount = Math.random()*2

await db.query(
`INSERT INTO market_orders
(user_id,pair,side,price,amount)
VALUES(0,$1,$2,$3,$4)`,
[pair,side,price,amount]
)

}

function startBot(){

setInterval(runMarketBot,5000)

}

module.exports = {startBot}
