const db = require("../database")
const ledger = require("../core/ledger")
const engine = require("../engines/casinoEngine")

exports.play = async (req,res)=>{

try{

const {game,bet,target} = req.body

const userId = req.user.id

if(!bet || bet<=0)
return res.status(400).json({error:"invalid_bet"})

const seed = await db.query(

`SELECT * FROM casino_seeds
WHERE user_id=$1`,

[userId]

)

const s = seed.rows[0]

await ledger.adjustBalance({

userId,
asset:"BX",
amount:-bet,
type:"casino_bet"

})

let result
let win=false
let payout=0

/* =====================
   GAME SWITCH
===================== */

switch(game){

case "dice":

result = engine.dice(s.server_seed,s.client_seed,s.nonce)
win = result > (target || 50)
payout = win ? bet*2 : 0
break

case "coinflip":

result = engine.coinflip(s.server_seed,s.client_seed,s.nonce)
win = result === target
payout = win ? bet*2 : 0
break

case "limbo":

result = engine.limbo(s.server_seed,s.client_seed,s.nonce)
win = result >= target
payout = win ? bet*target : 0
break

case "crash":

result = engine.crash(s.server_seed,s.client_seed,s.nonce)
win = result >= target
payout = win ? bet*target : 0
break

case "roulette":

result = engine.roulette(s.server_seed,s.client_seed,s.nonce)
win = result === target
payout = win ? bet*36 : 0
break

case "blackjack":

result = engine.blackjack(s.server_seed,s.client_seed,s.nonce)
win = result.player > result.dealer
payout = win ? bet*2 : 0
break

case "hilo":

result = engine.hilo(s.server_seed,s.client_seed,s.nonce)
win = result > 7
payout = win ? bet*2 : 0
break

case "wheel":

result = engine.wheel(s.server_seed,s.client_seed,s.nonce)
win = result === target
payout = win ? bet*10 : 0
break

case "mines":

result = engine.mines(s.server_seed,s.client_seed,s.nonce)
win = result !== target
payout = win ? bet*1.5 : 0
break

case "plinko":

result = engine.plinko(s.server_seed,s.client_seed,s.nonce)
win = result > 8
payout = win ? bet*2 : 0
break

case "keno":

result = engine.keno(s.server_seed,s.client_seed,s.nonce)
win = result === target
payout = win ? bet*5 : 0
break

case "slots":

result = engine.slots(s.server_seed,s.client_seed,s.nonce)
win = result[0]===result[1] && result[1]===result[2]
payout = win ? bet*10 : 0
break

}

/* =====================
   PAYOUT
===================== */

if(win){

await ledger.adjustBalance({

userId,
asset:"BX",
amount:payout,
type:"casino_win"

})

}

/* =====================
   UPDATE NONCE
===================== */

await db.query(

`UPDATE casino_seeds
SET nonce=nonce+1
WHERE user_id=$1`,

[userId]

)

/* =====================
   LOG GAME
===================== */

await db.query(

`INSERT INTO casino_sessions
(user_id,game,bet,result,profit)
VALUES($1,$2,$3,$4,$5)`,

[
userId,
game,
bet,
JSON.stringify(result),
payout-bet
]

)

/* =====================
   LIVE FEED
===================== */

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

res.json({

game,
result,
win,
payout

})

}catch(e){

res.status(500).json({
error:"casino_error"
})

}

  }
