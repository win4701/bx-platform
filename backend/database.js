"use strict"

require("dotenv").config()

const { Pool } = require("pg")

/* ================================
DATABASE CONFIG
================================ */

const pool = new Pool({

connectionString: process.env.DATABASE_URL,

ssl: process.env.DATABASE_URL?.includes("render")
? { rejectUnauthorized:false }
: false,

max: 20,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 5000

})

/* ================================
TEST CONNECTION
================================ */

pool.on("connect", () => {

console.log("✓ PostgreSQL connected")

})

pool.on("error", (err) => {

console.error("PostgreSQL error:", err)

})

/* ================================
QUERY HELPER
================================ */

async function query(text, params){

try{

const start = Date.now()

const res = await pool.query(text, params)

const duration = Date.now() - start

if(duration > 500){

console.log("Slow query:", text, duration,"ms")

}

return res

}catch(err){

console.error("DB Query error:", err)

throw err

}

}

/* ================================
TRANSACTION HELPER
================================ */

async function transaction(callback){

const client = await pool.connect()

try{

await client.query("BEGIN")

const result = await callback(client)

await client.query("COMMIT")

return result

}catch(e){

await client.query("ROLLBACK")

throw e

}finally{

client.release()

}

}

/* ================================
HEALTH CHECK
================================ */

async function health(){

try{

const r = await pool.query("SELECT NOW()")

return r.rows[0]

}catch(e){

console.error("DB health check failed")

return null

}

}

/* ================================
EXPORTS
================================ */

module.exports = {

pool,
query,
transaction,
health

}
