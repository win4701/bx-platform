"use strict"

require("dotenv").config()

const { Pool } = require("pg")

/* =====================================
CONFIG
===================================== */

const DATABASE_URL = process.env.DATABASE_URL

if(!DATABASE_URL){

console.error("DATABASE_URL missing")
process.exit(1)

}

/* =====================================
POOL
===================================== */

const pool = new Pool({

connectionString: DATABASE_URL,

ssl: DATABASE_URL.includes("render")
? { rejectUnauthorized:false }
: false,

max: 30,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 8000,

allowExitOnIdle:false

})

/* =====================================
POOL EVENTS
===================================== */

pool.on("connect", ()=>{

console.log("✓ PostgreSQL connected")

})

pool.on("error",(err)=>{

console.error("PostgreSQL pool error:",err)

})

/* =====================================
QUERY
===================================== */

async function query(text,params){

const start = Date.now()

try{

const res = await pool.query(text,params)

const duration = Date.now() - start

if(duration > 800){

console.log("Slow query:",duration,"ms")

}

return res

}catch(err){

console.error("DB query failed",err)

throw err

}

}

/* =====================================
TRANSACTION
===================================== */

async function transaction(fn){

const client = await pool.connect()

try{

await client.query("BEGIN")

const result = await fn(client)

await client.query("COMMIT")

return result

}catch(e){

await client.query("ROLLBACK")

throw e

}finally{

client.release()

}

}

/* =====================================
HEALTH
===================================== */

async function health(){

try{

const r = await pool.query("SELECT NOW() as time")

return {

status:"ok",
time:r.rows[0].time

}

}catch(e){

return {

status:"down"

}

}

}

/* =====================================
GRACEFUL SHUTDOWN
===================================== */

async function shutdown(){

console.log("Closing PostgreSQL pool")

await pool.end()

process.exit(0)

}

process.on("SIGINT",shutdown)
process.on("SIGTERM",shutdown)

/* =====================================
EXPORT
===================================== */

module.exports = {

pool,
query,
transaction,
health

  }
