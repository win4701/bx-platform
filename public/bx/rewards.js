/* =========================================================
   FILE: public/bx/rewards.js
   BLOXIO REWARDS ENGINE 2026
========================================================= */

window.BXRewards=(function(){

const listeners=new Set();

const history=[];

const state={
totalRewards:0,
pendingRewards:0,
claimedRewards:0,
dailyStreak:0,
lastClaim:0,
updatedAt:0
};

const REWARD_TYPES={

DAILY:"daily",
WEEKLY:"weekly",
MONTHLY:"monthly",
VIP:"vip",
MINING:"mining",
CASINO:"casino",
AIRDROP:"airdrop",
ACHIEVEMENT:"achievement",
REFERRAL:"referral"

};

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
"REWARDS_ENGINE",
error
);

}

});

render();

save();

}

function save(){

localStorage.setItem(
"bx_rewards",
JSON.stringify(
{
totalRewards:state.totalRewards,
pendingRewards:state.pendingRewards,
claimedRewards:state.claimedRewards,
dailyStreak:state.dailyStreak,
lastClaim:state.lastClaim
}
)
);

}

function load(){

const raw=
localStorage.getItem(
"bx_rewards"
);

if(!raw){
return;
}

try{

const data=
JSON.parse(raw);

state.totalRewards=
data.totalRewards||0;

state.pendingRewards=
data.pendingRewards||0;

state.claimedRewards=
data.claimedRewards||0;

state.dailyStreak=
data.dailyStreak||0;

state.lastClaim=
data.lastClaim||0;

}catch(error){}

}

/* =========================================================
   REWARD
========================================================= */

function addReward(
amount,
type,
reason=""
){

amount=
Number(amount)||0;

state.totalRewards+=amount;

state.pendingRewards+=amount;

history.unshift({
id:crypto.randomUUID(),
amount,
type,
reason,
time:Date.now()
});

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"success",
title:"Reward Added",
message:`+${amount} BX`
});

}

emit();

}

/* =========================================================
   CLAIM
========================================================= */

function claimRewards(){

if(
state.pendingRewards<=0
){
return false;
}

const amount=
state.pendingRewards;

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

state.claimedRewards+=amount;

state.pendingRewards=0;

state.lastClaim=
Date.now();

emit();

window.dispatchEvent(
new CustomEvent(
"bx:reward-claimed",
{
detail:{
amount
}
}
)
);

return true;

}

/* =========================================================
   DAILY
========================================================= */

function dailyReward(){

const now=
Date.now();

const diff=
now-state.lastClaim;

if(
diff<86400000
){
return;
}

state.dailyStreak++;

const reward=
Math.min(
100,
5+
state.dailyStreak
);

addReward(
reward,
REWARD_TYPES.DAILY,
"Daily Reward"
);

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:swap-complete",
()=>{

addReward(
2,
REWARD_TYPES.REFERRAL,
"Swap Activity"
);

}
);

window.addEventListener(
"bx:airdrop-claimed",
()=>{

addReward(
5,
REWARD_TYPES.AIRDROP,
"Airdrop Claim"
);

}
);

window.addEventListener(
"bx:mining-claim",
e=>{

addReward(
Math.max(
1,
Math.floor(
Number(
e.detail?.amount||1
)/10
)
),
REWARD_TYPES.MINING,
"Mining Reward"
);

}
);

window.addEventListener(
"bx:casino-win",
e=>{

const reward=
Math.floor(
Number(
e.detail?.amount||0
)/20
);

if(
reward>0
){

addReward(
reward,
REWARD_TYPES.CASINO,
"Casino Win"
);

}

}
);

window.addEventListener(
"bx:vip-upgrade",
e=>{

const map={
Silver:25,
Gold:50,
Platinum:100,
Diamond:250,
Master:500,
Legend:1000
};

const reward=
map[
e.detail?.name
]||0;

if(
reward>0
){

addReward(
reward,
REWARD_TYPES.VIP,
"VIP Upgrade"
);

}

}
);

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const pending=
document.getElementById(
"rewardPending"
);

const claimed=
document.getElementById(
"rewardClaimed"
);

const streak=
document.getElementById(
"rewardStreak"
);

if(pending){

pending.textContent=
`${state.pendingRewards.toFixed(2)} BX`;

}

if(claimed){

claimed.textContent=
`${state.claimedRewards.toFixed(2)} BX`;

}

if(streak){

streak.textContent=
state.dailyStreak;

}

}

/* =========================================================
   BUTTONS
========================================================= */

function bindButtons(){

document
.getElementById(
"claimRewardsBtn"
)
?.addEventListener(
"click",
claimRewards
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

bindEvents();

bindButtons();

dailyReward();

emit();

console.log(
"🎁 BLOXIO REWARDS READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

addReward,

claimRewards,

subscribe,

getState

};

})();

document.readyState==="loading"

?document.addEventListener(
"DOMContentLoaded",
()=>BXRewards.init()
)

:BXRewards.init();
