"use strict";

/* =========================================================
   BLOXIO DATABASE CORE
========================================================= */

const { Pool } =
  require("pg");

/* =========================================================
   ENV
========================================================= */

const DATABASE_URL =
  process.env.DATABASE_URL;

if(!DATABASE_URL){

  throw new Error(
    "❌ Missing DATABASE_URL"
  );

}

/* =========================================================
   POOL
========================================================= */

const pool =
  new Pool({

    connectionString:
      DATABASE_URL,

    ssl:{
      rejectUnauthorized:false
    },

    max:10,

    idleTimeoutMillis:
      30000,

    connectionTimeoutMillis:
      10000

  });

/* =========================================================
   EVENTS
========================================================= */

pool.on(

  "connect",

  ()=>{

    console.log(
      "✅ PostgreSQL connected"
    );

  }

);

pool.on(

  "error",

  err=>{

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

  const start =
    Date.now();

  let client;

  try{

    client =
      await pool.connect();

    const result =
      await client.query(
        text,
        params
      );

    const time =
      Date.now() - start;

    if(time > 1000){

      console.warn(

        "⚠️ Slow query:",

        time,
        "ms"

      );

    }

    return result;

  }catch(err){

    console.error(

      "❌ DB query error:",

      err.message

    );

    throw err;

  }finally{

    if(client){

      client.release();

    }

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

    await query(
      "SELECT NOW()"
    );

    return true;

  }catch{

    return false;

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  pool,

  query,

  transaction,

  health

};
