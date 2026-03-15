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

try{

const authHeader = req.headers.authorization

if(!authHeader){
return res.status(401).json({
error:"unauthorized"
})
}

const parts = authHeader.split(" ")

if(parts.length !== 2){
return res.status(401).json({
error:"invalid_authorization_format"
})
}

const token = parts[1]

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

let { telegram_id, username } = req.body

if(!telegram_id){

return res.status(400).json({
error:"telegram_id_required"
})

}

username = username || "player"

/* CHECK USER */

let user = await db.query(

`SELECT id,telegram_id,username
FROM users
WHERE telegram_id=$1`,
[telegram_id]

)

/* CREATE USER */

if(user.rows.length === 0){

const result = await db.query(

`INSERT INTO users
(telegram_id,username)
VALUES($1,$2)
RETURNING id,telegram_id,username`,

[telegram_id,username]

)

user = result.rows[0]

/* CREATE WALLET BALANCES */

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
VALUES($1,$2,0)
ON CONFLICT DO NOTHING`,

[user.id,asset]

)

}

}else{

user = user.rows[0]

}

/* CREATE JWT */

const token = createToken(user)

/* RESPONSE */

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

console.error("auth error",e)

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

if(!user.rows.length){

return res.status(404).json({
error:"user_not_found"
})

}

res.json({
user:user.rows[0]
})

}catch(e){

console.error("auth me error",e)

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
