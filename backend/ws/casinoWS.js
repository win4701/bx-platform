"use strict";

const wsHub = require("./wsHub");

/* =========================================
STATE
========================================= */

const recent = [];
const MAX = 50;

/* =========================================
HELPER
========================================= */

function push(data){

  recent.unshift(data);

  if(recent.length > MAX){
    recent.pop();
  }

}

/* =========================================
BROADCAST GENERIC
========================================= */

function send(data){

  push(data);

  wsHub.broadcast("casino", data);

}

/* =========================================
BET
========================================= */

function broadcastBet(user, game, bet){

  send({
    type: "bet",
    user,
    game,
    bet: Number(bet),
    time: Date.now()
  });

}

/* =========================================
WIN
========================================= */

function broadcastWin(user, game, payout, multiplier=null){

  send({
    type: "win",
    user,
    game,
    payout: Number(payout),
    multiplier,
    time: Date.now()
  });

  /* BIG WIN */

  if(payout >= 50){

    send({
      type: "big_win",
      user,
      game,
      payout,
      time: Date.now()
    });

    console.log("💰 BIG WIN:", user, payout);
  }

}

/* =========================================
SNAPSHOT
========================================= */

function sendSnapshot(ws){

  ws.send(JSON.stringify({
    type: "casino_snapshot",
    data: recent
  }));

}

/* =========================================
ON CONNECT
========================================= */

function handleConnection(ws){

  console.log("🎰 Casino WS connected");

  sendSnapshot(ws);

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  broadcastBet,
  broadcastWin,
  handleConnection
};
