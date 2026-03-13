const cache = new Map()

function setOrderbook(pair,data){

cache.set(pair,data)

}

function getOrderbook(pair){

return cache.get(pair)

}

module.exports={

setOrderbook,
getOrderbook

}
