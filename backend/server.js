require("dotenv").config()

const express = require("express")
const cors = require("cors")
const http = require("http")

const routes = require("./routes")
const db = require("./database")

const { startSystemBots } = require("./systemBots")
const startWS = require("./ws/wsHub")

const app = express()

app.use(cors())
app.use(express.json())

/* API ROUTES */

app.use("/", routes)

/* HEALTH CHECK (Render) */

app.get("/", (req,res)=>{
res.json({
status:"BLOXIO_BACKEND_RUNNING"
})
})

/* START SERVER */

async function startServer(){

try{

await db.connect()

console.log("Database connected")

const server = http.createServer(app)

/* WebSocket */

startWS(server)

/* Bots */

startSystemBots()

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

console.log("Bloxio backend running on port",PORT)

})

}catch(err){

console.error("Server startup error:",err)

process.exit(1)

}

}

startServer()
