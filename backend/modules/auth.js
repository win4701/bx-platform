"use strict";

const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../database");

/* =========================================
CONFIG
========================================= */

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "30d";

if(!JWT_SECRET){
  throw new Error("JWT_SECRET REQUIRED");
}

/* =========================================
UTILS
========================================= */

function createToken(user){
  return jwt.sign(
    { id:user.id },
    JWT_SECRET,
    { expiresIn:TOKEN_EXPIRY }
  );
}

async function createWallets(userId){

  const assets = ["BX","USDT","USDC","BTC","ETH","BNB","LTC","ZEC","TON","SOL"];

  for(const a of assets){
    await db.query(
      `INSERT INTO wallet_balances (user_id,asset,balance)
       VALUES($1,$2,0)
       ON CONFLICT DO NOTHING`,
      [userId,a]
    );
  }

}

/* =========================================
AUTH MIDDLEWARE
========================================= */

async function authMiddleware(req,res,next){

  try{

    const header = req.headers.authorization;
    if(!header) return res.status(401).json({error:"NO_TOKEN"});

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.query(
      `SELECT id FROM users WHERE id=$1`,
      [decoded.id]
    );

    if(!user.rows.length){
      return res.status(401).json({error:"USER_NOT_FOUND"});
    }

    req.user = decoded;
    next();

  }catch(e){
    return res.status(401).json({error:"INVALID_TOKEN"});
  }

}

/* =========================================
REGISTER
========================================= */

router.post("/register", async(req,res)=>{

  try{

    const { email, password, referral } = req.body;

    if(!email || !password){
      return res.status(400).json({error:"missing_fields"});
    }

    const exists = await db.query(
      `SELECT id FROM users WHERE email=$1`,
      [email]
    );

    if(exists.rows.length){
      return res.status(400).json({error:"email_exists"});
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email,password,created_at)
       VALUES($1,$2,NOW())
       RETURNING id,email`,
      [email, hash]
    );

    const user = result.rows[0];

    /* 🔥 referral */
    if(referral){

      const r = await db.query(
        `SELECT id FROM users WHERE ref_code=$1`,
        [referral]
      );

      if(r.rows.length){

        await db.query(
          `UPDATE users SET referred_by=$1 WHERE id=$2`,
          [r.rows[0].id, user.id]
        );

      }

    }

    /* 🔥 wallets */
    await createWallets(user.id);

    const token = createToken(user);

    res.json({
      success:true,
      token,
      user
    });

  }catch(e){
    console.error(e);
    res.status(500).json({error:"register_error"});
  }

});

/* =========================================
LOGIN
========================================= */

router.post("/login", async(req,res)=>{

  try{

    const { email, password } = req.body;

    const r = await db.query(
      `SELECT id,email,password FROM users WHERE email=$1`,
      [email]
    );

    if(!r.rows.length){
      return res.status(400).json({error:"invalid_credentials"});
    }

    const user = r.rows[0];

    const ok = await bcrypt.compare(password, user.password);

    if(!ok){
      return res.status(400).json({error:"invalid_credentials"});
    }

    await db.query(
      `UPDATE users SET last_login=NOW() WHERE id=$1`,
      [user.id]
    );

    const token = createToken(user);

    res.json({
      success:true,
      token,
      user:{ id:user.id, email:user.email }
    });

  }catch(e){
    res.status(500).json({error:"login_error"});
  }

});

/* =========================================
ME
========================================= */

router.get("/me", authMiddleware, async(req,res)=>{

  const r = await db.query(
    `SELECT id,email,bx_balance FROM users WHERE id=$1`,
    [req.user.id]
  );

  res.json({ user:r.rows[0] });

});

/* =========================================
CHECK
========================================= */

router.get("/check", authMiddleware, (req,res)=>{
  res.json({ ok:true });
});

/* =========================================
LOGOUT
========================================= */

router.post("/logout", (req,res)=>{
  res.json({ success:true });
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
