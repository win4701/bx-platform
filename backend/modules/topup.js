const db = require("../database")
const economy = require("../core/bxEconomy")

exports.execute = async (req,res)=>{

const {usdt} = req.body

const bx = usdt * 45

await economy.rewardBX(
req.user.id,
bx,
"topup"
)

res.json({
bx
})

}
