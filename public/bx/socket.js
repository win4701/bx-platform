/* =========================================================
   FILE: public/bx/socket.js
   BLOXIO ENTERPRISE SOCKET CLIENT 2026
   Socket.IO Client Gateway
========================================================= */

window.BXSocket=(function(){

let socket=null;

let connected=false;

let reconnectCount=0;

const listeners=new Map();

/* =========================================================
   CONNECT
========================================================= */

function connect(){

if(socket){
return socket;
}

socket=io({
transports:["websocket"],
reconnection:true,
reconnectionAttempts:Infinity,
reconnectionDelay:1000,
reconnectionDelayMax:10000,
timeout:20000
});

registerCoreEvents();

return socket;

}

/* =========================================================
   CORE EVENTS
========================================================= */

function registerCoreEvents(){

socket.on(
"connect",
()=>{
connected=true;
reconnectCount=0;
updateConnectionStatus(true);
console.log(
"🟢 BLOXIO SOCKET CONNECTED",
socket.id
);
}
);

socket.on(
"disconnect",
reason=>{
connected=false;
updateConnectionStatus(false);
console.log(
"🔴 BLOXIO SOCKET DISCONNECTED",
reason
);
}
);

socket.on(
"connect_error",
error=>{
console.error(
"SOCKET ERROR",
error
);
}
);

socket.io.on(
"reconnect",
attempt=>{
reconnectCount=attempt;
connected=true;
updateConnectionStatus(true);
}
);

socket.io.on(
"reconnect_attempt",
attempt=>{
reconnectCount=attempt;
}
);

socket.io.on(
"reconnect_error",
error=>{
console.error(
"RECONNECT ERROR",
error
);
}
);

socket.io.on(
"reconnect_failed",
()=>{
console.error(
"RECONNECT FAILED"
);
}
);

}

/* =========================================================
   STATUS
========================================================= */

function updateConnectionStatus(status){

const walletStatus=
document.getElementById(
"walletStatus"
);

if(walletStatus){

walletStatus.textContent=
status
?"LIVE"
:"OFFLINE";

walletStatus.classList.toggle(
"online",
status
);

walletStatus.classList.toggle(
"offline",
!status
);

}

const liveDots=
document.querySelectorAll(
".live-dot"
);

liveDots.forEach(dot=>{

dot.classList.toggle(
"online",
status
);

});

}

/* =========================================================
   EMIT
========================================================= */

function emit(
event,
payload={}
){

if(!socket){
return;
}

socket.emit(
event,
payload
);

}

/* =========================================================
   ON
========================================================= */

function on(
event,
callback
){

if(!socket){
return;
}

socket.on(
event,
callback
);

listeners.set(
event,
callback
);

}

/* =========================================================
   OFF
========================================================= */

function off(event){

if(!socket){
return;
}

const listener=
listeners.get(
event
);

if(listener){

socket.off(
event,
listener
);

listeners.delete(
event
);

}

}

/* =========================================================
   MARKET
========================================================= */

function subscribeMarket(pair){

emit(
"market:subscribe",
pair
);

}

function marketFeed(callback){

on(
"market:update",
callback
);

}

/* =========================================================
   CASINO
========================================================= */

function subscribeCasino(){

emit(
"casino:subscribe"
);

}

function casinoFeed(callback){

on(
"casino:bet",
callback
);

}

/* =========================================================
   WALLET
========================================================= */

function subscribeWallet(userId){

emit(
"wallet:subscribe",
userId
);

}

function walletFeed(callback){

on(
"wallet:update",
callback
);

}

/* =========================================================
   MINING
========================================================= */

function miningFeed(callback){

on(
"mining:update",
callback
);

}

/* =========================================================
   AIRDROP
========================================================= */

function airdropFeed(callback){

on(
"airdrop:update",
callback
);

}

/* =========================================================
   SYSTEM
========================================================= */

function systemFeed(callback){

on(
"system:online",
callback
);

}

/* =========================================================
   PING
========================================================= */

function ping(){

emit(
"ping"
);

}

/* =========================================================
   GETTERS
========================================================= */

function getSocket(){

return socket;

}

function isConnected(){

return connected;

}

function getSocketId(){

return socket
?socket.id
:null;

}

/* =========================================================
   DESTROY
========================================================= */

function destroy(){

if(!socket){
return;
}

listeners.forEach(
(listener,event)=>{
socket.off(
event,
listener
);
}
);

listeners.clear();

socket.disconnect();

socket=null;

connected=false;

}

/* =========================================================
   AUTO START
========================================================= */

connect();

/* =========================================================
   PUBLIC API
========================================================= */

return{
connect,
destroy,
emit,
on,
off,
ping,
getSocket,
getSocketId,
isConnected,
subscribeMarket,
marketFeed,
subscribeCasino,
casinoFeed,
subscribeWallet,
walletFeed,
miningFeed,
airdropFeed,
systemFeed
};

})();

/* =========================================================
   AUTO CHANNELS
========================================================= */

document.addEventListener(
"DOMContentLoaded",
()=>{

BXSocket.systemFeed(
payload=>{

console.log(
"SYSTEM ONLINE",
payload
);

}
);

BXSocket.marketFeed(
payload=>{

if(
window.MARKET &&
typeof window.MARKET.updateStats==="function"
){

window.MARKET.updateStats(
payload
);

}

}
);

}
);
