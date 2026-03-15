const express = require("express")
const router = express.Router()

const engine = require("../engines/marketEngine")

/* =========================
   BUY BX
========================= */

router.post("/buy", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

let {amount} = req.body

amount = Number(amount)

if(!amount || amount <= 0){
return res.status(400).json({
error:"invalid_amount"
})
}

/* EXECUTE TRADE */

const trade = await engine.buyBX(
userId,
amount
)

/* BROADCAST */

if(global.broadcast){

global.broadcast({
type:"trade",
pair:"BX_USDT",
side:"buy",
price:trade.price,
amount:trade.amount
})

}

/* RESPONSE */

res.json({
success:true,
trade
})

}catch(e){

console.error("market buy error",e)

res.status(500).json({
error:"market_buy_failed"
})

}

})

/* =========================
   SELL BX
========================= */

router.post("/sell", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

let {amount} = req.body

amount = Number(amount)

if(!amount || amount <= 0){
return res.status(400).json({
error:"invalid_amount"
})
}

/* EXECUTE TRADE */

const trade = await engine.sellBX(
userId,
amount
)

/* BROADCAST */

if(global.broadcast){

global.broadcast({
type:"trade",
pair:"BX_USDT",
side:"sell",
price:trade.price,
amount:trade.amount
})

}

/* RESPONSE */

res.json({
success:true,
trade
})

}catch(e){

console.error("market sell error",e)

res.status(500).json({
error:"market_sell_failed"
})

}

})

/* =========================
   MARKET STATS
========================= */

router.get("/stats", async (req,res)=>{

try{

const s = await engine.stats()

res.json(s)

}catch(e){

console.error("market stats error",e)

res.status(500).json({
error:"stats_failed"
})

}

})

/* =========================
   TRADE HISTORY
========================= */

router.get("/history", async (req,res)=>{

try{

const h = await engine.history()

res.json(h)

}catch(e){

console.error("market history error",e)

res.status(500).json({
error:"history_failed"
})

}

})

module.exports = router
