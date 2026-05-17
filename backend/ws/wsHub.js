"use strict";

/* =========================================================
   BXS WS HUB — ENTERPRISE REALTIME ENGINE
========================================================= */

const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const zlib = require("zlib");

const redis = require("./core/redis");
const config = require("./config");

/* =========================================================
   STATE
========================================================= */

let wss;

const clients = new Map();
/*
ws -> {
  userId,
  channels:Set,
  rate,
  last
}
*/

const channels = new Map();

/* =========================================================
   START
========================================================= */

function startWS(server){

  wss = new WebSocket.Server({

    server,

    perMessageDeflate:true,

    maxPayload: 1024 * 64

  });

  console.log("📡 BXS WS Hub started");

  wss.on("connection",(ws,req)=>{

    clients.set(ws,{
      userId:null,
      channels:new Set(),
      rate:0,
      last:Date.now()
    });

    ws.isAlive = true;

    ws.on("pong",()=>{

      ws.isAlive = true;

    });

    ws.on("message",(msg)=>{

      handleMessage(ws,msg);

    });

    ws.on("close",()=>{

      cleanup(ws);

    });

    ws.on("error",()=>{

      cleanup(ws);

    });

  });

  heartbeat();

  redisSubscriber();

}

/* =========================================================
   MESSAGE HANDLER
========================================================= */

function handleMessage(ws,msg){

  try{

    const meta = clients.get(ws);

    if(!meta) return;

    /* =====================================
       RATE LIMIT
    ===================================== */

    if(rateLimit(meta)){
      return;
    }

    const data = JSON.parse(msg);

    if(!data.type){
      return;
    }

    switch(data.type){

      case "auth":
        return authenticate(
          ws,
          data.token
        );

      case "subscribe":
        return subscribe(
          ws,
          data.channel
        );

      case "unsubscribe":
        return unsubscribe(
          ws,
          data.channel
        );

      case "ping":

        return send(ws,{
          type:"pong"
        });

    }

  }catch(e){

    console.error(
      "WS error:",
      e.message
    );

  }

}

/* =========================================================
   AUTH
========================================================= */

function authenticate(ws,token){

  try{

    const decoded = jwt.verify(
      token,
      config.security.jwtSecret
    );

    const meta = clients.get(ws);

    meta.userId = decoded.id;

    send(ws,{
      type:"auth_success"
    });

  }catch(e){

    send(ws,{
      type:"auth_failed"
    });

    ws.close();

  }

}

/* =========================================================
   RATE LIMIT
========================================================= */

function rateLimit(meta){

  const now = Date.now();

  if(now - meta.last > 1000){

    meta.rate = 0;
    meta.last = now;

  }

  meta.rate++;

  return meta.rate > 30;

}

/* =========================================================
   SUBSCRIBE
========================================================= */

function subscribe(ws,channel){

  if(!channel) return;

  const meta = clients.get(ws);

  if(!meta) return;

  meta.channels.add(channel);

  if(!channels.has(channel)){
    channels.set(channel,new Set());
  }

  channels.get(channel).add(ws);

  send(ws,{
    type:"subscribed",
    channel
  });

}

/* =========================================================
   UNSUBSCRIBE
========================================================= */

function unsubscribe(ws,channel){

  const meta = clients.get(ws);

  if(!meta) return;

  meta.channels.delete(channel);

  const set = channels.get(channel);

  if(set){
    set.delete(ws);
  }

}

/* =========================================================
   SEND
========================================================= */

function send(ws,data){

  if(ws.readyState !== 1){
    return;
  }

  try{

    const msg =
      JSON.stringify(data);

    ws.send(msg);

  }catch(e){}

}

/* =========================================================
   BROADCAST
========================================================= */

function broadcast(channel,data){

  const set = channels.get(channel);

  if(!set) return;

  const payload = JSON.stringify({
    channel,
    ...data
  });

  set.forEach(ws=>{

    if(ws.readyState === 1){

      /* =================================
         BACKPRESSURE
      ================================= */

      if(ws.bufferedAmount > 1e6){

        return cleanup(ws);

      }

      ws.send(payload);

    }

  });

}

/* =========================================================
   SEND TO USER
========================================================= */

function sendToUser(userId,data){

  const payload =
    JSON.stringify(data);

  clients.forEach((meta,ws)=>{

    if(
      meta.userId === userId &&
      ws.readyState === 1
    ){

      ws.send(payload);

    }

  });

}

/* =========================================================
   REDIS PUBSUB
========================================================= */

function redisSubscriber(){

  redis.subscribe(
    "ws_events",
    (msg)=>{

      try{

        const data =
          JSON.parse(msg);

        broadcast(
          data.channel,
          data.payload
        );

      }catch(e){}

    }
  );

}

async function publish(channel,payload){

  await redis.publish(
    "ws_events",
    JSON.stringify({
      channel,
      payload
    })
  );

}

/* =========================================================
   HEARTBEAT
========================================================= */

function heartbeat(){

  setInterval(()=>{

    if(!wss) return;

    wss.clients.forEach(ws=>{

      if(!ws.isAlive){

        return cleanup(ws);

      }

      ws.isAlive = false;

      try{
        ws.ping();
      }catch(e){}

    });

  },30000);

}

/* =========================================================
   CLEANUP
========================================================= */

function cleanup(ws){

  const meta = clients.get(ws);

  if(meta){

    meta.channels.forEach(ch=>{

      const set =
        channels.get(ch);

      if(set){
        set.delete(ws);
      }

    });

  }

  clients.delete(ws);

  try{
    ws.terminate();
  }catch(e){}

}

/* =========================================================
   STATS
========================================================= */

function getStats(){

  return {

    clients: clients.size,

    channels:
      [...channels.keys()],

    memory:
      process.memoryUsage()

  };

}

/* =========================================================
   SYSTEM EVENTS
========================================================= */

function broadcastMarket(data){
  return publish("market",data);
}

function broadcastCasino(data){
  return publish("casino",data);
}

function broadcastMining(data){
  return publish("mining",data);
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  startWS,

  broadcast,
  publish,

  sendToUser,

  broadcastMarket,
  broadcastCasino,
  broadcastMining,

  getStats

};
