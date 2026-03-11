"use strict"

import {API,STATE,CONFIG,UI,$,$$,renderBalances} from "./app.js"

window.WALLET = {

coins:CONFIG.COINS,

balances:{},

addresses:{},

activeCoin:"BX",

connectedWallet:null,

refreshTimer:null,

/* ================= INIT ================= */

async init(){

this.bindCoins()

this.bindTransfer()

this.bindWalletConnect()

this.bindBinance()

await this.loadBalances()

this.startAutoRefresh()

},

/* ================= LOAD BALANCES ================= */

async loadBalances(){

const res = await API.get("/finance/wallet")

if(!res) return

this.balances=res

STATE.balances=res

renderBalances(res)

},

/* ================= AUTO REFRESH ================= */

startAutoRefresh(){

if(this.refreshTimer)
clearInterval(this.refreshTimer)

this.refreshTimer=setInterval(()=>{

this.loadBalances()

},15000)

},

/* ================= COIN CLICK ================= */

bindCoins(){

$$(".coin-row").forEach(row=>{

row.onclick=()=>{

const coin=row.dataset.coin

this.openCoin(coin)

}

})

},

/* ================= OPEN COIN ================= */

openCoin(asset){

this.activeCoin=asset

const balance=this.balances[asset]||0

const box=$("walletDetails")

if(!box) return

box.innerHTML=`

<div class="wallet-coin">

<h3>${asset}</h3>

<div class="coin-balance">

${balance}

</div>

<div class="wallet-actions">

<button id="depositBtn">Deposit</button>
<button id="withdrawBtn">Withdraw</button>

</div>

</div>

`

$("#depositBtn").onclick=()=>this.deposit(asset)
$("#withdrawBtn").onclick=()=>this.withdraw(asset)

},

/* ================= DEPOSIT ================= */

async deposit(asset){

UI.toast("Generating address...")

if(this.addresses[asset]){

this.showDeposit(asset,this.addresses[asset])
return

}

const res = await API.get("/finance/deposit/"+asset)

if(!res){

UI.toast("Deposit error")
return

}

this.addresses[asset]=res.address

this.showDeposit(asset,res.address)

},

showDeposit(asset,address){

const modal=document.createElement("div")

modal.className="deposit-modal"

modal.innerHTML=`

<div class="deposit-box">

<h3>Deposit ${asset}</h3>

<input value="${address}" readonly>

<button id="copyAddr">Copy</button>

<button id="closeDeposit">Close</button>

</div>

`

document.body.appendChild(modal)

$("#copyAddr").onclick=()=>{

navigator.clipboard.writeText(address)

UI.toast("Address copied")

}

$("#closeDeposit").onclick=()=>{

modal.remove()

}

},

/* ================= WITHDRAW ================= */

async withdraw(asset){

const amount=prompt("Amount")

const address=prompt("Address")

if(!amount||!address){

UI.toast("Invalid withdraw")
return

}

UI.toast("Processing withdraw...")

const res = await API.post("/finance/withdraw",{

asset,
amount,
address

})

if(!res){

UI.toast("Withdraw failed")
return

}

UI.toast("Withdraw submitted")

this.loadBalances()

},

/* ================= TRANSFER ================= */

bindTransfer(){

const btn=$(".wallet-transfer button")

if(!btn) return

btn.onclick=()=>this.transfer()

},

async transfer(){

const user=$("transferTelegram")?.value
const amount=$("transferAmount")?.value

if(!user||!amount){

UI.toast("Invalid transfer")
return

}

const res=await API.post("/finance/transfer",{

to_user:user,
asset:this.activeCoin,
amount

})

if(!res){

UI.toast("Transfer failed")
return

}

UI.toast("Transfer success")

$("transferAmount").value=""

this.loadBalances()

},

/* ================= WALLET CONNECT ================= */

bindWalletConnect(){

const btn=document.querySelector(".connect-wallet")

if(!btn) return

btn.onclick=()=>this.connectWallet()

},

async connectWallet(){

try{

if(window.ethereum){

const accounts = await ethereum.request({
method:"eth_requestAccounts"
})

this.connectedWallet=accounts[0]

UI.toast("Connected: "+accounts[0])

}else{

UI.toast("Wallet not installed")

}

}catch{

UI.toast("Wallet connection rejected")

}

},

/* ================= BINANCE PAY ================= */

bindBinance(){

const btn=document.querySelector(".binance-pay")

if(!btn) return

btn.onclick=()=>this.openBinancePay()

},

async openBinancePay(){

UI.toast("Creating payment...")

const res = await API.post("/finance/binance-pay",{

asset:this.activeCoin,
amount:10

})

if(!res){

UI.toast("Payment error")
return

}

this.showBinanceQR(res.qr)

},

showBinanceQR(url){

const modal=document.createElement("div")

modal.className="binance-modal"

modal.innerHTML=`

<div class="binance-box">

<h3>Binance Pay</h3>

<img src="${url}">

<button id="closeBinance">Close</button>

</div>

`

document.body.appendChild(modal)

$("#closeBinance").onclick=()=>modal.remove()

},

/* ================= HISTORY ================= */

async loadHistory(){

const res = await API.get("/finance/history")

if(!res) return

const box=$("walletHistory")

if(!box) return

box.innerHTML=""

res.forEach(tx=>{

const row=document.createElement("div")

row.className="tx-row"

row.innerHTML=`

<span>${tx.asset}</span>
<span>${tx.amount}</span>
<span>${tx.type}</span>

`

box.appendChild(row)

})

}

}
