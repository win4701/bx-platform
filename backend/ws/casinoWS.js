"use strict";

/* =========================================================
   BLOXIO CASINO WS — ULTRA REALTIME ENGINE
========================================================= */

const wsHub = require("./wsHub");
const redis = require("../core/redis");

/* =========================================================
   STATE (LOCAL CACHE)
========================================================= */

const recent = new Map(); // game -> events[]
const MAX = 50;

/* =========================================================
   HELPERS
========================================================= */

function push(game, data){

  if(!recent.has(game)){
    recent.set(game, []);
  }

  const arr = recent.get(game);

  arr.unshift(data);

  if(arr.length > MAX){
    arr.pop();
  }

}

/* =========================================================
   BROADCAST
========================================================= */

function send(game, data){

  push(game, data);

  wsHub.broadcast(`casino:${game}`, data);

}

/* =========================================================
   BET
========================================================= */

async function broadcastBet(user, game, bet){

  const data = {
    type: "bet",
    user,
    game,
    bet: Number(bet),
    time: Date.now()
  };

  await redis.publish("casino_event", data);

  send(game, data);

}

/* =========================================================
   WIN
========================================================= */

async function broadcastWin(user, game, payout, multiplier=null){

  const data = {
    type: "win",
    user,
    game,
    payout: Number(payout),
    multiplier,
    time: Date.now()
  };

  await redis.publish("casino_event", data);

  send(game, data);

  /* 🔥 BIG WIN */
  if(payout >= 50){

    const big = {
      type: "big_win",
      user,
      game,
      payout,
      time: Date.now()
    };

    await redis.publish("casino_event", big);

    send(game, big);

    console.log("💰 BIG WIN:", user, payout);

  }

}

/* =========================================================
   REDIS SYNC (🔥 مهم)
========================================================= */

redis.subscribe("casino_event",(msg)=>{

  send(msg.game, msg);

});

/* =========================================================
   SNAPSHOT
========================================================= */

function sendSnapshot(ws, game){

  const data = recent.get(game) || [];

  ws.send(JSON.stringify({
    type: "casino_snapshot",
    game,
    data
  }));

}

/* =========================================================
   CONNECTION
========================================================= */

function handleConnection(ws){

  console.log("🎰 Casino WS connected");

  ws.on("message",(msg)=>{

    try{

      const data = JSON.parse(msg);

      switch(data.type){

        case "subscribe":

          if(!data.game) return;

          ws.game = data.game;

          wsHub.subscribe(ws, `casino:${data.game}`);

          sendSnapshot(ws, data.game);

          break;

        case "unsubscribe":

          if(ws.game){
            wsHub.unsubscribe(ws, `casino:${ws.game}`);
          }

          break;

      }

    }catch(e){
      console.error("Casino WS error:", e.message);
    }

  });

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  broadcastBet,
  broadcastWin,
  handleConnection
};
