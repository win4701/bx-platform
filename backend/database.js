"use strict";

require("dotenv").config();
const { Pool } = require("pg");

/* =====================================
ENV VALIDATION
===================================== */

const REQUIRED = ["DATABASE_URL"];

REQUIRED.forEach((k) => {
  if (!process.env[k]) {
    console.error(`❌ Missing ENV: ${k}`);
    process.exit(1);
  }
});

const isProd = process.env.NODE_ENV === "production";

/* =====================================
POOL (SUPABASE + HIGH LOAD READY)
===================================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: { rejectUnauthorized: false },

  max: isProd ? 40 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
});

/* =====================================
METRICS
===================================== */

let stats = {
  queries: 0,
  errors: 0,
  slow: 0,
  retries: 0,
};

/* =====================================
POOL EVENTS
===================================== */

pool.on("connect", () => {
  console.log("✅ DB connected");
});

pool.on("error", (err) => {
  stats.errors++;
  console.error("❌ Pool error:", err.message);
});

/* =====================================
SAFE QUERY (TAGGED + TIMEOUT + RETRY)
===================================== */

async function query(text, params = [], opts = {}) {

  const start = Date.now();
  stats.queries++;

  const tag = opts.tag || "default";

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("QUERY_TIMEOUT")), 8000)
  );

  try {

    const res = await Promise.race([
      pool.query(text, params),
      timeout
    ]);

    const duration = Date.now() - start;

    if (duration > 500) {
      stats.slow++;
      console.warn(`🐢 [${tag}] slow query: ${duration}ms`);
    }

    return res;

  } catch (err) {

    stats.errors++;

    console.error(`❌ [${tag}]`, err.message);

    if (
      opts.retry !== false &&
      ["QUERY_TIMEOUT", "ECONNRESET", "ETIMEDOUT"].includes(err.message || err.code)
    ) {
      stats.retries++;
      return query(text, params, { ...opts, retry: false });
    }

    throw err;
  }
}

/* =====================================
TRANSACTION (SERIALIZABLE SAFE)
===================================== */

async function transaction(fn, options = {}) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // 🔥 isolation (critical for market)
    if (options.isolation) {
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolation}`);
    }

    const tx = {
      query: (text, params = []) => client.query(text, params),

      // 🔒 row lock helper
      lockWallet: async (userId, asset) => {
        return client.query(
          `SELECT * FROM wallet_balances
           WHERE user_id = $1 AND asset = $2
           FOR UPDATE`,
          [userId, asset]
        );
      }
    };

    const result = await fn(tx);

    await client.query("COMMIT");

    return result;

  } catch (err) {

    await client.query("ROLLBACK");

    stats.errors++;
    console.error("❌ TX failed:", err.message);

    throw err;

  } finally {
    client.release();
  }
}

/* =====================================
HEALTH (RENDER)
===================================== */

async function health() {

  try {

    const start = Date.now();

    await pool.query("SELECT 1");

    return {
      status: "ok",
      latency: Date.now() - start,
      connections: pool.totalCount,
      idle: pool.idleCount,
      stats
    };

  } catch (e) {

    return {
      status: "down",
      error: e.message
    };

  }
}

/* =====================================
KEEP ALIVE (SUPABASE FIX)
===================================== */

setInterval(async () => {
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    console.warn("⚠️ DB ping failed:", e.message);
  }
}, 25000);

/* =====================================
GRACEFUL SHUTDOWN
===================================== */

async function shutdown() {

  console.log("🛑 Closing DB...");

  try {
    await pool.end();
    console.log("✅ DB closed");
  } catch (e) {
    console.error("Shutdown error:", e.message);
  }

}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* =====================================
EXPORT
===================================== */

module.exports = {
  pool,
  query,
  transaction,
  health
};
