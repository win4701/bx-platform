const db = require("../database")
const economy = require("../core/bxEconomy")

async function processMining(){

const sessions = await db.query(
`SELECT *
FROM mining_sessions
WHERE status='active'`
)

for(const s of sessions.rows){

const reward = Number(s.hash_rate) * 0.001

await economy.rewardBX(
s.user_id,
reward,
"mining_reward"
)

await db.query(
`UPDATE mining_sessions
SET last_reward = NOW()
WHERE id=$1`,
[s.id]
)

}

}

function startMiningScheduler(){

setInterval(async()=>{

try{

await processMining()

}catch(e){

console.error("mining error",e)

}

},60000)

}

module.exports={
startMiningScheduler
}
