"use strict"

require("dotenv").config()

const express = require("express")
const cors = require("cors")
const http = require("http")

const routes = require("./routes")
const db = require("./database")

const startWS = require("./ws/wsHub")
const { startSystemBots } = require("./systemBots")

const app = express()

/* =========================================
MIDDLEWARE
========================================= */

app.use(cors())
app.use(express.json({limit:"2mb"}))

/* =========================================
ROOT
========================================= */

app.get("/",(req,res)=>{

res.json({
name:"Bloxio Backend",
status:"running",
time:Date.now()
})

})

/* =========================================
HEALTH CHECK (Render)
========================================= */

app.get("/health",async(req,res)=>{

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
API ROUTES
========================================= */

app.use("/",routes)

/* =========================================
ERROR HANDLER
========================================= */

app.use((err,req,res,next)=>{

console.error("API ERROR",err)

res.status(500).json({
error:"internal_server_error"
})

})

/* =========================================
START SERVER
========================================= */

async function start(){

try{

/* test database */

await db.query("SELECT NOW()")

console.log("✓ Database connected")

const server = http.createServer(app)

/* start websocket */

startWS(server)

/* start bots only if enabled */

if(process.env.BOTS === "true"){

console.log("✓ Starting system bots")

startSystemBots()

}

/* render port */

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

console.log("🚀 Bloxio backend running on port",PORT)

})

/* graceful shutdown */

process.on("SIGTERM",shutdown)
process.on("SIGINT",shutdown)

function shutdown(){

console.log("Shutting down server")

server.close(()=>{
process.exit(0)
})

}

}catch(e){

console.error("Startup error",e)

process.exit(1)

}

}

start()
