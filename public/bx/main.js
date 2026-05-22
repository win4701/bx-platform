/* =====================================================
BLOXIO MAIN ENGINE V5
APP CONTROLLER
BROWSER FIRST
NO LOOP
NO PANEL CONFLICT
===================================================== */

(() => {

"use strict";

/* =====================================================
APP
===================================================== */

const APP=

window.BX_APP||

(window.BX_APP={});

APP.ui=

APP.ui||{};

APP.router=

APP.router||{};

/* =====================================================
CONFIG
===================================================== */

const CONFIG={

DEFAULT:"wallet",

STORE:"bloxio:view",

VIEWS:[

"wallet",

"market",

"casino",

"mining",

"airdrop",

"settings"

]

};

/* =====================================================
STATE
===================================================== */

const views=new Map();

const nav=new Map();

let booted=false;

/* =====================================================
DOM
===================================================== */

function cache(){

document
.querySelectorAll(

".view"

)

.forEach(v=>{

if(v.id){

views.set(

v.id,
v

);

}

});

document
.querySelectorAll(

"[data-view]"

)

.forEach(btn=>{

nav.set(

btn.dataset.view,
btn

);

});

}

/* =====================================================
SAFE
===================================================== */

function safe(fn){

try{

if(

typeof fn
==="function"

){

return fn();

}

}catch(e){

console.warn(

"[SAFE]",

e

);

}

}

/* =====================================================
AUTH
===================================================== */

function locked(){

return document.body
.classList.contains(

"auth-lock"

);

}

/* =====================================================
VIEW
===================================================== */

function hideAll(){

views.forEach(v=>{

v.classList.remove(

"active"

);

v.style.display=

"none";

});

}

function show(id){

const view=

views.get(id);

if(!view)return;

view.style.display="";

requestAnimationFrame(()=>{

view.classList.add(

"active"

);

});

}

/* =====================================================
NAV
===================================================== */

function setNav(id){

nav.forEach(

(btn,key)=>{

const active=

key===id;

btn.classList.toggle(

"active",

active

);

btn.setAttribute(

"aria-current",

active

?

"page"

:

"false"

);

}

);

}

/* =====================================================
PANELS
===================================================== */

function closePanels(view){

if(

view!=="wallet"

){

document
.querySelectorAll(

".wallet-panel"

)

.forEach(el=>{

el.classList.add(

"wallet-hidden"

);

});

}

document
.querySelectorAll(

".mining-sub-panel"

)

.forEach(el=>{

el.classList.add(

"mining-hidden"

);

});

document
.querySelectorAll(

".market-modal"

)

.forEach(el=>{

el.classList.remove(

"open"

);

});

}

/* =====================================================
HOOKS
===================================================== */

function hooks(view){

window.STATE
?.set(

"ui.view",

view

);

document.dispatchEvent(

new CustomEvent(

"bloxio:view",

{

detail:view

}

)

);

switch(view){

case"wallet":

safe(

window.renderWallet

);

safe(

window.updateWalletUI

);

break;

case"market":

safe(

window.renderMarket

);

safe(

window.updateMarketUI

);

safe(

window.resizeMarketChart

);

break;

case"casino":

safe(

window.renderCasinoLobby

);

safe(

window.updateCasinoUI

);

break;

case"mining":

safe(

window.renderMining

);

safe(

window.renderMiningPlans

);

safe(

window.updateMiningUI

);

break;

case"airdrop":

safe(

window.renderAirdrop

);

break;

case"settings":

safe(

window.renderSettings

);

break;

}

}

/* =====================================================
ROUTER
===================================================== */

function go(

view,

opt={}

){

if(

locked()

)return;

const next=

CONFIG.VIEWS.includes(

view

)

?

view

:

CONFIG.DEFAULT;

const current=

window.STATE
?.get(

"ui.view"

);

if(

current===next

&&

!opt.force

){

setNav(next);

return;

}

closePanels(next);

hideAll();

show(next);

setNav(next);

window.STATE
?.set(

"ui.view",

next

);

localStorage.setItem(

CONFIG.STORE,

next

);

hooks(next);

APP.router.current=

next;

}

/* =====================================================
ACTIONS
===================================================== */

function actions(){

document
.addEventListener(

"click",

e=>{

const target=

e.target.closest(

"[data-action]"

);

if(

!target

||

locked()

)

return;

const action=

target.dataset.action;

switch(action){

case"go-wallet":

go("wallet");

break;

case"go-market":

go("market");

break;

case"go-casino":

go("casino");

break;

case"go-mining":

go("mining");

break;

case"go-airdrop":

go("airdrop");

break;

case"go-settings":

go("settings");

break;

}

}

);

}

/* =====================================================
NAV
===================================================== */

function bindNav(){

nav.forEach(

(btn,id)=>{

btn.onclick=()=>{

go(id);

};

}

);

}

/* =====================================================
RESTORE
===================================================== */

function restore(){

const saved=

localStorage.getItem(

CONFIG.STORE

);

go(

saved||

CONFIG.DEFAULT,

{

force:true

}

);

}

/* =====================================================
ONLINE
===================================================== */

function network(){

window.addEventListener(

"online",

()=>{

document.body
.classList.remove(

"offline"

);

}

);

window.addEventListener(

"offline",

()=>{

document.body
.classList.add(

"offline"

);

}

);

}

/* =====================================================
BOOT
===================================================== */

function boot(){

if(

booted

)return;

booted=true;

cache();

actions();

bindNav();

network();

restore();

console.log(

"MAIN READY"

);

}

/* =====================================================
API
===================================================== */

APP.router.go=go;

/* =====================================================
START
===================================================== */

if(

document.readyState
==="loading"

){

document.addEventListener(

"DOMContentLoaded",

boot

);

}else{

boot();

}

})();
