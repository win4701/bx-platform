"use strict"

/* =================================
ENV
================================= */

require("dotenv").config()

/* =================================
IMPORTS
================================= */

const express = require("express")
const cors = require("cors")
const http = require("http")
const WebSocket = require("ws")

const routes = require("./routes")
const systemBots = require("./systemBots")

/* =================================
APP INIT
================================= */

const app = express()

app.use(cors({
origin:"*",
methods:["GET","POST","PUT","DELETE"],
allowedHeaders:["Content-Type","Authorization"]
}))

app.use(express.json({limit:"2mb"}))

/* =================================
API ROUTES
================================= */

app.use("/", routes)

/* =================================
HTTP SERVER
================================= */

const server = http.createServer(app)

/* =================================
WEBSOCKET HUB
================================= */

const wss = new WebSocket.Server({ server })

global.broadcast = function(data){

const msg = JSON.stringify(data)

wss.clients.forEach(client => {

if(client.readyState === WebSocket.OPEN){
client.send(msg)
}

})

}

/* =================================
WS CONNECTION
================================= */

wss.on("connection",(ws,req)=>{

console.log("WS client connected")

ws.on("message",(msg)=>{

try{

const data = JSON.parse(msg)

/* Example ping */

if(data.type === "ping"){

ws.send(JSON.stringify({
type:"pong",
time:Date.now()
}))

}

}catch(e){
console.log("WS message error")
}

})

ws.on("close",()=>{
console.log("WS client disconnected")
})

})

/* =================================
ERROR HANDLER
================================= */

app.use((err,req,res,next)=>{

console.error("Server error:",err)

res.status(500).json({
error:"internal_server_error"
})

})

/* =================================
START SERVER
================================= */

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

console.log("================================")
console.log("BLOXIO SERVER STARTED")
console.log("PORT:",PORT)
console.log("================================")

/* START SYSTEM ENGINES */

systemBots.start()

})

/* =================================
PROCESS HANDLERS
================================= */

process.on("uncaughtException",(err)=>{

console.error("Uncaught Exception:",err)

})

process.on("unhandledRejection",(err)=>{

console.error("Unhandled Rejection:",err)

})

/* =================================
GRACEFUL SHUTDOWN
================================= */

process.on("SIGTERM",()=>{

console.log("Server shutting down")

process.exit()

})
