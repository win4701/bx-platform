"use strict"

const WebSocket = require("ws")

let wss

function startWS(server){

wss = new WebSocket.Server({server})

console.log("WebSocket server started")

wss.on("connection",(ws)=>{

console.log("WS client connected")

ws.on("message",(msg)=>{

try{

const data = JSON.parse(msg)

if(data.type === "ping"){

ws.send(JSON.stringify({type:"pong"}))

}

}catch(e){

console.error("WS error",e)

}

})

ws.on("close",()=>{

console.log("WS client disconnected")

})

})

}

/* =========================
   BROADCAST
========================= */

function broadcast(data){

if(!wss) return

const msg = JSON.stringify(data)

wss.clients.forEach(c=>{

if(c.readyState === WebSocket.OPEN){

c.send(msg)

}

})

}

global.broadcast = broadcast

module.exports = startWS
