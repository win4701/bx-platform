const wsHub = require("./wsHub")

function broadcastBet(user,game,bet){

wsHub.broadcast({

type:"casino_bet",
user,
game,
bet,
time:Date.now()

})

}

function broadcastWin(user,game,payout){

if(payout < 20) return

wsHub.broadcast({

type:"big_win",
user,
game,
amount:payout,
time:Date.now()

})

}

module.exports = {

broadcastBet,
broadcastWin

}
