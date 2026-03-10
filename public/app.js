"use strict";

/* =====================================================
BLOXIO ULTIMATE APP.JS
Production Client Engine
===================================================== */


/* =====================================================
1 CORE ENGINE
===================================================== */

const BLOXIO = {
version:"5.0",
network:"production",
build: Date.now(),
ready:false
};


/* =====================================================
2 LOGGER ENGINE
===================================================== */

const LOG = {

info(...a){
console.log("[BLOXIO]",...a)
},

warn(...a){
console.warn("[BLOXIO]",...a)
},

error(...a){
console.error("[BLOXIO]",...a)
}

};


/* =====================================================
3 GLOBAL STATE ENGINE
===================================================== */

const STATE = {

user:null,

jwt:null,

wallet:{},

prices:{},

casino:{
current:null,
history:[]
},

mining:{
coin:"BX",
plans:[],
active:null
},

market:{
orderbook:{},
ticker:{}
},

airdrop:{
claimed:false,
reward:0
},

referral:{
link:null
},

ui:{
view:"wallet"
}

};


/* =====================================================
4 SECURITY ENGINE
===================================================== */

function authHeaders(){

if(!STATE.jwt) return {}

return {
Authorization:`Bearer ${STATE.jwt}`
}

}


/* =====================================================
5 API ENGINE
===================================================== */

async function api(url,opt={}){

try{

const res = await fetch(url,{
headers:{
"Content-Type":"application/json",
...authHeaders()
},
...opt
})

if(!res.ok) return null

return await res.json()

}catch(e){

LOG.error("API",url,e)
return null

}

}


/* =====================================================
6 TELEGRAM AUTH ENGINE
===================================================== */

async function telegramAuth(){

if(!window.Telegram) return

const tg = Telegram.WebApp

tg.ready()

const user = tg.initDataUnsafe?.user

if(!user) return

const r = await api("/auth/telegram",{
method:"POST",
body:JSON.stringify({
telegram_id:user.id,
username:user.username
})
})

if(!r) return

STATE.jwt = r.access_token
STATE.user = user

localStorage.setItem("jwt",STATE.jwt)

}


/* =====================================================
7 NAVIGATION ENGINE
===================================================== */

function switchView(view){

document.querySelectorAll(".view")
.forEach(v=>v.classList.remove("active"))

const el = document.getElementById(view)

if(el) el.classList.add("active")

document.dispatchEvent(
new CustomEvent("view:change",{detail:view})
)

}

/* =====================================================
8 UI BINDER ENGINE
===================================================== */

document.addEventListener("DOMContentLoaded",()=>{

document.querySelectorAll("[data-view]")
.forEach(btn=>{
btn.onclick = ()=>switchView(btn.dataset.view)
})

})


/* =====================================================
9 WALLET ENGINE
===================================================== */

async function loadWallet(){

const r = await api("/finance/wallet")

if(!r) return

STATE.wallet=r

renderWallet()

}

function renderWallet(){

Object.keys(STATE.wallet)
.forEach(asset=>{

const el=document.getElementById(
"bal-"+asset.toLowerCase()
)

if(el){

el.textContent=
Number(STATE.wallet[asset]).toFixed(4)

}

})

}


/* =====================================================
10 WALLETCONNECT ENGINE
===================================================== */

async function connectWallet(){

if(!window.ethereum) return

const acc=await ethereum.request({
method:"eth_requestAccounts"
})

await api("/finance/wallet/connect",{
method:"POST",
body:JSON.stringify({
type:"evm",
address:acc[0]
})
})

}


/* =====================================================
11 BINANCE PAY ENGINE
===================================================== */

async function binancePay(){

const r=await api("/finance/binancepay/init",{
method:"POST"
})

if(r?.url) window.open(r.url)

}


/* =====================================================
12 CASINO ENGINE
===================================================== */

async function playCasino(game,bet){

const r=await api("/casino/play",{
method:"POST",
body:JSON.stringify({
game,
bet
})
})

if(!r) return

STATE.casino.history.unshift(r)

alert(
r.win ?
`WIN ${r.payout}` :
"LOSE"
)

loadWallet()

}


/* =====================================================
13 MINING ENGINE
===================================================== */

async function subscribeMining(plan){

const amount=prompt("Amount")

await api("/mining/subscribe",{
method:"POST",
body:JSON.stringify({
plan_id:plan,
amount:Number(amount)
})
})

loadWallet()

}


/* =====================================================
14 MARKET ENGINE
===================================================== */

async function loadMarket(){

const r=await api("/market/prices")

if(!r) return

STATE.prices=r

renderMarket()

}

function renderMarket(){

Object.keys(STATE.prices)
.forEach(asset=>{

const el=document.querySelector(
`[data-price="${asset}"]`
)

if(el) el.textContent=STATE.prices[asset]

})

}


/* =====================================================
15 AIRDROP ENGINE
===================================================== */

async function claimAirdrop(){

const r=await api("/bxing/airdrop/claim",{
method:"POST"
})

if(r?.status==="ok"){

alert("Airdrop claimed")

loadWallet()

}

}


/* =====================================================
16 REFERRAL ENGINE
===================================================== */

function referralLink(){

return location.origin+"?ref="+STATE.jwt

}


/* =====================================================
17 REALTIME ENGINE
===================================================== */

function realtime(){

const proto=
location.protocol==="https:"?"wss":"ws"

const ws=
new WebSocket(`${proto}://${location.host}/ws`)

ws.onmessage=m=>{

const d=JSON.parse(m.data)

if(d.type==="wallet") loadWallet()

if(d.type==="price"){

STATE.prices[d.asset]=d.price
renderMarket()

}

}

}


/* =====================================================
18 EVENT BUS ENGINE
===================================================== */

document.addEventListener("view:change",e=>{

const view=e.detail

if(view==="wallet") loadWallet()

if(view==="market") loadMarket()

})


/* =====================================================
19 DATA SYNC ENGINE
===================================================== */

setInterval(()=>{

if(STATE.jwt) loadWallet()

},15000)


/* =====================================================
20 PERFORMANCE ENGINE
===================================================== */

function preload(){

loadMarket()

}


/* =====================================================
21 BOOT ENGINE
===================================================== */

document.addEventListener("DOMContentLoaded",async()=>{

STATE.jwt=localStorage.getItem("jwt")

await telegramAuth()

bindUI()

realtime()

preload()

switchView("wallet")

if(STATE.jwt) loadWallet()

})

/* ================= VIEW CONTROLLER ================= */

function handleView(view){

switch(view){

case "wallet":
if(typeof loadWallet === "function") loadWallet()
break

case "casino":
if(typeof initCasino === "function") initCasino()
break

case "mining":
if(typeof renderMining === "function") renderMining()
break

case "market":
if(typeof loadMarket === "function") loadMarket()
break

case "airdrop":
if(typeof loadAirdrop === "function") loadAirdrop()
break

}

}

document.addEventListener("view:change",(e)=>{
handleView(e.detail)
})
