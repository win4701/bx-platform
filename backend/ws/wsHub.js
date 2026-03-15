const WebSocket = require("ws")

function startWS(server){

const wss = new WebSocket.Server({ noServer:true })

server.on("upgrade",(req,socket,head)=>{

wss.handleUpgrade(req,socket,head,(ws)=>{

wss.emit("connection",ws,req)

})

})

wss.on("connection",(ws)=>{

console.log("WS client connected")

ws.on("close",()=>{

console.log("WS client disconnected")

})

})

console.log("WebSocket started")

}

module.exports = startWS
