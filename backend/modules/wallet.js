const db = require("../database")
const ledger = require("../core/ledger")

/* =============================
   SUPPORTED COINS
============================= */

const COINS = [
"BX",
"USDT",
"TON",
"BTC",
"ETH",
"BNB",
"SOL",
"TRX",
"USDC",
"LTC"
]

/* =============================
   WALLET BALANCE
============================= */

exports.getWallet = async (req,res)=>{

const r = await db.query(
`SELECT * FROM wallets
WHERE user_id=$1`,
[req.user.id]
)

const wallet = {}

const w = r.rows[0]

for(const c of COINS){

const col = c.toLowerCase()+"_balance"

wallet[c] = Number(w[col] || 0)

}

res.json(wallet)

}

/* =============================
   TRANSFER BX
============================= */

exports.transfer = async (req,res)=>{

try{

const {to_user,amount} = req.body

if(!to_user || amount <= 0)
return res.status(400).json({
error:"invalid_request"
})

await ledger.transfer({

fromUser:req.user.id,
toUser:to_user,
asset:"BX",
amount

})

res.json({
status:"ok"
})

}catch(e){

res.status(400).json({
error:e.message
})

}

}

/* =============================
   WALLET CONNECT
============================= */

exports.connectWallet = async (req,res)=>{

const {type,address} = req.body

if(!address)
return res.status(400).json({
error:"invalid_address"
})

await db.query(

`UPDATE users
SET wallet_type=$1,
wallet_address=$2
WHERE id=$3`,

[type,address,req.user.id]

)

res.json({

status:"connected",
address

})

}

/* =============================
   DEPOSIT ADDRESS
============================= */

exports.deposit = async (req,res)=>{

const {asset} = req.params

if(!COINS.includes(asset))
return res.status(400).json({
error:"unsupported_asset"
})

/* demo address */

const address = `BX_${asset}_${req.user.id}`

res.json({

asset,
address

})

}

/* =============================
   BINANCE PAY
============================= */

exports.binancePay = async (req,res)=>{

const {amount} = req.body

if(!amount || amount <= 0)
return res.status(400).json({
error:"invalid_amount"
})

const order = await db.query(

`INSERT INTO binance_deposits
(user_id,amount,status)
VALUES($1,$2,'pending')
RETURNING id`,

[req.user.id,amount]

)

res.json({

status:"created",
order_id:order.rows[0].id

})

}

/* =============================
   WITHDRAW
============================= */

exports.withdraw = async (req,res)=>{

const {asset,amount,address} = req.body

if(!COINS.includes(asset))
return res.status(400).json({
error:"unsupported_asset"
})

if(amount <= 0)
return res.status(400).json({
error:"invalid_amount"
})

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

/* =============================
   WALLET HISTORY
============================= */

exports.history = async (req,res)=>{

const r = await db.query(

`SELECT asset,amount,type,created_at
FROM wallet_transactions
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 50`,

[req.user.id]

)

res.json(r.rows)

   }
