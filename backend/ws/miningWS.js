"use strict";

const wsHub = require("./wsHub");

/* =========================================
STATE
========================================= */

let totalHashrate = 0;
const miners = new Map(); // userId -> hashrate
const recentRewards = [];

const MAX_HISTORY = 50;

/* =========================================
HELPERS
========================================= */

function pushReward(data){

  recentRewards.unshift(data);

  if(recentRewards.length > MAX_HISTORY){
    recentRewards.pop();
  }

}

/* =========================================
UPDATE HASHRATE
========================================= */

function updateHashrate(userId, rate){

  miners.set(userId, rate);

  totalHashrate = 0;

  for(const r of miners.values()){
    totalHashrate += r;
  }

  wsHub.broadcast("mining", {
    type: "network",
    totalHashrate,
    miners: miners.size,
    time: Date.now()
  });

}

/* =========================================
REMOVE MINER
========================================= */

function removeMiner(userId){

  miners.delete(userId);

  totalHashrate = 0;

  for(const r of miners.values()){
    totalHashrate += r;
  }

}

/* =========================================
REWARD
========================================= */

function broadcastReward(userId, amount){

  const data = {
    type: "reward",
    user: userId,
    amount: Number(amount),
    time: Date.now()
  };

  pushReward(data);

  wsHub.broadcast("mining", data);

}

/* =========================================
SNAPSHOT
========================================= */

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

/* =========================================
ON CONNECT
========================================= */

function handleConnection(ws){

  console.log("⛏ Mining WS connected");

  sendSnapshot(ws);

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  updateHashrate,
  removeMiner,
  broadcastReward,
  handleConnection
};
