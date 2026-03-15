const express = require("express")
const router = express.Router()

const db = require("../database")
const economy = require("../core/bxEconomy")

/* ===============================
   AIRDROP STATUS
================================ */

router.get("/status", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

const r = await db.query(
`SELECT claimed
FROM airdrop_claims
WHERE user_id=$1`,
[userId]
)

if(r.rows.length){

return res.json({
claimed:true
})

}

res.json({
claimed:false,
reward:5
})

}catch(e){

console.error("airdrop status error",e)

res.status(500).json({
error:"airdrop_error"
})

}

})

/* ===============================
   CLAIM AIRDROP
================================ */

router.post("/claim", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({
error:"unauthorized"
})
}

/* CHECK CLAIM */

const check = await db.query(
`SELECT claimed
FROM airdrop_claims
WHERE user_id=$1`,
[userId]
)

if(check.rows.length){

return res.status(400).json({
error:"already_claimed"
})

}

/* REWARD USER */

await economy.rewardBX(
userId,
5,
"airdrop"
)

/* SAVE CLAIM */

await db.query(
`INSERT INTO airdrop_claims
(user_id,claimed,claimed_at)
VALUES($1,true,NOW())`,
[userId]
)

/* RESPONSE */

res.json({
success:true,
reward:5
})

}catch(e){

console.error("airdrop claim error",e)

res.status(500).json({
error:"airdrop_error"
})

}

})

module.exports = router
