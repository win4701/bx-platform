const db = require("../database")
const bxToken = require("./bxToken")

async function claim(userId){

const claimed = await db.query(

`SELECT *
FROM airdrop_claims
WHERE user_id=$1`,
[userId]

)

if(claimed.rows.length){

return {

claimed:true

}

}

const reward = 5

await bxToken.mint(userId,reward)

await db.query(

`INSERT INTO airdrop_claims
(user_id,claimed,claimed_at)
VALUES($1,true,NOW())`,
[userId]

)

return {

claimed:false,
reward

}

}

async function status(userId){

const r = await db.query(

`SELECT *
FROM airdrop_claims
WHERE user_id=$1`,
[userId]

)

if(r.rows.length){

return {

claimed:true

}

}

return {

claimed:false,
reward:5

}

}

module.exports={

claim,
status

  }
