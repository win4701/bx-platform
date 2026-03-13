const http = require("http")
const WebSocket = require("ws")

const app = require("./app")

const server = http.createServer(app)

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

function broadcast(data){

const msg = JSON.stringify(data)

clients.forEach(c=>{
if(c.readyState===1){
c.send(msg)
}
})

}

global.broadcast = broadcast

server.listen(process.env.PORT || 3000,()=>{
console.log("Bloxio server started")
})
