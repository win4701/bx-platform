const db = require("../database")
const ledger = require("../core/ledger")

async function mint(userId,amount){

await ledger.adjustBalance({

userId,
asset:"BX",
amount,
type:"mint"

})

}

async function burn(userId,amount){

await ledger.adjustBalance({

userId,
asset:"BX",
amount:-amount,
type:"burn"

})

}

async function transfer(fromUser,toUser,amount){

await ledger.adjustBalance({

userId:fromUser,
asset:"BX",
amount:-amount,
type:"transfer_out"

})

await ledger.adjustBalance({

userId:toUser,
asset:"BX",
amount:amount,
type:"transfer_in"

})

}

async function totalSupply(){

const r = await db.query(

`SELECT SUM(bx_balance) as supply
FROM wallets`

)

return Number(r.rows[0].supply || 0)

}

module.exports={

mint,
burn,
transfer,
totalSupply

              }
