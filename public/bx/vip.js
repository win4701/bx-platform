/*=========================================================
VIP ENGINE V3
BX + XBC ECOSYSTEM
10 LEVELS
=========================================================*/

window.BXVIP=(function(){

const listeners=new Set();
const history=[];

const STORAGE_KEY="bx_vip_v3";

const LEVELS=[

{id:0,name:"VIP0",xp:0,cashback:0.25,rakeback:0.25,mining:1.00},

{id:1,name:"VIP1",xp:1000,cashback:0.50,rakeback:0.50,mining:1.05},

{id:2,name:"VIP2",xp:5000,cashback:0.75,rakeback:0.75,mining:1.10},

{id:3,name:"VIP3",xp:15000,cashback:1.00,rakeback:1.00,mining:1.20},

{id:4,name:"VIP4",xp:35000,cashback:1.50,rakeback:1.50,mining:1.35},

{id:5,name:"VIP5",xp:75000,cashback:2.00,rakeback:2.00,mining:1.50},

{id:6,name:"VIP6",xp:150000,cashback:3.00,rakeback:3.00,mining:1.75},

{id:7,name:"VIP7",xp:300000,cashback:4.00,rakeback:4.00,mining:2.00},

{id:8,name:"VIP8",xp:600000,cashback:5.00,rakeback:5.00,mining:2.50},

{id:9,name:"VIP9",xp:1200000,cashback:7.00,rakeback:7.00,mining:3.00},

{id:10,name:"VIP10",xp:2500000,cashback:10.00,rakeback:10.00,mining:5.00}

];

const state={

level:0,
name:"VIP0",

xp:0,

nextXP:1000,

cashback:0.25,

rakeback:0.25,

miningBoost:1,

dailyBX:5,

weeklyBX:25,

monthlyBX:100,

dailyXBC:2,

weeklyXBC:10,

monthlyXBC:50,

totalRewards:0,

updatedAt:0

};

/*=========================================================
HELPERS
=========================================================*/
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

function uuid(){

return crypto.randomUUID
?crypto.randomUUID()
:Math.random().toString(36).slice(2);

}

/*=========================================================
STORAGE
=========================================================*/
function save(){

localStorage.setItem(
STORAGE_KEY,
JSON.stringify({

xp:state.xp,

level:state.level

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

state.xp=
Number(
data.xp||0
);

}catch(error){}

}

/*=========================================================
LEVEL
=========================================================*/
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

const old=
state.level;

state.level=
current.id;

state.name=
current.name;

state.cashback=
current.cashback;

state.rakeback=
current.rakeback;

state.miningBoost=
current.mining;

const next=
LEVELS[
current.id+1
];

state.nextXP=
next
?next.xp
:current.xp;

calculateRewards();

if(
old!==state.level
){

levelUp();

}

}

/*=========================================================
XP
=========================================================*/
function addXP(amount){

amount=
Number(amount)||0;

if(amount<=0)
return;

state.xp+=amount;

updateLevel();

emit();

}

function setXP(amount){

state.xp=
Math.max(
0,
Number(amount)||0
);

updateLevel();

emit();

}

/*=========================================================
LEVEL UP
=========================================================*/
function levelUp(){

history.unshift({

id:uuid(),

type:"level-up",

level:state.name,

time:Date.now()

});

if(window.BXChat){

BXChat.receive?.({

system:true,

room:"global",

user:"VIP",

vip:"SYSTEM",

text:
`${state.name} unlocked`,

time:Date.now()

});

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

/*=========================================================
REWARDS
=========================================================*/
function calculateRewards(){

state.dailyBX=
5+
(state.level*2);

state.weeklyBX=
25+
(state.level*15);

state.monthlyBX=
100+
(state.level*100);

state.dailyXBC=
2+
(state.level);

state.weeklyXBC=
10+
(state.level*5);

state.monthlyXBC=
50+
(state.level*25);

}

/*=========================================================
PAY
=========================================================*/
function credit(
coin,
amount
){

if(window.Wallet){

Wallet.credit?.(
coin,
amount
);

}

}

/*=========================================================
CLAIMS
=========================================================*/
function claimDaily(){

credit(
"BX",
state.dailyBX
);

credit(
"XBC",
state.dailyXBC
);

rewardHistory(
"Daily"
);

}

function claimWeekly(){

credit(
"BX",
state.weeklyBX
);

credit(
"XBC",
state.weeklyXBC
);

rewardHistory(
"Weekly"
);

}

function claimMonthly(){

credit(
"BX",
state.monthlyBX
);

credit(
"XBC",
state.monthlyXBC
);

rewardHistory(
"Monthly"
);

}

function rewardHistory(type){

state.totalRewards++;

history.unshift({

id:uuid(),

type,

bx:
state[`${type.toLowerCase()}BX`],

xbc:
state[`${type.toLowerCase()}XBC`],

time:Date.now()

});

emit();

}

/*=========================================================
EVENTS
=========================================================*/
function bindEvents(){

window.addEventListener(
"bx:swap-complete",
()=>addXP(15)
);

window.addEventListener(
"bx:mining-claim",
()=>addXP(25)
);

window.addEventListener(
"bx:casino-bet",
()=>addXP(3)
);

window.addEventListener(
"bx:casino-win",
e=>{

const amount=
Number(
e.detail?.amount||0
);

addXP(
Math.max(
1,
Math.floor(
amount/10
)
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

/*=========================================================
UI
=========================================================*/
function updateUI(){

const level=
document.getElementById(
"vipLevel"
);

const xp=
document.getElementById(
"vipXP"
);

const cashback=
document.getElementById(
"vipCashback"
);

const rakeback=
document.getElementById(
"vipRakeback"
);

const progress=
document.getElementById(
"vipProgress"
);

const mining=
document.getElementById(
"vipMiningBoost"
);

if(level){

level.textContent=
state.name;

}

if(xp){

xp.textContent=
state.xp.toLocaleString();

}

if(cashback){

cashback.textContent=
`${state.cashback}%`;

}

if(rakeback){

rakeback.textContent=
`${state.rakeback}%`;

}

if(mining){

mining.textContent=
`${state.miningBoost}x`;

}

if(progress){

const current=
LEVELS[state.level];

const start=
current.xp;

const end=
state.nextXP;

const value=
end>start
?(
(
state.xp-start
)/
(
end-start
)
)*100
:100;

progress.style.width=
`${Math.min(100,value)}%`;

}

}

/*=========================================================
BUTTONS
=========================================================*/
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
MOCK
=========================================================*/
function startMock(){

setInterval(()=>{

addXP(
Math.floor(
Math.random()*5
)
);

},60000);

}

/*=========================================================
INIT
=========================================================*/
function init(){

load();

updateLevel();

calculateRewards();

bindEvents();

bindButtons();

startMock();

emit();

console.log(
"👑 BLOXIO VIP V3 READY"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

addXP,

setXP,

claimDaily,

claimWeekly,

claimMonthly,

subscribe,

getState,

levels:LEVELS

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXVIP.init()
)
:BXVIP.init();
