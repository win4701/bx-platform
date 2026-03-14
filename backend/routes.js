const router = require("express").Router()

const auth = require("./modules/auth")
const wallet = require("./modules/wallet")
const casino = require("./modules/casino")
const market = require("./modules/market")
const mining = require("./modules/mining")
const airdrop = require("./modules/airdrop")
const admin = require("./modules/admin")

const {auth:authMiddleware,adminAuth} = require("./core/security")

/* ======================
   HEALTH
====================== */

router.get("/health",(req,res)=>{
res.json({status:"ok"})
})

/* ======================
   AUTH
====================== */

router.post("/auth/telegram",auth.telegram)

/* ======================
   WALLET
====================== */

router.get("/finance/wallet",authMiddleware,wallet.getWallet)

router.post("/finance/transfer",authMiddleware,wallet.transfer)

router.post("/finance/withdraw",authMiddleware,wallet.withdraw)

router.get("/finance/history",authMiddleware,wallet.history)

/* ======================
   CASINO
====================== */

router.post("/casino/play",authMiddleware,casino.play)

/* ======================
   MARKET
====================== */

router.post("/exchange/buy",authMiddleware,market.buy)

router.post("/exchange/sell",authMiddleware,market.sell)

router.get("/exchange/stats",market.stats)

router.get("/exchange/history",market.history)

/* ======================
   MINING
====================== */

router.post("/mining/subscribe",authMiddleware,mining.subscribe)

/* ======================
   AIRDROP
====================== */

router.get("/airdrop/status",authMiddleware,airdrop.status)

router.post("/airdrop/claim",authMiddleware,airdrop.claim)

/* ======================
   ADMIN
====================== */

router.get("/admin/stats",authMiddleware,adminAuth,admin.stats)

router.get("/admin/system",authMiddleware,adminAuth,admin.system)

module.exports = router
