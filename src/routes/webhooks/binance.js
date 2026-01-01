import express from "express";
import { pool } from "../../db/pg.js";
const r = express.Router();

/*
 POST /webhook/binance/confirm
 body: { user_id, plan, amount, reference }
*/
r.post("/confirm", async (req,res)=>{
  const { user_id, plan, reference } = req.body;

  // منع التكرار
  const dupe = await pool.query(
    "SELECT 1 FROM plan_purchases WHERE reference=$1",
    [reference]
  );
  if (dupe.rowCount) return res.json({ ok:true });

  // تأكيد الشراء
  await pool.query(
    `UPDATE plan_purchases
     SET status='paid', reference=$1
     WHERE user_id=$2 AND plan=$3 AND status='pending'`,
    [reference, user_id, plan]
  );

  // تفعيل الخطة
  await pool.query(
    `UPDATE mining_accounts SET plan=$1 WHERE user_id=$2`,
    [plan, user_id]
  );

  res.json({ ok:true });
});

export default r;
