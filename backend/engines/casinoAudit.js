const db = require("../database")

async function logRNG({

userId,
game,
serverSeed,
clientSeed,
nonce,
result

}){

await db.query(
`INSERT INTO casino_audit
(user_id,game,server_seed,client_seed,nonce,result)
VALUES($1,$2,$3,$4,$5,$6)`,
[
userId,
game,
serverSeed,
clientSeed,
nonce,
result
]
)

}

module.exports={logRNG}
