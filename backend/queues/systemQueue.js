"use strict";

const { Queue } = require("bullmq");
const connection = require("../core/redis");

const systemQueue = new Queue("system", {
  connection
});

/* =========================
ADD JOB
========================= */

async function addJob(name, data){

  await systemQueue.add(name, data, {
    removeOnComplete: true,
    attempts: 3
  });

}

module.exports = {
  systemQueue,
  addJob
};
