/* =========================================================
   FILE: public/bx/achievements.js
   BLOXIO ACHIEVEMENTS ENGINE 2026
========================================================= */

window.BXAchievements=(function(){

const listeners=new Set();

const unlocked=new Set();

const history=[];

const state={
total:0,
unlocked:0,
progress:0,
updatedAt:0
};

const ACHIEVEMENTS=[

{id:"first_login",title:"First Login",reward:10},

{id:"first_swap",title:"First Swap",reward:25},

{id:"first_mining",title:"First Mining",reward:50},

{id:"first_airdrop",title:"First Airdrop",reward:50},

{id:"first_casino",title:"First Casino Win",reward:100},

{id:"vip_silver",title:"VIP Silver",reward:100},

{id:"vip_gold",title:"VIP Gold",reward:250},

{id:"vip_platinum",title:"VIP Platinum",reward:500},

{id:"wallet_100",title:"Wallet $100",reward:50},

{id:"wallet_1000",title:"Wallet $1000",reward:250},

{id:"wallet_10000",title:"Wallet $10000",reward:1000},

{id:"miner_1",title:"First Miner",reward:100},

{id:"referral_1",title:"First Referral",reward:50},

{id:"referral_10",title:"10 Referrals",reward:500},

{id:"referral_100",title:"100 Referrals",reward:5000}

];

/* =========================================================
   HELPERS
========================================================= */

function emit(){

state.total=
ACHIEVEMENTS.length;

state.unlocked=
unlocked.size;

state.progress=
(
state.unlocked/
state.total
)*100;

state.updatedAt=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
error
);

}

});

render();

save();

}

function save(){

localStorage.setItem(
"bx_achievements",
JSON.stringify(
Array.from(unlocked)
)
);

}

function load(){

const raw=
localStorage.getItem(
"bx_achievements"
);

if(!raw){
return;
}

try{

JSON.parse(raw)
.forEach(id=>{

unlocked.add(id);

});

}catch(error){}

}

/* =========================================================
   UNLOCK
========================================================= */

function unlock(id){

if(
unlocked.has(id)
){
return;
}

const achievement=
ACHIEVEMENTS.find(
item=>item.id===id
);

if(!achievement){
return;
}

unlocked.add(id);

history.unshift({
id,
title:achievement.title,
reward:achievement.reward,
time:Date.now()
});

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
asset.balance+
achievement.reward
);

}

}

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"success",
title:"Achievement Unlocked",
message:achievement.title
});

}

emit();

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:login-success",
()=>unlock(
"first_login"
)
);

window.addEventListener(
"bx:swap-complete",
()=>unlock(
"first_swap"
)
);

window.addEventListener(
"bx:mining-claim",
()=>unlock(
"first_mining"
)
);

window.addEventListener(
"bx:airdrop-claimed",
()=>unlock(
"first_airdrop"
)
);

window.addEventListener(
"bx:casino-win",
()=>unlock(
"first_casino"
)
);

window.addEventListener(
"bx:vip-upgrade",
e=>{

const level=
e.detail?.name;

if(level==="Silver"){
unlock("vip_silver");
}

if(level==="Gold"){
unlock("vip_gold");
}

if(level==="Platinum"){
unlock("vip_platinum");
}

}
);

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const container=
document.getElementById(
"achievementGrid"
);

if(!container){
return;
}

container.innerHTML=
ACHIEVEMENTS.map(item=>`
<div class="achievement-card ${unlocked.has(item.id)?"unlocked":""}">
<div>${item.title}</div>
<div>${item.reward} BX</div>
</div>
`).join("");

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
total:state.total,
unlocked:state.unlocked,
progress:state.progress,
history:[...history],
achievements:ACHIEVEMENTS.map(item=>({
...item,
unlocked:unlocked.has(item.id)
}))
};

}

/* =========================================================
   INIT
========================================================= */

function init(){

load();

bindEvents();

emit();

console.log(
"🏅 BLOXIO ACHIEVEMENTS READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{
init,
unlock,
subscribe,
getState
};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXAchievements.init()
)
:BXAchievements.init();
