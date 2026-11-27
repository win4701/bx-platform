/* =========================================================
   BLOXIO MAIN ROUTER — PRO MAX
========================================================= */

const express = require("express");
const router  = express.Router();

/* =========================================================
   MIDDLEWARE
========================================================= */

// 🔐 JWT AUTH (مثال بسيط — عدله حسب auth.js عندك)
function auth(req,res,next){

  try{

    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
      return res.status(401).json({ error:"no_token" });
    }

    // ⚠️ عدل حسب نظامك (JWT verify)
    const decoded = require("../core/jwt").verify(token);

    req.user = decoded;

    next();

  }catch(e){
    return res.status(401).json({ error:"invalid_token" });
  }

}

/* =========================================================
   LOAD ROUTES
========================================================= */

module.exports = (db) => {

  /* ================= CORE ROUTES ================= */

  const adminRoutes   = require("./admin")(db);

  // (اختياري) لو عندك ملفات أخرى:
  // const authRoutes    = require("./auth")(db);
  // const walletRoutes  = require("./wallet")(db);
  // const marketRoutes  = require("./market")(db);

  /* =========================================================
     PUBLIC ROUTES (بدون auth)
  ========================================================= */

  router.get("/", (req,res)=>{
    res.json({ status:"BLOXIO API RUNNING 🚀" });
  });

  /* =========================================================
     AUTH ROUTES
  ========================================================= */

  // router.use("/auth", authRoutes);

  /* =========================================================
     ADMIN ROUTES (🔐 محمية)
  ========================================================= */

  router.use("/admin", auth, adminRoutes);

  /* =========================================================
     WALLET ROUTES (مثال)
  ========================================================= */

  router.get("/wallet/balance", auth, async (req,res)=>{

    try{

      const userId = req.user.id;

      const result = await db.query(`
        SELECT bx_balance FROM users WHERE id=$1
      `,[userId]);

      res.json({
        balance: result.rows[0]?.bx_balance || 0
      });

    }catch(e){
      res.status(500).json({ error:"wallet_error" });
    }

  });

  /* =========================================================
     TRANSFER (داخلي)
  ========================================================= */

  router.post("/wallet/transfer", auth, async (req,res)=>{

    const { to, amount } = req.body;
    const from = req.user.id;

    if(!to || !amount){
      return res.status(400).json({ error:"missing_data" });
    }

    const client = await db.connect();

    try{

      await client.query("BEGIN");

      // خصم
      await client.query(`
        UPDATE users SET bx_balance = bx_balance - $1
        WHERE id=$2
      `,[amount,from]);

      // إضافة
      await client.query(`
        UPDATE users SET bx_balance = bx_balance + $1
        WHERE id=$2
      `,[amount,to]);

      // سجل العملية
      await client.query(`
        INSERT INTO transactions (from_id,to_id,amount,type)
        VALUES ($1,$2,$3,'transfer')
      `,[from,to,amount]);

      await client.query("COMMIT");

      res.json({ success:true });

    }catch(e){

      await client.query("ROLLBACK");

      res.status(500).json({ error:"transfer_failed" });

    }finally{
      client.release();
    }

  });

  /* =========================================================
     AIRDROP
  ========================================================= */

  router.post("/airdrop/claim", auth, async (req,res)=>{

    const userId = req.user.id;

    try{

      const reward = await db.query(`
        SELECT value FROM system_settings
        WHERE key='airdrop_reward'
      `);

      const amount = Number(reward.rows[0].value || 0);

      await db.query(`
        UPDATE users SET bx_balance = bx_balance + $1
        WHERE id=$2
      `,[amount,userId]);

      res.json({ success:true, amount });

    }catch(e){
      res.status(500).json({ error:"airdrop_error" });
    }

  });

  /* =========================================================
     HEALTH CHECK
  ========================================================= */

  router.get("/health", (req,res)=>{
    res.json({ status:"ok" });
  });

  /* =========================================================
     RETURN ROUTER
  ========================================================= */

  return router;

};
