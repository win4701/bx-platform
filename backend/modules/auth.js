"use strict"

const express = require("express")
const router = express.Router()

const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const db = require("../database")

/* =========================================
CONFIG
========================================= */

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key"
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || null
const TOKEN_EXPIRY = "30d"

if (!process.env.JWT_SECRET) {
  console.warn("⚠️ Using default JWT_SECRET (NOT SAFE FOR PROD)")
}

/* =========================================
CREATE TOKEN
========================================= */

function createToken(user){
  return jwt.sign(
    {
      id: user.id,
      telegram_id: user.telegram_id
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  )
}

/* =========================================
AUTH MIDDLEWARE (DB VALIDATION)
========================================= */

async function authMiddleware(req,res,next){

  try{

    const header = req.headers.authorization

    if(!header){
      return res.status(401).json({ error:"NO_TOKEN" })
    }

    let token = header.startsWith("Bearer ")
      ? header.split(" ")[1]
      : header

    if(!token){
      return res.status(401).json({ error:"EMPTY_TOKEN" })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    // 🔥 CHECK USER EXISTS
    const user = await db.query(
      `SELECT id FROM users WHERE id=$1`,
      [decoded.id]
    )

    if(!user.rows.length){
      return res.status(401).json({ error:"USER_NOT_FOUND" })
    }

    req.user = decoded

    next()

  }catch(e){

    console.error("AUTH ERROR:", e.message)

    return res.status(401).json({
      error:"INVALID_TOKEN"
    })

  }

}

/* =========================================
VERIFY TELEGRAM (STRONG)
========================================= */

function verifyTelegram(data){

  if(!TELEGRAM_TOKEN) return true

  if(!data.hash) return false

  const secret = crypto
    .createHash("sha256")
    .update(TELEGRAM_TOKEN)
    .digest()

  const checkString = Object.keys(data)
    .filter(k => k !== "hash")
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join("\n")

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex")

  return hmac === data.hash
}

/* =========================================
CREATE USER WALLETS
========================================= */

async function createWallets(userId){

  const assets = ["BX","USDT","BTC"]

  for(const asset of assets){
    await db.query(
      `INSERT INTO wallet_balances (user_id,asset,balance)
       VALUES($1,$2,0)
       ON CONFLICT DO NOTHING`,
      [userId,asset]
    )
  }

}

/* =========================================
LOGIN
========================================= */

router.post("/telegram", async(req,res)=>{

  try{

    const data = req.body

    if(!data.telegram_id){
      return res.status(400).json({
        error:"telegram_id_required"
      })
    }

    if(!verifyTelegram(data)){
      return res.status(403).json({
        error:"telegram_verification_failed"
      })
    }

    let username = data.username || "player"

    let user = await db.query(
      `SELECT id,telegram_id,username
       FROM users WHERE telegram_id=$1`,
      [data.telegram_id]
    )

    if(user.rows.length === 0){

      const result = await db.query(
        `INSERT INTO users (telegram_id,username,created_at)
         VALUES($1,$2,NOW())
         RETURNING id,telegram_id,username`,
        [data.telegram_id, username]
      )

      user = result.rows[0]

      await createWallets(user.id)

    }else{

      user = user.rows[0]

      await db.query(
        `UPDATE users SET last_login=NOW() WHERE id=$1`,
        [user.id]
      )
    }

    const token = createToken(user)

    res.json({
      success:true,
      token,
      user
    })

  }catch(e){

    console.error("AUTH ERROR:", e)

    res.status(500).json({
      error:"auth_failed"
    })

  }

})

/* =========================================
ME
========================================= */

router.get("/me", authMiddleware, async(req,res)=>{

  const r = await db.query(
    `SELECT id,telegram_id,username
     FROM users WHERE id=$1`,
    [req.user.id]
  )

  res.json({ user:r.rows[0] })

})

/* =========================================
LOGOUT (CLIENT SIDE SUPPORT)
========================================= */

router.post("/logout", authMiddleware, (req,res)=>{
  res.json({ success:true })
})

/* =========================================
CHECK
========================================= */

router.get("/check", authMiddleware, (req,res)=>{
  res.json({
    ok:true,
    user:req.user
  })
})

module.exports = router
module.exports.authMiddleware = authMiddleware
