"use strict";

const WebSocket = require("ws");

/* =========================================
STATE
========================================= */

let wss;

const clients = new Map(); 
// ws -> { channels:Set, userId }

/* =========================================
START
========================================= */

function startWS(server){

  wss = new WebSocket.Server({ server });

  console.log("📡 WS Hub started");

  wss.on("connection", (ws, req)=>{

    console.log("🔌 WS connected");

    clients.set(ws, {
      channels: new Set(),
      userId: null
    });

    ws.isAlive = true;

    /* ================= HEARTBEAT ================= */

    ws.on("pong", ()=> ws.isAlive = true);

    /* ================= MESSAGE ================= */

    ws.on("message", (msg)=>{

      try{

        const data = JSON.parse(msg);
        const meta = clients.get(ws);

        if(!meta) return;

        /* ================= AUTH ================= */

        if(data.type === "auth"){
          meta.userId = data.userId;
        }

        /* ================= SUBSCRIBE ================= */

        if(data.type === "subscribe"){

          const { channel } = data;

          if(channel){
            meta.channels.add(channel);

            ws.send(JSON.stringify({
              type:"subscribed",
              channel
            }));
          }

        }

        /* ================= UNSUBSCRIBE ================= */

        if(data.type === "unsubscribe"){

          const { channel } = data;
          meta.channels.delete(channel);

        }

        /* ================= PING ================= */

        if(data.type === "ping"){
          ws.send(JSON.stringify({ type:"pong" }));
        }

      }catch(e){
        console.error("WS parse error:", e.message);
      }

    });

    /* ================= CLOSE ================= */

    ws.on("close", ()=>{

      console.log("❌ WS disconnected");
      clients.delete(ws);

    });

  });

  /* =========================================
  HEARTBEAT LOOP
  ========================================= */

  setInterval(()=>{

    wss.clients.forEach(ws=>{

      if(!ws.isAlive){
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();

    });

  }, 30000);

}

/* =========================================
BROADCAST (CHANNEL)
========================================= */

function broadcast(channel, data){

  if(!wss) return;

  const msg = JSON.stringify({
    channel,
    ...data
  });

  wss.clients.forEach(ws=>{

    const meta = clients.get(ws);

    if(
      ws.readyState === WebSocket.OPEN &&
      meta &&
      meta.channels.has(channel)
    ){
      ws.send(msg);
    }

  });

}

/* =========================================
SEND TO USER
========================================= */

function sendToUser(userId, data){

  if(!wss) return;

  const msg = JSON.stringify(data);

  wss.clients.forEach(ws=>{

    const meta = clients.get(ws);

    if(
      ws.readyState === WebSocket.OPEN &&
      meta &&
      meta.userId === userId
    ){
      ws.send(msg);
    }

  });

}

/* =========================================
SYSTEM EVENTS
========================================= */

function broadcastMarket(data){
  broadcast("market", data);
}

function broadcastCasino(data){
  broadcast("casino", data);
}

function broadcastMining(data){
  broadcast("mining", data);
}

/* =========================================
STATS
========================================= */

function getStats(){

  return {
    clients: clients.size,
    channels: [...new Set(
      [...clients.values()]
        .flatMap(c => [...c.channels])
    )]
  };

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  startWS,
  broadcast,
  sendToUser,
  broadcastMarket,
  broadcastCasino,
  broadcastMining,
  getStats
};
