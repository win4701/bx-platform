const rateMap = new Map()

function casinoRateLimit(userId){

const now = Date.now()

const last = rateMap.get(userId) || 0

if(now-last < 800){

throw new Error("too_fast")

}

rateMap.set(userId,now)

}

module.exports = {
generateToken,
verifyToken,
auth,
casinoRateLimit
}
