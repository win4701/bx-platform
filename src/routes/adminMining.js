// src/routes/adminMining.js
import express from "express";
import { pool } from "../db/pg.js";
const r = express.Router();

r.get("/plans", async (req,res)=>{
  if(!req.user?.isAdmin) return res.sendStatus(403);
  const q = await pool.query("SELECT * FROM mining_plans ORDER BY plan");
  res.json(q.rows);
});

r.post("/plans", async (req,res)=>{
  if(!req.user?.isAdmin) return res.sendStatus(403);
  const { plan, daily_rate, withdraw_min, cooldown_hours } = req.body;
  await pool.query(
    `INSERT INTO mining_plans(plan,daily_rate,withdraw_min,cooldown_hours)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (plan) DO UPDATE SET
       daily_rate=$2, withdraw_min=$3, cooldown_hours=$4`,
    [plan, daily_rate, withdraw_min, cooldown_hours]
  );
  res.json({ ok:true });
});

export default r;
