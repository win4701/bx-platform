"use strict";

/* =========================================================
   BXS REDIS CORE
========================================================= */

const Redis =
  require("ioredis");

const REDIS_URL =
  process.env.REDIS_URL;

/* =========================================================
   OPTIONAL REDIS
========================================================= */

if(!REDIS_URL){

  console.log(
    "⚠️ Redis disabled"
  );

  module.exports = null;

  return;

}

/* =========================================================
   CLIENT
========================================================= */

const redis =
  new Redis(

    REDIS_URL,

    {

      lazyConnect:true,

      maxRetriesPerRequest:3,

      enableReadyCheck:true,

      retryStrategy(times){

        return Math.min(
          times * 200,
          2000
        );

      }

    }

);

/* =========================================================
   EVENTS
========================================================= */

redis.on(

  "connect",

  ()=>{

    console.log(
      "🔥 Redis connected"
    );

  }

);

redis.on(

  "error",

  err=>{

    console.error(

      "❌ Redis:",

      err.message

    );

  }

);

/* =========================================================
   HELPERS
========================================================= */

async function getCache(
  key
){

  try{

    return await redis.get(
      key
    );

  }catch{

    return null;

  }

}

async function setCache(
  key,
  value,
  ttl = 60
){

  try{

    await redis.set(

      key,

      typeof value === "string"
        ? value
        : JSON.stringify(value),

      "EX",

      ttl

    );

    return true;

  }catch{

    return false;

  }

}

async function delCache(
  key
){

  try{

    await redis.del(key);

  }catch{}

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  client:
    redis,

  getCache,

  setCache,

  delCache,

  incr:
    (...args)=>
      redis.incr(...args),

  expire:
    (...args)=>
      redis.expire(...args),

  publish:
    (...args)=>
      redis.publish(...args),

  subscribe:
    (...args)=>
      redis.subscribe(...args)

};
