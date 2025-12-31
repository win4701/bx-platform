import { pool } from "./db/pg.js";

export async function logEvent(userId, type, meta = {}) {
  await pool.query(
    "INSERT INTO events(user_id,type,meta) VALUES($1,$2,$3)",
    [userId, type, meta]
  );
}
