"use strict"

const db = require("../database")
const ledger = require("../core/ledger")
const fetch = require("node-fetch")

/* ================================
SUPPORTED COINS
================================ */

const COINS = {

USDT:{ chain:"ETH", decimals:6 },
USDC:{ chain:"ETH", decimals:6 },

BTC:{ chain:"BTC", decimals:8 },

BNB:{ chain:"BSC", decimals:18 },

ETH:{ chain:"ETH", decimals:18 },

AVAX:{ chain:"AVAX", decimals:18 },

ZEC:{ chain:"ZEC", decimals:8 },

TON:{ chain:"TON", decimals:9 },

SOL:{ chain:"SOL", decimals:9 },

LTC:{ chain:"LTC", decimals:8 }

}

/* ================================
CONFIRMATION REQUIREMENTS
================================ */

const CONFIRMATIONS = {

BTC:3,
ETH:6,
BNB:6,
USDT:6,
USDC:6,
AVAX:6,
ZEC:6,
TON:3,
SOL:10,
LTC:6

}

/* ================================
CHECK TX ALREADY PROCESSED
================================ */

async function txExists(txid){

const r = await db.query(`
SELECT id FROM wallet_transactions
WHERE txid=$1
`,[txid])

return r.rows.length > 0

}

/* ================================
CREDIT USER WALLET
================================ */

async function creditDeposit(userId,asset,amount,txid){

await ledger.credit({

userId,
asset,
amount,
type:"deposit",
txid

})

await db.query(`
INSERT INTO wallet_transactions
(user_id,asset,amount,type,txid)
VALUES($1,$2,$3,'deposit',$4)
`,[
userId,
asset,
amount,
txid
])

}

/* ================================
GET USER ADDRESSES
================================ */

async function getWallets(asset){

const r = await db.query(`
SELECT user_id,deposit_address
FROM wallets
WHERE asset=$1
`,[asset])

return r.rows

}

/* ================================
BTC / LTC / ZEC SCANNER
================================ */

async function scanUTXO(asset){

const wallets = await getWallets(asset)

for(const w of wallets){

try{

const res = await fetch(
`https://api.blockcypher.com/v1/${asset.toLowerCase()}/main/addrs/${w.deposit_address}`
)

const data = await res.json()

for(const tx of data.txrefs || []){

if(tx.confirmations < CONFIRMATIONS[asset]) continue

if(await txExists(tx.tx_hash)) continue

const amount = tx.value / Math.pow(10,COINS[asset].decimals)

await creditDeposit(
w.user_id,
asset,
amount,
tx.tx_hash
)

}

}catch(e){

console.log(asset,"scan error",e)

}

}

}

/* ================================
EVM SCANNER (ETH / USDT / USDC / BNB / AVAX)
================================ */

async function scanEVM(asset){

const wallets = await getWallets(asset)

for(const w of wallets){

try{

const url =
`https://api.etherscan.io/api?module=account&action=txlist&address=${w.deposit_address}`

const res = await fetch(url)

const data = await res.json()

for(const tx of data.result || []){

if(tx.confirmations < CONFIRMATIONS[asset]) continue

if(await txExists(tx.hash)) continue

const value = tx.value / Math.pow(10,COINS[asset].decimals)

if(value <= 0) continue

await creditDeposit(
w.user_id,
asset,
value,
tx.hash
)

}

}catch(e){

console.log(asset,"scan error",e)

}

}

}

/* ================================
TON SCANNER
================================ */

async function scanTON(){

const wallets = await getWallets("TON")

try{

const res = await fetch(
"https://toncenter.com/api/v2/getTransactions"
)

const data = await res.json()

for(const tx of data.result || []){

const address = tx.in_msg.destination

const user = wallets.find(
w => w.deposit_address === address
)

if(!user) continue

if(await txExists(tx.transaction_id.hash)) continue

const amount =
tx.in_msg.value / Math.pow(10,COINS.TON.decimals)

await creditDeposit(
user.user_id,
"TON",
amount,
tx.transaction_id.hash
)

}

}catch(e){

console.log("TON scan error",e)

}

}

/* ================================
SOL SCANNER
================================ */

async function scanSOL(){

const wallets = await getWallets("SOL")

for(const w of wallets){

try{

const res = await fetch(
"https://api.mainnet-beta.solana.com"
)

const data = await res.json()

for(const tx of data.result || []){

if(await txExists(tx.signature)) continue

await creditDeposit(
w.user_id,
"SOL",
tx.amount,
tx.signature
)

}

}catch(e){

console.log("SOL scan error",e)

}

}

}

/* ================================
MAIN WATCHER
================================ */

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

/* ================================
START WATCHER
================================ */

function startWatcher(){

console.log("Deposit watcher started")

setInterval(async()=>{

try{

await scanAll()

}catch(e){

console.error("Deposit watcher error",e)

}

},20000)

}

module.exports = {
startWatcher
  }
