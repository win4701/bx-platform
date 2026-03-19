"use strict";

const { Queue, Worker, QueueEvents } = require("bullmq");
const connection = require("../core/redis");

/* =========================================
QUEUE
========================================= */

const systemQueue = new Queue("system", {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000
    }
  }
});

/* =========================================
QUEUE EVENTS (LOGGING)
========================================= */

const events = new QueueEvents("system", { connection });

events.on("completed", ({ jobId }) => {
  console.log(`✅ Job completed: ${jobId}`);
});

events.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ Job failed: ${jobId}`, failedReason);
});

/* =========================================
ADD JOB
========================================= */

async function addJob(name, data, opts = {}) {

  return await systemQueue.add(name, data, {
    ...opts
  });

}

/* =========================================
ADD DELAYED JOB
========================================= */

async function addDelayedJob(name, data, delayMs) {

  return await systemQueue.add(name, data, {
    delay: delayMs
  });

}

/* =========================================
WORKER (🔥 المهم)
========================================= */

const worker = new Worker(
  "system",
  async (job) => {

    const { name, data } = job;

    console.log(`⚙️ Processing job: ${name}`);

    try {

      switch (name) {

        /* =========================
        DEPOSIT WATCHER
        ========================= */
        case "deposit_check":

          const depositWatcher = require("../services/depositWatcher");
          return await depositWatcher.run(data);

        /* =========================
        MATCH ENGINE
        ========================= */
        case "match_order":

          const matchingEngine = require("../engines/matchingEngine");
          return await matchingEngine.process(data);

        /* =========================
        MARKET BOT
        ========================= */
        case "market_bot":

          const bot = require("../services/systemBots");
          return await bot.run(data);

        /* =========================
        MINING
        ========================= */
        case "mining_reward":

          const mining = require("../engines/miningEngine");
          return await mining.process(data);

        /* =========================
        DEFAULT
        ========================= */
        default:
          console.log(" Unknown job:", name);
          return null;

      }

    } catch (err) {

      console.error(" Worker error:", err.message);
      throw err;

    }

  },
  {
    connection,
    concurrency: 5
  }
);

/* =========================================
WORKER EVENTS
========================================= */

worker.on("completed", (job) => {
  console.log(` Worker done: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(` Worker failed: ${job?.id}`, err.message);
});

/* =========================================
GRACEFUL SHUTDOWN
========================================= */

process.on("SIGINT", async () => {
  console.log(" Closing queue...");
  await worker.close();
  await systemQueue.close();
  process.exit(0);
});

/* =========================================
EXPORT
========================================= */

module.exports = {
  systemQueue,
  addJob,
  addDelayedJob
};
