"use strict"

const express = require("express")

const router = express.Router()

/* ===============================
MODULES
=============================== */

const authRoutes = require("./modules/auth")
const walletRoutes = require("./modules/wallet")
const casinoRoutes = require("./modules/casino")
const marketRoutes = require("./modules/market")
const miningRoutes = require("./modules/mining")
const airdropRoutes = require("./modules/airdrop")
const paymentRoutes = require("./modules/payments")

/* ===============================
SYSTEM ROUTES
=============================== */

router.get("/", (req,res)=>{

res.json({
name:"Bloxio API",
status:"online",
version:"1.0",
time:Date.now()
})

})

router.get("/health",(req,res)=>{

res.json({
status:"ok",
uptime:process.uptime()
})

})

/* ===============================
AUTH
=============================== */

router.use("/auth", authRoutes)

/*
Endpoints:

POST /auth/login
POST /auth/register
POST /auth/telegram
GET  /auth/me
*/

/* ===============================
WALLET
=============================== */

router.use("/finance", walletRoutes)

/*
Endpoints:

GET  /finance/wallet
GET  /finance/deposit/:asset
POST /finance/withdraw
POST /finance/transfer
POST /finance/wallet/connect
*/

/* ===============================
CASINO
=============================== */

router.use("/casino", casinoRoutes)

/*
Endpoints:

POST /casino/play
GET  /casino/history
GET  /casino/flags
*/

/* ===============================
MARKET
=============================== */

router.use("/exchange", marketRoutes)

/*
Endpoints:

GET  /exchange/orderbook
GET  /exchange/trades
POST /exchange/order
GET  /exchange/stats
*/

/* ===============================
MINING
=============================== */

router.use("/mining", miningRoutes)

/*
Endpoints:

GET  /mining/status
POST /mining/subscribe
POST /mining/claim
*/

/* ===============================
AIRDROP
=============================== */

router.use("/airdrop", airdropRoutes)

/*
Endpoints:

GET  /airdrop/status
POST /airdrop/claim
*/

/* ===============================
PAYMENTS
=============================== */

router.use("/payments", paymentRoutes)

/*
Endpoints:

POST /payments/binance/create
POST /topup/execute
GET  /payments/history
GET  /payments/status/:id
*/

/* ===============================
404 HANDLER
=============================== */

router.use((req,res)=>{

res.status(404).json({
error:"endpoint_not_found",
path:req.originalUrl
})

})

module.exports = router
