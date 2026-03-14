const db = require("../database")
const engine = require("./marketEngine")

const BOT_USER = 0
const BOT_INTERVAL = 15000

const PAIRS=["BX_USDT"]

function rand(min,max){
return Math.random()*(max-min)+min
}

function randSide(){
return Math.random()>0.5?"buy":"sell"
}

async function runBotTrade(pair){

try{

const side = randSide()
const amount = Number(rand(0.5,5).toFixed(2))
const price = engine.getPrice(pair)

await db.query(
`INSERT INTO market_trades
(user_id,pair,side,price,amount)
VALUES($1,$2,$3,$4,$5)`,
[BOT_USER,pair,side,price,amount]
)

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

function startBot(){

setInterval(async()=>{

for(const pair of PAIRS){
await runBotTrade(pair)
}

},BOT_INTERVAL)

}

module.exports={
startBot
}
