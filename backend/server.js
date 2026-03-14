require("dotenv").config()

const http = require("http")
const WebSocket = require("ws")

const app = require("./app")

const marketBot = require("./engines/marketBot")

const PORT = process.env.PORT || 3000

/* ======================
   HTTP SERVER
====================== */

const server = http.createServer(app)

/* ======================
   WEBSOCKET
====================== */

const wss = new WebSocket.Server({
server,
path:"/ws"
})

const clients = new Set()

wss.on("connection",(ws)=>{

clients.add(ws)

ws.on("close",()=>{
clients.delete(ws)
})

})

/* ======================
   BROADCAST
====================== */

global.broadcast = (data)=>{

const msg = JSON.stringify(data)

for(const client of clients){

if(client.readyState === WebSocket.OPEN){

client.send(msg)

}

}

}

/* ======================
   START MARKET BOT
====================== */

marketBot.startBot()

/* ======================
   START SERVER
====================== */

server.listen(PORT,()=>{

console.log("Bloxio backend running on port",PORT)

})
