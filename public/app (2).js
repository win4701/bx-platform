"use strict";

/* =========================================================
   BLOXIO APP ENGINE
========================================================= */

const $ = id => document.getElementById(id);
const $$ = q => document.querySelectorAll(q);

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

API: location.origin,

WS:
location.protocol === "https:"
? `wss://${location.host}`
: `ws://${location.host}`,

VERSION:"12.0",

WALLET_COINS:[
"BX","USDT","USDC","BTC","ETH",
"BNB","SOL","TON","AVAX","LTC"
]

};

/* =========================================================
   LOGGER
========================================================= */

const LOG = {

info(...a){console.log("[APP]",...a)},
warn(...a){console.warn("[WARN]",...a)},
error(...a){console.error("[ERR]",...a)}

};

/* =========================================================
   STATE
========================================================= */

const STATE = {

user:null,

balances:{},

casino:{
current:null,
bet:0
},

mining:{
coin:"BX",
active:null
},

market:{
pair:"BX/USDT"
}

};

/* =========================================================
   EVENT BUS
========================================================= */

const BUS = {

events:{},

on(name,fn){

if(!this.events[name])
this.events[name]=[];

this.events[name].push(fn);

},

emit(name,data){

(this.events[name]||[])
.forEach(fn=>fn(data));

}

};

/* =========================================================
   AUTH
========================================================= */

const AUTH = {

jwt:null,

load(){

this.jwt = localStorage.getItem("jwt");

},

set(token){

this.jwt = token;

localStorage.setItem("jwt",token);

},

headers(){

return this.jwt
?{Authorization:"Bearer "+this.jwt}
:{};

},

logout(){

localStorage.removeItem("jwt");

location.reload();

}

};

/* =========================================================
   API ENGINE
========================================================= */

const API = {

async get(path){

const res = await fetch(CONFIG.API+path,{
headers:AUTH.headers()
});

if(!res.ok) return null;

return res.json();

},

async post(path,data){

const res = await fetch(CONFIG.API+path,{

method:"POST",

headers:{
"Content-Type":"application/json",
...AUTH.headers()
},

body:JSON.stringify(data)

});

if(!res.ok) return null;

return res.json();

}

};

/* =========================================================
   UI ENGINE
========================================================= */

const UI = {

switch(view){

$$(".view").forEach(v=>v.classList.remove("active"));

$(view).classList.add("active");

$$(".bottom-nav button")
.forEach(b=>{

b.classList.toggle(
"active",
b.dataset.view===view
);

});

BUS.emit("view",view);

},

toast(msg){

const el = document.createElement("div");

el.className="toast";

el.textContent=msg;

document.body.appendChild(el);

setTimeout(()=>el.remove(),3000);

}

};

/* =========================================================
   NAVIGATION
========================================================= */

document.addEventListener("click",e=>{

const btn = e.target.closest("[data-view]");

if(btn){

UI.switch(btn.dataset.view);

}

});

/* =========================================================
   WALLET ENGINE
========================================================= */

const WALLET = {

async load(){

const res = await API.get("/finance/wallet");

if(!res) return;

STATE.balances = res;

this.render();

},

render(){

CONFIG.WALLET_COINS.forEach(c=>{

const el = $("bal-"+c.toLowerCase());

if(el){

el.textContent =
Number(STATE.balances[c]||0).toFixed(4);

}

});

},

async deposit(asset){

const res =
await API.get(`/finance/deposit/${asset}`);

if(!res) return;

alert(`Deposit Address:\n${res.address}`);

},

async withdraw(){

const asset=prompt("Asset");
const amount=prompt("Amount");
const address=prompt("Address");

await API.post("/finance/withdraw",{

asset,
amount,
address

});

},

async transfer(){

const user=$("transferTelegram").value;
const amount=$("transferAmount").value;

await API.post("/finance/transfer",{

to_user:user,
asset:"BX",
amount

});

this.load();

}

};

/* =========================================================
   WALLET CONNECT
========================================================= */

const WALLET_CONNECT = {

async connect(){

if(window.ethereum){

const accounts =
await ethereum.request({
method:"eth_requestAccounts"
});

alert("Connected\n"+accounts[0]);

}

}

};

/* =========================================================
   CASINO ENGINE
========================================================= */

const CASINO = {

socket:null,

games:[
"coinflip","dice","limbo","crash",
"slot","plinko","hilo","airboss",
"banana_farm","fruit_party",
"birds_party","blackjack_fast"
],

connect(){

this.socket =
new WebSocket(CONFIG.WS+"/ws/casino");

this.socket.onmessage=e=>{

const res = JSON.parse(e.data);

this.handle(res);

};

},

play(game,bet){

this.socket.send(JSON.stringify({

action:"play",
game,
bet

}));

},

handle(res){

if(res.win){

UI.toast(`WIN ${res.payout}`);

}else{

UI.toast("LOSE");

}

WALLET.load();

}

};

/* =========================================================
   BIG WINS
========================================================= */

function initBigWins(){

const ws =
new WebSocket(CONFIG.WS+"/ws/big-wins");

ws.onmessage=e=>{

const data = JSON.parse(e.data);

const row=document.createElement("div");

row.className="big-win-row";

row.innerHTML=
`<span>${data.user}</span>
<span>${data.game}</span>
<strong>+${data.amount}</strong>`;

$("bigWinsList").prepend(row);

};

}

/* =========================================================
   MINING ENGINE
========================================================= */

const MINING = {

coin:"BX",

async load(){

const res =
await API.get("/mining/plans");

this.render(res);

},

render(plans){

const grid=$("miningGrid");

grid.innerHTML="";

plans.forEach(p=>{

const card=document.createElement("div");

card.className="mining-plan";

card.innerHTML=`

<h3>${p.name}</h3>
<div class="mining-profit">${p.roi}%</div>
<button>Subscribe</button>

`;

card.querySelector("button").onclick=()=>{

this.subscribe(p.id);

};

grid.appendChild(card);

});

},

async subscribe(plan){

const amount=prompt("Amount");

await API.post("/mining/subscribe",{

coin:this.coin,
plan_id:plan,
amount

});

}

};

/* =========================================================
   AIRDROP ENGINE
========================================================= */

const AIRDROP = {

async load(){

const res =
await API.get("/airdrop/status");

if(!res) return;

document.querySelector(".airdrop-status")
.textContent=
`Referrals: ${res.referrals}`;

},

async claim(){

await API.post("/airdrop/claim");

UI.toast("Airdrop claimed");

}

};

/* =========================================================
   REFERRAL
========================================================= */

const REFERRAL = {

async load(){

const res =
await API.get("/airdrop/referral");

if(!res) return;

const link =
location.origin+"?ref="+res.code;

document.querySelector(".ref-link")
.textContent=link;

}

};

/* =========================================================
   TOPUP
========================================================= */

const TOPUP = {

async pay(){

const phone=$("topup-phone").value;
const amount=$("topup-amount").value;

await API.post("/topup/create",{

phone,
amount

});

UI.toast("Topup request sent");

}

};

/* =========================================================
   MARKET ENGINE
========================================================= */

BUS.on("view",view=>{

if(view==="market"){

if(typeof initMarket==="function")
initMarket();

}

});

/* =========================================================
   APP BOOT
========================================================= */

const APP = {

init(){

AUTH.load();

UI.switch("wallet");

WALLET.load();

CASINO.connect();

initBigWins();

AIRDROP.load();

REFERRAL.load();

}

};

document.addEventListener(
"DOMContentLoaded",
()=>APP.init()
);
