"use strict";

/* =========================================================
   BLOXIO TON INDEXER — FULL ONCHAIN ENGINE
========================================================= */

const axios = require("axios");
const redis = require("../core/redis");
const { addJob } = require("../core/systemQueue");

/* =========================================================
   CONFIG
========================================================= */

const TON_API = "https://toncenter.com/api/v2";
const API_KEY = process.env.TON_API_KEY;

const BX_CONTRACT = "EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a";

/* =========================================================
   LAST BLOCK CACHE
========================================================= */

let lastLt = 0;

/* =========================================================
   FETCH TRANSACTIONS
========================================================= */

async function fetchTransactions(){

  try{

    const res = await axios.get(`${TON_API}/getTransactions`,{
      params:{
        address: BX_CONTRACT,
        limit: 50,
        lt: lastLt || undefined,
        api_key: API_KEY
      }
    });

    return res.data.result || [];

  }catch(e){
    console.error("TON fetch error:", e.message);
    return [];
  }

}

/* =========================================================
   PARSE TRANSACTION (🔥 مهم)
========================================================= */

function parseTx(tx){

  const inMsg = tx.in_msg;

  if(!inMsg) return null;

  const from = inMsg.source;
  const to = inMsg.destination;
  const amount = Number(inMsg.value) / 1e9;

  return {
    hash: tx.transaction_id.hash,
    from,
    to,
    amount,
    lt: tx.transaction_id.lt
  };

}

/* =========================================================
   PROCESS TRANSACTION
========================================================= */

async function processTx(tx){

  const parsed = parseTx(tx);

  if(!parsed) return;

  /* 🔥 dedupe */
  const exists = await redis.getCache("tx:" + parsed.hash);
  if(exists) return;

  await redis.setCache("tx:" + parsed.hash, true, 3600);

  /* 🔥 send to queue */
  await addJob("onchain_tx", parsed);

}

/* =========================================================
   MAIN LOOP
========================================================= */

async function run(){

  const txs = await fetchTransactions();

  for(const tx of txs){

    await processTx(tx);

    if(tx.transaction_id?.lt){
      lastLt = tx.transaction_id.lt;
    }

  }

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  run
};
