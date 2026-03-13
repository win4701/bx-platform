const db = require("../database")
const engine = require("../engines/marketEngine")
const ledger = require("../core/ledger")

/* =========================
   CREATE ORDER
========================= */

exports.order = async (req,res)=>{

try{

const {pair,side,price,amount} = req.body

const userId=req.user.id

if(!pair || !side || !price || !amount)
return res.status(400).json({
error:"invalid_order"
})

const base = pair.split("_")[0]
const quote = pair.split("_")[1]

/* =====================
   LOCK FUNDS
===================== */

if(side==="buy"){

await ledger.lockBalance({

userId,
asset:quote,
amount:price*amount

})

}

if(side==="sell"){

await ledger.lockBalance({

userId,
asset:base,
amount:amount

})

}

/* =====================
   INSERT ORDER
===================== */

const order = await db.query(

`INSERT INTO market_orders
(user_id,pair,side,price,amount,status)
VALUES($1,$2,$3,$4,$5,'open')
RETURNING id`,

[
userId,
pair,
side,
price,
amount
]

)

/* =====================
   MATCH
===================== */

await engine.matchOrders(pair)

/* =====================
   FEED
===================== */

if(global.broadcast){

global.broadcast({

type:"market_order",
pair,
side,
price,
amount

})

}

res.json({

status:"created",
order_id:order.rows[0].id

})

}catch(e){

res.status(500).json({
error:"order_failed"
})

}

}

/* =========================
   ORDERBOOK
========================= */

exports.orderbook = async (req,res)=>{

const {pair} = req.params

const book = await engine.orderbook(pair)

res.json(book)

}

/* =========================
   MARKET STATS
========================= */

exports.stats = async (req,res)=>{

const {pair} = req.params

const s = await engine.stats(pair)

res.json(s)

}

/* =========================
   USER ORDERS
========================= */

exports.myOrders = async (req,res)=>{

const r = await db.query(

`SELECT *
FROM market_orders
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 50`,

[req.user.id]

)

res.json(r.rows)

}

/* =========================
   CANCEL ORDER
========================= */

exports.cancel = async (req,res)=>{

const {order_id}=req.body

const order = await db.query(

`SELECT *
FROM market_orders
WHERE id=$1
AND user_id=$2`,

[order_id,req.user.id]

)

if(!order.rows.length)
return res.status(404).json({
error:"order_not_found"
})

await db.query(

`UPDATE market_orders
SET status='cancelled'
WHERE id=$1`,

[order_id]

)

res.json({

status:"cancelled"

})

          }
