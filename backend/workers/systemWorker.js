"use strict";

/* =========================================================
   BLOXIO WORKER ENGINE — ULTRA ENTERPRISE
========================================================= */

const { Worker } = require("bullmq");
const redis = require("./core/redis");
const config = require("./config");

const connection = redis.redis;

/* =========================================================
   ENGINES (PRELOAD 🔥)
========================================================= */

const marketEngine = require("./engines/marketEngine");
const casinoEngine = require("./engines/casinoEngine");
const miningEngine = require("./engines/miningEngine");

/* =========================================================
   JOB VALIDATION
========================================================= */

function validate(job){

  if(!job.name) throw new Error("invalid_job");

  switch(job.name){

    case "market_match":
      if(!job.data?.pair) throw new Error("missing_pair");
      break;

    case "casino_play":
      if(!job.data?.userId) throw new Error("missing_user");
      break;

  }

}

/* =========================================================
   WORKER
========================================================= */

const worker = new Worker(
  "system",
  async (job)=>{

    const { name, data, id } = job;

    console.log(`⚙️ ${name} (${id})`);

    /* 🔐 distributed lock */
    const locked = await redis.lock("job:" + id, 10000);

    if(!locked){
      console.warn("🔁 Duplicate skipped:", id);
      return null;
    }

    try{

      validate(job);

      switch(name){

        /* ================= MARKET ================= */
        case "market_match":
          return await marketEngine.matchOrders(data.pair);

        /* ================= CASINO ================= */
        case "casino_play":
          return await casinoEngine.processGame(data);

        /* ================= MINING ================= */
        case "mining_tick":
          return await miningEngine.processMining();

        default:
          console.warn("Unknown job:", name);
          return null;

      }

    }catch(err){

      console.error(`🔥 ${name} error:`, err.message);
      throw err;

    }finally{
      await redis.unlock("job:" + id);
    }

  },
  {
    connection,

    concurrency: config.queue?.concurrency || 10,

    limiter: {
      max: 100,
      duration: 1000
    }
  }
);

/* =========================================================
   EVENTS
========================================================= */

worker.on("completed",(job)=>{
  console.log("✔ Done:", job.name, job.id);
});

worker.on("failed",(job,err)=>{
  console.error("❌ Failed:", job?.name, err.message);
});

worker.on("error",(err)=>{
  console.error("💥 Worker crash:", err.message);
});

/* =========================================================
   HEALTH CHECK
========================================================= */

async function health(){

  try{
    return await redis.health();
  }catch{
    return false;
  }

}

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(){

  console.log("🛑 Closing worker...");

  await worker.close();

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  worker,
  health,
  shutdown
};
