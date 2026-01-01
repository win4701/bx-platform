// src/routes/sell.js
import express from "express";
import { pool } from "../db/pg.js";
const r = express.Router();

const BX_USD = 0.05; // مثال

r.post("/request", async (req,res)=>{
  const { method, bx, payoutId } = req.body;
  const uid = req.user.id;

  const usd = +(bx * BX_USD).toFixed(2);
  // limits مختصرة
  if (usd > 100) return res.status(400).json({ error:"LIMIT" });

  await pool.query(
    `INSERT INTO sell_requests(user_id,method,bx_amount,usd_amount,payout_id)
     VALUES($1,$2,$3,$4,$5)`,
    [uid, method, bx, usd, payoutId]
  );

  // خصم BX فور الطلب (حجز)
  await pool.query("UPDATE users SET bx=bx-$1 WHERE id=$2",[bx,uid]);

  res.json({ ok:true, usd });
});
export default r;
