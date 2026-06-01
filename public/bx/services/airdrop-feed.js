/* =========================================================
   FILE: public/bx/services/airdrop-feed.js
   BLOXIO AIRDROP ENGINE 2026
   BX Ecosystem Rewards
========================================================= */

import {WalletFeed} from "./wallet-feed.js";

export const AirdropFeed=(function(){

const listeners=new Set();

const completedTasks=new Set();

const claimHistory=[];

const state={
campaign:"BLOXIO AIRDROP SEASON 1",
rewardPool:10000000,
claimedPool:0,
userReward:0,
referrals:0,
tasksCompleted:0,
progress:0,
canClaim:false,
refCode:"",
refLink:"",
tier:"Bronze",
updatedAt:0
};

/* =========================================================
   TASKS
========================================================= */

const TASKS=[
{id:"register",title:"Register Account",reward:25,type:"mandatory"},
{id:"wallet",title:"Create Wallet",reward:25,type:"mandatory"},
{id:"telegram",title:"Join Telegram",reward:50,type:"social"},
{id:"twitter",title:"Follow X",reward:50,type:"social"},
{id:"discord",title:"Join Discord",reward:50,type:"social"},
{id:"market",title:"Visit Market",reward:25,type:"engagement"},
{id:"swap",title:"Complete Swap",reward:100,type:"engagement"},
{id:"mining",title:"Activate Mining",reward:100,type:"engagement"},
{id:"casino",title:"Open Casino",reward:50,type:"engagement"},
{id:"referral1",title:"Invite 1 Friend",reward:250,type:"referral"},
{id:"referral5",title:"Invite 5 Friends",reward:750,type:"referral"},
{id:"referral10",title:"Invite 10 Friends",reward:1500,type:"referral"}
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
"AirDropFeed",
error
);

}

});

updateUI();

}

function updateUI(){

const reward=
document.getElementById(
"airdropReward"
);

const tasks=
document.getElementById(
"airdropTasks"
);

const ref=
document.getElementById(
"ref-link-airdrop"
);

if(reward){

reward.textContent=
`${state.userReward.toFixed(2)} BX`;

}

if(tasks){

tasks.textContent=
`${state.tasksCompleted}/${TASKS.length}`;

}

if(ref){

ref.value=
state.refLink;

}

}

/* =========================================================
   REFERRAL
========================================================= */

function generateReferral(){

const code=
`BX${Math.random()
.toString(36)
.substring(2,10)
.toUpperCase()}`;

state.refCode=
code;

state.refLink=
`${window.location.origin}/?ref=${code}`;

}

function addReferral(count=1){

state.referrals+=count;

if(
state.referrals>=1
){

completeTask(
"referral1"
);

}

if(
state.referrals>=5
){

completeTask(
"referral5"
);

}

if(
state.referrals>=10
){

completeTask(
"referral10"
);

}

emit();

}

/* =========================================================
   TASKS
========================================================= */

function completeTask(taskId){

if(
completedTasks.has(
taskId
)
){
return;
}

const task=
TASKS.find(
item=>item.id===taskId
);

if(!task){
return;
}

completedTasks.add(
taskId
);

state.userReward+=
task.reward;

state.tasksCompleted=
completedTasks.size;

state.progress=
(
state.tasksCompleted/
TASKS.length
)*100;

state.canClaim=
state.userReward>0;

updateTier();

emit();

}

function getTasks(){

return TASKS.map(task=>({

...task,

completed:
completedTasks.has(
task.id
)

}));

}

/* =========================================================
   TIER
========================================================= */

function updateTier(){

if(
state.userReward>=5000
){

state.tier="Diamond";

}else if(
state.userReward>=2500
){

state.tier="Gold";

}else if(
state.userReward>=1000
){

state.tier="Silver";

}else{

state.tier="Bronze";

}

}

/* =========================================================
   CLAIM
========================================================= */

function claim(){

if(
!state.canClaim
){
return false;
}

const asset=
WalletFeed.getAsset(
"BX"
);

if(asset){

WalletFeed.updateBalance(
"BX",
asset.balance+
state.userReward
);

}

claimHistory.unshift({
id:crypto.randomUUID(),
amount:state.userReward,
time:Date.now()
});

if(
claimHistory.length>100
){

claimHistory.pop();

}

state.claimedPool+=
state.userReward;

state.userReward=0;

state.canClaim=false;

emit();

window.dispatchEvent(
new CustomEvent(
"bx:airdrop-claimed"
)
);

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
   COPY REF
========================================================= */

function copyReferral(){

navigator.clipboard.writeText(
state.refLink
);

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

window.BXSocket.airdropFeed(
payload=>{

if(
payload.reward
){

state.rewardPool=
Math.max(
state.rewardPool,
payload.reward
);

}

emit();

}
);

}

/* =========================================================
   BUTTONS
========================================================= */

function bindButtons(){

const claimBtn=
document.getElementById(
"claimAirdropBtn"
);

const copyBtn=
document.getElementById(
"copyRefBtn"
);

claimBtn?.addEventListener(
"click",
()=>{

claim();

}
);

copyBtn?.addEventListener(
"click",
()=>{

copyReferral();

}
);

}

/* =========================================================
   AUTO TASKS
========================================================= */

function autoTasks(){

window.addEventListener(
"bx:swap-complete",
()=>{

completeTask(
"swap"
);

}
);

window.addEventListener(
"bx:airdrop-claimed",
()=>{

console.log(
"AIRDROP CLAIMED"
);

}
);

}

/* =========================================================
   MOCK
========================================================= */

function startMockMode(){

setTimeout(
()=>completeTask(
"register"
),
1000
);

setTimeout(
()=>completeTask(
"wallet"
),
2000
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
tasks:getTasks(),
history:getHistory()
};

}

/* =========================================================
   INIT
========================================================= */

function init(){

generateReferral();

bindSocket();

bindButtons();

autoTasks();

startMockMode();

emit();

console.log(
"🎁 BLOXIO AIRDROP READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{
init,
claim,
subscribe,
getState,
getTasks,
getHistory,
addReferral,
completeTask,
copyReferral
};

})();

window.AirdropFeed=
AirdropFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>AirdropFeed.init()
)
:AirdropFeed.init();
