const crypto = require("../utils/crypto")

function generateSeeds(){

const serverSeed = crypto.randomHex(32)

const serverSeedHash = crypto.sha256(serverSeed)

return {

serverSeed,
serverSeedHash,
clientSeed:"default",
nonce:0

}

}

function rollDice(serverSeed,clientSeed,nonce){

const hash = crypto.hmac(
serverSeed,
`${clientSeed}:${nonce}`
)

const n = parseInt(hash.substring(0,8),16)

const result = (n / 0xffffffff) * 100

return Number(result.toFixed(2))

}

function coinflip(serverSeed,clientSeed,nonce){

const hash = crypto.hmac(
serverSeed,
`${clientSeed}:${nonce}`
)

const n = parseInt(hash.substring(0,8),16)

return n % 2 === 0 ? "heads":"tails"

}

module.exports = {

generateSeeds,
rollDice,
coinflip

}

function publishBet(data){

global.broadcastMarket({

type:"casino_bet",
user:data.user,
game:data.game,
bet:data.bet,
win:data.win,
payout:data.payout

})

}

module.exports={publishBet}
