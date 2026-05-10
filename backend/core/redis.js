"use strict";

const Redis =
  require("ioredis");

if(!process.env.REDIS_URL){

  console.warn(
    "⚠️ Redis disabled"
  );

  module.exports = null;

  return;

}

const redis =
  new Redis(

    process.env.REDIS_URL,

    {

      maxRetriesPerRequest:3,

      enableReadyCheck:true,

      lazyConnect:true

    }

);

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

module.exports =
  redis;
