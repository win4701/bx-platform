"use strict";

/* =========================================================
   BLOXIO WS HUB — ULTRA REALTIME CORE
========================================================= */

const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const config = require("./config");
const redis = require("./core/redis");

/* =========================================================
   STATE
========================================================= */

let wss;

const clients = new Map(); // ws -> meta
const channels = new Map(); // channel -> Set(ws)

/* =========================================================
   START
========================================================= */

function startWS(server){

  wss = new WebSocket.Server({ server });

  console.log("📡 WS Hub started");

  wss.on("connection",(ws)=>{

    clients.set(ws,{
      channels:new Set(),
      userId:null
    });

    ws.isAlive = true;

    ws.on("pong",()=> ws.isAlive = true);

    ws.on("message",(msg)=> handleMessage(ws,msg));

    ws.on("close",()=> cleanup(ws));

    ws.on("error",()=> cleanup(ws));

  });

  heartbeat();

}

/* =========================================================
   AUTH (JWT 🔥)
========================================================= */

function authenticate(ws, token){

  try{

    const decoded = jwt.verify(token, config.security.jwtSecret);

    clients.get(ws).userId = decoded.id;

    ws.send(JSON.stringify({ type:"auth_success" }));

  }catch{
    ws.send(JSON.stringify({ type:"auth_failed" }));
    ws.close();
  }

}

/* =========================================================
   MESSAGE HANDLER
========================================================= */

function handleMessage(ws, msg){

  try{

    const data = JSON.parse(msg);
    const meta = clients.get(ws);

    if(!meta) return;

    switch(data.type){

      case "auth":
        authenticate(ws, data.token);
        break;

      case "subscribe":
        subscribe(ws, data.channel);
        break;

      case "unsubscribe":
        unsubscribe(ws, data.channel);
        break;

      case "ping":
        ws.send(JSON.stringify({type:"pong"}));
        break;

    }

  }catch(e){
    console.error("WS error:", e.message);
  }

}

/* =========================================================
   SUBSCRIBE (OPTIMIZED 🔥)
========================================================= */

function subscribe(ws, channel){

  if(!channel) return;

  const meta = clients.get(ws);

  meta.channels.add(channel);

  if(!channels.has(channel)){
    channels.set(channel,new Set());
  }

  channels.get(channel).add(ws);

}

/* =========================================================
   UNSUBSCRIBE
========================================================= */

function unsubscribe(ws, channel){

  const meta = clients.get(ws);

  if(!meta) return;

  meta.channels.delete(channel);

  const set = channels.get(channel);

  if(set){
    set.delete(ws);
  }

}

/* =========================================================
   BROADCAST (O(1) 🔥)
========================================================= */

function broadcast(channel, data){

  const set = channels.get(channel);

  if(!set) return;

  const msg = JSON.stringify({
    channel,
    ...data
  });

  set.forEach(ws=>{
    if(ws.readyState === 1){
      ws.send(msg);
    }
  });

}

/* =========================================================
   SEND TO USER
========================================================= */

function sendToUser(userId, data){

  const msg = JSON.stringify(data);

  clients.forEach((meta,ws)=>{

    if(meta.userId === userId && ws.readyState === 1){
      ws.send(msg);
    }

  });

}

/* =========================================================
   REDIS SYNC (🔥 DISTRIBUTED)
========================================================= */

redis.subscribe("ws_broadcast",(msg)=>{
  broadcast(msg.channel, msg.data);
});

async function publish(channel,data){
  await redis.publish("ws_broadcast",{channel,data});
}

/* =========================================================
   HEARTBEAT
========================================================= */

function heartbeat(){

  setInterval(()=>{

    wss.clients.forEach(ws=>{

      if(!ws.isAlive){
        return cleanup(ws);
      }

      ws.isAlive = false;
      ws.ping();

    });

  }, config.ws.heartbeat || 30000);

}

/* =========================================================
   CLEANUP
========================================================= */

function cleanup(ws){

  const meta = clients.get(ws);

  if(meta){

    meta.channels.forEach(ch=>{
      const set = channels.get(ch);
      if(set) set.delete(ws);
    });

  }

  clients.delete(ws);

}

/* =========================================================
   STATS
========================================================= */

function getStats(){

  return {
    clients: clients.size,
    channels: channels.size
  };

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  startWS,
  broadcast,
  publish,
  sendToUser,
  subscribe,
  unsubscribe,
  getStats
};
