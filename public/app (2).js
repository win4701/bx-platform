"use strict"

import "./wallet.js"
import "./casino.js"
import "./mining.js"
import "./airdrop.js"
import "./market.js"

export const $ = id => document.getElementById(id)
export const $$ = q => document.querySelectorAll(q)

export const CONFIG = {

API: location.origin,

WS:
location.protocol==="https:"
?`wss://${location.host}`
:`ws://${location.host}`,

COINS:[
"BX","USDT","USDC","BTC","BNB",
"ETH","AVAX","ZEC","TON","SOL","LTC"
]

}

export const STATE = {

balances:{},

market:{
pair:"BX/USDT"
},

casino:{
game:null
},

mining:{
coin:"BX"
}

}

export const API = {

async get(url){

const r = await fetch(CONFIG.API+url)

if(!r.ok) throw "api error"

return r.json()

},

async post(url,data){

const r = await fetch(CONFIG.API+url,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(data)
})

return r.json()

}

}

export const UI = {

view(name){

$$(".view")
.forEach(v=>v.classList.remove("active"))

const el=$(name)

if(el) el.classList.add("active")

},

toast(msg){

const el=document.createElement("div")

el.className="toast"

el.textContent=msg

document.body.appendChild(el)

setTimeout(()=>el.remove(),3000)

}

}

document.addEventListener("click",e=>{

const btn=e.target.closest("[data-view]")

if(btn){

UI.view(btn.dataset.view)

}

})

async function boot(){

await WALLET.init()
await CASINO.init()
await MINING.init()
await AIRDROP.init()

if(typeof MARKET?.init==="function")
await MARKET.init()

console.log("BLOXIO READY")

}

window.addEventListener(
"DOMContentLoaded",
boot
)
