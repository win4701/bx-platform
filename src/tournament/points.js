// src/tournament/points.js
import { pool } from "../db/pg.js";

export async function addPoints({ userId, game, win, multiplier }) {
  const t = await pool.query(
    "SELECT id FROM tournaments WHERE status='active' LIMIT 1"
  );
  if (!t.rowCount) return;

  let pts = 1;
  if (win) pts += 5;
  if (game === "crash" && multiplier >= 2) pts += 3;

  await pool.query(
    `INSERT INTO tournament_scores(user_id,tournament_id,points)
     VALUES($1,$2,$3)
     ON CONFLICT (user_id,tournament_id)
     DO UPDATE SET points = tournament_scores.points + $3`,
    [userId, t.rows[0].id, pts]
  );
}
