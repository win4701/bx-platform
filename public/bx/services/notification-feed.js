/* =========================================================
   FILE: public/bx/services/notification-feed.js
   BLOXIO NOTIFICATION CENTER 2026
========================================================= */

export const NotificationFeed=(function(){

const listeners=new Set();

const notifications=[];

const MAX_NOTIFICATIONS=500;

const state={
unread:0,
total:0,
sound:true,
desktop:false,
toast:true,
updatedAt:0
};

/* =========================================================
   TYPES
========================================================= */

const TYPES={
SYSTEM:"system",
SUCCESS:"success",
INFO:"info",
WARNING:"warning",
ERROR:"error",
MARKET:"market",
WALLET:"wallet",
SWAP:"swap",
CASINO:"casino",
MINING:"mining",
AIRDROP:"airdrop",
AUTH:"auth",
VIP:"vip"
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
"NOTIFICATION_FEED",
error
);

}

});

updateBadge();

}

function createNotification(
payload={}
){

return{
id:crypto.randomUUID(),
title:payload.title||"Notification",
message:payload.message||"",
type:payload.type||TYPES.INFO,
read:false,
createdAt:Date.now()
};

}

function add(payload){

const notification=
createNotification(
payload
);

notifications.unshift(
notification
);

if(
notifications.length>
MAX_NOTIFICATIONS
){

notifications.pop();

}

state.unread++;

state.total=
notifications.length;

if(state.toast){

showToast(
notification
);

}

if(state.sound){

playSound();

}

if(state.desktop){

showDesktop(
notification
);

}

emit();

return notification;

}

/* =========================================================
   TOAST
========================================================= */

function showToast(notification){

const container=
document.getElementById(
"notificationContainer"
);

if(!container){
return;
}

const toast=
document.createElement(
"div"
);

toast.className=
`notification-toast ${notification.type}`;

toast.innerHTML=
`<div class="notification-title">${notification.title}</div><div class="notification-message">${notification.message}</div>`;

container.prepend(
toast
);

setTimeout(()=>{

toast.remove();

},5000);

}

/* =========================================================
   SOUND
========================================================= */

function playSound(){

try{

const audio=
new Audio(
"/assets/audio/notify.mp3"
);

audio.volume=0.4;

audio.play();

}catch(error){}

}

/* =========================================================
   DESKTOP
========================================================= */

function showDesktop(notification){

if(
!("Notification" in window)
){
return;
}

if(
Notification.permission!==
"granted"
){
return;
}

new Notification(
notification.title,
{
body:notification.message,
icon:"/assets/images/logo.webp"
}
);

}

/* =========================================================
   BADGE
========================================================= */

function updateBadge(){

const badge=
document.getElementById(
"notificationBadge"
);

if(!badge){
return;
}

badge.textContent=
state.unread;

badge.style.display=
state.unread>0
?"flex"
:"none";

}

/* =========================================================
   READ
========================================================= */

function markRead(id){

const item=
notifications.find(
n=>n.id===id
);

if(
!item||
item.read
){
return;
}

item.read=true;

state.unread=
Math.max(
0,
state.unread-1
);

emit();

}

function markAllRead(){

notifications.forEach(
item=>{

item.read=true;

}
);

state.unread=0;

emit();

}

/* =========================================================
   REMOVE
========================================================= */

function remove(id){

const index=
notifications.findIndex(
n=>n.id===id
);

if(index===-1){
return;
}

notifications.splice(
index,
1
);

state.total=
notifications.length;

emit();

}

function clear(){

notifications.length=0;

state.total=0;

state.unread=0;

emit();

}

/* =========================================================
   SETTINGS
========================================================= */

function enableSound(){

state.sound=true;

emit();

}

function disableSound(){

state.sound=false;

emit();

}

function enableToast(){

state.toast=true;

emit();

}

function disableToast(){

state.toast=false;

emit();

}

async function enableDesktop(){

if(
!("Notification" in window)
){
return;
}

const permission=
await Notification.requestPermission();

state.desktop=
permission==="granted";

emit();

}

/* =========================================================
   SOCKET EVENTS
========================================================= */

