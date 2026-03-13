const router = require("express").Router()

const auth = require("./modules/auth")
const wallet = require("./modules/wallet")
const casino = require("./modules/casino")
const mining = require("./modules/mining")
const market = require("./modules/market")
const airdrop = require("./modules/airdrop")
const topup = require("./modules/topup")
const admin = require("./modules/admin")

const {auth:authMiddleware} = require("./core/security")
const adminAuth = require("./core/security").adminAuth

router.get("/health",(req,res)=>{
res.json({status:"ok"})
})

/* auth */

router.post("/auth/telegram",auth.telegram)

/* wallet */

router.get("/finance/wallet",authMiddleware,wallet.getWallet)
router.post("/finance/transfer",authMiddleware,wallet.transfer)
router.post("/finance/withdraw",authMiddleware,wallet.withdraw)

/* casino */

router.post("/casino/play",authMiddleware,casino.play)

/* mining */

router.post("/mining/subscribe",authMiddleware,mining.subscribe)

/* market */

router.post("/exchange/order",authMiddleware,market.order)

/* airdrop */

router.get("/airdrop/status",authMiddleware,airdrop.status)
router.post("/airdrop/claim",authMiddleware,airdrop.claim)

/* topup */

router.post("/topup/execute",authMiddleware,topup.execute)

/* admin */

router.get("/admin/stats",authMiddleware,adminAuth,admin.stats)
router.get("/admin/system",authMiddleware,adminAuth,admin.system)

module.exports = router
