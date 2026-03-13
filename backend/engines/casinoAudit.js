const db = require("../database")

/* ===========================
   LOG RNG EVENT
=========================== */

async function logRNG({

userId,
game,
serverSeed,
clientSeed,
nonce,
result,
bet,
payout

}){

try{

await db.query(

`INSERT INTO casino_audit
(user_id,game,server_seed,client_seed,nonce,result,bet,payout)
VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,

[
userId,
game,
serverSeed,
clientSeed,
nonce,
JSON.stringify(result),
bet,
payout
]

)

}catch(e){

console.error("casinoAudit log error",e)

}

}

/* ===========================
   GET USER HISTORY
=========================== */

async function getUserAudit(userId,limit=50){

const r = await db.query(

`SELECT
game,
result,
bet,
payout,
nonce,
created_at
FROM casino_audit
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT $2`,

[userId,limit]

)

return r.rows

}

/* ===========================
   GET GAME STATS
=========================== */

async function getGameStats(game){

const r = await db.query(

`SELECT
COUNT(*) as plays,
SUM(bet) as total_bet,
SUM(payout) as total_payout
FROM casino_audit
WHERE game=$1`,

[game]

)

return r.rows[0]

}

/* ===========================
   VERIFY FAIRNESS
=========================== */

function verify({

serverSeed,
clientSeed,
nonce,
engineResult,
engine

}){

try{

const calculated = engine(
serverSeed,
clientSeed,
nonce
)

return JSON.stringify(calculated) === JSON.stringify(engineResult)

}catch{

return false

}

}

/* ===========================
   GLOBAL STATS
=========================== */

async function globalStats(){

const r = await db.query(

`SELECT
COUNT(*) as plays,
SUM(bet) as bet_volume,
SUM(payout) as payouts
FROM casino_audit`

)

return r.rows[0]

}

module.exports={

logRNG,
getUserAudit,
getGameStats,
verify,
globalStats

}
