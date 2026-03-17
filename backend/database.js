"use strict"

require("dotenv").config()
const { Pool } = require("pg")

/* =====================================
CONFIG
===================================== */

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL missing")
  process.exit(1)
}

/* =====================================
SMART SSL (Render + Fly compatible)
===================================== */

const isProd = process.env.NODE_ENV === "production"

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  },

  max: 10, // أقل = استقرار أعلى على Render
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,

  keepAlive: true,
})

/* =====================================
AUTO RECONNECT (IMPORTANT)
===================================== */

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err.message)
})

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected")
})

/* =====================================
SAFE QUERY (WITH RETRY + BACKOFF)
===================================== */

async function query(text, params, retry = 2) {
  try {
    return await pool.query(text, params)
  } catch (err) {
    console.error("❌ DB query error:", err.message)

    if (retry > 0) {
      console.log("🔁 Retrying query...")
      await new Promise(res => setTimeout(res, 500))
      return query(text, params, retry - 1)
    }

    throw err
  }
}

/* =====================================
TRANSACTION SAFE
===================================== */

async function transaction(fn) {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const result = await fn(client)

    await client.query("COMMIT")

    return result
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("❌ Transaction failed:", err.message)
    throw err
  } finally {
    client.release()
  }
}

/* =====================================
HEALTH CHECK
===================================== */

async function health() {
  try {
    const start = Date.now()
    await pool.query("SELECT 1")
    return {
      status: "ok",
      latency: Date.now() - start,
      connections: pool.totalCount
    }
  } catch (e) {
    return {
      status: "down",
      error: e.message
    }
  }
}

/* =====================================
KEEP ALIVE (VERY IMPORTANT FOR FLY)
===================================== */

setInterval(async () => {
  try {
    await pool.query("SELECT 1")
    console.log("💓 DB keep-alive")
  } catch (e) {
    console.error("⚠️ Keep-alive failed:", e.message)
  }
}, 30000)

/* =====================================
GRACEFUL SHUTDOWN
===================================== */

async function shutdown() {
  console.log("🔻 Closing PostgreSQL pool...")
  try {
    await pool.end()
    console.log("✅ DB pool closed")
  } catch (e) {
    console.error("Shutdown error:", e.message)
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

/* =====================================
EXPORT
===================================== */

module.exports = {
  pool,
  query,
  transaction,
  health
}
