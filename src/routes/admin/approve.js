import express from "express";
import { pool } from "../../db/pg.js";
import { sendBX } from "../../ton/sendBX.js";

const r = express.Router();

// Admin only
function isAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) return res.sendStatus(403);
  next();
}

/*
 POST /admin/approve/:id
 Body: { approve: true|false }
*/
r.post("/:id", isAdmin, async (req, res) => {
  const id = req.params.id;
  const { approve } = req.body;

  // Lock row to prevent double approve
  const q = await pool.query(
    `SELECT * FROM bx_purchases
     WHERE id=$1
     FOR UPDATE`,
    [id]
  );

  if (!q.rowCount) return res.sendStatus(404);
  const order = q.rows[0];

  if (order.status !== "pending") {
    return res.status(409).json({ error: "ALREADY_PROCESSED" });
  }

  if (!approve) {
    await pool.query(
      `UPDATE bx_purchases
       SET status='rejected', approved_at=NOW()
       WHERE id=$1`,
      [id]
    );
    return res.json({ ok: true, status: "rejected" });
  }

  // ✅ APPROVE FLOW
  // 1) Send BX from Admin wallet
  await sendBX(order.user_ton_address, order.bx_amount);

  // 2) Mark approved
  await pool.query(
    `UPDATE bx_purchases
     SET status='approved', approved_at=NOW()
     WHERE id=$1`,
    [id]
  );

  // 3) Log
  await pool.query(
    `INSERT INTO admin_logs(action, ref_id, admin_id)
     VALUES('APPROVE_BUY', $1, $2)`,
    [id, req.user.id]
  );

  // 4) Notify user (async / fire-and-forget)
  try {
    req.bot?.sendMessage(
      order.user_id,
      "✅ Your BX purchase has been approved and delivered."
    );
  } catch {}

  res.json({ ok: true, status: "approved" });
});

export default r;
