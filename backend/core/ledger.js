const db = require("../database")

/* ============================
   BALANCE UPDATE
============================ */

async function adjustBalance({

userId,
asset,
amount,
type,
reference=null

}){

const column = asset.toLowerCase()+"_balance"

return db.transaction(async (client)=>{

const wallet = await client.query(

`SELECT ${column}
FROM wallets
WHERE user_id=$1
FOR UPDATE`,

[userId]

)

if(!wallet.rows.length)
throw new Error("wallet_not_found")

const current = Number(wallet.rows[0][column])

const next = current + amount

if(next < 0)
throw new Error("insufficient_balance")

await client.query(

`UPDATE wallets
SET ${column}=$1,
updated_at=NOW()
WHERE user_id=$2`,

[next,userId]

)

await client.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,reference_id)
VALUES($1,$2,$3,$4,$5)`,

[userId,asset,amount,type,reference]

)

return next

})

}

/* ============================
   TRANSFER
============================ */

async function transfer({

fromUser,
toUser,
asset,
amount

}){

return db.transaction(async (client)=>{

await adjustBalance({

userId:fromUser,
asset,
amount:-amount,
type:"transfer_out"

})

await adjustBalance({

userId:toUser,
asset,
amount:amount,
type:"transfer_in"

})

await client.query(

`INSERT INTO internal_transfers
(from_user,to_user,asset,amount)
VALUES($1,$2,$3,$4)`,

[fromUser,toUser,asset,amount]

)

})

}

/* ============================
   LOCK BALANCE
============================ */

async function lockBalance({

userId,
asset,
amount

}){

const column = asset.toLowerCase()+"_balance"

return db.transaction(async (client)=>{

const wallet = await client.query(

`SELECT ${column}
FROM wallets
WHERE user_id=$1
FOR UPDATE`,

[userId]

)

const current = Number(wallet.rows[0][column])

if(current < amount)
throw new Error("insufficient_balance")

await client.query(

`UPDATE wallets
SET ${column}=${column}-$1,
locked_balance=locked_balance+$1
WHERE user_id=$2`,

[amount,userId]

)

})

}

/* ============================
   UNLOCK BALANCE
============================ */

async function unlockBalance({

userId,
asset,
amount

}){

const column = asset.toLowerCase()+"_balance"

return db.transaction(async (client)=>{

await client.query(

`UPDATE wallets
SET ${column}=${column}+$1,
locked_balance=locked_balance-$1
WHERE user_id=$2`,

[amount,userId]

)

})

}

module.exports={

adjustBalance,
transfer,
lockBalance,
unlockBalance

}
