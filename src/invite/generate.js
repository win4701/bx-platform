import crypto from "crypto";
import { pool } from "../db/pg.js";

export async function generateCodes(names = []) {
  for (const name of names) {
    const code = `INV-BX-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    await pool.query(
      `INSERT INTO influencers(name, code, max_users, max_daily_usdt, commission_rate)
       VALUES($1,$2,500,10000,0.05)`,
      [name, code]
    );
  }
}
