"use strict"

const express = require("express")
const router = express.Router()

const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const db = require("../database")

/* =========================================
CONFIG
========================================= */

const JWT_SECRET = process.env.JWT_SECRET

if(!JWT_SECRET){
console.error("JWT_SECRET missing")
process.exit(1)
}

const TOKEN_EXPIRY = "30d"

/* =========================================
CREATE TOKEN
========================================= */

function createToken(user){

return jwt.sign(
{
id:user.id,
telegram_id:user.telegram_id
},
JWT_SECRET,
{
expiresIn:TOKEN_EXPIRY
}
)

}

/* =========================================
AUTH MIDDLEWARE
========================================= */

function authMiddleware(req,res,next){

try{

const header = req.headers.authorization

if(!header){
return res.status(401).json({
error:"unauthorized"
})
}

const token = header.split(" ")[1]

const decoded = jwt.verify(token,JWT_SECRET)

req.user = decoded

next()

}catch(e){

return res.status(401).json({
error:"invalid_token"
})

}

}

/* =========================================
VERIFY TELEGRAM HASH
========================================= */

function verifyTelegram(data){

if(!data.hash) return false

const secret = crypto
.createHash("sha256")
.update(process.env.TELEGRAM_BOT_TOKEN)
.digest()

const checkString = Object.keys(data)
.filter(k => k !== "hash")
.sort()
.map(k => `${k}=${data[k]}`)
.join("\n")

const hmac = crypto
.createHmac("sha256",secret)
.update(checkString)
.digest("hex")

return hmac === data.hash

}

/* =========================================
CREATE USER WALLETS
========================================= */

async function createWallets(userId){

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

[userId,asset]

)

}

}

/* =========================================
TELEGRAM LOGIN
========================================= */

router.post("/telegram", async(req,res)=>{

try{

let { telegram_id, username } = req.body

if(!telegram_id){

return res.status(400).json({
error:"telegram_id_required"
})

}

username = username || "player"

/* FIND USER */

let user = await db.query(

`SELECT id,telegram_id,username
FROM users
WHERE telegram_id=$1`,

[telegram_id]

)

if(user.rows.length === 0){

const result = await db.query(

`INSERT INTO users
(telegram_id,username,created_at)
VALUES($1,$2,NOW())
RETURNING id,telegram_id,username`,

[telegram_id,username]

)

user = result.rows[0]

await createWallets(user.id)

}else{

user = user.rows[0]

await db.query(

`UPDATE users
SET last_login = NOW()
WHERE id=$1`,

[user.id]

)

}

/* CREATE TOKEN */

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

/* =========================================
CURRENT USER
========================================= */

router.get("/me", authMiddleware, async(req,res)=>{

try{

const r = await db.query(

`SELECT id,telegram_id,username
FROM users
WHERE id=$1`,

[req.user.id]

)

if(!r.rows.length){

return res.status(404).json({
error:"user_not_found"
})

}

res.json({
user:r.rows[0]
})

}catch(e){

console.error("auth me error",e)

res.status(500).json({
error:"internal_error"
})

}

})

/* =========================================
EXPORT
========================================= */

module.exports = router
module.exports.authMiddleware = authMiddleware
