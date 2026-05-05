"use strict";

/* =========================================================
   BLOXIO REDIS CORE — ULTRA PRODUCTION
========================================================= */

const Redis = require("ioredis");
const config = require("../config");

/* =========================================================
   CONNECTION
========================================================= */

const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times){
    return Math.min(times * 100, 3000);
  }
});

/* =========================================================
   EVENTS
========================================================= */

redis.on("connect", ()=>{
  console.log("🔥 Redis connected");
});

redis.on("ready", ()=>{
  console.log("✅ Redis ready");
});

redis.on("error", (err)=>{
  console.error("❌ Redis error:", err.message);
});

redis.on("reconnecting", ()=>{
  console.warn("⚠️ Redis reconnecting...");
});

/* =========================================================
   PREFIX HELPER
========================================================= */

const prefix = config.redis.prefix || "bx:";

function key(k){
  return prefix + k;
}

/* =========================================================
   CACHE SYSTEM
========================================================= */

async function setCache(k, value, ttl = 60){

  await redis.set(
    key(k),
    JSON.stringify(value),
    "EX",
    ttl
  );

}

async function getCache(k){

  const data = await redis.get(key(k));

  if(!data) return null;

  try{
    return JSON.parse(data);
  }catch{
    return null;
  }

}

async function delCache(k){
  await redis.del(key(k));
}

/* =========================================================
   PUB/SUB SYSTEM
========================================================= */

const pub = redis;
const sub = new Redis(config.redis.url);

async function publish(channel, data){

  await pub.publish(channel, JSON.stringify(data));

}

function subscribe(channel, handler){

  sub.subscribe(channel);

  sub.on("message",(ch,msg)=>{
    if(ch === channel){
      handler(JSON.parse(msg));
    }
  });

}

/* =========================================================
   DISTRIBUTED LOCK (🔥 مهم)
========================================================= */

async function lock(resource, ttl = 5000){

  const lockKey = key("lock:" + resource);

  const result = await redis.set(
    lockKey,
    "1",
    "NX",
    "PX",
    ttl
  );

  return result === "OK";

}

async function unlock(resource){
  await redis.del(key("lock:" + resource));
}

/* =========================================================
   RATE LIMIT (REDIS BASED)
========================================================= */

async function rateLimit(k, limit, window){

  const rlKey = key("rl:" + k);

  const count = await redis.incr(rlKey);

  if(count === 1){
    await redis.expire(rlKey, window);
  }

  return count <= limit;

}

/* =========================================================
   HEALTH CHECK
========================================================= */

async function health(){

  try{
    await redis.ping();
    return true;
  }catch{
    return false;
  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  redis,
  setCache,
  getCache,
  delCache,
  publish,
  subscribe,
  lock,
  unlock,
  rateLimit,
  health
};
