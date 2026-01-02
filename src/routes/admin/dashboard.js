import express from "express";
import { pool } from "../../db/pg.js";

const r = express.Router();

// Middleware: Admin only
function isAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) return res.sendStatus(403);
  next();
}

/*
 GET /admin/dashboard
 Returns:
 - pending payments
 - last approvals
 - KPIs
*/
r.get("/", isAdmin, async (req, res) => {
  const pending = await pool.query(`
    SELECT id, user_id, method, amount_usdt, bx_amount, reference, created_at
    FROM bx_purchases
    WHERE status='pending'
    ORDER BY created_at ASC
    LIMIT 50
  `);

  const approved = await pool.query(`
    SELECT id, user_id, method, amount_usdt, bx_amount, reference, approved_at
    FROM bx_purchases
    WHERE status='approved'
    ORDER BY approved_at DESC
    LIMIT 20
  `);

  const kpis = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COALESCE(SUM(amount_usdt),0) FROM bx_purchases WHERE status='approved') AS total_usdt,
      (SELECT COALESCE(SUM(bx_amount),0) FROM bx_purchases WHERE status='approved') AS total_bx_out,
      (SELECT COUNT(*) FROM bx_purchases WHERE status='pending') AS pending_count
  `);

  res.json({
    pending: pending.rows,
    approved: approved.rows,
    kpis: kpis.rows[0]
  });
});

export default r;
