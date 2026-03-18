"use strict";

const { Worker } = require("bullmq");
const connection = require("../core/redis");

const marketEngine = require("../engines/marketEngine");
const casinoEngine = require("../engines/casinoEngine");
const miningEngine = require("../engines/miningEngine");

const worker = new Worker("system", async job => {

  const { name, data } = job;

  switch(name){

    case "market_match":
      await marketEngine.matchOrders("BX_USDT");
      break;

    case "casino_play":
      await casinoEngine.processGame(data);
      break;

    case "mining_tick":
      await miningEngine.processMining();
      break;

    default:
      console.log("Unknown job:", name);

  }

}, { connection });

worker.on("completed", job => {
  console.log("✅ Job done:", job.name);
});

worker.on("failed", (job, err)=>{
  console.error("❌ Job failed:", job.name, err.message);
});

console.log("⚙️ Worker started");
