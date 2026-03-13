const router = require("express").Router()

const auth = require("./modules/auth")
const wallet = require("./modules/wallet")
const casino = require("./modules/casino")
const mining = require("./modules/mining")
const market = require("./modules/market")
const airdrop = require("./modules/airdrop")
const topup = require("./modules/topup")

const {auth:authMiddleware} = require("./core/security")

router.post("/auth/telegram",auth.telegram)

router.get("/finance/wallet",authMiddleware,wallet.getWallet)
router.post("/finance/transfer",authMiddleware,wallet.transfer)
router.post("/finance/withdraw",authMiddleware,wallet.withdraw)

router.post("/casino/play",authMiddleware,casino.play)

router.post("/mining/subscribe",authMiddleware,mining.subscribe)

router.post("/exchange/order",authMiddleware,market.order)

router.get("/airdrop/status",authMiddleware,airdrop.status)
router.post("/airdrop/claim",authMiddleware,airdrop.claim)

router.post("/topup/execute",authMiddleware,topup.execute)

module.exports = router
