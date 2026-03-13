const db = require("../database")
const economy = require("../core/bxEconomy")

exports.status = async (req,res)=>{

const r = await db.query(
`SELECT * FROM airdrop_claims
WHERE user_id=$1`,
[req.user.id]
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

}

exports.claim = async (req,res)=>{

await economy.rewardBX(
req.user.id,
5,
"airdrop"
)

await db.query(
`INSERT INTO airdrop_claims
(user_id,claimed,claimed_at)
VALUES($1,true,NOW())`,
[req.user.id]
)

res.json({status:"ok"})

  }
