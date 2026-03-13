const db = require("../database")
const ledger = require("../core/ledger")

exports.getWallet = async (req,res)=>{

const r = await db.query(

`SELECT
bx_balance,
usdt_balance,
ton_balance
FROM wallets
WHERE user_id=$1`,

[req.user.id]

)

const w = r.rows[0]

res.json({

BX:Number(w.bx_balance),
USDT:Number(w.usdt_balance),
TON:Number(w.ton_balance)

})

}

exports.transfer = async (req,res)=>{

try{

const {to_user,asset,amount} = req.body

if(amount <= 0)
return res.status(400).json({error:"invalid_amount"})

await ledger.transfer({

fromUser:req.user.id,
toUser:to_user,
asset,
amount

})

res.json({status:"ok"})

}catch(e){

res.status(400).json({
error:e.message
})

}

}

exports.withdraw = async (req,res)=>{

const {asset,amount,address} = req.body

await db.query(

`INSERT INTO withdraw_requests
(user_id,asset,amount,address)
VALUES($1,$2,$3,$4)`,

[req.user.id,asset,amount,address]

)

res.json({

status:"submitted"

})

  }
