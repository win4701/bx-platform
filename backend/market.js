exports.prices = (req,res)=>{

res.json({
BX_USDT:45
})

}

exports.order = async (req,res)=>{

const {pair,side,price,amount} = req.body

res.json({
status:true
})

}
