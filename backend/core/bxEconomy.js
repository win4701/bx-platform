const ledger = require("./ledger")

async function rewardBX(userId,amount,reason){

await ledger.adjustBalance({

userId,
asset:"BX",
amount,
type:reason

})

}

async function burnBX(userId,amount){

await ledger.adjustBalance({

userId,
asset:"BX",
amount:-amount,
type:"burn"

})

}

module.exports={

rewardBX,
burnBX

}
