const db = require("../database")
const engine = require("./marketEngine")

/* =========================
   CONFIG
========================= */

const BOT_USER = 0
const BOT_INTERVAL = 15000   // 15 seconds

const PAIRS = [
"BX_USDT"
]

/* =========================
   RANDOM
========================= */

function rand(min,max){

return Math.random()*(max-min)+min

}

function randSide(){

return Math.random()>0.5 ? "buy":"sell"

}

/* =========================
   BOT TRADE
========================= */

async function runBotTrade(pair){

try{

const side = randSide()

const amount = Number(rand(0.5,5).toFixed(2))

const price = engine.BX_PRICE

await db.query(

`INSERT INTO market_trades
(user_id,side,price,amount)
VALUES($1,$2,$3,$4)`,

[
BOT_USER,
side,
price,
amount
]

)

/* broadcast */

if(global.broadcast){

global.broadcast({

type:"trade",
pair,
side,
price,
amount,
bot:true

})

}

}catch(e){

console.error("marketBot error",e)

}

}

/* =========================
   BOT LOOP
========================= */

function startBot(){

setInterval(async()=>{

for(const pair of PAIRS){

await runBotTrade(pair)

}

},BOT_INTERVAL)

}

/* =========================
   MANUAL BOT TRADE
========================= */

async function manualTrade(pair,side,amount){

const price = engine.BX_PRICE

await db.query(

`INSERT INTO market_trades
(user_id,side,price,amount)
VALUES($1,$2,$3,$4)`,

[
BOT_USER,
side,
price,
amount
]

)

}

/* =========================
   BOT STATS
========================= */

async function stats(){

const r = await db.query(

`SELECT
COUNT(*) as trades,
SUM(amount) as volume
FROM market_trades
WHERE user_id=$1`,

[BOT_USER]

)

return r.rows[0]

}

module.exports={

startBot,
manualTrade,
stats

  }
