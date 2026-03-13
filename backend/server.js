require("dotenv").config()

const express = require("express")
const cors = require("cors")
const http = require("http")
const WebSocket = require("ws")

const routes = require("./routes")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/",routes)

app.get("/",(req,res)=>{
res.json({status:"BX backend running"})
})

const server = http.createServer(app)

/* ================= WEBSOCKET ================= */

const wss = new WebSocket.Server({
server,
path:"/ws/big-wins"
})

function broadcast(data){

wss.clients.forEach(client=>{
if(client.readyState === WebSocket.OPEN){
client.send(JSON.stringify(data))
}
})

}

global.broadcastBigWin = broadcast

/* ============================================= */

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

console.log("Server running on port",PORT)

})
