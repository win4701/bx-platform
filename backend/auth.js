const jwt = require("jsonwebtoken")
const db = require("./database")

exports.telegram = async (req,res)=>{

const {telegram_id,username,first_name} = req.body

let user = await db.query(
"SELECT id FROM users WHERE telegram_id=$1",
[telegram_id]
)

if(user.rows.length===0){

const created = await db.query(
`INSERT INTO users(telegram_id,username,first_name)
VALUES($1,$2,$3)
RETURNING id`,
[telegram_id,username,first_name]
)

await db.query(
"INSERT INTO wallets(user_id) VALUES($1)",
[created.rows[0].id]
)

user = created

}

const token = jwt.sign(
{ id:user.rows[0].id },
process.env.JWT_SECRET
)

res.json({access_token:token})

}

exports.auth = (req,res,next)=>{

const header = req.headers.authorization

if(!header) return res.status(401).json({error:"no token"})

try{

const token = header.split(" ")[1]

const decoded = jwt.verify(
token,
process.env.JWT_SECRET
)

req.user = decoded

next()

}catch{

res.status(401).json({error:"invalid token"})

}

}
