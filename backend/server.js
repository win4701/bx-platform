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

app.use(cors())
app.use(express.json())

app.use("/", routes)

app.get("/", (req,res)=>{
res.json({status:"Bloxio backend running"})
})

async function start(){

try{

await db.connect()

console.log("Database connected")

const server = http.createServer(app)

/* websocket */

startWS(server)

/* start bots only on Fly */

if(process.env.BOTS === "true"){

console.log("Starting system bots")

startSystemBots()

}

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

console.log("Server running on",PORT)

})

}catch(e){

console.error("Startup error",e)

process.exit(1)

}

}

start()
