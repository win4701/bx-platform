const db = require("./database")

exports.status = async (req,res)=>{

const r = await db.query(
"SELECT * FROM airdrop_claims WHERE user_id=$1",
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

await db.query(
`INSERT INTO airdrop_claims(user_id,reward)
VALUES($1,5)`,
[req.user.id]
)

await db.query(
`UPDATE wallets
SET bx = bx + 5
WHERE user_id=$1`,
[req.user.id]
)

res.json({status:"ok"})

}
