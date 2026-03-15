const express = require("express")
const router = express.Router()

const db = require("../database")
const engine = require("../engines/miningEngine")

/* ===============================
   START MINING
================================ */

router.post("/subscribe", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

let {hashRate} = req.body

hashRate = Number(hashRate)

if(!hashRate || hashRate <= 0){
return res.status(400).json({
error:"invalid_hashrate"
})
}

/* CHECK ACTIVE SESSION */

const active = await db.query(
`SELECT id
FROM mining_sessions
WHERE user_id=$1
AND status='active'`,
[userId]
)

if(active.rows.length){
return res.status(400).json({
error:"mining_already_active"
})
}

/* CALCULATE REWARD */

const reward = engine.calculateReward(hashRate)

/* CREATE SESSION */

await db.query(
`INSERT INTO mining_sessions
(user_id,hash_rate,reward,status,started_at)
VALUES($1,$2,$3,'active',NOW())`,
[userId,hashRate,reward]
)

/* BROADCAST */

if(global.broadcast){

global.broadcast({
type:"mining_start",
user:userId,
hashRate,
reward
})

}

/* RESPONSE */

res.json({
status:"started",
hashRate,
reward
})

}catch(e){

console.error("mining start error",e)

res.status(500).json({
error:"mining_start_failed"
})

}

})

/* ===============================
   MINING STATUS
================================ */

router.get("/status", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

const s = await db.query(
`SELECT hash_rate,reward,status,started_at
FROM mining_sessions
WHERE user_id=$1
AND status='active'`,
[userId]
)

if(!s.rows.length){

return res.json({
active:false
})

}

res.json({
active:true,
session:s.rows[0]
})

}catch(e){

console.error("mining status error",e)

res.status(500).json({
error:"mining_status_failed"
})

}

})

/* ===============================
   CLAIM REWARD
================================ */

router.post("/claim", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

const session = await db.query(
`SELECT id,reward
FROM mining_sessions
WHERE user_id=$1
AND status='active'`,
[userId]
)

if(!session.rows.length){
return res.status(400).json({
error:"no_active_mining"
})
}

const reward = session.rows[0].reward

/* ADD REWARD */

await db.query(
`UPDATE wallet_balances
SET balance = balance + $1
WHERE user_id=$2
AND asset='BX'`,
[reward,userId]
)

/* CLOSE SESSION */

await db.query(
`UPDATE mining_sessions
SET status='claimed',
ended_at=NOW()
WHERE id=$1`,
[session.rows[0].id]
)

/* BROADCAST */

if(global.broadcast){

global.broadcast({
type:"mining_claim",
user:userId,
reward
})

}

/* RESPONSE */

res.json({
claimed:true,
reward
})

}catch(e){

console.error("mining claim error",e)

res.status(500).json({
error:"mining_claim_failed"
})

}

})

module.exports = router
