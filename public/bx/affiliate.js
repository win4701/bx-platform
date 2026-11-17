/* =========================================================
   FILE: public/bx/affiliate.js
   BLOXIO AFFILIATE ENGINE 2026
========================================================= */

window.BXAffiliate=(function(){

const listeners=new Set();

const referrals=[];

const commissions=[];

const state={
refCode:"",
refLink:"",
totalReferrals:0,
activeReferrals:0,
commissionBX:0,
commissionUSD:0,
tier:"Starter",
updatedAt:0
};

const TIERS=[

{
name:"Starter",
referrals:0,
commission:5
},

{
name:"Bronze",
referrals:10,
commission:7
},

{
name:"Silver",
referrals:50,
commission:10
},

{
name:"Gold",
referrals:100,
commission:15
},

{
name:"Diamond",
referrals:500,
commission:20
}

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
"BX_AFFILIATE",
error
);

}

});

render();

save();

}

function save(){

localStorage.setItem(
"bx_affiliate",
JSON.stringify({
referrals,
commissions,
state
})
);

}

function load(){

const raw=
localStorage.getItem(
"bx_affiliate"
);

if(!raw){
return;
}

try{

const data=
JSON.parse(raw);

referrals.push(
...(data.referrals||[])
);

commissions.push(
...(data.commissions||[])
);

Object.assign(
state,
data.state||{}
);

}catch(error){}

}

/* =========================================================
   REF CODE
========================================================= */

function generateCode(){

const username=
window.AuthFeed
?.getState()
?.user
?.username
||"BX";

state.refCode=
(
username+
Math.random()
.toString(36)
.substring(2,8)
)
.toUpperCase();

state.refLink=
`${location.origin}/?ref=${state.refCode}`;

emit();

}

/* =========================================================
   REFERRALS
========================================================= */

function addReferral(payload={}){

referrals.unshift({

id:crypto.randomUUID(),

username:
payload.username||
`user${Math.floor(Math.random()*99999)}`,

wager:
payload.wager||0,

commission:
payload.commission||0,

joinedAt:
Date.now()

});

state.totalReferrals=
referrals.length;

state.activeReferrals=
referrals.filter(
item=>item.wager>0
).length;

updateTier();

emit();

}

/* =========================================================
   COMMISSIONS
========================================================= */

function addCommission(
amount,
source="Casino"
){

amount=
Number(amount)||0;

commissions.unshift({

id:crypto.randomUUID(),

source,

amount,

time:Date.now()

});

state.commissionBX+=
amount;

state.commissionUSD+=
amount*45;

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

if(
window.NotificationFeed
){

NotificationFeed.add({

type:"success",

title:"Affiliate Commission",

message:`+${amount} BX`

});

}

emit();

}

/* =========================================================
   TIER
========================================================= */

function updateTier(){

let current=
TIERS[0];

TIERS.forEach(tier=>{

if(
state.totalReferrals>=
tier.referrals
){

current=tier;

}

});

state.tier=
current.name;

}

/* =========================================================
   COPY LINK
========================================================= */

function copyLink(){

navigator.clipboard.writeText(
state.refLink
);

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:casino-win",
e=>{

const amount=
Number(
e.detail?.amount||0
);

if(
amount>0
){

addCommission(
amount*0.01,
"Casino"
);

}

}
);

window.addEventListener(
"bx:swap-complete",
()=>{

addCommission(
0.25,
"Swap"
);

}
);

window.addEventListener(
"bx:mining-claim",
()=>{

addCommission(
0.5,
"Mining"
);

}
);

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const referralsEl=
document.getElementById(
"affiliateReferrals"
);

const commissionEl=
document.getElementById(
"affiliateCommission"
);

const tierEl=
document.getElementById(
"affiliateTier"
);

const linkEl=
document.getElementById(
"affiliateLink"
);

if(referralsEl){

referralsEl.textContent=
state.totalReferrals;

}

if(commissionEl){

commissionEl.textContent=
`${state.commissionBX.toFixed(2)} BX`;

}

if(tierEl){

tierEl.textContent=
state.tier;

}

if(linkEl){

linkEl.value=
state.refLink;

}

}

/* =========================================================
   MOCK
========================================================= */

function mock(){

setInterval(()=>{

addReferral({

username:
`user${Math.floor(Math.random()*9999)}`,

wager:
Math.random()*100

});

},180000);

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

referrals:[...referrals],

commissions:[...commissions]

};

}

/* =========================================================
   INIT
========================================================= */

function init(){

load();

if(
!state.refCode
){

generateCode();

}

bindEvents();

mock();

emit();

console.log(
"🤝 BLOXIO AFFILIATE READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

addReferral,

addCommission,

copyLink,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXAffiliate.init()
)
:BXAffiliate.init();
