"use strict"

const express = require("express")
const router = express.Router()

const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const db = require("../database")

/* =========================================
CONFIG (FIXED)
========================================= */

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key"
const TOKEN_EXPIRY = "30d"

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
AUTH MIDDLEWARE (FIXED STRONG)
========================================= */

function authMiddleware(req,res,next){

  try{

    const header = req.headers.authorization

    if(!header){
      return res.status(401).json({ error:"NO_TOKEN" })
    }

    // support both formats
    let token

    if(header.startsWith("Bearer ")){
      token = header.split(" ")[1]
    }else{
      token = header
    }

    if(!token){
      return res.status(401).json({ error:"TOKEN_EMPTY" })
    }

    const decoded = jwt.verify(token,JWT_SECRET)

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
TELEGRAM LOGIN (FIXED RESPONSE)
========================================= */

router.post("/telegram", async(req,res)=>{

  try{

    let { telegram_id, username } = req.body

    if(!telegram_id){
      return res.status(400).json({ error:"telegram_id_required" })
    }

    username = username || "player"

    let user = await db.query(
      `SELECT id,telegram_id,username FROM users WHERE telegram_id=$1`,
      [telegram_id]
    )

    if(user.rows.length === 0){

      const result = await db.query(
        `INSERT INTO users (telegram_id,username,created_at)
         VALUES($1,$2,NOW())
         RETURNING id,telegram_id,username`,
        [telegram_id,username]
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

  try{

    const r = await db.query(
      `SELECT id,telegram_id,username FROM users WHERE id=$1`,
      [req.user.id]
    )

    if(!r.rows.length){
      return res.status(404).json({ error:"user_not_found" })
    }

    res.json({ user:r.rows[0] })

  }catch(e){

    res.status(500).json({
      error:"internal_error"
    })

  }

})

module.exports = router
module.exports.authMiddleware = authMiddleware
