"use strict"

const express = require("express")

const router = express.Router()

/* MODULES */

const auth = require("./modules/auth")
const wallet = require("./modules/wallet")
const casino = require("./modules/casino")
const market = require("./modules/market")
const mining = require("./modules/mining")
const airdrop = require("./modules/airdrop")
const payments = require("./modules/payments")

/* ROOT */

router.get("/", (req,res)=>{

res.json({
name:"Bloxio API",
status:"online",
version:"1.0"
})

})

/* HEALTH */

router.get("/health",(req,res)=>{

res.json({
status:"ok",
uptime:process.uptime()
})

})

/* MODULE ROUTES */

router.use("/auth", auth)
router.use("/finance", wallet)
router.use("/casino", casino)
router.use("/exchange", market)
router.use("/mining", mining)
router.use("/airdrop", airdrop)
router.use("/payments", payments)

/* 404 */

router.use((req,res)=>{

res.status(404).json({
error:"endpoint_not_found",
path:req.originalUrl
})

})

module.exports = router
