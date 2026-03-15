const express = require("express")
const router = express.Router()

const db = require("../database")
const ledger = require("../core/ledger")
const engine = require("../engines/casinoEngine")

/* ===============================
   CREATE / LOAD SEED
================================ */

async function ensureSeed(userId){

const seed = await db.query(
`SELECT server_seed,client_seed,nonce
FROM casino_seeds
WHERE user_id=$1`,
[userId]
)

if(seed.rows.length) return seed.rows[0]

const serverSeed = Math.random().toString(36).slice(2)
const clientSeed = "client_"+Date.now()

await db.query(
`INSERT INTO casino_seeds
(user_id,server_seed,client_seed,nonce)
VALUES($1,$2,$3,0)`,
[userId,serverSeed,clientSeed]
)

return {
server_seed:serverSeed,
client_seed:clientSeed,
nonce:0
}

}

/* ===============================
   PLAY GAME
================================ */

router.post("/play", async (req,res)=>{

try{

const userId = req.user?.id

if(!userId){
return res.status(401).json({error:"unauthorized"})
}

let {
game,
bet,
multiplier,
choice,
client_seed
} = req.body

bet = Number(bet)

if(!bet || bet <= 0){
return res.status(400).json({error:"invalid_bet"})
}

/* ===============================
   LOAD USER BALANCE
================================ */

const balance = await ledger.getBalance(userId,"BX")

if(balance < bet){
return res.status(400).json({
error:"insufficient_balance"
})
}

/* ===============================
   LOAD SEED
================================ */

const seed = await ensureSeed(userId)

const serverSeed = seed.server_seed
const clientSeed = client_seed || seed.client_seed
const nonce = seed.nonce

/* ===============================
   TAKE BET
================================ */

await ledger.adjustBalance({
userId,
asset:"BX",
amount:-bet,
type:"casino_bet"
})

let result
let win=false
let payout=0

/* ===============================
   GAME SWITCH
================================ */

switch(game){

case "dice":

result = engine.dice(serverSeed,clientSeed,nonce)

const diceTarget = Number(multiplier) || 50

win = result > diceTarget

payout = win ? bet * 1.98 : 0

break


case "coinflip":

result = engine.coinflip(serverSeed,clientSeed,nonce)

win = result === choice

payout = win ? bet * 1.98 : 0

break


case "limbo":

result = engine.limbo(serverSeed,clientSeed,nonce)

multiplier = Number(multiplier) || 2

win = result >= multiplier

payout = win ? bet * multiplier : 0

break


case "crash":

result = engine.crash(serverSeed,clientSeed,nonce)

multiplier = Number(multiplier) || 2

win = result >= multiplier

payout = win ? bet * multiplier : 0

break


case "plinko":

result = engine.plinko(serverSeed,clientSeed,nonce)

win = result > 8

payout = win ? bet * 2 : 0

break


case "slots":

result = engine.slots(serverSeed,clientSeed,nonce)

win = result[0]===result[1] && result[1]===result[2]

payout = win ? bet * 10 : 0

break


case "hilo":

result = engine.hilo(serverSeed,clientSeed,nonce)

if(choice === "high"){
win = result > 7
}else{
win = result <= 7
}

payout = win ? bet * 1.98 : 0

break


case "blackjack":

result = engine.blackjack(serverSeed,clientSeed,nonce)

win = result.player > result.dealer

payout = win ? bet * 2 : 0

break


case "roulette":

result = engine.roulette(serverSeed,clientSeed,nonce)

win = result === multiplier

payout = win ? bet * 36 : 0

break


case "keno":

result = engine.keno(serverSeed,clientSeed,nonce)

win = result === multiplier

payout = win ? bet * 5 : 0

break


case "mines":

result = engine.mines(serverSeed,clientSeed,nonce)

win = result !== multiplier

payout = win ? bet * 1.5 : 0

break


case "wheel":

result = engine.wheel(serverSeed,clientSeed,nonce)

win = result === multiplier

payout = win ? bet * 10 : 0

break


default:

return res.status(400).json({
error:"invalid_game"
})

}

/* ===============================
   PAYOUT
================================ */

if(win){

await ledger.adjustBalance({
userId,
asset:"BX",
amount:payout,
type:"casino_win"
})

}

/* ===============================
   UPDATE NONCE
================================ */

await db.query(
`UPDATE casino_seeds
SET nonce = nonce + 1
WHERE user_id=$1`,
[userId]
)

/* ===============================
   SAVE SESSION
================================ */

await db.query(
`INSERT INTO casino_sessions
(user_id,game,bet,result,profit)
VALUES($1,$2,$3,$4,$5)`,
[
userId,
game,
bet,
JSON.stringify(result),
payout - bet
]
)

/* ===============================
   LIVE FEED
================================ */

if(global.broadcast){

global.broadcast({
type:"casino_bet",
user:userId,
game,
bet,
win,
payout
})

}

/* ===============================
   RESPONSE
================================ */

res.json({
game,
bet,
result,
win,
payout
})

}catch(e){

console.error("casino error",e)

res.status(500).json({
error:"casino_error"
})

}

})

/* ===============================
   GAME FLAGS
================================ */

router.get("/flags",(req,res)=>{

res.json({

coinflip:true,
crash:true,
limbo:true,
dice:true,
slot:true,
plinko:true,
hilo:true,
airboss:true,
fruit_party:true,
banana_farm:true,
blackjack_fast:true,
birds_party:true

})

})

module.exports = router
