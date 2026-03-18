"use strict";

require("dotenv").config();
const { Pool } = require("pg");

/* =====================================
CONFIG
===================================== */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL missing");
  process.exit(1);
}

const isProd = process.env.NODE_ENV === "production";

/* =====================================
POOL
===================================== */

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: isProd ? { rejectUnauthorized: false } : false,

  max: 25,
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
  slow: 0
};

/* =====================================
POOL EVENTS
===================================== */

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err.message);
  stats.errors++;
});

/* =====================================
SAFE QUERY (TIMEOUT + RETRY + METRICS)
===================================== */

async function query(text, params = [], retry = 2){

  const start = Date.now();
  stats.queries++;

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("QUERY_TIMEOUT")), 8000)
  );

  try{

    const res = await Promise.race([
      pool.query(text, params),
      timeout
    ]);

    const duration = Date.now() - start;

    if(duration > 500){
      stats.slow++;
      console.log("🐢 Slow query:", duration, "ms");
    }

    return res;

  }catch(err){

    stats.errors++;
    console.error("❌ DB error:", err.message);

    if(
      retry > 0 &&
      (
        err.message === "QUERY_TIMEOUT" ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT"
      )
    ){
      console.log("🔁 Retrying query...");
      return query(text, params, retry - 1);
    }

    throw err;
  }

}

/* =====================================
TRANSACTION (SAFE WRAPPER)
===================================== */

async function transaction(fn){

  const client = await pool.connect();

  try{

    await client.query("BEGIN");

    const result = await fn({
      query: (text, params)=> client.query(text, params)
    });

    await client.query("COMMIT");

    return result;

  }catch(err){

    await client.query("ROLLBACK");
    stats.errors++;

    console.error("❌ TX failed:", err.message);

    throw err;

  }finally{
    client.release();
  }

}

/* =====================================
HEALTH CHECK
===================================== */

async function health(){

  try{

    const start = Date.now();

    await pool.query("SELECT 1");

    return {
      status: "ok",
      latency: Date.now() - start,
      connections: pool.totalCount,
      idle: pool.idleCount,
      stats
    };

  }catch(e){

    return {
      status: "down",
      error: e.message
    };

  }

}

/* =====================================
AUTO CHECK (KEEP ALIVE)
===================================== */

setInterval(async ()=>{

  try{
    await pool.query("SELECT 1");
  }catch(e){
    console.error("⚠️ DB ping failed:", e.message);
  }

}, 30000);

/* =====================================
GRACEFUL SHUTDOWN
===================================== */

async function shutdown(){

  console.log("🛑 Closing DB...");

  try{
    await pool.end();
    console.log("✅ DB closed");
  }catch(e){
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
