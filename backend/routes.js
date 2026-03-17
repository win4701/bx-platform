"use strict"

const express = require("express")
const router = express.Router()

/* ======================================
MODULES
====================================== */

const auth = require("./modules/auth")
const wallet = require("./modules/wallet")
const casino = require("./modules/casino")
const market = require("./modules/market")
const mining = require("./modules/mining")
const airdrop = require("./modules/airdrop")
const payments = require("./modules/payments")

/* ======================================
MIDDLEWARE
====================================== */

function requestLogger(req,res,next){

console.log(

req.method,
req.originalUrl,
req.ip

)

next()

}

router.use(requestLogger)

/* ======================================
ROOT
====================================== */

router.get("/",(req,res)=>{

res.json({

name:"Bloxio API",
status:"online",
version:"1.0",
time:Date.now()

})

})

/* ======================================
HEALTH
====================================== */

router.get("/health",(req,res)=>{

res.json({

status:"ok",
uptime:process.uptime(),
memory:process.memoryUsage().rss

})

})

/* ======================================
API VERSION
====================================== */

const api = express.Router()

/* ======================================
MODULE ROUTES
====================================== */

api.use("/auth", auth)

api.use("/wallet", wallet)

api.use("/casino", casino)

api.use("/market", market)

api.use("/mining", mining)

api.use("/airdrop", airdrop)

api.use("/payments", payments)

/* attach version */

router.use("/api/v1", api)

/* ======================================
NOT FOUND
====================================== */

router.use((req,res)=>{

res.status(404).json({

error:"endpoint_not_found",
path:req.originalUrl

})

})

/* ======================================
ERROR HANDLER
====================================== */

router.use((err,req,res,next)=>{

console.error("API error:",err)

res.status(500).json({

error:"internal_server_error"

})

})

module.exports = router
