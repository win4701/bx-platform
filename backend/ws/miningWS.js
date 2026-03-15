const wsHub = require("./wsHub")

function broadcastMining(user,coin,amount){

wsHub.broadcast({

type:"mining_reward",
user,
coin,
amount,
time:Date.now()

})

}

function broadcastHashrate(rate){

wsHub.broadcast({

type:"network_hashrate",
rate,
time:Date.now()

})

}

module.exports = {

broadcastMining,
broadcastHashrate

}