function bindSocket(){

if(
!window.BXSocket
){
return;
}

window.BXSocket.on(
"system:online",
payload=>{

add({
type:TYPES.SYSTEM,
title:"System Online",
message:`${payload.count} users online`
});

}
);

}

/* =========================================================
   WALLET EVENTS
========================================================= */

function bindWalletEvents(){

window.addEventListener(
"bx:deposit-success",
e=>{

add({
type:TYPES.WALLET,
title:"Deposit Completed",
message:`${e.detail.amount} ${e.detail.asset}`
});

}
);

window.addEventListener(
"bx:withdraw-success",
e=>{

add({
type:TYPES.WALLET,
title:"Withdraw Submitted",
message:`${e.detail.amount} ${e.detail.asset}`
});

}
);

}

/* =========================================================
   SWAP EVENTS
========================================================= */

function bindSwapEvents(){

window.addEventListener(
"bx:swap-complete",
e=>{

add({
type:TYPES.SWAP,
title:"Swap Completed",
message:`${e.detail.from} → ${e.detail.to}`
});

}
);

}

/* =========================================================
   MARKET EVENTS
========================================================= */

function bindMarketEvents(){

window.addEventListener(
"bx:market-live",
()=>{

});

}

/* =========================================================
   CASINO EVENTS
========================================================= */

function bindCasinoEvents(){

window.addEventListener(
"bx:casino-win",
e=>{

add({
type:TYPES.CASINO,
title:"Casino Win",
message:`Won ${e.detail.amount} BX`
});

}
);

}

/* =========================================================
   MINING EVENTS
========================================================= */

function bindMiningEvents(){

window.addEventListener(
"bx:mining-claim",
e=>{

add({
type:TYPES.MINING,
title:"Mining Reward",
message:`Claimed ${e.detail.amount}`
});

}
);

}

/* =========================================================
   AIRDROP EVENTS
========================================================= */

function bindAirdropEvents(){

window.addEventListener(
"bx:airdrop-claimed",
()=>{

add({
type:TYPES.AIRDROP,
title:"Airdrop Claimed",
message:"Rewards added to wallet"
});

}
);

}

/* =========================================================
   AUTH EVENTS
========================================================= */

function bindAuthEvents(){

window.addEventListener(
"bx:login-success",
e=>{

add({
type:TYPES.AUTH,
title:"Login Success",
message:e.detail.username
});

}
);

window.addEventListener(
"bx:register-success",
e=>{

add({
type:TYPES.AUTH,
title:"Account Created",
message:e.detail.username
});

}
);

window.addEventListener(
"bx:logout",
()=>{

add({
type:TYPES.AUTH,
title:"Logged Out",
message:"Session closed"
});

}
);

}

/* =========================================================
   VIP EVENTS
========================================================= */

function vipUpgrade(level){

add({
type:TYPES.VIP,
title:"VIP Upgrade",
message:`VIP ${level}`
});

}

/* =========================================================
   MOCK
========================================================= */

function startMockFeed(){

setInterval(()=>{

const events=[
{
title:"Market Update",
message:"BX Volume Increased",
type:TYPES.MARKET
},
{
title:"Mining Active",
message:"Hashrate Updated",
type:TYPES.MINING
},
{
title:"Casino Activity",
message:"New Big Win",
type:TYPES.CASINO
}
];

const item=
events[
Math.floor(
Math.random()*events.length
)
];

add(item);

},30000);

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
notifications:[
...notifications
]
};

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindSocket();

bindWalletEvents();

bindSwapEvents();

bindMarketEvents();

bindCasinoEvents();

bindMiningEvents();

bindAirdropEvents();

bindAuthEvents();

startMockFeed();

console.log(
"🔔 BLOXIO NOTIFICATION READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{
init,
add,
remove,
clear,
markRead,
markAllRead,
enableSound,
disableSound,
enableToast,
disableToast,
enableDesktop,
vipUpgrade,
subscribe,
getState,
TYPES
};

})();

window.NotificationFeed=
NotificationFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>NotificationFeed.init()
)
:NotificationFeed.init();
