const casinoWS = require("../ws/casinoWS")

function broadcastWin(user,game,payout){

if(payout < 20) return

casinoWS.broadcastWin(
user,
game,
payout
)

}

function broadcastBet(user,game,bet){

casinoWS.broadcastBet(
user,
game,
bet
)

}

module.exports = {
broadcastWin,
broadcastBet
}
