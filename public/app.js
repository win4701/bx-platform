"use strict";

/* =========================================================
   BLOXIO SUPER ENGINE v11
========================================================= */

const $ = id => document.getElementById(id)
const $$ = q => document.querySelectorAll(q)

/* =========================================================
   CORE
========================================================= */

const BLOXIO = {

config:{
api:"/api",
sync:20000
},

state:{
jwt:localStorage.getItem("jwt"),
user:null,
wallet:{},
view:"wallet",
ready:false
},

/* =========================================================
   API
========================================================= */

async api(endpoint,method="GET",body=null){

const headers={
"Content-Type":"application/json",
...(this.state.jwt && {Authorization:`Bearer ${this.state.jwt}`})
}

const res=await fetch(`${this.config.api}${endpoint}`,{
method,
headers,
body:body?JSON.stringify(body):null
})

if(res.status===401){

this.auth.logout()
throw new Error("Session expired")

}

const data=await res.json()

if(!res.ok) throw new Error(data.detail || "API error")

return data

},

/* =========================================================
   AUTH
========================================================= */

auth:{

async load(){

if(!BLOXIO.state.jwt) return

const user=await BLOXIO.api("/auth/me")

BLOXIO.state.user=user

this.render()

},

render(){

if($("u-name"))
$("u-name").textContent=BLOXIO.state.user.first_name

if($("u-id"))
$("u-id").textContent=BLOXIO.state.user.id

},

logout(){

localStorage.removeItem("jwt")
location.reload()

}

},

/* =========================================================
   NAVIGATION
========================================================= */

nav:{

switch(view){

BLOXIO.state.view=view

$$(".view").forEach(v=>v.classList.remove("active"))

const el=$(view)
if(el) el.classList.add("active")

$$(".bottom-nav button")
.forEach(b=>b.classList.toggle("active",b.dataset.view===view))

document.dispatchEvent(new CustomEvent("viewChange",{detail:view}))

},

bind(){

$$(".bottom-nav button").forEach(btn=>{
btn.onclick=()=>this.switch(btn.dataset.view)
})

}

},

/* =========================================================
   WALLET
========================================================= */

wallet:{

assets:[
"BX","USDT","USDC","BTC","BNB",
"ETH","AVAX","ZEC","TON","SOL","LTC"
],

async load(){

const data=await BLOXIO.api("/finance/wallet")

BLOXIO.state.wallet=data

this.render()

},

render(){

let total=0

this.assets.forEach(a=>{

const el=$(`bal-${a.toLowerCase()}`)
if(!el) return

const v=BLOXIO.state.wallet[a]||0

el.textContent=a==="BX"?v.toFixed(2):v.toFixed(6)

total+=v

})

if($("walletTotal"))
$("walletTotal").textContent=total.toFixed(2)

this.updateMini()

},

updateMini(){

if($("walletBX"))
$("walletBX").textContent=(BLOXIO.state.wallet.BX||0).toFixed(2)

if($("walletUSDT"))
$("walletUSDT").textContent=(BLOXIO.state.wallet.USDT||0).toFixed(2)

},

async transfer(uid,amount){

await BLOXIO.api("/finance/transfer","POST",{
to_user:uid,
asset:"BX",
amount
})

await this.load()

BLOXIO.ui.toast("Transfer success")

},

async withdraw(asset,amount,address){

await BLOXIO.api("/finance/withdraw","POST",{
asset,
amount,
address
})

BLOXIO.ui.toast("Withdraw submitted")

},

async deposit(asset){

const res=await BLOXIO.api(`/finance/deposit/${asset}`)

navigator.clipboard.writeText(res.address)

BLOXIO.ui.toast("Deposit address copied")

}

},

/* =========================================================
   WALLETCONNECT
========================================================= */

walletconnect:{

state:{
connected:false,
address:null
},

async connect(){

if(window.ethereum){

const accounts=await window.ethereum.request({
method:"eth_requestAccounts"
})

this.state.connected=true
this.state.address=accounts[0]

localStorage.setItem("web3wallet",accounts[0])

BLOXIO.ui.toast("Wallet connected")

}

}

},

/* =========================================================
   MINING
========================================================= */

mining:{

coin:"BX",

async subscribe(plan,amount){

await BLOXIO.api("/mining/subscribe","POST",{
coin:this.coin,
plan_id:plan,
amount
})

BLOXIO.ui.toast("Mining started")

BLOXIO.wallet.load()

},

async claim(){

const res=await BLOXIO.api("/mining/claim","POST")

BLOXIO.ui.toast(`+${res.profit} ${res.coin}`)

BLOXIO.wallet.load()

}

},

/* =========================================================
   CASINO
========================================================= */

casino:{

async play(game,bet,extra={}){

const res=await BLOXIO.api("/casino/play","POST",{
game,
bet,
...extra
})

if(res.win){

BLOXIO.ui.toast(`WIN +${res.payout}`)

}else{

BLOXIO.ui.toast("Lose")

}

BLOXIO.wallet.load()

}

},

/* =========================================================
   AIRDROP
========================================================= */

airdrop:{

async status(){

return await BLOXIO.api("/bxing/airdrop/status")

},

async claim(){

const res=await BLOXIO.api("/bxing/airdrop/claim","POST")

if(res.status==="ok")
BLOXIO.ui.toast(`+${res.reward} BX`)
else
BLOXIO.ui.toast("Already claimed")

BLOXIO.wallet.load()

}

},

/* =========================================================
   REFERRAL
========================================================= */

referral:{

generate(){

if(!BLOXIO.state.user) return

const link=
`${location.origin}?ref=${BLOXIO.state.user.id}`

const el=document.querySelector(".ref-link")

if(el) el.textContent=link

},

copy(){

const el=document.querySelector(".ref-link")

if(!el) return

navigator.clipboard.writeText(el.textContent)

BLOXIO.ui.toast("Referral copied")

}

},

/* =========================================================
   TOPUP
========================================================= */

topup:{

async execute(data){

await BLOXIO.api("/topup/execute","POST",data)

BLOXIO.ui.toast("Topup completed")

}

},

/* =========================================================
   UI
========================================================= */

ui:{

toast(msg){

const el=document.createElement("div")

el.className="toast"
el.textContent=msg

document.body.appendChild(el)

setTimeout(()=>el.remove(),3000)

}

},

/* =========================================================
   EVENTS
========================================================= */

events(){

document.addEventListener("viewChange",e=>{

const v=e.detail

if(v==="wallet") BLOXIO.wallet.load()

if(v==="airdrop") BLOXIO.referral.generate()

})

const transferBtn=document.querySelector(".wallet-transfer .confirm")

if(transferBtn){

transferBtn.onclick=()=>{

const uid=$("transferTelegram").value
const amount=$("transferAmount").value

BLOXIO.wallet.transfer(uid,amount)

}

}

const depBtn=document.querySelector(".wallet-actions .primary")

if(depBtn){
depBtn.onclick=()=>BLOXIO.wallet.deposit("USDT")
}

const wdBtn=document.querySelectorAll(".wallet-actions .btn")[1]

if(wdBtn){
wdBtn.onclick=()=>{

const amount=prompt("Amount")
const address=prompt("Address")

if(amount && address)
BLOXIO.wallet.withdraw("USDT",amount,address)

}
}

},

/* =========================================================
   SYNC
========================================================= */

sync(){

setInterval(()=>{

if(!this.state.ready) return

if(this.state.view==="wallet")
this.wallet.load()

},this.config.sync)

},

/* =========================================================
   INIT
========================================================= */

async init(){

await this.auth.load()

await this.wallet.load()

this.nav.bind()

this.events()

this.referral.generate()

this.sync()

this.state.ready=true

console.log("BLOXIO SUPER ENGINE v11 READY")

}

}

/* =========================================================
   BOOT
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{

BLOXIO.init()

})
