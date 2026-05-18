"use strict";

/* =========================================================
   MEMPOOL WATCH (SIMULATED VIA FAST POLL)
========================================================= */

const redis = require("../core/redis");

async function watch(tx){

  /* pending flag */
  await redis.setCache("pending:" + tx.hash, tx, 60);

  global.WS?.publish("wallet",{
    type:"pending_tx",
    tx
  });

}

module.exports = { watch };
