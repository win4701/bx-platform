"use strict";

/* =========================================
   BLOXIO SERVER
   Production Core
========================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const routes = require("./routes");
const db = require("./database");

const systemBots = require("./systemBots");

/* =========================================
   CONFIG
========================================= */

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

/* =========================================
   WEBSOCKET
========================================= */

const wss = new WebSocket.Server({ server });

const WS_CLIENTS = {
  bigwins: new Set(),
  market: new Set()
};

function broadcast(channel, data){

  const msg = JSON.stringify(data);

  if(!WS_CLIENTS[channel]) return;

  WS_CLIENTS[channel].forEach(ws => {

    if(ws.readyState === WebSocket.OPEN){
      ws.send(msg);
    }

  });

}

/* =========================================
   WS ROUTING
========================================= */

wss.on("connection",(ws,req)=>{

  const url = req.url;

  if(url === "/ws/big-wins"){
    WS_CLIENTS.bigwins.add(ws);
  }

  if(url === "/ws/market"){
    WS_CLIENTS.market.add(ws);
  }

  ws.on("close",()=>{

    WS_CLIENTS.bigwins.delete(ws);
    WS_CLIENTS.market.delete(ws);

  });

});

/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors({
origin:"*",
methods:["GET","POST","PUT","DELETE"],
allowedHeaders:["Content-Type","Authorization"]
}));

app.use(express.json());

/* =========================================
   ROUTES
========================================= */

app.use("/",routes);

/* =========================================
   HEALTH CHECK (Render)
========================================= */

app.get("/health",(req,res)=>{
res.json({
status:"ok",
time:Date.now()
});
});

/* =========================================
   ENGINE EVENTS
========================================= */

global.BLOXIO_WS = {

bigWin(data){
broadcast("bigwins",data);
},

marketTrade(data){
broadcast("market",data);
}

};

/* =========================================
   DATABASE
========================================= */

async function initDatabase(){

try{

await db.connect();

console.log("Database connected");

}catch(e){

console.error("Database connection failed");
process.exit(1);

}

}

/* =========================================
   SERVER START
========================================= */

async function startServer(){

await initDatabase();

server.listen(PORT,()=>{

console.log("Bloxio server running on port",PORT);

/* START ENGINES */

systemBots.start();

});

}

startServer();
