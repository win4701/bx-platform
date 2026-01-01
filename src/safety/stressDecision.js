import { pool } from "../db/pg.js";

export async function runGoNoGo() {

  // أمثلة مبسطة — يمكن تحسينها
  const fraudAvg = 28;
  const fraudMax = 62;
  const ocrAccuracy = 0.83;
  const pending = await pool.query(
    "SELECT COUNT(*) c FROM p2p_payments WHERE status='pending'"
  );

  const sell = await pool.query(
    "SELECT COUNT(*) c FROM sell_requests WHERE created_at > NOW()-INTERVAL '24 hours'"
  );
  const buy = await pool.query(
    "SELECT COUNT(*) c FROM p2p_payments WHERE created_at > NOW()-INTERVAL '24 hours'"
  );

  const sellBuyRatio = buy.rows[0].c
    ? sell.rows[0].c / buy.rows[0].c
    : 0;

  const go =
    fraudAvg < 35 &&
    fraudMax < 70 &&
    ocrAccuracy >= 0.8 &&
    Number(pending.rows[0].c) < 10 &&
    sellBuyRatio < 0.6;

  return go ? "GO" : "NO_GO";
}
