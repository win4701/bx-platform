import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db/pg.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "../sql/migrations");

export async function runMigrations() {
  console.log("🔁 Running migrations...");

  // 1) Create migrations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 2) Read migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const done = await pool.query(
      "SELECT 1 FROM migrations WHERE filename=$1",
      [file]
    );
    if (done.rowCount) continue;

    console.log(`➡️ Executing ${file}`);
    const sql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, file),
      "utf8"
    );

    await pool.query(sql);
    await pool.query(
      "INSERT INTO migrations(filename) VALUES($1)",
      [file]
    );
  }

  console.log("✅ Migrations completed");
}
