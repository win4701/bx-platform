const router = require("express").Router()

const auth = require("./auth")
const wallet = require("./wallet")
const casino = require("./casino")
const mining = require("./mining")
const market = require("./market")
const airdrop = require("./airdrop")
const topup = require("./topup")

router.post("/auth/telegram",auth.telegram)

/* wallet */

router.get("/finance/wallet",auth.auth,wallet.getWallet)
router.post("/finance/withdraw",auth.auth,wallet.withdraw)
router.post("/finance/transfer",auth.auth,wallet.transfer)
router.get("/finance/deposit/:asset",auth.auth,wallet.deposit)
router.post("/finance/wallet/connect",auth.auth,wallet.connect)

/* casino */

router.post("/casino/play",auth.auth,casino.play)
router.get("/casino/flags",casino.flags)

/* mining */

router.post("/mining/subscribe",auth.auth,mining.subscribe)

/* market */

router.get("/market/prices",market.prices)
router.post("/exchange/order",auth.auth,market.order)

/* airdrop */

router.get("/airdrop/status",auth.auth,airdrop.status)
router.post("/airdrop/claim",auth.auth,airdrop.claim)

/* topup */

router.post("/topup/execute",auth.auth,topup.execute)

module.exports = router
