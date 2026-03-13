const db = require("../database")
const ledger = require("../core/ledger")
const engine = require("../engines/casinoEngine")

exports.play = async (req,res)=>{

const {game,bet,target} = req.body
const userId = req.user.id

await ledger.adjustBalance({
userId,
asset:"BX",
amount:-bet,
type:"casino_bet"
})

let roll = engine.dice("server","client",Date.now())

const win = roll > target
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

res.json({

roll,
win,
payout

})

  }
