const express = require("express")
const cors = require("cors")
const compression = require("compression")
const rateLimit = require("express-rate-limit")

const routes = require("./routes")

const app = express()

/* ======================
   MIDDLEWARE
====================== */

app.use(cors())

app.use(express.json())

app.use(compression())

/* ======================
   RATE LIMIT
====================== */

const limiter = rateLimit({

windowMs:60000,
max:120

})

app.use(limiter)

/* ======================
   ROUTES
====================== */

app.use("/",routes)

/* ======================
   HEALTH CHECK
====================== */

app.get("/",(req,res)=>{

res.json({

status:"bloxio backend online"

})

})

module.exports = app
