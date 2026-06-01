/* =========================================================
   FILE: public/bx/rain.js
   BLOXIO RAIN ENGINE 2026
========================================================= */

window.BXRain=(function(){

const listeners=new Set();

const history=[];

const state={
active:false,
amount:0,
participants:0,
countdown:0,
host:null,
updatedAt:0
};

let timer=null;

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
"RAIN_ENGINE",
error
);

}

});

render();

}

/* =========================================================
   CREATE
========================================================= */

function createRain(
amount,
seconds=60
){

state.active=true;

state.amount=
Number(amount)||0;

state.participants=0;

state.countdown=
seconds;

state.host=
window.AuthFeed
?.getState()
?.user
?.username
||"system";

history.unshift({
id:crypto.randomUUID(),
type:"created",
amount,
host:state.host,
time:Date.now()
});

startCountdown();

emit();

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"success",
title:"Rain Started",
message:`${amount} BX`
});

}

}

/* =========================================================
   JOIN
========================================================= */

function joinRain(){

if(
!state.active
){
return;
}

state.participants++;

emit();

}

/* =========================================================
   DISTRIBUTE
========================================================= */

function distribute(){

if(
!state.active
){
return;
}

const reward=
state.participants>0
?state.amount/state.participants
:0;

history.unshift({
id:crypto.randomUUID(),
type:"distributed",
reward,
participants:state.participants,
time:Date.now()
});

if(
window.WalletFeed &&
reward>0
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
type:"airdrop",
title:"Rain Claimed",
message:`+${reward.toFixed(4)} BX`
});

}

state.active=false;
state.amount=0;
state.participants=0;
state.countdown=0;

emit();

}

/* =========================================================
   TIMER
========================================================= */

function startCountdown(){

clearInterval(
timer
);

timer=
setInterval(()=>{

state.countdown--;

if(
state.countdown<=0
){

clearInterval(
timer
);

distribute();

}

emit();

},1000);

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const amount=
document.getElementById(
"rainAmount"
);

const users=
document.getElementById(
"rainParticipants"
);

const timerEl=
document.getElementById(
"rainCountdown"
);

if(amount){

amount.textContent=
`${state.amount} BX`;

}

if(users){

users.textContent=
state.participants;

}

if(timerEl){

timerEl.textContent=
`${state.countdown}s`;

}

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:vip-upgrade",
e=>{

if(
e.detail?.level>=4
){

createRain(
100,
60
);

}

}
);

}

/* =========================================================
   MOCK
========================================================= */

function mock(){

setInterval(()=>{

if(
!state.active
){

createRain(
Math.floor(
Math.random()*500
)+50,
60
);

}

},300000);

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

bindEvents();

mock();

emit();

console.log(
"🌧️ BLOXIO RAIN READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

createRain,

joinRain,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXRain.init()
)
:BXRain.init();
