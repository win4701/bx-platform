"use strict";

/* =========================================================
BLOXIO REDIS CORE
========================================================= */

const Redis =
require("ioredis");

/* =========================================================
ENV
========================================================= */

const REDIS_URL =
process.env.REDIS_URL;

/* =========================================================
OPTIONAL REDIS
========================================================= */

if(!REDIS_URL){

console.log(
" Redis disabled"
);

module.exports = {

disabled:true,

client:null,

duplicate:()=>null,

async getCache(){
  return null;
},

async setCache(){
  return false;
},

async delCache(){
  return false;
},

async lock(){
  return true;
},

async unlock(){
  return true;
},

async incr(){
  return 0;
},

async expire(){
  return false;
},

async publish(){
  return false;
},

async subscribe(){
  return false;
},

async shutdown(){
  return true;
}

};

return;

}

/* =========================================================
CLIENT
========================================================= */

const redis =
new Redis(

REDIS_URL,

{

  lazyConnect:false,

  maxRetriesPerRequest:null,

  enableReadyCheck:true,

  connectTimeout:10000,

  retryStrategy(times){

    return Math.min(
      times * 300,
      3000
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
  " Redis connected"
);

}

);

redis.on(

"ready",

()=>{

console.log(
  "✅ Redis ready"
);

}

);

redis.on(

"reconnecting",

()=>{

console.log(
  " Redis reconnecting"
);

}

);

redis.on(

"error",

err=>{

console.error(

  " Redis:",

  err.message

);

}

);

redis.on(

"close",

()=>{

console.log(
  " Redis closed"
);

}

);

/* =========================================================
DUPLICATE CONNECTION
========================================================= */

function duplicate(){

return redis.duplicate();

}

/* =========================================================
CACHE
========================================================= */

async function getCache(
key
){

try{

const value =
  await redis.get(key);

if(!value){

  return null;

}

try{

  return JSON.parse(
    value
  );

}catch{

  return value;

}

}catch(err){

console.error(
  "Redis GET:",
  err.message
);

return null;

}

}

async function setCache(
key,
value,
ttl = 60
){

try{

const payload =

  typeof value === "string"
    ? value
    : JSON.stringify(value);

await redis.set(

  key,

  payload,

  "EX",

  ttl

);

return true;

}catch(err){

console.error(
  "Redis SET:",
  err.message
);

return false;

}

}

async function delCache(
key
){

try{

await redis.del(key);

return true;

}catch(err){

console.error(
  "Redis DEL:",
  err.message
);

return false;

}

}

/* =========================================================
LOCKS
========================================================= */

async function lock(
key,
ttl = 30
){

try{

const result =
  await redis.set(

    key,

    "1",

    "EX",

    ttl,

    "NX"

  );

return result === "OK";

}catch{

return false;

}

}

async function unlock(
key
){

try{

await redis.del(key);

return true;

}catch{

return false;

}

}

/* =========================================================
SHUTDOWN
========================================================= */

async function shutdown(){

try{

await redis.quit();

console.log(
  " Redis shutdown"
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

disabled:false,

client:
redis,

duplicate,

getCache,

setCache,

delCache,

lock,

unlock,

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
redis.subscribe(...args),

shutdown

};
