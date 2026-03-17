"use strict"

require("dotenv").config()

const { Pool } = require("pg")

/* =====================================
CONFIG
===================================== */

const DATABASE_URL = process.env.DATABASE_URL

if(!DATABASE_URL){
console.error(" DATABASE_URL missing")
process.exit(1)
}

/* =====================================
POOL (SMART SSL)
===================================== */

const isProd = process.env.NODE_ENV === "production"

const pool = new Pool({
connectionString: DATABASE_URL,

ssl: isProd
? { rejectUnauthorized:false }
: false,

max: 20,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 10000
})

/* =====================================
POOL EVENTS
===================================== */

pool.on("connect", ()=>{
console.log(" PostgreSQL connected")
})

pool.on("error",(err)=>{
console.error(" PostgreSQL pool error:",err)
})

/* =====================================
SAFE QUERY (WITH RETRY)
===================================== */

async function query(text, params, retry = 1){

const start = Date.now()

try{

const res = await pool.query(text, params)

const duration = Date.now() - start

if(duration > 500){
console.log(" Slow query:", duration, "ms")
}

return res

}catch(err){

console.error("DB query error:", err.message)

if(retry > 0){
console.log(" Retrying query...")
return query(text, params, retry - 1)
}

throw err

}

}

/* =====================================
TRANSACTION (SAFE)
===================================== */

async function transaction(fn){

const client = await pool.connect()

try{

await client.query("BEGIN")

const result = await fn(client)

await client.query("COMMIT")

return result

}catch(err){

await client.query("ROLLBACK")

console.error(" Transaction failed:", err.message)

throw err

}finally{

client.release()

}

}

/* =====================================
HEALTH CHECK (PRODUCTION READY)
===================================== */

async function health(){

try{

const start = Date.now()

await pool.query("SELECT 1")

const latency = Date.now() - start

return {
status:"ok",
latency,
connections: pool.totalCount
}

}catch(e){

return {
status:"down",
error:e.message
}

}

}

/* =====================================
GRACEFUL SHUTDOWN (SAFE)
===================================== */

async function shutdown(){

console.log(" Closing PostgreSQL pool...")

try{
await pool.end()
console.log(" DB pool closed")
}catch(e){
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
