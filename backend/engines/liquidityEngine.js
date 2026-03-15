const db = require("../database")

function rand(min,max){
return Math.random()*(max-min)+min
}

async function generateLiquidity(){

const price = 45

for(let i=1;i<=10;i++){

const bid = price - i*0.1
const ask = price + i*0.1

await db.query(`
INSERT INTO orders(user_id,pair,side,price,amount)
VALUES(0,'BX_USDT','buy',$1,$2)
`,[
bid,
rand(1,5)
])

await db.query(`
INSERT INTO orders(user_id,pair,side,price,amount)
VALUES(0,'BX_USDT','sell',$1,$2)
`,[
ask,
rand(1,5)
])

}

}

function startLiquidity(){

setInterval(()=>{

generateLiquidity()

},10000)

}

module.exports = {
startLiquidity
  }
