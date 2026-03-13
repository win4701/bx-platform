const engine = require("../engines/marketEngine")

/* =========================
   BUY BX
========================= */

exports.buy = async (req,res)=>{

try{

const {amount} = req.body

if(!amount || amount<=0)
return res.status(400).json({
error:"invalid_amount"
})

const trade = await engine.buyBX(
req.user.id,
amount
)

if(global.broadcast){

global.broadcast({
type:"trade",
side:"buy",
price:trade.price,
amount:trade.amount
})

}

res.json(trade)

}catch{

res.status(500).json({
error:"market_buy_failed"
})

}

}

/* =========================
   SELL BX
========================= */

exports.sell = async (req,res)=>{

try{

const {amount} = req.body

if(!amount || amount<=0)
return res.status(400).json({
error:"invalid_amount"
})

const trade = await engine.sellBX(
req.user.id,
amount
)

if(global.broadcast){

global.broadcast({
type:"trade",
side:"sell",
price:trade.price,
amount:trade.amount
})

}

res.json(trade)

}catch{

res.status(500).json({
error:"market_sell_failed"
})

}

}

/* =========================
   MARKET STATS
========================= */

exports.stats = async (req,res)=>{

const s = await engine.stats()

res.json(s)

}

/* =========================
   TRADE HISTORY
========================= */

exports.history = async (req,res)=>{

const h = await engine.history()

res.json(h)

}
