"use strict"

const express = require("express")
const router = express.Router()

const jwt = require("jsonwebtoken")

const db = require("../database")

/* ================================
JWT CONFIG
================================ */

const JWT_SECRET = process.env.JWT_SECRET || "bloxio_secret"

/* ================================
CREATE TOKEN
================================ */

function createToken(user){

return jwt.sign(
{
id:user.id,
telegram_id:user.telegram_id
},
JWT_SECRET,
{
expiresIn:"30d"
}
)

}

/* ================================
AUTH MIDDLEWARE
================================ */

function authMiddleware(req,res,next){

const auth = req.headers.authorization

if(!auth){

return res.status(401).json({
error:"unauthorized"
})

}

try{

const token = auth.split(" ")[1]

const decoded = jwt.verify(token,JWT_SECRET)

req.user = decoded

next()

}catch(e){

return res.status(401).json({
error:"invalid_token"
})

}

}

/* ================================
TELEGRAM LOGIN
================================ */

router.post("/telegram", async(req,res)=>{

try{

const { telegram_id, username } = req.body

if(!telegram_id){

return res.status(400).json({
error:"telegram_id_required"
})

}

/* check user */

let user = await db.query(

`SELECT * FROM users
WHERE telegram_id=$1`,
[telegram_id]

)

if(user.rows.length === 0){

/* create user */

const result = await db.query(

`INSERT INTO users
(telegram_id,username)
VALUES($1,$2)
RETURNING *`,

[
telegram_id,
username || "player"
]

)

user = result.rows[0]

/* create wallets */

const assets = [
"BX",
"USDT",
"USDC",
"BTC",
"BNB",
"ETH",
"AVAX",
"ZEC",
"TON",
"SOL",
"LTC"
]

for(const asset of assets){

await db.query(

`INSERT INTO wallet_balances
(user_id,asset,balance)
VALUES($1,$2,0)`,

[user.id,asset]

)

}

}else{

user = user.rows[0]

}

/* create token */

const token = createToken(user)

res.json({

success:true,
token,
user:{

id:user.id,
telegram_id:user.telegram_id,
username:user.username

}

})

}catch(e){

console.error("Auth error:",e)

res.status(500).json({
error:"auth_failed"
})

}

})

/* ================================
CURRENT USER
================================ */

router.get("/me", authMiddleware, async(req,res)=>{

try{

const user = await db.query(

`SELECT id,telegram_id,username
FROM users
WHERE id=$1`,

[req.user.id]

)

if(user.rows.length === 0){

return res.status(404).json({
error:"user_not_found"
})

}

res.json({

user:user.rows[0]

})

}catch(e){

console.error(e)

res.status(500).json({
error:"internal_error"
})

}

})

/* ================================
EXPORTS
================================ */

module.exports = router
module.exports.authMiddleware = authMiddleware
