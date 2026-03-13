const db = require("./database")

exports.flags = (req,res)=>{

res.json({
coinflip:true,
crash:true,
limbo:true,
dice:true
})

}

exports.play = async (req,res)=>{

const {game,bet} = req.body

const win = Math.random() > 0.5
const payout = win ? bet*2 : 0

await db.query(
`UPDATE wallets
SET bx = bx + $1
WHERE user_id=$2`,
[payout-bet,req.user.id]
)

if(win && payout>5){

global.broadcastBigWin({
user:"player"+req.user.id,
game,
amount:payout
})

}

res.json({
game,
bet,
win,
payout
})

}
