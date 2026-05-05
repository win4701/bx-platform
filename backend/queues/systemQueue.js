"use strict";

/* =========================================================
   BLOXIO SYSTEM QUEUE — ULTRA ENTERPRISE
========================================================= */

const { Queue, Worker, QueueEvents } = require("bullmq");
const redis = require("../core/redis");

const connection = redis.redis;

/* =========================================================
   QUEUE
========================================================= */

const systemQueue = new Queue("system", {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000
    },
    timeout: 30000
  }
});

/* =========================================================
   EVENTS
========================================================= */

const events = new QueueEvents("system", { connection });

events.on("completed", ({ jobId }) => {
  console.log("✅ Job completed:", jobId);
});

events.on("failed", ({ jobId, failedReason }) => {
  console.error("❌ Job failed:", jobId, failedReason);
});

/* =========================================================
   JOB VALIDATION
========================================================= */

function validateJob(name, data){
  if(!name) throw new Error("invalid_job_name");
  if(typeof data !== "object") throw new Error("invalid_job_data");
}

/* =========================================================
   ADD JOB (IDEMPOTENT)
========================================================= */

async function addJob(name, data, opts = {}){

  validateJob(name,data);

  const jobId = opts.jobId || `${name}:${JSON.stringify(data)}`;

  return await systemQueue.add(name, data, {
    jobId, // 🔥 prevents duplicates
    priority: opts.priority || 1,
    ...opts
  });

}

/* =========================================================
   DELAYED JOB
========================================================= */

async function addDelayedJob(name, data, delayMs){

  return await systemQueue.add(name, data, {
    delay: delayMs,
    jobId: `${name}:${Date.now()}`
  });

}

/* =========================================================
   WORKERS (PRELOAD)
========================================================= */

const depositWatcher = require("../services/depositWatcher");
const matchingEngine = require("../engines/matchingEngine");
const systemBots = require("../services/systemBots");
const miningEngine = require("../engines/miningEngine");

/* =========================================================
   WORKER
========================================================= */

const worker = new Worker(
  "system",
  async (job) => {

    const { name, data } = job;

    console.log("⚙️ Processing:", name);

    try{

      /* 🔐 distributed lock */
      const locked = await redis.lock("job:" + job.id);

      if(!locked){
        return null;
      }

      switch(name){

        case "deposit_check":
          return await depositWatcher.run(data);

        case "match_order":
          return await matchingEngine.process(data);

        case "market_bot":
          return await systemBots.run(data);

        case "mining_reward":
          return await miningEngine.process(data);

        default:
          console.warn("Unknown job:", name);
          return null;

      }

    }catch(err){

      console.error("Worker error:", err.message);
      throw err;

    }finally{
      await redis.unlock("job:" + job.id);
    }

  },
  {
    connection,
    concurrency: 10
  }
);

/* =========================================================
   WORKER EVENTS
========================================================= */

worker.on("completed", (job)=>{
  console.log("✔ Worker done:", job.id);
});

worker.on("failed", (job, err)=>{
  console.error("❌ Worker failed:", job?.id, err.message);
});

/* =========================================================
   MONITORING
========================================================= */

async function stats(){

  return {
    waiting: await systemQueue.getWaitingCount(),
    active: await systemQueue.getActiveCount(),
    completed: await systemQueue.getCompletedCount(),
    failed: await systemQueue.getFailedCount()
  };

}

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(){

  console.log("🛑 Shutting down queue...");

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
