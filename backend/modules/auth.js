const db = require("../database")
const security = require("../core/security")

exports.telegram = async (req,res)=>{

const {telegram_id,username} = req.body

if(!telegram_id)
return res.status(400).json({error:"telegram required"})

let user = await db.query(
"SELECT id FROM users WHERE telegram_id=$1",
[telegram_id]
)

if(user.rows.length===0){

const created = await db.query(
`INSERT INTO users(telegram_id,username)
VALUES($1,$2)
RETURNING id`,
[telegram_id,username]
)

await db.query(
`INSERT INTO wallets(user_id)
VALUES($1)`,
[created.rows[0].id]
)

user = created

}

const token = security.generateToken(
user.rows[0].id
)

res.json({access_token:token})

}
