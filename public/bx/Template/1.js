/*=========================================================
BLOXIO CASINO V3.1 - CORE FOUNDATION
=========================================================*/
"use strict";

/*=========================================================
IMPORTS
=========================================================*/
import {CASINO_GAMES} from "./data/games.js";
import {COINS} from "./data/coins.js";

/*=========================================================
HELPERS
=========================================================*/
const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);
const random=(min,max)=>Math.random()*(max-min)+min;
const randomInt=(min,max)=>Math.floor(random(min,max+1));
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const now=()=>Date.now();

/*=========================================================
STORAGE
=========================================================*/
const STORAGE={
APP:"bloxio_casino",
STATE:"bloxio_casino_state",
SETTINGS:"bloxio_casino_settings",
WALLET:"bloxio_wallet",
ANALYTICS:"bloxio_casino_analytics",
HISTORY:"bloxio_casino_history"
};

/*=========================================================
EVENT BUS
=========================================================*/
class EventBus{
constructor(){
this.events=new Map();
}

on(event,callback){
if(!this.events.has(event)){
this.events.set(event,[]);
}
this.events.get(event).push(callback);
return()=>this.off(event,callback);
}

off(event,callback){
if(!this.events.has(event))return;
const list=this.events.get(event);
this.events.set(
event,
list.filter(fn=>fn!==callback)
);
}

emit(event,payload){
if(!this.events.has(event))return;
for(const callback of this.events.get(event)){
try{
callback(payload);
}catch(error){
console.error(`[BUS:${event}]`,error);
}
}
}

clear(){
this.events.clear();
}
}

export const BUS=new EventBus();

/*=========================================================
STATE
=========================================================*/
export const STATE={
ready:false,
booted:false,
version:"3.1.0",
currency:"BX",
online:false,
activeGame:null,
activeView:"lobby",

wallet:{
BX:0,
XBC:0
},

user:{
id:null,
username:null,
vip:0,
level:1,
verified:false
},

casino:{
onlinePlayers:0,
games:[],
featured:[],
jackpots:{},
leaderboard:[],
tournaments:[],
providers:[]
},

filters:{
search:"",
category:"all",
provider:"all"
},

feeds:{
live:[],
winners:[],
bigWins:[]
},

analytics:{
wagered:0,
won:0,
lost:0,
profit:0,
bets:0,
wins:0,
losses:0
},

runtime:{
socket:false,
pixi:false,
audio:false,
charts:false
}
};

/*=========================================================
SETTINGS
=========================================================*/
export const Settings={
sound:true,
music:false,
animations:true,
currency:"BX",
theme:"dark",

save(){
localStorage.setItem(
STORAGE.SETTINGS,
JSON.stringify({
sound:this.sound,
music:this.music,
animations:this.animations,
currency:this.currency,
theme:this.theme
})
);
},

load(){
try{
const data=JSON.parse(
localStorage.getItem(STORAGE.SETTINGS)||"{}"
);
Object.assign(this,data);
}catch(error){
console.warn(
"[SETTINGS]",
error
);
}
}
};

/*=========================================================
PERSISTENCE
=========================================================*/
export const Persistence={

saveState(){
localStorage.setItem(
STORAGE.STATE,
JSON.stringify({
currency:STATE.currency,
analytics:STATE.analytics
})
);
},

loadState(){
try{
const data=JSON.parse(
localStorage.getItem(STORAGE.STATE)||"{}"
);

if(data.currency){
STATE.currency=data.currency;
}

if(data.analytics){
STATE.analytics=data.analytics;
}

}catch(error){
console.warn(
"[STATE]",
error
);
}
},

saveWallet(){
localStorage.setItem(
STORAGE.WALLET,
JSON.stringify(STATE.wallet)
);
},

loadWallet(){
try{
const data=JSON.parse(
localStorage.getItem(STORAGE.WALLET)||"{}"
);

STATE.wallet.BX=Number(
data.BX||0
);

STATE.wallet.XBC=Number(
data.XBC||0
);

}catch(error){
console.warn(
"[WALLET]",
error
);
}
}
};

