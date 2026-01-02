// src/games/Crash.js
import crypto from "crypto";
import { pool } from "../db/pg.js";

const RTP = 0.97;          // نسبة العائد
const HOUSE_EDGE = 1 - RTP;

// إنشاء Round جديد
export async function createCrashRound() {
  const seed = crypto.randomBytes(16).toString("hex");
  const crashPoint = calcCrashPoint(seed);

  const { rows } = await pool.query(
    `INSERT INTO crash_rounds (seed, crash_point, status)
     VALUES ($1,$2,'active')
     RETURNING id, crash_point`,
    [seed, crashPoint]
  );

  return rows[0];
}

// حساب نقطة الانفجار (عادل)
function calcCrashPoint(seed) {
  const h = crypto.createHash("sha256").update(seed).digest("hex");
  const n = parseInt(h.slice(0, 8), 16);
  const max = Math.floor((1 / HOUSE_EDGE) * 100);
  const point = Math.max(1.01, (max / (n % max + 1)) / 100);
  return Number(point.toFixed(2));
}

// بدء الرهان
export async function placeCrashBet(userId, roundId, betBx) {
  await pool.query("BEGIN");

  // خصم الرهان
  await pool.query(
    `UPDATE users SET bx = bx - $1
     WHERE id=$2 AND bx >= $1`,
    [betBx, userId]
  );

  // تسجيل الرهان
  await pool.query(
    `INSERT INTO crash_bets (round_id, user_id, bet_bx)
     VALUES ($1,$2,$3)`,
    [roundId, userId, betBx]
  );

  await pool.query("COMMIT");
}

// Cashout
export async function cashoutCrash(userId, roundId, multiplier) {
  await pool.query("BEGIN");

  const { rows } = await pool.query(
    `SELECT r.crash_point, b.bet_bx, b.status
     FROM crash_rounds r
     JOIN crash_bets b ON b.round_id=r.id
     WHERE r.id=$1 AND b.user_id=$2 FOR UPDATE`,
    [roundId, userId]
  );

  if (!rows.length) {
    await pool.query("ROLLBACK");
    throw new Error("BET_NOT_FOUND");
  }

  const { crash_point, bet_bx, status } = rows[0];
  if (status === "cashed") {
    await pool.query("ROLLBACK");
    throw new Error("ALREADY_CASHED");
  }

  // إذا حاول cashout بعد الانفجار → خسارة
  if (multiplier > crash_point) {
    await pool.query(
      `UPDATE crash_bets SET status='lost'
       WHERE round_id=$1 AND user_id=$2`,
      [roundId, userId]
    );
    await pool.query("COMMIT");
    return { win: false };
  }

  const winBx = bet_bx * multiplier;

  await pool.query(
    `UPDATE users SET bx = bx + $1 WHERE id=$2`,
    [winBx, userId]
  );

  await pool.query(
    `UPDATE crash_bets SET status='cashed', payout_bx=$1
     WHERE round_id=$2 AND user_id=$3`,
    [winBx, roundId, userId]
  );

  await pool.query("COMMIT");
  return { win: true, payout: winBx };
}
