const db = require("../database")
const marketWS = require("../ws/marketWS")

async function matchOrders(pair){

const buy = await db.query(`
SELECT * FROM orders
WHERE pair=$1 AND side='buy'
ORDER BY price DESC, created_at ASC
LIMIT 1
`,[pair])

const sell = await db.query(`
SELECT * FROM orders
WHERE pair=$1 AND side='sell'
ORDER BY price ASC, created_at ASC
LIMIT 1
`,[pair])

if(!buy.rows.length || !sell.rows.length) return

const b = buy.rows[0]
const s = sell.rows[0]

if(b.price < s.price) return

const tradePrice = s.price
const amount = Math.min(b.amount,s.amount)

await db.query(`
INSERT INTO trades(pair,price,amount,buy_user,sell_user)
VALUES($1,$2,$3,$4,$5)
`,[
pair,
tradePrice,
amount,
b.user_id,
s.user_id
])

await db.query(`
UPDATE orders SET amount=amount-$1 WHERE id=$2
`,[amount,b.id])

await db.query(`
UPDATE orders SET amount=amount-$1 WHERE id=$2
`,[amount,s.id])

marketWS.broadcastTrade(
pair,
tradePrice,
amount,
"match"
)

}

function startMatching(){

setInterval(()=>{

matchOrders("BX_USDT")

},200)

}

module.exports = {
startMatching
               }
