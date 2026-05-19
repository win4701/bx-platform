"use strict";

/* =========================================================
BLOXIO SYSTEM QUEUE
========================================================= */

const {
Queue,
Worker,
QueueEvents
} = require("bullmq");

const redis =
require("../core/redis");

/* =========================================================
REDIS SAFETY
========================================================= */

if(
!redis ||
!redis.client
){

console.log(
" Queue disabled"
);

module.exports = {

systemQueue:null,

async addJob(){
  return null;
},

async addDelayedJob(){
  return null;
},

async stats(){

  return {

    waiting:0,
    active:0,
    completed:0,
    failed:0

  };

},

async shutdown(){
  return true;
}

};

return;

}

/* =========================================================
DEDICATED CONNECTIONS
========================================================= */

const queueConnection =
redis.duplicate();

const workerConnection =
redis.duplicate();

const eventsConnection =
redis.duplicate();

/* =========================================================
QUEUE
========================================================= */

const systemQueue =
new Queue(

"system",

{

  connection:
    queueConnection,

  defaultJobOptions: {

    removeOnComplete:100,

    removeOnFail:50,

    attempts:3,

    backoff:{

      type:"exponential",

      delay:2000

    }

  }

}

);

/* =========================================================
EVENTS
========================================================= */

const events =
new QueueEvents(

"system",

{

  connection:
    eventsConnection

}

);

events.on(

"completed",

({ jobId })=>{

console.log(
  "✅ Job completed:",
  jobId
);

}

);

events.on(

"failed",

({
jobId,
failedReason
})=>{

console.error(

  " Job failed:",

  jobId,

  failedReason

);

}

);

/* =========================================================
SERVICES
========================================================= */

let depositWatcher = null;
let matchingEngine = null;
let miningEngine = null;

try{

depositWatcher =
require("../services/depositWatcher");

}catch{}

try{

matchingEngine =
require("../engines/matchingEngine");

}catch{}

try{

miningEngine =
require("../engines/miningEngine");

}catch{}

/* =========================================================
PROCESSOR
========================================================= */

async function processJob(
job
){

const {
name,
data
} = job;

const lockKey =
"job:${job.id}";

try{

const locked =
  await redis.lock(
    lockKey
  );

if(!locked){

  return null;

}

console.log(
  " Processing:",
  name
);

switch(name){

  case "deposit_check":

    if(
      depositWatcher?.run
    ){

      return await depositWatcher
        .run(data);

    }

    break;

  case "match_order":

    if(
      matchingEngine?.process
    ){

      return await matchingEngine
        .process(data);

    }

    break;

  case "mining_reward":

    if(
      miningEngine?.process
    ){

      return await miningEngine
        .process(data);

    }

    break;

  default:

    console.warn(
      "Unknown job:",
      name
    );

    return null;

}

}catch(err){

console.error(

  " Worker error:",

  err.message

);

throw err;

}finally{

await redis.unlock(
  lockKey
);

}

}

/* =========================================================
WORKER
========================================================= */

const worker =
new Worker(

"system",

processJob,

{

  connection:
    workerConnection,

  concurrency:5

}

);

worker.on(

"completed",

job=>{

console.log(
  "✔ Worker done:",
  job.id
);

}

);

worker.on(

"failed",

(job,err)=>{

console.error(

  " Worker failed:",

  job?.id,

  err.message

);

}

);

/* =========================================================
ADD JOB
========================================================= */

async function addJob(
name,
data = {},
opts = {}
){

return await systemQueue.add(

name,

data,

{

  jobId:

    opts.jobId ||

    `${name}:${Date.now()}`,

  ...opts

}

);

}

/* =========================================================
DELAYED JOB
========================================================= */

async function addDelayedJob(
name,
data = {},
delay = 1000
){

return await systemQueue.add(

name,

data,

{

  delay,

  jobId:
    `${name}:${Date.now()}`

}

);

}

/* =========================================================
STATS
========================================================= */

async function stats(){

return {

waiting:
  await systemQueue
    .getWaitingCount(),

active:
  await systemQueue
    .getActiveCount(),

completed:
  await systemQueue
    .getCompletedCount(),

failed:
  await systemQueue
    .getFailedCount()

};

}

/* =========================================================
SHUTDOWN
========================================================= */

async function shutdown(){

console.log(
" Queue shutdown..."
);

await worker.close();

await events.close();

await systemQueue.close();

}

/* =========================================================
EXPORT
========================================================= */

module.exports = {

systemQueue,

addJob,

addDelayedJob,

stats,

shutdown

};
