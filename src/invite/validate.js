import { pool } from "../db/pg.js";

export async function validateInvite(code){
  const q = await pool.query(
    "SELECT * FROM influencers WHERE code=$1 AND active=true",
    [code]
  );
  return q.rowCount ? q.rows[0] : null;
}
