const db = require("../database")
const ledger = require("../core/ledger")

async function scanDeposits(){

const deposits = await fetch("https://toncenter.com/api/v2/getTransactions")

const txs = await deposits.json()

for(const tx of txs.result){

const address = tx.in_msg.destination
const amount = tx.in_msg.value

const user = await db.query(`
SELECT id FROM users WHERE deposit_address=$1
`,[address])

if(!user.rows.length) continue

await ledger.credit({

userId:user.rows[0].id,
asset:"TON",
amount:amount,
type:"deposit"

})

}

}

function startWatcher(){

setInterval(()=>{

scanDeposits()

},20000)

}

module.exports = {
startWatcher
  }
