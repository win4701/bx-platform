const router = require("express").Router()

/* modules */

const auth = require("./modules/auth")
const wallet = require("./modules/wallet")
const casino = require("./modules/casino")
const mining = require("./modules/mining")
const market = require("./modules/market")
const airdrop = require("./modules/airdrop")
const topup = require("./modules/topup")
const admin = require("./modules/admin")

/* security */

const {auth:authMiddleware,adminAuth} = require("./core/security")

/* ===========================
   SYSTEM
=========================== */

router.get("/health",(req,res)=>{
res.json({
status:"ok",
time:Date.now()
})
})

/* ===========================
   AUTH
=========================== */

router.post("/auth/telegram",auth.telegram)

/* ===========================
   WALLET
=========================== */

router.get(
"/finance/wallet",
authMiddleware,
wallet.getWallet
)

router.post(
"/finance/transfer",
authMiddleware,
wallet.transfer
)

router.post(
"/finance/connect",
authMiddleware,
wallet.connectWallet
)

router.get(
"/finance/deposit/:asset",
authMiddleware,
wallet.deposit
)

router.post(
"/finance/binancepay",
authMiddleware,
wallet.binancePay
)

router.post(
"/finance/withdraw",
authMiddleware,
wallet.withdraw
)

router.get(
"/finance/history",
authMiddleware,
wallet.history
)

/* ===========================
   CASINO
=========================== */

router.post(
"/casino/play",
authMiddleware,
casino.play
)

/* ===========================
   MINING
=========================== */

router.post(
"/mining/subscribe",
authMiddleware,
mining.subscribe
)

/* ===========================
   MARKET
=========================== */

router.post(
"/exchange/order",
authMiddleware,
market.order
)

/* ===========================
   AIRDROP
=========================== */

router.get(
"/airdrop/status",
authMiddleware,
airdrop.status
)

router.post(
"/airdrop/claim",
authMiddleware,
airdrop.claim
)

/* ===========================
   TOPUP
=========================== */

router.post(
"/topup/execute",
authMiddleware,
topup.execute
)

/* ===========================
   ADMIN
=========================== */

router.get(
"/admin/stats",
authMiddleware,
adminAuth,
admin.stats
)

router.get(
"/admin/system",
authMiddleware,
adminAuth,
admin.system
)

module.exports = router
