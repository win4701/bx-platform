// src/routes/history.js
import express from "express";
import { pool } from "../db/pg.js";
const r = express.Router();

r.get("/", async (req,res)=>{
  const uid = req.user.id;
  const rows = await pool.query(`
    SELECT 'buy' t, amount_usd a, created_at d FROM p2p_payments WHERE user_id=$1
    UNION ALL
    SELECT 'sell', usd_amount, created_at FROM sell_requests WHERE user_id=$1
    ORDER BY d DESC LIMIT 50
  `,[uid]);
  res.json(rows.rows);
});
export default r;
