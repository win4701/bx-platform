"use strict"

/* =========================================================
   BLOXIO WALLET ENGINE
   Fully compatible with index.html structure
========================================================= */

import {API,STATE,CONFIG,UI,$,$$} from "./app.js"

/* ================= WALLET MODULE ================= */

window.WALLET = {

addresses:{},

refreshTimer:null,

/* ================= INIT ================= */

async init(){

await this.loadBalances()

this.bindActions()

this.startAutoRefresh()

this.bindWalletConnect()

this.bindBinancePay()

},

/* ================= LOAD BALANCES ================= */

async loadBalances(){

const res = await API.get("/finance/wallet")

if(!res) return

STATE.balances = res

this.renderBalances()

this.renderMarketMini()

this.renderTotal()

},

/* ================= RENDER BALANCES ================= */

renderBalances(){

CONFIG.COINS.forEach(asset=>{

const el = $("bal-"+asset.toLowerCase())

if(!el) return

const val = STATE.balances[asset] || 0

el.textContent = Number(val).toFixed(4)

})

},

/* ================= TOTAL VALUE ================= */

renderTotal(){

let total = 0

Object.values(STATE.balances).forEach(v=>{

total += Number(v || 0)

})

const el = $("walletTotal")

if(el){

el.textContent = "$"+total.toFixed(2)

}

},

/* ================= MARKET MINI ================= */

renderMarketMini(){

const bx = STATE.balances.BX || 0
const usdt = STATE.balances.USDT || 0

const bxEl = $("walletBX")
const usdtEl = $("walletUSDT")

if(bxEl) bxEl.textContent = Number(bx).toFixed(4)
if(usdtEl) usdtEl.textContent = Number(usdt).toFixed(4)

},

/* ================= AUTO REFRESH ================= */

startAutoRefresh(){

if(this.refreshTimer)
clearInterval(this.refreshTimer)

this.refreshTimer = setInterval(()=>{

this.loadBalances()

},15000)

},

/* ================= ACTION BUTTONS ================= */

bindActions(){

const btns = $$(".wallet-actions button")

if(btns[0]) btns[0].onclick = ()=>this.deposit("BX")
if(btns[1]) btns[1].onclick = ()=>this.withdraw()
if(btns[2]) btns[2].onclick = ()=>this.transfer()

const confirm = $(".wallet-transfer .confirm")

if(confirm){

confirm.onclick = ()=>this.transfer()

}

},

/* ================= DEPOSIT ================= */

async deposit(asset){

try{

UI.toast("Generating address...")

if(this.addresses[asset]){

this.showDeposit(asset,this.addresses[asset])
return

}

const res = await API.get("/finance/deposit/"+asset)

if(!res){

UI.toast("Deposit unavailable")
return

}

this.addresses[asset] = res.address

this.showDeposit(asset,res.address)

}catch(e){

UI.toast("Deposit error")

}

},

showDeposit(asset,address){

const box = document.createElement("div")

box.className = "deposit-modal"

box.innerHTML = `

<div class="deposit-card">

<h3>Deposit ${asset}</h3>

<input value="${address}" readonly>

<button id="copyDeposit">Copy</button>

<button id="closeDeposit">Close</button>

</div>

`

document.body.appendChild(box)

$("#copyDeposit").onclick = ()=>{

navigator.clipboard.writeText(address)

UI.toast("Address copied")

}

$("#closeDeposit").onclick = ()=>{

box.remove()

}

},

/* ================= WITHDRAW ================= */

async withdraw(){

const asset = prompt("Asset")
const amount = prompt("Amount")
const address = prompt("Address")

if(!asset || !amount || !address){

UI.toast("Invalid withdraw data")
return

}

UI.toast("Sending withdraw...")

const res = await API.post("/finance/withdraw",{

asset,
amount,
address

})

if(!res){

UI.toast("Withdraw failed")
return

}

UI.toast("Withdraw request sent")

this.loadBalances()

},

/* ================= TRANSFER ================= */

async transfer(){

const user = $("transferTelegram")?.value
const amount = $("transferAmount")?.value

if(!user || !amount){

UI.toast("Invalid transfer")
return

}

UI.toast("Processing transfer")

const res = await API.post("/finance/transfer",{

to_user:user,
asset:"BX",
amount

})

if(!res){

UI.toast("Transfer failed")
return

}

UI.toast("Transfer completed")

$("transferAmount").value = ""

this.loadBalances()

},

/* ================= WALLET CONNECT ================= */

bindWalletConnect(){

const btn = $("walletConnectBtn")

if(!btn) return

btn.onclick = ()=>this.connectWallet()

},

async connectWallet(){

if(!window.ethereum){

UI.toast("Wallet not installed")
return

}

try{

const accounts = await ethereum.request({

method:"eth_requestAccounts"

})

UI.toast("Connected: "+accounts[0])

}catch(e){

UI.toast("Connection rejected")

}

},

/* ================= BINANCE PAY ================= */

bindBinancePay(){

const btn = $("binanceConnectBtn")

if(!btn) return

btn.onclick = ()=>this.openBinancePay()

},

openBinancePay(){

const modal = document.createElement("div")

modal.className = "binance-modal"

modal.innerHTML = `

<div class="binance-box">

<h3>Binance Pay</h3>

<p>Scan with Binance App</p>

<img src="assets/images/binance-qr.png"/>

<button id="closeBinance">Close</button>

</div>

`

document.body.appendChild(modal)

$("#closeBinance").onclick = ()=>{

modal.remove()

}

},

/* ================= TRANSACTION HISTORY ================= */

async loadHistory(){

const res = await API.get("/finance/history")

if(!res) return

const list = document.createElement("div")

list.className = "wallet-history"

res.forEach(tx=>{

const row = document.createElement("div")

row.className = "tx-row"

row.innerHTML = `

<span>${tx.asset}</span>
<span>${tx.amount}</span>
<span>${tx.type}</span>

`

list.appendChild(row)

})

},

/* ================= SECURITY CHECK ================= */

validateAmount(val){

if(!val) return false

if(isNaN(val)) return false

if(Number(val)<=0) return false

return true

},

/* ================= DEBUG ================= */

debug(){

console.log("Balances",STATE.balances)

}

}
