"use strict";

/* =========================================================
   BLOXIO MINING WS — ULTRA REALTIME ENGINE
========================================================= */

const wsHub = require("./wsHub");
const redis = require("./core/redis");

/* =========================================================
   STATE (LOCAL CACHE)
========================================================= */

let totalHashrate = 0;
const miners = new Map();
const recentRewards = [];

const MAX_HISTORY = 50;

/* =========================================================
   HELPERS
========================================================= */

function pushReward(data){

  recentRewards.unshift(data);

  if(recentRewards.length > MAX_HISTORY){
    recentRewards.pop();
  }

}

/* =========================================================
   HASHRATE UPDATE (DISTRIBUTED)
========================================================= */

async function updateHashrate(userId, rate){

  rate = Number(rate);

  if(!rate || rate <= 0 || rate > 10000){
    return;
  }

  miners.set(userId, rate);

  totalHashrate = [...miners.values()]
    .reduce((a,b)=>a+b,0);

  /* 🔥 Redis sync */
  await redis.publish("mining_hashrate", {
    userId,
    rate
  });

  broadcastNetwork();

}

/* =========================================================
   REMOVE MINER
========================================================= */

async function removeMiner(userId){

  miners.delete(userId);

  totalHashrate = [...miners.values()]
    .reduce((a,b)=>a+b,0);

  await redis.publish("mining_remove", { userId });

  broadcastNetwork();

}

/* =========================================================
   BROADCAST NETWORK
========================================================= */

function broadcastNetwork(){

  wsHub.broadcast("mining", {
    type: "network",
    totalHashrate,
    miners: miners.size,
    time: Date.now()
  });

}

/* =========================================================
   REWARD
========================================================= */

async function broadcastReward(userId, amount){

  const data = {
    type: "reward",
    user: userId,
    amount: Number(amount),
    time: Date.now()
  };

  pushReward(data);

  /* 🔥 Redis sync */
  await redis.publish("mining_reward", data);

  wsHub.broadcast("mining", data);

}

/* =========================================================
   REDIS SUBSCRIBE (🔥 مهم)
========================================================= */

redis.subscribe("mining_hashrate",(msg)=>{

  miners.set(msg.userId, msg.rate);

  totalHashrate = [...miners.values()]
    .reduce((a,b)=>a+b,0);

  broadcastNetwork();

});

redis.subscribe("mining_remove",(msg)=>{

  miners.delete(msg.userId);

  totalHashrate = [...miners.values()]
    .reduce((a,b)=>a+b,0);

  broadcastNetwork();

});

redis.subscribe("mining_reward",(msg)=>{

  pushReward(msg);

  wsHub.broadcast("mining", msg);

});

/* =========================================================
   SNAPSHOT
========================================================= */

function sendSnapshot(ws){

  ws.send(JSON.stringify({
    type: "mining_snapshot",
    data: {
      totalHashrate,
      miners: miners.size,
      rewards: recentRewards
    }
  }));

}

/* =========================================================
   CONNECTION
========================================================= */

function handleConnection(ws){

  console.log("⛏ Mining WS connected");

  sendSnapshot(ws);

}

/* =========================================================
   CLEANUP (IDLE MINERS)
========================================================= */

setInterval(()=>{

  // example cleanup logic
  if(miners.size > 10000){
    miners.clear();
  }

}, 60000);

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  updateHashrate,
  removeMiner,
  broadcastReward,
  handleConnection
};
