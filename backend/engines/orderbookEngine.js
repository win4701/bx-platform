const db = require("../database")

async function broadcastOrderbook(pair){

const bids = await db.query(
`SELECT price,amount
FROM market_orders
WHERE pair=$1
AND side='buy'
AND status='open'
ORDER BY price DESC
LIMIT 20`,
[pair]
)

const asks = await db.query(
`SELECT price,amount
FROM market_orders
WHERE pair=$1
AND side='sell'
AND status='open'
ORDER BY price ASC
LIMIT 20`,
[pair]
)

global.broadcastMarket({

type:"orderbook",
pair,
bids:bids.rows,
asks:asks.rows

})

}

module.exports={broadcastOrderbook}
