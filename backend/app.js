require("dotenv").config()

const express = require("express")
const cors = require("cors")
const compression = require("compression")
const http = require("http")
const WebSocket = require("ws")
const rateLimit = require("express-rate-limit")

const routes = require("./routes")
const wsHub = require("./core/wsHub")

const app = express()

/* middlewares */

app.use(cors())

app.use(express.json())

app.use(compression())

/* rate limit */

const limiter = rateLimit({

windowMs:60000,
max:120

})

app.use(limiter)

/* routes */

app.use("/",routes)

app.get("/",(req,res)=>{

res.json({
status:"Bloxio backend running"
})

})

/* http server */

const server = http.createServer(app)

/* websocket */

const wss = new WebSocket.Server({

server,
path:"/ws"

})

wss.on("connection",(ws)=>{

wsHub.add(ws)

ws.on("close",()=>{

wsHub.remove(ws)

})

})

/* start */

server.listen(process.env.PORT || 3000,()=>{

console.log("Bloxio backend started")

})

module.exports = server
