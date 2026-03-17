"use strict"

/* =========================================
WS HUB (optional)
========================================= */

let wsHub = null

function attachWS(hub){
wsHub = hub
}

/* =========================================
STATE
========================================= */

const trades = []

const MAX_TRADES = 100

/* =========================================
PUBLISH TRADE
========================================= */

async function publishTrade(trade){

try{

const data = {
pair: trade.pair,
price: Number(trade.price),
amount: Number(trade.amount),
time: Date.now()
}

/* store */

trades.unshift(data)

if(trades.length > MAX_TRADES){
trades.pop()
}

/* broadcast */

if(wsHub){

wsHub.broadcast("trades", data)

}

/* log */

console.log("📊 Trade:",data.pair,data.price,data.amount)

}catch(e){

console.error("Trade publish error:",e)

}

}

/* =========================================
GET TRADES
========================================= */

function getTrades(pair){

if(!pair) return trades

return trades.filter(t => t.pair === pair)

}

/* =========================================
EXPORT
========================================= */

module.exports = {
publishTrade,
getTrades,
attachWS
}
