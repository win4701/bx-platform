// src/routes/mining.js
import express from "express";
import { pool } from "../db/pg.js";
const r = express.Router();

r.post("/activate", async (req,res)=>{
  const { plan, coin } = req.body;
  const uid = req.user.id;
  await pool.query(
    `INSERT INTO mining_accounts(user_id,plan,coin,last_mine)
     VALUES($1,$2,$3,NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET plan=$2, coin=$3`,
    [uid, plan, coin]
  );
  res.json({ ok:true });
});