/*=========================================================
WALLET ENGINE
=========================================================*/
export const Wallet={

get(currency=STATE.currency){
return Number(
STATE.wallet[currency]||0
);
},

set(currency,value){
STATE.wallet[currency]=Number(
value||0
);

Persistence.saveWallet();

BUS.emit(
"wallet:update",
STATE.wallet
);

return true;
},

credit(currency,amount){
amount=Number(amount||0);

STATE.wallet[currency]+=amount;

Persistence.saveWallet();

BUS.emit(
"wallet:update",
STATE.wallet
);

return true;
},

debit(currency,amount){
amount=Number(amount||0);

if(
STATE.wallet[currency]<amount
){
return false;
}

STATE.wallet[currency]-=amount;

Persistence.saveWallet();

BUS.emit(
"wallet:update",
STATE.wallet
);

return true;
}
};

/*=========================================================
CURRENCY ENGINE
=========================================================*/
export const Currency={

supported:[
"BX",
"XBC"
],

set(currency){

if(
!this.supported.includes(currency)
){
return false;
}

STATE.currency=currency;
Settings.currency=currency;
Settings.save();

BUS.emit(
"currency:change",
currency
);

return true;
},

get(){
return STATE.currency;
},

minBet(){
return STATE.currency==="XBC"
?10
:0.1;
}
};

/*=========================================================
GAME REGISTRY
=========================================================*/
export const Registry={

games:[],

init(){

this.games=
Array.isArray(CASINO_GAMES)
?CASINO_GAMES
:[];

STATE.casino.games=this.games;

STATE.casino.featured=
this.games.filter(
game=>game.featured
);

STATE.casino.providers=[
...new Set(
this.games.map(
g=>g.provider||"BLOXIO"
)
)
];
},

all(){
return this.games;
},

featured(){
return STATE.casino.featured;
},

get(id){
return this.games.find(
game=>game.id===id
);
},

search(term=""){
term=term.toLowerCase();

return this.games.filter(game=>
game.name?.toLowerCase().includes(term)||
game.category?.toLowerCase().includes(term)||
game.provider?.toLowerCase().includes(term)
);
},

category(category){

if(category==="all"){
return this.games;
}

return this.games.filter(
game=>game.category===category
);
},

provider(provider){

if(provider==="all"){
return this.games;
}

return this.games.filter(
game=>game.provider===provider
);
}
};

/*=========================================================
ANALYTICS
=========================================================*/
export const Analytics={

bet(amount){
STATE.analytics.bets++;
STATE.analytics.wagered+=
Number(amount||0);
},

win(amount){
STATE.analytics.wins++;
STATE.analytics.won+=
Number(amount||0);
},

loss(amount){
STATE.analytics.losses++;
STATE.analytics.lost+=
Number(amount||0);
},

recalculate(){

STATE.analytics.profit=
STATE.analytics.won-
STATE.analytics.lost;

Persistence.saveState();
}
};

/*=========================================================
CASINO CORE
=========================================================*/
export const CasinoCore={

boot(){

if(STATE.booted){
return;
}

Settings.load();
Persistence.loadState();
Persistence.loadWallet();

Registry.init();

STATE.currency=
Settings.currency||"BX";

STATE.booted=true;

BUS.emit(
"core:booted",
STATE
);

console.log(
"[CASINO V3.1] BOOTED"
);
},

start(){

if(STATE.ready){
return;
}

this.boot();

STATE.ready=true;

BUS.emit(
"casino:ready",
STATE
);

console.log(
"[CASINO V3.1] READY"
);
},

destroy(){

BUS.clear();

STATE.ready=false;
STATE.booted=false;
}
};

/*=========================================================
GLOBALS
=========================================================*/
window.CasinoCore=CasinoCore;
window.CasinoState=STATE;
window.CasinoWallet=Wallet;
window.CasinoRegistry=Registry;
window.CasinoBus=BUS;

/*=========================================================
AUTO START
=========================================================*/
document.addEventListener(
"DOMContentLoaded",
()=>{
CasinoCore.start();
}
);
