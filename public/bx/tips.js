/* =========================================================
   FILE: public/bx/tips.js
   BLOXIO TIPS ENGINE 2026
========================================================= */

window.BXTips=(function(){

const listeners=new Set();

const history=[];

const state={
sent:0,
received:0,
volume:0,
updatedAt:0
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
"TIPS_ENGINE",
error
);

}

});

render();

}

/* =========================================================
   SEND TIP
========================================================= */

function sendTip(
user,
amount,
asset="BX"
){

amount=
Number(amount)||0;

if(
amount<=0
){
return false;
}

if(
!window.WalletFeed
){
return false;
}

const wallet=
WalletFeed.getAsset(
asset
);

if(
!wallet||
wallet.balance<amount
){
return false;
}

WalletFeed.updateBalance(
asset,
wallet.balance-amount
);

history.unshift({
id:crypto.randomUUID(),
type:"sent",
user,
asset,
amount,
time:Date.now()
});

state.sent++;

state.volume+=amount;

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"success",
title:"Tip Sent",
message:`${amount} ${asset} → ${user}`
});

}

window.dispatchEvent(
new CustomEvent(
"bx:tip-sent",
{
detail:{
user,
asset,
amount
}
}
)
);

emit();

return true;

}

/* =========================================================
   RECEIVE TIP
========================================================= */

function receiveTip(
user,
amount,
asset="BX"
){

amount=
Number(amount)||0;

const wallet=
WalletFeed.getAsset(
asset
);

if(wallet){

WalletFeed.updateBalance(
asset,
wallet.balance+amount
);

}

history.unshift({
id:crypto.randomUUID(),
type:"received",
user,
asset,
amount,
time:Date.now()
});

state.received++;

state.volume+=amount;

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"success",
title:"Tip Received",
message:`${amount} ${asset} from ${user}`
});

}

window.dispatchEvent(
new CustomEvent(
"bx:tip-received",
{
detail:{
user,
asset,
amount
}
}
)
);

emit();

}

/* =========================================================
   CHAT INTEGRATION
========================================================= */

function tipFromChat(){

const input=
document.getElementById(
"tipAmount"
);

const user=
document.getElementById(
"tipUser"
);

const button=
document.getElementById(
"tipSendBtn"
);

button?.addEventListener(
"click",
()=>{

sendTip(
user.value,
input.value,
"BX"
);

}
);

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const sent=
document.getElementById(
"tipsSent"
);

const received=
document.getElementById(
"tipsReceived"
);

const volume=
document.getElementById(
"tipsVolume"
);

if(sent){

sent.textContent=
state.sent;

}

if(received){

received.textContent=
state.received;

}

if(volume){

volume.textContent=
`${state.volume.toFixed(2)} BX`;

}

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

BXSocket.on(
"tip:receive",
payload=>{

receiveTip(
payload.user,
payload.amount,
payload.asset
);

}
);

}

/* =========================================================
   MOCK
========================================================= */

function mock(){

setInterval(()=>{

receiveTip(
`player${Math.floor(Math.random()*9999)}`,
Number(
(
Math.random()*10
).toFixed(2)
),
"BX"
);

},120000);

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

bindSocket();

tipFromChat();

mock();

emit();

console.log(
"💸 BLOXIO TIPS READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

sendTip,

receiveTip,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXTips.init()
)
:BXTips.init();
