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
res.json({status:"Bloxio Backend Running"})
})

const server = http.createServer(app)

const wss = new WebSocket.Server({
server,
path:"/ws/big-wins"
})

function broadcast(data){

wss.clients.forEach(c=>{
if(c.readyState===1)
c.send(JSON.stringify(data))
})

}

global.broadcastBigWin = broadcast

server.listen(process.env.PORT || 3000)
