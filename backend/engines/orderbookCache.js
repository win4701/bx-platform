const cache = new Map()

function setOrderbook(pair,data){

cache.set(pair,{
data,
time:Date.now()
})

}

function getOrderbook(pair){

const item = cache.get(pair)

if(!item) return null

return item.data

}

/* CLEAN CACHE */

setInterval(()=>{

const now = Date.now()

for(const [k,v] of cache){

if(now - v.time > 30000){

cache.delete(k)

}

}

},10000)

module.exports={
setOrderbook,
getOrderbook
}
