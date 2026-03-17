"use strict"

const db = require("../database")
const ledger = require("../core/ledger")
const fetch = require("node-fetch")

const SCAN_INTERVAL = 20000

/* ===============================
API KEYS
=============================== */

const ETHERSCAN = process.env.ETHERSCAN_KEY || ""
const BSCSCAN = process.env.BSCSCAN_KEY || ""
const SNOWTRACE = process.env.SNOWTRACE_KEY || ""

/* ===============================
COINS
=============================== */

const COINS = {

BTC:{ type:"utxo", decimals:8 },

LTC:{ type:"utxo", decimals:8 },

ZEC:{ type:"utxo", decimals:8 },

ETH:{ type:"evm", decimals:18, explorer:"https://api.etherscan.io/api" },

USDT:{ type:"evm", decimals:6, explorer:"https://api.etherscan.io/api" },

USDC:{ type:"evm", decimals:6, explorer:"https://api.etherscan.io/api" },

BNB:{ type:"evm", decimals:18, explorer:"https://api.bscscan.com/api" },

AVAX:{ type:"evm", decimals:18, explorer:"https://api.snowtrace.io/api" },

TON:{ type:"ton", decimals:9 },

SOL:{ type:"sol", decimals:9 }

}

/* ===============================
CONFIRMATIONS
=============================== */

const CONFIRM = {

BTC:3,
LTC:6,
ZEC:6,

ETH:6,
USDT:6,
USDC:6,
BNB:6,
AVAX:6,

TON:3,
SOL:10

}

/* ===============================
CHECK TX
=============================== */

async function txExists(txid){

const r = await db.query(
`SELECT id FROM wallet_transactions WHERE txid=$1`,
[txid]
)

return r.rows.length > 0

}

/* ===============================
CREDIT
=============================== */

async function creditDeposit(user,asset,amount,txid){

await ledger.credit({

user_id:user,
asset,
amount,
reason:"deposit"

})

await db.query(

`INSERT INTO wallet_transactions
(user_id,asset,amount,type,txid)
VALUES($1,$2,$3,'deposit',$4)`,

[user,asset,amount,txid]

)

console.log("Deposit credited",asset,amount)

}

/* ===============================
GET WALLETS
=============================== */

async function getWallets(asset){

const r = await db.query(

`SELECT user_id,deposit_address
FROM wallets
WHERE asset=$1`,

[asset]

)

return r.rows

}

/* ===============================
UTXO SCAN
=============================== */

async function scanUTXO(asset){

const wallets = await getWallets(asset)

for(const w of wallets){

try{

const url =
`https://api.blockcypher.com/v1/${asset.toLowerCase()}/main/addrs/${w.deposit_address}/full`

const r = await fetch(url)

const data = await r.json()

for(const tx of data.txs || []){

if(tx.confirmations < CONFIRM[asset]) continue

if(await txExists(tx.hash)) continue

for(const out of tx.outputs){

if(!out.addresses) continue

if(!out.addresses.includes(w.deposit_address)) continue

const amount =
out.value / Math.pow(10,COINS[asset].decimals)

await creditDeposit(
w.user_id,
asset,
amount,
tx.hash
)

}

}

}catch(e){

console.log(asset,"scan error",e)

}

}

}

/* ===============================
EVM SCAN
=============================== */

async function scanEVM(asset){

const wallets = await getWallets(asset)

const explorer = COINS[asset].explorer

for(const w of wallets){

try{

const url =
`${explorer}?module=account&action=txlist&address=${w.deposit_address}&sort=desc&apikey=${ETHERSCAN}`

const r = await fetch(url)

const data = await r.json()

for(const tx of data.result || []){

if(Number(tx.confirmations) < CONFIRM[asset]) continue

if(await txExists(tx.hash)) continue

if(tx.to.toLowerCase() !== w.deposit_address.toLowerCase()) continue

const amount =
Number(tx.value) /
Math.pow(10,COINS[asset].decimals)

if(amount <= 0) continue

await creditDeposit(
w.user_id,
asset,
amount,
tx.hash
)

}

}catch(e){

console.log(asset,"scan error",e)

}

}

}

/* ===============================
TON
=============================== */

async function scanTON(){

const wallets = await getWallets("TON")

for(const w of wallets){

try{

const url =
`https://toncenter.com/api/v2/getTransactions?address=${w.deposit_address}`

const r = await fetch(url)

const data = await r.json()

for(const tx of data.result || []){

const hash = tx.transaction_id.hash

if(await txExists(hash)) continue

const amount =
tx.in_msg.value / Math.pow(10,COINS.TON.decimals)

await creditDeposit(
w.user_id,
"TON",
amount,
hash
)

}

}catch(e){

console.log("TON scan error",e)

}

}

}

/* ===============================
SOL
=============================== */

async function scanSOL(){

const wallets = await getWallets("SOL")

for(const w of wallets){

try{

const url =
`https://public-api.solscan.io/account/transactions?account=${w.deposit_address}`

const r = await fetch(url)

const data = await r.json()

for(const tx of data || []){

if(await txExists(tx.txHash)) continue

const amount = Math.abs(tx.changeAmount)

await creditDeposit(
w.user_id,
"SOL",
amount,
tx.txHash
)

}

}catch(e){

console.log("SOL scan error",e)

}

}

}

/* ===============================
SCAN ALL
=============================== */

async function scanAll(){

await scanUTXO("BTC")
await scanUTXO("LTC")
await scanUTXO("ZEC")

await scanEVM("ETH")
await scanEVM("USDT")
await scanEVM("USDC")
await scanEVM("BNB")
await scanEVM("AVAX")

await scanTON()

await scanSOL()

}

/* ===============================
START
=============================== */

function startWatcher(){

console.log("Deposit watcher started")

setInterval(async()=>{

try{

await scanAll()

}catch(e){

console.error("Deposit watcher error",e)

}

},SCAN_INTERVAL)

}

module.exports = { startWatcher }
