const db = require("../database")

async function generateLiquidity(pair, price){

for(let i=1;i<=10;i++){

const bid = price - i * price * 0.001
const ask = price + i * price * 0.001

await db.query(
`INSERT INTO market_liquidity
(pair,side,price,amount)
VALUES($1,'buy',$2,$3)`,
[pair,bid,Math.random()*5]
)

await db.query(
`INSERT INTO market_liquidity
(pair,side,price,amount)
VALUES($1,'sell',$2,$3)`,
[pair,ask,Math.random()*5]
)

}

}

module.exports = {generateLiquidity}
