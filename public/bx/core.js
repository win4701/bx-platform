// =====================================================
// BLOXIO CORE ENGINE V3
// ENTERPRISE BOOT SYSTEM
// =====================================================

"use strict";

/* =====================================================
CONFIG
===================================================== */

const CONFIG={

API:
"https://api.bloxio.online",

WS:
"wss://api.bloxio.online",

BOOT_TIMEOUT:
12000,

VERSION:
"3.0.0"

};

/* =====================================================
GLOBAL
===================================================== */

window.APP=window.APP||{

version:
CONFIG.VERSION,

ready:false,

booting:true,

online:
navigator.onLine,

user:null,

modules:{},

services:{},

errors:[]

};

/* =====================================================
DOM
===================================================== */

const DOM={

loader:
()=>document.getElementById(
"globalLoader"
),

loaderFill:
()=>document.getElementById(
"loaderProgress"
),

app:
()=>document.getElementById(
"app"
)

};

/* =====================================================
LOGGER
===================================================== */

function log(...args){

console.log(
"[BX]",
...args
);

}

function warn(...args){

console.warn(
"[BX]",
...args
);

}

function error(...args){

console.error(
"[BX]",
...args
);

APP.errors.push(args);

}

/* =====================================================
LOADER
===================================================== */

function setProgress(v){

const el=
DOM.loaderFill();

if(!el)return;

el.style.width=
`${v}%`;

}

function removeLoader(){

const loader=
DOM.loader();

if(!loader)return;

loader.classList.add(
"hidden"
);

setTimeout(()=>{

loader.remove();

},450);

}

/* =====================================================
APP STATE
===================================================== */

function unlockApp(){

document.body.classList.remove(
"loading"
);

document.body.classList.remove(
"app-preload"
);

document.body.classList.remove(
"auth-lock"
);

document.body.classList.add(
"app-ready"
);

DOM.app()
?.classList.remove(
"app-hidden"
);

}

function lockApp(){

document.body.classList.add(
"loading"
);

}

/* =====================================================
NETWORK
===================================================== */

function networkWatcher(){

window.addEventListener(
"online",
()=>{

APP.online=true;

log(
"ONLINE"
);

}
);

window.addEventListener(
"offline",
()=>{

APP.online=false;

warn(
"OFFLINE"
);

});

}

/* =====================================================
TELEGRAM
===================================================== */

async function initTelegram(){

const tg=
window.Telegram
?.WebApp;

if(!tg){

log(
"No Telegram"
);

return;

}

try{

tg.ready();

tg.expand();

tg.setHeaderColor(
"#05080e"
);

tg.setBackgroundColor(
"#05080e"
);

const user=

tg.initDataUnsafe
?.user;

if(!user){

warn(
"No TG User"
);

return;

}

APP.user=user;

log(
"TG USER",
user.id
);

try{

const res=
await fetch(

CONFIG.API+
"/auth/telegram",

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:

JSON.stringify({

telegram_id:
user.id,

username:
user.username

})

}

);

const data=
await res.json();

if(data?.token){

localStorage.setItem(

"token",
data.token

);

}

}catch(e){

warn(
"TG AUTOLOGIN FAIL"
);

}

}catch(e){

warn(
"TG INIT FAIL",
e
);

}

}

/* =====================================================
WEBSOCKET
===================================================== */

function initWS(){

if(!window.WS){

warn(
"WS MISSING"
);

return;

}

try{

WS.connect();

log(
"WS READY"
);

}catch(e){

warn(
"WS FAIL"
);

}

}

/* =====================================================
SAFE MODULES
===================================================== */

function initWallet(){

try{

window.WALLET
?.init
?.();

}catch(e){

error(
"WALLET",
e
);

}

}

function initMarket(){

try{

window
.initMarket
?.();

}catch(e){

error(
"MARKET",
e
);

}

}

function initCasino(){

try{

window
.CASINO
?.init
?.();

}catch(e){

error(
"CASINO",
e
);

}

}

function initMining(){

try{

window
.renderMining
?.();

}catch(e){

error(
"MINING",
e
);

}

}

function initAirdrop(){

try{

window
.initAirdrop
?.();

}catch(e){

error(
"AIRDROP",
e
);

}

}

/* =====================================================
BOOT
===================================================== */

async function boot(){

lockApp();

log(
"BOOT START"
);

const timeout=

setTimeout(()=>{

warn(
"BOOT TIMEOUT"
);

finishBoot();

},

CONFIG
.BOOT_TIMEOUT

);

try{

setProgress(5);

networkWatcher();

setProgress(12);

await initTelegram();

setProgress(25);

initWS();

setProgress(40);

initWallet();

setProgress(55);

initMarket();

setProgress(68);

initCasino();

setProgress(78);

initMining();

setProgress(88);

initAirdrop();

setProgress(100);

clearTimeout(
timeout
);

finishBoot();

}catch(e){

error(
"BOOT",
e
);

finishBoot();

}

}

/* =====================================================
READY
===================================================== */

function finishBoot(){

if(APP.ready){

return;

}

APP.ready=true;

APP.booting=false;

unlockApp();

removeLoader();

log(
"CORE READY"
);

}

/* =====================================================
RECOVERY
===================================================== */

window.addEventListener(

"error",

e=>{

error(

"RUNTIME",

e.error||

e.message

);

}

);

window.addEventListener(

"unhandledrejection",

e=>{

error(

"PROMISE",

e.reason

);

}

);

/* =====================================================
INIT
===================================================== */

document.addEventListener(

"DOMContentLoaded",

()=>{

boot();

}

);
