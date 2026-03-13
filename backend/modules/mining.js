const db = require("../database")
const engine = require("../engines/miningEngine")

exports.subscribe = async (req,res)=>{

const {hashRate} = req.body

const reward = engine.calculateReward(hashRate)

await db.query(
`INSERT INTO mining_sessions
(user_id,hash_rate,reward)
VALUES($1,$2,$3)`,
[req.user.id,hashRate,reward]
)

res.json({
status:"started",
reward
})

}
