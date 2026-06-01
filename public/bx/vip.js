/* =========================================================
   FILE: public/bx/vip.js
   BLOXIO VIP ENGINE 2026
========================================================= */

window.BXVIP=(function(){

const listeners=new Set();

const state={
level:0,
name:"Bronze",
xp:0,
nextXP:1000,
cashback:0,
rakeback:0,
dailyBonus:0,
weeklyBonus:0,
monthlyBonus:0,
multiplier:1,
updatedAt:0
};

const LEVELS=[

{id:0,name:"Bronze",xp:0,cashback:0.25,rakeback:0.25,multiplier:1},

{id:1,name:"Silver",xp:1000,cashback:0.50,rakeback:0.50,multiplier:1.1},

{id:2,name:"Gold",xp:5000,cashback:1,rakeback:1,multiplier:1.25},

{id:3,name:"Platinum",xp:15000,cashback:2,rakeback:2,multiplier:1.5},

{id:4,name:"Diamond",xp:50000,cashback:3,rakeback:3,multiplier:2},

{id:5,name:"Master",xp:100000,cashback:4,rakeback:4,multiplier:3},

{id:6,name:"Legend",xp:250000,cashback:5,rakeback:5,multiplier:5}

];

const history=[];

/* =========================================================
   HELPERS
========================================================= */

function emit(){

state.updatedAt=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
"VIP_ENGINE",
error
);

}

});

updateUI();

save();

}

function save(){

localStorage.setItem(
"bx_vip",
JSON.stringify(
{
level:state.level,
xp:state.xp
}
)
);

}

function load(){

const raw=
localStorage.getItem(
"bx_vip"
);

if(!raw){
return;
}

try{

const data=
JSON.parse(raw);

state.level=
data.level||0;

state.xp=
data.xp||0;

}catch(error){}

}

/* =========================================================
   LEVEL
========================================================= */

function updateLevel(){

let current=
LEVELS[0];

LEVELS.forEach(level=>{

if(
state.xp>=level.xp
){

current=level;

}

});

const oldLevel=
state.level;

state.level=
current.id;

state.name=
current.name;

state.cashback=
current.cashback;

state.rakeback=
current.rakeback;

state.multiplier=
current.multiplier;

const next=
LEVELS[
current.id+1
];

state.nextXP=
next
?next.xp
:current.xp;

if(
oldLevel!==state.level
){

levelUp();

}

}

/* =========================================================
   XP
========================================================= */

function addXP(amount){

amount=
Number(amount)||0;

state.xp+=amount;

updateLevel();

emit();

}

function setXP(amount){

state.xp=
Number(amount)||0;

updateLevel();

emit();

}

/* =========================================================
   LEVEL UP
========================================================= */

function levelUp(){

history.unshift({
id:crypto.randomUUID(),
type:"level-up",
level:state.name,
time:Date.now()
});

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"vip",
title:"VIP LEVEL UP",
message:`${state.name}`
});

}

if(
window.AuthFeed
){

AuthFeed.setVIP(
state.name
);

}

window.dispatchEvent(
new CustomEvent(
"bx:vip-upgrade",
{
detail:getState()
}
)
);

}

/* =========================================================
   REWARDS
========================================================= */

function calculateRewards(){

state.dailyBonus=
Number(
(
state.level*2+
5
).toFixed(2)
);

state.weeklyBonus=
Number(
(
state.level*15+
25
).toFixed(2)
);

state.monthlyBonus=
Number(
(
state.level*100+
100
).toFixed(2)
);

}

/* =========================================================
   CLAIM
========================================================= */

function claimDaily(){

reward(
state.dailyBonus,
"Daily"
);

}

function claimWeekly(){

reward(
state.weeklyBonus,
"Weekly"
);

}

function claimMonthly(){

reward(
state.monthlyBonus,
"Monthly"
);

}

function reward(
amount,
type
){

if(
window.WalletFeed
){

const asset=
WalletFeed.getAsset(
"BX"
);

if(asset){

WalletFeed.updateBalance(
"BX",
asset.balance+amount
);

}

}

history.unshift({
id:crypto.randomUUID(),
type,
amount,
time:Date.now()
});

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"vip",
title:`${type} VIP Bonus`,
message:`+${amount} BX`
});

}

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:swap-complete",
()=>{

addXP(15);

}
);

window.addEventListener(
"bx:airdrop-claimed",
()=>{

addXP(10);

}
);

window.addEventListener(
"bx:mining-claim",
()=>{

addXP(25);

}
);

window.addEventListener(
"bx:casino-win",
e=>{

const profit=
Number(
e.detail?.amount||0
);

addXP(
Math.floor(
profit/10
)
);

}
);

window.addEventListener(
"bx:deposit-success",
e=>{

const amount=
Number(
e.detail?.amount||0
);

addXP(
Math.floor(
amount/5
)
);

}
);

}

/* =========================================================
   UI
========================================================= */

function updateUI(){

const level=
document.getElementById(
"vipLevel"
);

const xp=
document.getElementById(
"vipXP"
);

const progress=
document.getElementById(
"vipProgress"
);

const cashback=
document.getElementById(
"vipCashback"
);

const rakeback=
document.getElementById(
"vipRakeback"
);

if(level){

level.textContent=
state.name;

}

if(xp){

xp.textContent=
state.xp;

}

if(cashback){

cashback.textContent=
`${state.cashback}%`;

}

if(rakeback){

rakeback.textContent=
`${state.rakeback}%`;

}

if(progress){

const value=
Math.min(
100,
(
state.xp/
state.nextXP
)*100
);

progress.style.width=
`${value}%`;

}

}

/* =========================================================
   BUTTONS
========================================================= */

function bindButtons(){

document
.getElementById(
"vipClaimDaily"
)
?.addEventListener(
"click",
claimDaily
);

document
.getElementById(
"vipClaimWeekly"
)
?.addEventListener(
"click",
claimWeekly
);

document
.getElementById(
"vipClaimMonthly"
)
?.addEventListener(
"click",
claimMonthly
);

}

/* =========================================================
   SUBSCRIBE
========================================================= */

function subscribe(callback){

listeners.add(
callback
);

callback(
getState()
);

return()=>{

listeners.delete(
callback
);

};

}

/* =========================================================
   HISTORY
========================================================= */

function getHistory(){

return[
...history
];

}

/* =========================================================
   STATE
========================================================= */

function getState(){

return{
...state,
history:getHistory()
};

}

/* =========================================================
   MOCK
========================================================= */

function startMock(){

setInterval(()=>{

addXP(
Math.floor(
Math.random()*5
)
);

},60000);

}

/* =========================================================
   INIT
========================================================= */

function init(){

load();

updateLevel();

calculateRewards();

bindEvents();

bindButtons();

startMock();

emit();

console.log(
"👑 BLOXIO VIP READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

addXP,

setXP,

claimDaily,

claimWeekly,

claimMonthly,

subscribe,

getState,

getHistory

};

})();

/* =========================================================
   AUTO INIT
========================================================= */

document.readyState==="loading"

?document.addEventListener(
"DOMContentLoaded",
()=>BXVIP.init()
)

:BXVIP.init();
