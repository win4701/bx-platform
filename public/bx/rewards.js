/*=========================================================
FILE: public/bx/rewards.js
BLOXIO REWARDS ENGINE V3
BX + XBC
=========================================================*/

window.BXRewards=(function(){

/* BLOXIO SVG icon adapter — gracefully falls back when the shared library is unavailable. */
const BLOXIO_ICON = (() => {
  const resolve = (kind, code, fallback = "") => {
    const api = window.BLOXIO_ICONS;
    try {
      const fn = api && api[kind];
      return typeof fn === "function" ? (fn.call(api, code) || fallback) : fallback;
    } catch (_) { return fallback; }
  };
  const apply = (button, name, label) => {
    if (!button || button.querySelector(".bloxio-js-icon")) return;
    const src = resolve("action", name);
    if (!src) return;
    const img = document.createElement("img");
    img.className = "bloxio-js-icon";
    img.src = src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.width = 18;
    img.height = 18;
    img.style.cssText = "width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-inline-end:8px";
    button.prepend(img);
    if (label) button.setAttribute("aria-label", label);
  };
  return Object.freeze({ resolve, apply });
})();

function addAssetIcon(target, symbol) {
  if (!target || target.querySelector(".bloxio-js-icon")) return;
  const src = BLOXIO_ICON.resolve("token", symbol) || BLOXIO_ICON.resolve("action", "gift");
  if (!src) return;
  const img = document.createElement("img");
  img.className = "bloxio-js-icon";
  img.src = src;
  img.alt = "";
  img.width = 18;
  img.height = 18;
  img.style.cssText = "width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-inline-end:6px";
  target.prepend(img);
}


const listeners=new Set();
const history=[];

const STORAGE_KEY="bx_rewards_v3";

const state={

dailyClaimed:false,
weeklyClaimed:false,
monthlyClaimed:false,

streak:0,

totalBX:0,
totalXBC:0,

missionsCompleted:0,

updatedAt:0

};

const REWARDS={

daily:{
bx:5,
xbc:10
},

weekly:{
bx:50,
xbc:100
},

monthly:{
bx:250,
xbc:500
}

};

/*=========================================================
HELPERS
=========================================================*/
function uuid(){

return crypto.randomUUID
?crypto.randomUUID()
:Math.random().toString(36).slice(2);

}

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

updateUI();

save();

}

function reward(
bx=0,
xbc=0,
type="Reward"
){

if(window.Wallet){

if(bx){

Wallet.credit?.(
"BX",
bx
);

state.totalBX+=bx;

}

if(xbc){

Wallet.credit?.(
"XBC",
xbc
);

state.totalXBC+=xbc;

}

}

history.unshift({

id:uuid(),

type,

bx,

xbc,

time:Date.now()

});

emit();

}

/*=========================================================
STORAGE
=========================================================*/
function save(){

localStorage.setItem(
STORAGE_KEY,
JSON.stringify({

dailyClaimed:
state.dailyClaimed,

weeklyClaimed:
state.weeklyClaimed,

monthlyClaimed:
state.monthlyClaimed,

streak:
state.streak,

totalBX:
state.totalBX,

totalXBC:
state.totalXBC

})

);

}

function load(){

const raw=
localStorage.getItem(
STORAGE_KEY
);

if(!raw)return;

try{

const data=
JSON.parse(raw);

Object.assign(
state,
data
);

}catch(error){}

}

/*=========================================================
DAILY
=========================================================*/
function claimDaily(){

if(
state.dailyClaimed
){
return false;
}

state.dailyClaimed=true;

state.streak++;

reward(

REWARDS.daily.bx,

REWARDS.daily.xbc,

"Daily"

);

return true;

}

/*=========================================================
WEEKLY
=========================================================*/
function claimWeekly(){

if(
state.weeklyClaimed
){
return false;
}

state.weeklyClaimed=true;

reward(

REWARDS.weekly.bx,

REWARDS.weekly.xbc,

"Weekly"

);

return true;

}

/*=========================================================
MONTHLY
=========================================================*/
function claimMonthly(){

if(
state.monthlyClaimed
){
return false;
}

state.monthlyClaimed=true;

reward(

REWARDS.monthly.bx,

REWARDS.monthly.xbc,

"Monthly"

);

return true;

}

/*=========================================================
MISSIONS
=========================================================*/
function missionReward(
name,
bx,
xbc
){

state.missionsCompleted++;

reward(
bx,
xbc,
name
);

}

/*=========================================================
EVENT REWARDS
=========================================================*/
function bindEvents(){

window.addEventListener(
"bx:mining-claim",
()=>{

missionReward(
"Mining",
1,
2
);

}
);

window.addEventListener(
"bx:casino-win",
()=>{

missionReward(
"Casino",
2,
3
);

}
);

window.addEventListener(
"bx:swap-complete",
()=>{

missionReward(
"Swap",
1,
1
);

}
);

window.addEventListener(
"bx:referral-success",
()=>{

missionReward(
"Referral",
25,
50
);

}
);

window.addEventListener(
"bx:vip-upgrade",
()=>{

missionReward(
"VIP",
20,
40
);

}
);

}

/*=========================================================
RESETS
=========================================================*/
function startResetTimers(){

setInterval(()=>{

const now=
new Date();

if(
now.getHours()===0&&
now.getMinutes()===0
){

state.dailyClaimed=
false;

emit();

}

},60000);

setInterval(()=>{

const now=
new Date();

if(
now.getDay()===1&&
now.getHours()===0&&
now.getMinutes()===0
){

state.weeklyClaimed=
false;

emit();

}

},60000);

setInterval(()=>{

const now=
new Date();

if(
now.getDate()===1&&
now.getHours()===0&&
now.getMinutes()===0
){

state.monthlyClaimed=
false;

emit();

}

},60000);

}

/*=========================================================
UI
=========================================================*/
function updateUI(){

const streak=
document.getElementById(
"rewardStreak"
);

const totalBX=
document.getElementById(
"rewardBX"
);

const totalXBC=
document.getElementById(
"rewardXBC"
);

const missions=
document.getElementById(
"rewardMissions"
);

if(streak){
streak.textContent = state.streak;
}

if(totalBX){
totalBX.textContent = state.totalBX.toFixed(2);
addAssetIcon(totalBX, "BX");
}

if(totalXBC){
totalXBC.textContent = state.totalXBC.toFixed(2);
addAssetIcon(totalXBC, "XBC");
}

if(missions){

missions.textContent=
state.missionsCompleted;

}

}

/*=========================================================
BUTTONS
=========================================================*/
function bindButtons(){

BLOXIO_ICON.apply(document.getElementById("rewardClaimDaily"), "gift", "Claim daily reward");
BLOXIO_ICON.apply(document.getElementById("rewardClaimWeekly"), "calendar", "Claim weekly reward");
BLOXIO_ICON.apply(document.getElementById("rewardClaimMonthly"), "award", "Claim monthly reward");

document
.getElementById(
"rewardClaimDaily"
)
?.addEventListener(
"click",
claimDaily
);

document
.getElementById(
"rewardClaimWeekly"
)
?.addEventListener(
"click",
claimWeekly
);

document
.getElementById(
"rewardClaimMonthly"
)
?.addEventListener(
"click",
claimMonthly
);

}

/*=========================================================
SUBSCRIBE
=========================================================*/
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

/*=========================================================
STATE
=========================================================*/
function getState(){

return{

...state,

history:[...history]

};

}

/*=========================================================
INIT
=========================================================*/
function init(){

load();

bindButtons();

bindEvents();

startResetTimers();

emit();

console.log(
"🎁 BLOXIO REWARDS READY"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

claimDaily,

claimWeekly,

claimMonthly,

missionReward,

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
