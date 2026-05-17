"use strict";

/* =========================================================
   BLOXIO SYSTEM QUEUE — ENTERPRISE
========================================================= */

const {
  Queue,
  Worker,
  QueueEvents
} = require("bullmq");

const redis =
  require("../core/redis");

/* =========================================================
   REDIS
========================================================= */

const connection =
  redis.client;

/* =========================================================
   SAFETY
========================================================= */

if(!connection){

  console.warn(
    "⚠️ Queue disabled: Redis unavailable"
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
   QUEUE
========================================================= */

const systemQueue =
  new Queue(

    "system",

    {

      connection,

      defaultJobOptions: {

        removeOnComplete:true,

        removeOnFail:100,

        attempts:5,

        backoff:{

          type:"exponential",

          delay:2000

        },

        timeout:30000

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

      connection

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

      "❌ Job failed:",

      jobId,

      failedReason

    );

  }

);

/* =========================================================
   VALIDATION
========================================================= */

function validateJob(
  name,
  data
){

  if(!name){

    throw new Error(
      "invalid_job_name"
    );

  }

  if(
    typeof data !== "object"
  ){

    throw new Error(
      "invalid_job_data"
    );

  }

}

/* =========================================================
   ADD JOB
========================================================= */

async function addJob(
  name,
  data,
  opts = {}
){

  validateJob(
    name,
    data
  );

  const jobId =

    opts.jobId ||

    `${name}:${Date.now()}`;

  return await systemQueue.add(

    name,

    data,

    {

      jobId,

      priority:
        opts.priority || 1,

      ...opts

    }

  );

}

/* =========================================================
   DELAYED JOB
========================================================= */

async function addDelayedJob(
  name,
  data,
  delayMs = 1000
){

  return await systemQueue.add(

    name,

    data,

    {

      delay:delayMs,

      jobId:
        `${name}:${Date.now()}`

    }

  );

}

/* =========================================================
   SERVICES
========================================================= */

let depositWatcher = null;
let matchingEngine = null;
let systemBots = null;
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

  systemBots =
    require("../services/systemBots");

}catch{}

try{

  miningEngine =
    require("../engines/miningEngine");

}catch{}

/* =========================================================
   WORKER
========================================================= */

const worker =
  new Worker(

    "system",

    async job=>{

      const {
        name,
        data
      } = job;

      console.log(
        "⚙️ Processing:",
        name
      );

      const lockKey =
        "job:" + job.id;

      try{

        const locked =
          await redis.lock(
            lockKey
          );

        if(!locked){

          return null;

        }

        switch(name){

          case "deposit_check":

            if(
              depositWatcher?.run
            ){

              return await depositWatcher
                .run(data);

            }

            return null;

          case "match_order":

            if(
              matchingEngine?.process
            ){

              return await matchingEngine
                .process(data);

            }

            return null;

          case "market_bot":

            if(
              systemBots?.run
            ){

              return await systemBots
                .run(data);

            }

            return null;

          case "mining_reward":

            if(
              miningEngine?.process
            ){

              return await miningEngine
                .process(data);

            }

            return null;

          default:

            console.warn(
              "Unknown job:",
              name
            );

            return null;

        }

      }catch(err){

        console.error(

          "❌ Worker error:",

          err.message

        );

        throw err;

      }finally{

        await redis.unlock(
          lockKey
        );

      }

    },

    {

      connection,

      concurrency:10

    }

);

/* =========================================================
   WORKER EVENTS
========================================================= */

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

      "❌ Worker failed:",

      job?.id,

      err.message

    );

  }

);

/* =========================================================
   MONITOR
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
    "🛑 Queue shutdown..."
  );

  await worker.close();

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
