const db = require("../database")

exports.order = async (req,res)=>{

const {pair,side,price,amount} = req.body

await db.query(
`INSERT INTO market_orders
(user_id,pair,side,price,amount)
VALUES($1,$2,$3,$4,$5)`,
[
req.user.id,
pair,
side,
price,
amount
]
)

res.json({status:true})

          }
