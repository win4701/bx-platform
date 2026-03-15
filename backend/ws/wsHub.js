const WebSocket = require("ws")

let wss = null

function startWS(server){

wss = new WebSocket.Server({ server })

wss.on("connection",(ws)=>{

console.log("WS client connected")

ws.on("message",(msg)=>{

try{

const data = JSON.parse(msg)

handleMessage(ws,data)

}catch(e){

console.error("WS message error",e)

}

})

ws.on("close",()=>{

console.log("WS client disconnected")

})

})

console.log("WebSocket server started")

}

function broadcast(data){

if(!wss) return

const msg = JSON.stringify(data)

wss.clients.forEach(client=>{

if(client.readyState === WebSocket.OPEN){

client.send(msg)

}

})

}

function handleMessage(ws,data){

switch(data.type){

case "ping":

ws.send(JSON.stringify({type:"pong"}))

break

default:

break

}

}

module.exports = startWS
module.exports.broadcast = broadcast
