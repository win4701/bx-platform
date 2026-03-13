require("dotenv").config()

const express = require("express")
const cors = require("cors")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
const os = require("os")

const routes = require("./routes")

const app = express()

let REQUEST_COUNT = 0

app.use(cors())
app.use(express.json())
app.use(compression())

const limiter = rateLimit({
windowMs:60000,
max:120
})

app.use(limiter)

app.use((req,res,next)=>{
REQUEST_COUNT++
next()
})

app.use("/",routes)

app.get("/",(req,res)=>{
res.json({
status:"Bloxio backend running"
})
})

function getSystemStats(){

const mem = process.memoryUsage()

return{

uptime:process.uptime(),

cpu_load:os.loadavg()[0],

total_memory:os.totalmem(),

free_memory:os.freemem(),

heap_used:mem.heapUsed,

heap_total:mem.heapTotal,

requests:REQUEST_COUNT,

time:Date.now()

}

}

global.getSystemStats = getSystemStats

module.exports = app
