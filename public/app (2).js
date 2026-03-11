"use strict"

/* ======================================================
   BLOXIO APP CORE
   Modular System
====================================================== */

/* ================= IMPORT MODULES ================= */

import "./wallet.js"
import "./casino.js"
import "./mining.js"
import "./airdrop.js"
import "./market.js"

/* ================= HELPERS ================= */

export const $ = id => document.getElementById(id)
export const $$ = q => document.querySelectorAll(q)

/* ================= CONFIG ================= */

export const CONFIG = {

API: location.origin,

WS:
location.protocol==="https:"
?`wss://${location.host}`
:`ws://${location.host}`,

VERSION:"2.0",

COINS:[
"BX","USDT","USDC",
"BTC","ETH","BNB",
"SOL","TON","AVAX","LTC"
],

WALLET_REFRESH:15000

}

/* ================= GLOBAL STATE ================= */

export const STATE = {

user:null,

balances:{},

wallet:{
addresses:{}
},

market:{
pair:"BX/USDT",
price:0
},

casino:{
game:null
},

mining:{
coin:"BX"
},

airdrop:{
referrals:0
}

}

/* ================= LOGGER ================= */

export const LOG = {

info(...a){console.log("[BLOXIO]",...a)},

warn(...a){console.warn("[BLOXIO]",...a)},

error(...a){console.error("[BLOXIO]",...a)}

}

/* ================= EVENT BUS ================= */

export const BUS = {

events:{},

on(name,fn){

if(!this.events[name])
this.events[name]=[]

this.events[name].push(fn)

},

emit(name,data){

;(this.events[name]||[])
.forEach(fn=>fn(data))

}

}

/* ================= API ENGINE ================= */

export const API = {

async get(url){

try{

const r = await fetch(CONFIG.API+url)

if(!r.ok) throw r.status

return r.json()

}catch(e){

LOG.error("GET FAIL",url)

return null

}

},

async post(url,data){

try{

const r = await fetch(CONFIG.API+url,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(data)

})

if(!r.ok) throw r.status

return r.json()

}catch(e){

LOG.error("POST FAIL",url)

return null

}

}

}

/* ================= UI ENGINE ================= */

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

/* ================= NAVIGATION ================= */

document.addEventListener("click",e=>{

const btn=e.target.closest("[data-view]")

if(!btn) return

UI.view(btn.dataset.view)

})

/* ================= SOCKET MANAGER ================= */

export const SOCKET = {

connect(path){

return new WebSocket(CONFIG.WS+path)

}

}

/* ================= BALANCE RENDER ================= */

export function renderBalances(balances){

CONFIG.COINS.forEach(asset=>{

const el=$("bal-"+asset.toLowerCase())

if(!el) return

el.textContent=
Number(balances[asset]||0)
.toFixed(4)

})

}

/* ================= APP BOOT ================= */

async function boot(){

LOG.info("Starting BLOXIO")

try{

if(window.WALLET?.init)
await WALLET.init()

if(window.CASINO?.init)
await CASINO.init()

if(window.MINING?.init)
await MINING.init()

if(window.AIRDROP?.init)
await AIRDROP.init()

if(window.MARKET?.init)
await MARKET.init()

LOG.info("APP READY")

}catch(e){

LOG.error("BOOT ERROR",e)

}

}

/* ================= START ================= */

window.addEventListener(
"DOMContentLoaded",
boot
)
