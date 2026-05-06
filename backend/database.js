"use strict";

/* =========================================================
   BXS DATABASE CORE — ENTERPRISE POSTGRES LAYER
========================================================= */

require("dotenv").config();

const {

  Pool

} = require("pg");

const crypto =
  require("crypto");

/* =========================================================
   ENV
========================================================= */

const REQUIRED = [

  "DATABASE_URL"

];

for(const k of REQUIRED){

  if(!process.env[k]){

    console.error(
      `❌ Missing ENV: ${k}`
    );

    process.exit(1);

  }

}

const isProd =
  process.env.NODE_ENV ===
  "production";

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

  max:
    isProd ? 50 : 10,

  idleTimeoutMillis:
    30000,

  connectionTimeoutMillis:
    5000,

  keepAlive:true,

  statement_timeout:
    10000,

  query_timeout:
    10000

};

/* =========================================================
   POOL
========================================================= */

const pool =
  new Pool({

    connectionString:
      process.env
        .DATABASE_URL,

    ssl:{
      rejectUnauthorized:false
    },

    ...CONFIG

  });

/* =========================================================
   METRICS
========================================================= */

const stats = {

  queries:0,

  errors:0,

  retries:0,

  slow:0,

  tx:0,

  deadlocks:0

};

/* =========================================================
   POOL EVENTS
========================================================= */

pool.on(

  "connect",

  async(client)=>{

    console.log(
      "✅ DB connected"
    );

    try{

      await client.query(`
        SET statement_timeout
        TO 10000
      `);

    }catch(e){}

  }

);

pool.on(

  "error",

  err=>{

    stats.errors++;

    console.error(

      "❌ Pool error:",

      err.message

    );

  }

);

/* =========================================================
   TRACE ID
========================================================= */

function trace(){

  return crypto
    .randomBytes(6)
    .toString("hex");

}

/* =========================================================
   QUERY
========================================================= */

async function query(

  text,
  params=[],
  opts={}

){

  const start =
    Date.now();

  const id =
    trace();

  stats.queries++;

  const tag =
    opts.tag ||
    "default";

  try{

    const res =
      await pool.query({

        text,
        values:params,

        statement_timeout:
          opts.timeout ||
          10000

      });

    const duration =
      Date.now() - start;

    if(duration > 500){

      stats.slow++;

      console.warn(

        `🐢 [${tag}]`,

        `${duration}ms`,

        id

      );

    }

    return res;

  }catch(err){

    stats.errors++;

    console.error(

      `❌ [${tag}]`,

      err.message,

      id

    );

    /* ===================================
       RETRY
    =================================== */

    if(

      opts.retry !== false &&

      [

        "40001",
        "40P01",
        "ETIMEDOUT",
        "ECONNRESET"

      ].includes(

        err.code ||
        err.message

      )

    ){

      stats.retries++;

      if(
        err.code === "40P01"
      ){

        stats.deadlocks++;

      }

      await sleep(50);

      return query(

        text,

        params,

        {

          ...opts,

          retry:false

        }

      );

    }

    throw err;

  }

}

/* =========================================================
   SLEEP
========================================================= */

function sleep(ms){

  return new Promise(r=>
    setTimeout(r,ms)
  );

}

/* =========================================================
   TRANSACTION
========================================================= */

async function transaction(

  fn,
  options={}

){

  const client =
    await pool.connect();

  const txId =
    trace();

  stats.tx++;

  try{

    await client.query(
      "BEGIN"
    );

    /* ===================================
       ISOLATION
    =================================== */

    if(
      options.isolation
    ){

      await client.query(
        `SET TRANSACTION ISOLATION LEVEL ${options.isolation}`
      );

    }

    /* ===================================
       TIMEOUT
    =================================== */

    await client.query(`
      SET LOCAL statement_timeout
      TO 10000
    `);

    const tx = {

      query:(

        text,
        params=[]

      )=>client.query({

        text,

        values:params

      }),

      lockWallet:(
        userId,
        asset
      )=>client.query(`
        SELECT *
        FROM wallet_balances
        WHERE user_id=$1
        AND asset=$2
        FOR UPDATE
      `,[

        userId,
        asset

      ]),

      client

    };

    const result =
      await fn(tx);

    await client.query(
      "COMMIT"
    );

    return result;

  }catch(err){

    await client.query(
      "ROLLBACK"
    );

    stats.errors++;

    console.error(

      "❌ TX:",

      err.message,

      txId

    );

    /* ===================================
       SERIALIZATION RETRY
    =================================== */

    if(

      options.retry !== false &&

      [

        "40001",
        "40P01"

      ].includes(err.code)

    ){

      stats.retries++;

      await sleep(100);

      return transaction(

        fn,

        {

          ...options,

          retry:false

        }

      );

    }

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
        Date.now()-start,

      total:
        pool.totalCount,

      idle:
        pool.idleCount,

      waiting:
        pool.waitingCount,

      stats

    };

  }catch(e){

    return {

      status:"down",

      error:e.message

    };

  }

}

/* =========================================================
   KEEP ALIVE
========================================================= */

setInterval(

  async()=>{

    try{

      await pool.query(
        "SELECT 1"
      );

    }catch(e){

      console.warn(

        "⚠️ DB ping:",

        e.message

      );

    }

  },

  25000

);

/* =========================================================
   SHUTDOWN
========================================================= */

async function shutdown(){

  console.log(
    "🛑 Closing DB..."
  );

  try{

    await pool.end();

    console.log(
      "✅ DB closed"
    );

  }catch(e){

    console.error(

      "Shutdown:",

      e.message

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
   EXPORT
========================================================= */

module.exports = {

  pool,

  query,

  transaction,

  health,

  stats

};
