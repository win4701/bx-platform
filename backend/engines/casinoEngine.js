const crypto = require("../utils/crypto")

function dice(serverSeed,clientSeed,nonce){

const hash = crypto.hmac(

serverSeed,
clientSeed+":"+nonce

)

const n = parseInt(hash.slice(0,8),16)

return (n/0xffffffff)*100

}

module.exports={dice}
