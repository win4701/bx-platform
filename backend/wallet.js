const db = require("./database")

exports.getWallet = async (req,res)=>{

const r = await db.query(
"SELECT * FROM wallets WHERE user_id=$1",
[req.user.id]
)

res.json(r.rows[0])

}

exports.deposit = (req,res)=>{

res.json({
address:"TEST_"+req.params.asset+"_ADDRESS"
})

}

exports.withdraw = async (req,res)=>{

const {asset,amount,address} = req.body

await db.query(
`UPDATE wallets
SET ${asset.toLowerCase()} = ${asset.toLowerCase()} - $1
WHERE user_id=$2`,
[amount,req.user.id]
)

res.json({message:"withdraw submitted"})

}

exports.transfer = async (req,res)=>{

const {to_user,asset,amount} = req.body

await db.query("BEGIN")

await db.query(
`UPDATE wallets
SET ${asset.toLowerCase()}=${asset.toLowerCase()}-$1
WHERE user_id=$2`,
[amount,req.user.id]
)

await db.query(
`UPDATE wallets
SET ${asset.toLowerCase()}=${asset.toLowerCase()}+$1
WHERE user_id=$2`,
[amount,to_user]
)

await db.query("COMMIT")

res.json({status:"ok"})

          }
