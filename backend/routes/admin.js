/* =========================================================
   BLOXIO ADMIN ROUTES — ULTRA PRO MAX
========================================================= */

const express = require("express");
const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

// ⚠️ يفترض أنك تستعمل middleware يضيف req.user
function requireAdmin(req,res,next){

  if(!req.user || req.user.role !== "superadmin"){
    return res.status(403).json({ error:"forbidden" });
  }

  next();
}

// سجل العمليات (Audit)
async function logAction(db, adminId, action, meta){

  try{
    await db.query(`
      INSERT INTO audit_logs (user_id, action, meta)
      VALUES ($1,$2,$3)
    `,[adminId, action, meta]);
  }catch(e){
    console.error("AUDIT ERROR", e);
  }

}

/* =========================================================
   INIT (db injection)
========================================================= */

module.exports = (db) => {

  /* =========================================================
     DASHBOARD
  ========================================================= */

  router.get("/dashboard", requireAdmin, async (req,res)=>{

    try{

      const users   = await db.query(`SELECT COUNT(*) FROM users`);
      const active  = await db.query(`SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '1 day'`);
      const volume  = await db.query(`SELECT COALESCE(SUM(amount),0) FROM deposits`);
      const revenue = await db.query(`SELECT COALESCE(SUM(fee),0) FROM transactions`);

      res.json({
        users: Number(users.rows[0].count),
        active: Number(active.rows[0].count),
        volume: Number(volume.rows[0].coalesce || 0),
        revenue: Number(revenue.rows[0].coalesce || 0)
      });

    }catch(e){
      res.status(500).json({ error:"dashboard_error" });
    }

  });

  /* =========================================================
     USERS CONTROL
  ========================================================= */

  router.post("/user/ban", requireAdmin, async (req,res)=>{

    const { userId } = req.body;

    if(!userId) return res.status(400).json({error:"missing_user"});

    await db.query(`UPDATE users SET banned=true WHERE id=$1`,[userId]);

    await logAction(db, req.user.id, "user_ban", { userId });

    res.json({ success:true });

  });

  router.post("/user/unban", requireAdmin, async (req,res)=>{

    const { userId } = req.body;

    await db.query(`UPDATE users SET banned=false WHERE id=$1`,[userId]);

    await logAction(db, req.user.id, "user_unban", { userId });

    res.json({ success:true });

  });

  /* =========================================================
     WALLET CONTROL
  ========================================================= */

  router.post("/wallet/add", requireAdmin, async (req,res)=>{

    const { userId, amount } = req.body;

    if(!userId || !amount){
      return res.status(400).json({error:"missing_data"});
    }

    await db.query(`
      UPDATE users SET bx_balance = bx_balance + $1
      WHERE id=$2
    `,[amount,userId]);

    await logAction(db, req.user.id, "wallet_add", { userId, amount });

    res.json({ success:true });

  });

  router.post("/wallet/remove", requireAdmin, async (req,res)=>{

    const { userId, amount } = req.body;

    await db.query(`
      UPDATE users SET bx_balance = bx_balance - $1
      WHERE id=$2
    `,[amount,userId]);

    await logAction(db, req.user.id, "wallet_remove", { userId, amount });

    res.json({ success:true });

  });

  /* =========================================================
     AIRDROP CONTROL
  ========================================================= */

  router.post("/airdrop/update", requireAdmin, async (req,res)=>{

    const { reward } = req.body;

    await db.query(`
      UPDATE system_settings SET value=$1 WHERE key='airdrop_reward'
    `,[reward]);

    await logAction(db, req.user.id, "airdrop_update", { reward });

    res.json({ success:true });

  });

  /* =========================================================
     MINING CONTROL
  ========================================================= */

  router.post("/mining/update", requireAdmin, async (req,res)=>{

    const { rate } = req.body;

    await db.query(`
      UPDATE system_settings SET value=$1 WHERE key='mining_rate'
    `,[rate]);

    await logAction(db, req.user.id, "mining_update", { rate });

    res.json({ success:true });

  });

  /* =========================================================
     MARKET CONTROL
  ========================================================= */

  router.post("/market/update", requireAdmin, async (req,res)=>{

    const { price } = req.body;

    await db.query(`
      UPDATE market SET price=$1 WHERE symbol='BTC'
    `,[price]);

    await logAction(db, req.user.id, "market_update", { price });

    res.json({ success:true });

  });

  /* =========================================================
     CASINO CONTROL
  ========================================================= */

  router.post("/casino/update", requireAdmin, async (req,res)=>{

    const { rtp } = req.body;

    await db.query(`
      UPDATE system_settings SET value=$1 WHERE key='casino_rtp'
    `,[rtp]);

    await logAction(db, req.user.id, "casino_update", { rtp });

    res.json({ success:true });

  });

  /* =========================================================
     LOGS
  ========================================================= */

  router.get("/logs", requireAdmin, async (req,res)=>{

    const logs = await db.query(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json(logs.rows);

  });

  /* =========================================================
     SYSTEM CONTROL (ADVANCED)
  ========================================================= */

  router.post("/system/freeze-user", requireAdmin, async (req,res)=>{

    const { userId } = req.body;

    await db.query(`
      UPDATE users SET frozen=true WHERE id=$1
    `,[userId]);

    await logAction(db, req.user.id, "user_freeze", { userId });

    res.json({ success:true });

  });

  router.post("/system/unfreeze-user", requireAdmin, async (req,res)=>{

    const { userId } = req.body;

    await db.query(`
      UPDATE users SET frozen=false WHERE id=$1
    `,[userId]);

    await logAction(db, req.user.id, "user_unfreeze", { userId });

    res.json({ success:true });

  });

  /* =========================================================
     RETURN ROUTER
  ========================================================= */

  return router;

};
