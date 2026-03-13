const db = require("../database")
const crypto = require("../utils/crypto")

async function rotateSeeds(userId){

const seed = crypto.randomHex(32)

const hash = crypto.sha256(seed)

await db.query(
`UPDATE casino_seeds
SET server_seed=$1,
server_seed_hash=$2,
nonce=0
WHERE user_id=$3`,
[seed,hash,userId]
)

return hash

}

module.exports={rotateSeeds}
