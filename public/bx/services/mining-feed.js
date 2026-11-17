/* =========================================================
   FILE: public/bx/services/mining-feed.js
   BLOXIO MINING ENGINE 2026
   Supported:
   BX
   ETC
   LTC
   TRX
   BNB
   SOL
   XRP
   USDC
   DOGE
   TON
========================================================= */

import {WalletFeed} from "./wallet-feed.js";

export const MiningFeed=(function(){

const listeners=new Set();

const activePlans=new Map();

const claimHistory=[];

const state={
miners:0,
hashrate:0,
dailyRewards:0,
totalRewards:0,
activeCurrency:"BX",
activePlans:0,
online:0,
updatedAt:0
};

/* =========================================================
   COINS
========================================================= */

const COINS={
BX:{price:45,minStake:10},
ETC:{price:35,minStake:5},
LTC:{price:90,minStake:2},
TRX:{price:0.12,minStake:100},
BNB:{price:700,minStake:0.05},
SOL:{price:180,minStake:0.2},
XRP:{price:0.7,minStake:50},
USDC:{price:1,minStake:50},
DOGE:{price:0.15,minStake:200},
TON:{price:6,minStake:20}
};

/* =========================================================
   PLANS
========================================================= */

const PLANS=[
{id:"starter",name:"Starter",hashrate:25,cycle:24,yield:0.6},
{id:"basic",name:"Basic",hashrate:75,cycle:24,yield:1.2},
{id:"advanced",name:"Advanced",hashrate:150,cycle:24,yield:2.4},
{id:"pro",name:"Pro",hashrate:350,cycle:24,yield:5},
{id:"elite",name:"Elite",hashrate:700,cycle:24,yield:10},
{id:"legend",name:"Legend",hashrate:1500,cycle:24,yield:20}
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
"MINING_FEED",
error
);

}

});

updateUI();

}

function updateUI(){

const btn=
document.getElementById(
"miningClaimBtn"
);

if(btn){

btn.disabled=
state.totalRewards<=0;

}

}

/* =========================================================
   PLAN
========================================================= */

function getPlans(){

return PLANS.map(plan=>{

const coin=
COINS[
state.activeCurrency
];

const estimated=
(
coin.price*
plan.yield
)/100;

return{
...plan,
currency:state.activeCurrency,
estimatedReturn:estimated
};

});

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
plans:getPlans(),
history:getHistory()
};

}

/* =========================================================
   CURRENCY
========================================================= */

function setCurrency(symbol){

if(
!COINS[
symbol
]
){
return;
}

state.activeCurrency=
symbol;

emit();

}

/* =========================================================
   SUBSCRIBE PLAN
========================================================= */

function subscribePlan(
planId,
amount
){

const plan=
PLANS.find(
item=>item.id===planId
);

if(!plan){
return false;
}

const asset=
WalletFeed.getAsset(
state.activeCurrency
);

if(!asset){
return false;
}

amount=
Number(amount)||0;

if(
amount<
COINS[
state.activeCurrency
].minStake
){
return false;
}

if(
asset.balance<
amount
){
return false;
}

WalletFeed.updateBalance(
state.activeCurrency,
asset.balance-amount
);

const planKey=
crypto.randomUUID();

activePlans.set(
planKey,
{
id:planKey,
currency:state.activeCurrency,
planId,
amount,
hashrate:plan.hashrate,
yield:plan.yield,
startedAt:Date.now(),
lastClaim:Date.now()
}
);

state.activePlans=
activePlans.size;

state.hashrate+=
plan.hashrate;

state.miners++;

emit();

return true;

}

/* =========================================================
   REWARD ENGINE
========================================================= */

function rewardLoop(){

setInterval(()=>{

let totalReward=0;

activePlans.forEach(plan=>{

const reward=
(
plan.amount*
plan.yield
)/100/
1440;

totalReward+=reward;

});

state.dailyRewards=
totalReward*1440;

state.totalRewards+=
totalReward;

emit();

},60000);

}

/* =========================================================
   CLAIM
========================================================= */

function claim(){

if(
state.totalRewards<=0
){
return false;
}

const asset=
WalletFeed.getAsset(
state.activeCurrency
);

if(asset){

WalletFeed.updateBalance(
state.activeCurrency,
asset.balance+
state.totalRewards
);

}

claimHistory.unshift({
id:crypto.randomUUID(),
currency:state.activeCurrency,
amount:Number(
state.totalRewards
.toFixed(8)
),
time:Date.now()
});

if(
claimHistory.length>100
){

claimHistory.pop();

}

state.totalRewards=0;

emit();

return true;

}

/* =========================================================
   HISTORY
========================================================= */

function getHistory(){

return[
...claimHistory
];

}

/* =========================================================
   GRID
========================================================= */

function renderPlans(){

const grid=
document.getElementById(
"miningGrid"
);

if(!grid){
return;
}

grid.innerHTML=
getPlans().map(plan=>`
<div class="mining-card">
<div class="mining-title">${plan.name}</div>
<div class="mining-currency">${plan.currency}</div>
<div class="mining-hashrate">${plan.hashrate} TH/s</div>
<div class="mining-cycle">${plan.cycle}H</div>
<div class="mining-yield">${plan.yield}%</div>
<div class="mining-estimated">${plan.estimatedReturn.toFixed(4)}</div>
<button class="mining-subscribe-btn" data-plan="${plan.id}">
Subscribe
</button>
</div>
`).join("");

bindPlanButtons();

}

/* =========================================================
   BUTTONS
========================================================= */

function bindPlanButtons(){

document
.querySelectorAll(
".mining-subscribe-btn"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

subscribePlan(
btn.dataset.plan,
100
);

}
);

});

}

/* =========================================================
   CLAIM BUTTON
========================================================= */

function bindClaim(){

const btn=
document.getElementById(
"miningClaimBtn"
);

btn?.addEventListener(
"click",
()=>{

claim();

}
);

}

/* =========================================================
   TABS
========================================================= */

function bindTabs(){

document
.querySelectorAll(
"[data-mining-coin]"
)
.forEach(tab=>{

tab.addEventListener(
"click",
()=>{

document
.querySelectorAll(
"[data-mining-coin]"
)
.forEach(
item=>
item.classList.remove(
"active"
)
);

tab.classList.add(
"active"
);

setCurrency(
tab.dataset.miningCoin
);

renderPlans();

}
);

});

}

/* =========================================================
   SOCKET
========================================================= */

function bindSocket(){

if(
!window.BXSocket
){
return;
}

window.BXSocket.miningFeed(
payload=>{

state.online=
payload.miners||0;

emit();

}
);

}

/* =========================================================
   MOCK
========================================================= */

function mockOnline(){

setInterval(()=>{

state.online=
1000+
Math.floor(
Math.random()*5000
);

emit();

},5000);

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindTabs();

bindClaim();

bindSocket();

mockOnline();

rewardLoop();

renderPlans();

console.log(
"⛏️ BLOXIO MINING READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{
init,
claim,
subscribe,
setCurrency,
subscribePlan,
getState,
getPlans,
getHistory
};

})();

window.MiningFeed=
MiningFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>MiningFeed.init()
)
:MiningFeed.init();
