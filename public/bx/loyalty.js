/* =========================================================
   FILE: public/bx/loyalty.js
   BLOXIO LOYALTY ENGINE 2026
========================================================= */

window.BXLoyalty=(function(){

const listeners=new Set();

const history=[];

const state={
points:0,
lifetimePoints:0,
rank:"Starter",
multiplier:1,
updatedAt:0
};

const RANKS=[

{rank:"Starter",points:0,multiplier:1},
{rank:"Bronze",points:1000,multiplier:1.1},
{rank:"Silver",points:5000,multiplier:1.25},
{rank:"Gold",points:15000,multiplier:1.5},
{rank:"Platinum",points:50000,multiplier:2},
{rank:"Diamond",points:100000,multiplier:3}

];

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
"LOYALTY_ENGINE",
error
);

}

});

render();

save();

}

function save(){

localStorage.setItem(
"bx_loyalty",
JSON.stringify({
points:state.points,
lifetimePoints:state.lifetimePoints
})
);

}

function load(){

const raw=
localStorage.getItem(
"bx_loyalty"
);

if(!raw){
return;
}

try{

const data=
JSON.parse(raw);

state.points=
data.points||0;

state.lifetimePoints=
data.lifetimePoints||0;

}catch(error){}

}

/* =========================================================
   RANK
========================================================= */

function updateRank(){

let current=
RANKS[0];

RANKS.forEach(rank=>{

if(
state.lifetimePoints>=rank.points
){

current=rank;

}

});

state.rank=
current.rank;

state.multiplier=
current.multiplier;

}

/* =========================================================
   POINTS
========================================================= */

function addPoints(
amount,
source="system"
){

amount=
Number(amount)||0;

if(
amount<=0
){
return;
}

amount=
Math.floor(
amount*
state.multiplier
);

state.points+=amount;

state.lifetimePoints+=amount;

history.unshift({

id:crypto.randomUUID(),

source,

amount,

time:Date.now()

});

updateRank();

emit();

}

function spendPoints(points){

points=
Number(points)||0;

if(
state.points<points
){
return false;
}

state.points-=points;

emit();

return true;

}

/* =========================================================
   REDEEM
========================================================= */

function redeemBX(points){

if(
!spendPoints(points)
){
return false;
}

const reward=
points/100;

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
asset.balance+reward
);

}

}

if(
window.NotificationFeed
){

NotificationFeed.add({

type:"success",

title:"Loyalty Reward",

message:`${reward} BX`

});

}

return true;

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:casino-win",
e=>{

addPoints(
Math.floor(
Number(
e.detail?.amount||0
)
),
"casino"
);

}
);

window.addEventListener(
"bx:swap-complete",
()=>{

addPoints(
50,
"swap"
);

}
);

window.addEventListener(
"bx:mining-claim",
()=>{

addPoints(
75,
"mining"
);

}
);

window.addEventListener(
"bx:airdrop-claimed",
()=>{

addPoints(
25,
"airdrop"
);

}
);

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const points=
document.getElementById(
"loyaltyPoints"
);

const rank=
document.getElementById(
"loyaltyRank"
);

const multiplier=
document.getElementById(
"loyaltyMultiplier"
);

if(points){

points.textContent=
state.points
.toLocaleString();

}

if(rank){

rank.textContent=
state.rank;

}

if(multiplier){

multiplier.textContent=
`${state.multiplier}x`;

}

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
   STATE
========================================================= */

function getState(){

return{

...state,

history:[...history]

};

}

/* =========================================================
   INIT
========================================================= */

function init(){

load();

updateRank();

bindEvents();

emit();

console.log(
"🎖️ BLOXIO LOYALTY READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

addPoints,

redeemBX,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXLoyalty.init()
)
:BXLoyalty.init();
