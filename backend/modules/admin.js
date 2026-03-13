const db = require("../database")
const bxToken = require("../bloxio/bxToken")

exports.stats = async (req,res)=>{

try{

const users = await db.query(
"SELECT COUNT(*) FROM users"
)

const trades = await db.query(
"SELECT COUNT(*) FROM market_trades"
)

const casino = await db.query(
"SELECT SUM(profit) AS profit FROM casino_sessions"
)

const mining = await db.query(
"SELECT COUNT(*) FROM mining_sessions WHERE status='active'"
)

const supply = await bxToken.totalSupply()

res.json({

users:Number(users.rows[0].count),

trades:Number(trades.rows[0].count),

casino_profit:Number(casino.rows[0].profit || 0),

active_mining:Number(mining.rows[0].count),

bx_supply:supply

})

}catch(e){

res.status(500).json({
error:"stats_error"
})

}

}

exports.system = (req,res)=>{

res.json({
system:global.getSystemStats()
})

}
