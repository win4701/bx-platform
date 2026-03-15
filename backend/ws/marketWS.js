const wsHub = require("./wsHub")

function broadcastPrice(pair,price){

wsHub.broadcast({

type:"market_price",
pair,
price,
time:Date.now()

})

}

function broadcastTrade(pair,price,amount,side){

wsHub.broadcast({

type:"market_trade",
pair,
price,
amount,
side,
time:Date.now()

})

}

function broadcastOrderbook(pair,bids,asks){

wsHub.broadcast({

type:"orderbook",
pair,
bids,
asks

})

}

module.exports = {

broadcastPrice,
broadcastTrade,
broadcastOrderbook

}
