"use strict";

const { Worker } = require("bullmq");
const connection = require("../core/redis");

/* =========================================
ENGINES
========================================= */

const marketEngine = require("../engines/marketEngine");
const casinoEngine = require("../engines/casinoEngine");
const miningEngine = require("../engines/miningEngine");

/* =========================================
WORKER
========================================= */

const worker = new Worker(
  "system",
  async (job) => {

    const { name, data, id } = job;

    console.log(`⚙️ Processing job: ${name} (${id})`);

    try {

      switch (name) {

        /* ================= MARKET ================= */
        case "market_match":

          if (!data?.pair) throw new Error("Missing pair");

          return await marketEngine.matchOrders(data.pair);


        /* ================= CASINO ================= */
        case "casino_play":

          if (!data?.userId) throw new Error("Missing userId");

          return await casinoEngine.processGame(data);


        /* ================= MINING ================= */
        case "mining_tick":

          return await miningEngine.processMining();


        /* ================= DEFAULT ================= */
        default:

          console.log("⚠️ Unknown job:", name);
          return null;

      }

    } catch (err) {

      console.error(`🔥 Job error [${name}]`, err.message);

      throw err; // مهم جدا لل retry

    }

  },
  {
    connection,

    concurrency: 10, // 🔥 مهم للأداء

    limiter: {
      max: 50,
      duration: 1000
    }
  }
);

/* =========================================
EVENTS
========================================= */

worker.on("completed", (job) => {

  console.log(`✅ Done: ${job.name} (${job.id})`);

});

worker.on("failed", (job, err) => {

  console.error(`❌ Failed: ${job?.name}`, err.message);

});

worker.on("error", (err) => {

  console.error("💥 Worker crash:", err.message);

});

/* =========================================
GRACEFUL SHUTDOWN
========================================= */

process.on("SIGINT", async () => {

  console.log("🛑 Closing worker...");

  await worker.close();
  process.exit(0);

});

/* =========================================
AUTO JOBS (🔥 مهم جدا)
========================================= */

const { addJob } = require("./systemQueue");

/* 🔁 Market loop */
setInterval(() => {

  addJob("market_match", {
    pair: "BX_USDT"
  });

}, 1000);

/* 🎰 Casino activity */
setInterval(() => {

  addJob("casino_play", {
    userId: 1,
    game: "crash",
    amount: Math.random() * 5
  });

}, 3000);

/* ⛏️ Mining loop */
setInterval(() => {

  addJob("mining_tick", {});

}, 5000);

/* =========================================
START
========================================= */

console.log("🚀 Worker started (PRODUCTION)");
