const db = require("../database")

async function adjustBalance({

userId,
asset,
amount,
type

}){

const col = asset.toLowerCase()+"_balance"

await db.query("BEGIN")

try{

const r = await db.query(
`SELECT ${col}
FROM wallets
WHERE user_id=$1
FOR UPDATE`,
[userId]
)

const current = Number(r.rows[0][col])
const next = current + amount

if(next < 0)
throw new Error("insufficient")

await db.query(
`UPDATE wallets
SET ${col}=$1
WHERE user_id=$2`,
[next,userId]
)

await db.query(
`INSERT INTO wallet_transactions
(user_id,asset,amount,type)
VALUES($1,$2,$3,$4)`,
[userId,asset,amount,type]
)

await db.query("COMMIT")

return next

}catch(e){

await db.query("ROLLBACK")
throw e

}

}

module.exports={adjustBalance}
