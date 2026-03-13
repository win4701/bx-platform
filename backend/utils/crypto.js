const crypto = require("crypto")

function sha256(data){

return crypto
.createHash("sha256")
.update(data)
.digest("hex")

}

function hmac(key,data){

return crypto
.createHmac("sha256",key)
.update(data)
.digest("hex")

}

function randomHex(size=32){

return crypto
.randomBytes(size)
.toString("hex")

}

module.exports = {

sha256,
hmac,
randomHex

}
