"use strict"

require("dotenv").config()

const express = require("express")
const cors = require("cors")
const http = require("http")

const routes = require("./routes")
const db = require("./database")

const startWS = require("./ws/wsHub")
const { startSystemBots } = require("./systemBots")

/* =========================================
ENV
========================================= */

const PORT = process.env.PORT || 3000
const RUN_BOTS = process.env.BOTS === "true"

/* =========================================
APP
========================================= */

const app = express()

app.use(cors())
app.use(express.json({limit:"2mb"}))

/* =========================================
ROOT
========================================= */

app.get("/",(req,res)=>{

res.json({
name:"Bloxio Backend",
mode: RUN_BOTS ? "BOT" : "API",
status:"running",
time: Date.now()
})

})

/* =========================================
HEALTH (RENDER)
========================================= */

app.get("/health", async (req,res)=>{

try{

await db.query("SELECT 1")

res.json({
status:"ok",
uptime:process.uptime()
})

}catch(e){

res.status(500).json({
status:"db_error"
})

}

})

/* =========================================
ROUTES (API MODE ONLY)
========================================= */

if(!RUN_BOTS){

app.use("/", routes)

}

/* =========================================
ERROR HANDLER
========================================= */

app.use((err,req,res,next)=>{

console.error("API ERROR:",err)

res.status(500).json({
error:"internal_server_error"
})

})

/* =========================================
SERVER START
========================================= */

async function start(){

try{

/* DB check */

await db.query("SELECT NOW()")

console.log("✓ Database connected")

const server = http.createServer(app)

/* WebSocket */

startWS(server)

/* Start server */

server.listen(PORT,()=>{

console.log(`🚀 Server running on port ${PORT}`)
console.log(`Mode: ${RUN_BOTS ? "BOT" : "API"}`)

})

/* START BOTS (Fly only) */

if(RUN_BOTS){

console.log("🤖 Starting system bots...")

setTimeout(()=>{

startSystemBots()

},2000)

}

/* =========================================
GRACEFUL SHUTDOWN
========================================= */

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

function shutdown(){

console.log("Shutting down...")

server.close(()=>{
process.exit(0)
})

}

}catch(e){

console.error("Startup error:",e)

process.exit(1)

}

}

start()
