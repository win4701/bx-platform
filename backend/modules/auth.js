"use strict";

/* =========================================================
   BLOXIO AUTH SYSTEM — ULTRA PRO
========================================================= */

const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = require("../database");
const config = require("../config");

/* =========================================================
   HELPERS
========================================================= */

function createAccessToken(user){
  return jwt.sign(
    { id:user.id },
    config.security.jwtSecret,
    { expiresIn: "15m" }
  );
}

function createRefreshToken(user){
  return jwt.sign(
    { id:user.id },
    config.security.jwtSecret,
    { expiresIn: "30d" }
  );
}

function validatePassword(pw){
  if(!pw || pw.length < 6){
    throw new Error("weak_password");
  }
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

async function authMiddleware(req,res,next){

  try{

    const token = req.headers.authorization?.split(" ")[1];

    if(!token) return res.status(401).json({error:"NO_TOKEN"});

    const decoded = jwt.verify(token, config.security.jwtSecret);

    const r = await db.query(`
      SELECT id, banned, frozen
      FROM users
      WHERE id=$1
    `,[decoded.id]);

    if(!r.rows.length){
      return res.status(401).json({error:"USER_NOT_FOUND"});
    }

    if(r.rows[0].banned || r.rows[0].frozen){
      return res.status(403).json({error:"ACCOUNT_BLOCKED"});
    }

    req.user = decoded;

    next();

  }catch(e){
    return res.status(401).json({error:"INVALID_TOKEN"});
  }

}

/* =========================================================
   REGISTER
========================================================= */

router.post("/register", async(req,res)=>{

  try{

    const { email, password } = req.body;

    if(!email || !password){
      return res.status(400).json({error:"missing_fields"});
    }

    validatePassword(password);

    const exists = await db.query(
      `SELECT id FROM users WHERE email=$1`,
      [email]
    );

    if(exists.rows.length){
      return res.status(400).json({error:"email_exists"});
    }

    const hash = await bcrypt.hash(password, config.security.bcryptRounds);

    const r = await db.query(`
      INSERT INTO users(email,password,role,created_at)
      VALUES($1,$2,'user',NOW())
      RETURNING id,email,role
    `,[email,hash]);

    const user = r.rows[0];

    /* wallets init */
    await db.query(`
      INSERT INTO wallet_balances(user_id,asset,balance,locked)
      SELECT $1, asset, 0, 0
      FROM (VALUES
        ('BX'),('USDT'),('BTC'),('ETH')
      ) AS t(asset)
    `,[user.id]);

    /* audit */
    await db.query(`
      INSERT INTO audit_logs(user_id,action)
      VALUES($1,'register')
    `,[user.id]);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.json({
      success:true,
      accessToken,
      refreshToken,
      user
    });

  }catch(e){
    res.status(500).json({error:e.message});
  }

});

/* =========================================================
   LOGIN (SECURE)
========================================================= */

router.post("/login", async(req,res)=>{

  try{

    const { email, password } = req.body;

    const r = await db.query(`
      SELECT id,email,password,banned,frozen
      FROM users WHERE email=$1
    `,[email]);

    if(!r.rows.length){
      return res.status(400).json({error:"invalid_credentials"});
    }

    const user = r.rows[0];

    if(user.banned || user.frozen){
      return res.status(403).json({error:"account_blocked"});
    }

    const ok = await bcrypt.compare(password, user.password);

    if(!ok){
      return res.status(400).json({error:"invalid_credentials"});
    }

    await db.query(`
      UPDATE users SET last_login=NOW()
      WHERE id=$1
    `,[user.id]);

    await db.query(`
      INSERT INTO audit_logs(user_id,action)
      VALUES($1,'login')
    `,[user.id]);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.json({
      success:true,
      accessToken,
      refreshToken,
      user:{ id:user.id, email:user.email }
    });

  }catch(e){
    res.status(500).json({error:"login_error"});
  }

});

/* =========================================================
   REFRESH TOKEN
========================================================= */

router.post("/refresh", async(req,res)=>{

  try{

    const { token } = req.body;

    const decoded = jwt.verify(token, config.security.jwtSecret);

    const accessToken = createAccessToken({ id:decoded.id });

    res.json({ accessToken });

  }catch{
    res.status(401).json({error:"invalid_refresh"});
  }

});

/* =========================================================
   ME (FIXED)
========================================================= */

router.get("/me", authMiddleware, async(req,res)=>{

  const r = await db.query(`
    SELECT id,email,role,banned,frozen
    FROM users WHERE id=$1
  `,[req.user.id]);

  res.json({ user:r.rows[0] });

});

/* =========================================================
   LOGOUT (CLIENT SIDE)
========================================================= */

router.post("/logout",(req,res)=>{
  res.json({ success:true });
});

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;
module.exports.authMiddleware = authMiddleware;
