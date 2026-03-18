"use strict";

const WebSocket = require("ws");

let wss;

/* =========================================
STATE
========================================= */

const clients = new Map(); // ws -> {channels:Set}

/* =========================================
START
========================================= */

function startWS(server){

  wss = new WebSocket.Server({ server });

  console.log("📡 WebSocket Hub started");

  wss.on("connection", (ws)=>{

    console.log("🔌 WS connected");

    clients.set(ws, {
      channels: new Set()
    });

    ws.isAlive = true;

    /* ================= HEARTBEAT ================= */

    ws.on("pong", ()=> ws.isAlive = true);

    /* ================= MESSAGE ================= */

    ws.on("message", (msg)=>{

      try{

        const data = JSON.parse(msg);

        /* SUBSCRIBE */

        if(data.type === "subscribe"){

          const { channel } = data;

          if(channel){
            clients.get(ws).channels.add(channel);
          }

        }

        /* UNSUBSCRIBE */

        if(data.type === "unsubscribe"){

          const { channel } = data;

          clients.get(ws).channels.delete(channel);

        }

        /* PING */

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
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();

    });

  }, 30000);

}

/* =========================================
BROADCAST (CHANNEL BASED)
========================================= */

function broadcast(channel, data){

  if(!wss) return;

  const msg = JSON.stringify(data);

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
SEND TO ONE
========================================= */

function send(ws, data){

  if(ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify(data));
  }

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  startWS,
  broadcast,
  send
};
