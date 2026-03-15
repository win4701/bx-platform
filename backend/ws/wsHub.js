const WebSocket = require("ws")

let wss = null

function init(server){

wss = new WebSocket.Server({ server })

wss.on("connection",(ws,req)=>{

ws.isAlive = true

ws.on("pong",()=>{
ws.isAlive = true
})

})

setInterval(()=>{

wss.clients.forEach(ws=>{

if(!ws.isAlive) return ws.terminate()

ws.isAlive = false
ws.ping()

})

},30000)

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

module.exports = {
init,
broadcast
  }
