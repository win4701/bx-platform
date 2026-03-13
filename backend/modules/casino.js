const db = require("../database")
const ledger = require("../core/ledger")
const engine = require("../engines/casinoEngine")

exports.play = async (req,res)=>{

const {game,bet,target} = req.body
const userId = req.user.id

if(!bet || bet <= 0)
return res.status(400).json({error:"invalid_bet"})

await ledger.adjustBalance({
userId,
asset:"BX",
amount:-bet,
type:"casino_bet"
})

let roll = engine.rollDice(
"server",
"client",
Date.now()
)

const win = roll > (target || 50)

const payout = win ? bet*2 : 0

if(win){

await ledger.adjustBalance({
userId,
asset:"BX",
amount:payout,
type:"casino_win"
})

}

await db.query(
`INSERT INTO casino_sessions
(user_id,game,bet,result,profit)
VALUES($1,$2,$3,$4,$5)`,
[
userId,
game,
bet,
win?"win":"lose",
payout-bet
]
)

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

roll,
win,
payout

})

}
