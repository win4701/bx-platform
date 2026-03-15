const db = require("../database")
const marketWS = require("../ws/marketWS")

let candles = {}

function updateCandle(pair, price, amount){

const minute = Math.floor(Date.now()/60000)

if(!candles[pair] || candles[pair].minute !== minute){

candles[pair] = {
minute,
open:price,
high:price,
low:price,
close:price,
volume:amount
}

}else{

const c = candles[pair]

c.high = Math.max(c.high,price)
c.low = Math.min(c.low,price)
c.close = price
c.volume += amount

}

}

async function saveCandle(pair){

const c = candles[pair]
if(!c) return

await db.query(`
INSERT INTO candles(pair,minute,open,high,low,close,volume)
VALUES($1,$2,$3,$4,$5,$6,$7)
`,[
pair,
c.minute,
c.open,
c.high,
c.low,
c.close,
c.volume
])

marketWS.broadcast({
type:"candle",
pair,
candle:c
})

}

function start(){

setInterval(()=>{

Object.keys(candles).forEach(pair=>{
saveCandle(pair)
})

},60000)

}

module.exports={
updateCandle,
start
}
