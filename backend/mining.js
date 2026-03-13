const db = require("./database")

exports.subscribe = async (req,res)=>{

const {coin,plan_id,amount} = req.body

await db.query(
`INSERT INTO mining_sessions(user_id,coin,plan_id,amount)
VALUES($1,$2,$3,$4)`,
[req.user.id,coin,plan_id,amount]
)

res.json({status:"mining_started"})

}
