"use strict";

/* =========================================================
   BXS DATABASE CORE
   Render + Neon Optimized
========================================================= */

require("dotenv").config();

const { Pool } =
  require("pg");

/* =========================================================
   ENV VALIDATION
========================================================= */

if(!process.env.DATABASE_URL){

  console.error(
    "❌ DATABASE_URL missing"
  );

  process.exit(1);

}

/* =========================================================
   CONFIG
========================================================= */

const isProd =
  process.env.NODE_ENV ===
  "production";

const pool =
  new Pool({

    connectionString:
      process.env.DATABASE_URL,

    ssl:
      isProd

        ? {
            rejectUnauthorized:false
          }

        : false,

    max:3,

    idleTimeoutMillis:10000,

    connectionTimeoutMillis:10000

  });

/* =========================================================
   STATS
========================================================= */

const stats = {

  queries:0,

  errors:0,

  connected:false,

  lastQuery:null

};

/* =========================================================
   EVENTS
========================================================= */

pool.on(

  "connect",

  ()=>{

    stats.connected = true;

    console.log(
      "✅ PostgreSQL connected"
    );

  }

);

pool.on(

  "error",

  err=>{

    stats.errors++;

    console.error(

      "❌ PostgreSQL:",

      err.message

    );

  }

);

/* =========================================================
   QUERY
========================================================= */

async function query(

  text,
  params=[]

){

  try{

    stats.queries++;

    stats.lastQuery =
      Date.now();

    return await pool.query(

      text,

      params

    );

  }catch(err){

    stats.errors++;

    console.error(

      "❌ Query:",

      err.message

    );

    throw err;

  }

}

/* =========================================================
   TRANSACTION
========================================================= */

async function transaction(
  callback
){

  const client =
    await pool.connect();

  try{

    await client.query(
      "BEGIN"
    );

    const result =
      await callback(client);

    await client.query(
      "COMMIT"
    );

    return result;

  }catch(err){

    await client.query(
      "ROLLBACK"
    );

    console.error(

      "❌ TX:",

      err.message

    );

    throw err;

  }finally{

    client.release();

  }

}

/* =========================================================
   HEALTH
========================================================= */

async function health(){

  try{

    const start =
      Date.now();

    await pool.query(
      "SELECT 1"
    );

    return {

      status:"ok",

      latency:
        Date.now() - start,

      total:
        pool.totalCount,

      idle:
        pool.idleCount,

      waiting:
        pool.waitingCount,

      stats

    };

  }catch(err){

    return {

      status:"down",

      error:err.message

    };

  }

}

/* =========================================================
   SHUTDOWN
========================================================= */

async function shutdown(){

  console.log(
    "🛑 Closing PostgreSQL..."
  );

  try{

    await pool.end();

    console.log(
      "✅ PostgreSQL closed"
    );

  }catch(err){

    console.error(

      "Shutdown:",

      err.message

    );

  }

}

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

  pool,

  query,

  transaction,

  health,

  stats

};
