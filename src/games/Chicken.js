// src/games/Chicken.js
import crypto from "crypto";
import { pool } from "../db/pg.js";

const BASE_RISK = 0.15;
const STEP_RISK = 0.05;

// بدء جلسة
export async function startChicken(userId, betBx) {
  await pool.query("BEGIN");

  await pool.query(
    `UPDATE users SET bx=bx-$1
     WHERE id=$2 AND bx >= $1`,
    [betBx, userId]
  );

  const { rows } = await pool.query(
    `INSERT INTO chicken_games (user_id, bet_bx)
     VALUES ($1,$2) RETURNING id`,
    [userId, betBx]
  );

  await pool.query("COMMIT");
  return rows[0];
}

// خطوة للأمام
export async function chickenStep(gameId) {
  const { rows } = await pool.query(
    `SELECT step, bet_bx, status FROM chicken_games
     WHERE id=$1 FOR UPDATE`,
    [gameId]
  );

  if (!rows.length) throw new Error("GAME_NOT_FOUND");
  const g = rows[0];
  if (g.status !== "playing") throw new Error("GAME_ENDED");

  const risk = BASE_RISK + g.step * STEP_RISK;
  const roll = crypto.randomInt(0, 100) / 100;

  // خسارة
  if (roll < risk) {
    await pool.query(
      `UPDATE chicken_games SET status='lost'
       WHERE id=$1`,
      [gameId]
    );
    return { alive: false };
  }

  // نجاة
  await pool.query(
    `UPDATE chicken_games SET step=step+1 WHERE id=$1`,
    [gameId]
  );
  return { alive: true };
}

// Cashout
export async function chickenCashout(gameId) {
  await pool.query("BEGIN");

  const { rows } = await pool.query(
    `SELECT user_id, bet_bx, step, status
     FROM chicken_games WHERE id=$1 FOR UPDATE`,
    [gameId]
  );

  if (!rows.length) {
    await pool.query("ROLLBACK");
    throw new Error("GAME_NOT_FOUND");
  }

  const g = rows[0];
  if (g.status !== "playing") {
    await pool.query("ROLLBACK");
    throw new Error("GAME_ENDED");
  }

  const multiplier = 1 + g.step * 0.25;
  const payout = g.bet_bx * multiplier;

  await pool.query(
    `UPDATE users SET bx=bx+$1 WHERE id=$2`,
    [payout, g.user_id]
  );

  await pool.query(
    `UPDATE chicken_games
     SET status='cashed', payout_bx=$1
     WHERE id=$2`,
    [payout, gameId]
  );

  await pool.query("COMMIT");
  return { payout };
}
