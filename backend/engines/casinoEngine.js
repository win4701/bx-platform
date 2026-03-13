const crypto = require("../utils/crypto")

function hash(serverSeed,clientSeed,nonce){

return crypto.hmac(
serverSeed,
`${clientSeed}:${nonce}`
)

}

/* ======================
   RNG NUMBER
====================== */

function rng(serverSeed,clientSeed,nonce){

const h = hash(serverSeed,clientSeed,nonce)

const n = parseInt(h.slice(0,8),16)

return n / 0xffffffff

}

/* ======================
   DICE
====================== */

function dice(serverSeed,clientSeed,nonce){

return Number((rng(serverSeed,clientSeed,nonce)*100).toFixed(2))

}

/* ======================
   COINFLIP
====================== */

function coinflip(serverSeed,clientSeed,nonce){

return rng(serverSeed,clientSeed,nonce) > 0.5 ? "heads":"tails"

}

/* ======================
   LIMBO
====================== */

function limbo(serverSeed,clientSeed,nonce){

const r = rng(serverSeed,clientSeed,nonce)

return Number((1/(1-r)).toFixed(2))

}

/* ======================
   CRASH
====================== */

function crash(serverSeed,clientSeed,nonce){

const r = rng(serverSeed,clientSeed,nonce)

return Number((1/(1-r)).toFixed(2))

}

/* ======================
   ROULETTE
====================== */

function roulette(serverSeed,clientSeed,nonce){

return Math.floor(rng(serverSeed,clientSeed,nonce)*37)

}

/* ======================
   BLACKJACK
====================== */

function blackjack(serverSeed,clientSeed,nonce){

const player = Math.floor(rng(serverSeed,clientSeed,nonce)*11)+16

const dealer = Math.floor(rng(serverSeed,clientSeed,nonce+1)*11)+16

return {player,dealer}

}

/* ======================
   HI-LO
====================== */

function hilo(serverSeed,clientSeed,nonce){

return Math.floor(rng(serverSeed,clientSeed,nonce)*13)+1

}

/* ======================
   WHEEL
====================== */

function wheel(serverSeed,clientSeed,nonce){

return Math.floor(rng(serverSeed,clientSeed,nonce)*10)

}

/* ======================
   MINES
====================== */

function mines(serverSeed,clientSeed,nonce){

return Math.floor(rng(serverSeed,clientSeed,nonce)*25)

}

/* ======================
   PLINKO
====================== */

function plinko(serverSeed,clientSeed,nonce){

return Math.floor(rng(serverSeed,clientSeed,nonce)*16)

}

/* ======================
   KENO
====================== */

function keno(serverSeed,clientSeed,nonce){

return Math.floor(rng(serverSeed,clientSeed,nonce)*40)+1

}

/* ======================
   SLOTS
====================== */

function slots(serverSeed,clientSeed,nonce){

return [
Math.floor(rng(serverSeed,clientSeed,nonce)*7),
Math.floor(rng(serverSeed,clientSeed,nonce+1)*7),
Math.floor(rng(serverSeed,clientSeed,nonce+2)*7)
]

}

module.exports={

dice,
coinflip,
limbo,
crash,
roulette,
blackjack,
hilo,
wheel,
mines,
plinko,
keno,
slots

}
