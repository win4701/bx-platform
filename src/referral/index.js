import { pool } from "../db/pg.js";

export async function getReferralStats(userId) {
  const r = await pool.query(
    `SELECT COUNT(*) total, COALESCE(SUM(bonus),0) earned
     FROM referrals WHERE referrer=$1`,
    [userId]
  );
  return r.rows[0];
}

export function computeLevel(count) {
  if (count >= 50) return "Gold";
  if (count >= 10) return "Silver";
  return "Bronze";
}
