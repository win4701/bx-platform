/* =========================================================
BLOXIO WS ENGINE V6
ENTERPRISE REALTIME LAYER
BROWSER FIRST
========================================================= */

"use strict";

(function(){

const CONFIG={

URL:

location.hostname==="localhost"

?

"ws://localhost:3000/ws"

:

(

location.protocol==="https:"

?"wss://"

:"ws://"

)

+

location.host

+

"/ws",

HEARTBEAT:25000,

QUEUE_LIMIT:300,

MAX_BACKOFF:30000,

BASE_BACKOFF:1500,

MAX_EVENTS:1000

};

const listeners=new Map();

const queue=[];

const recent=new Set();

let socket=null;

let connected=false;

let connecting=false;

let destroyed=false;

let heartbeat=null;

let reconnectTimer=null;

let reconnectDelay=

CONFIG.BASE_BACKOFF;

const metrics={

connectedAt:0,

sent:0,

received:0,

reconnects:0,

failed:0

};

const channels=new Set();

/* =====================================================
EVENT BUS
===================================================== */

function on(

event,
fn

){

if(

!listeners.has(event)

){

listeners.set(

event,

new Set()

);

}

listeners
.get(event)
.add(fn);

return()=>{

listeners
.get(event)
?.delete(fn);

};

}

function emit(

event,
data

){

listeners
.get(event)
?.forEach(fn=>{

try{

fn(data);

}catch(e){

console.warn(

"WS EVENT",

e

);

}

});

}

/* =====================================================
TOKEN
===================================================== */

function token(){

return localStorage
.getItem(

"token"

);

}

/* =====================================================
URL
===================================================== */

function url(){

const t=

token();

if(!t){

return CONFIG.URL;

}

return(

CONFIG.URL+

`?token=${t}`

);

}

/* =====================================================
CONNECT
===================================================== */

function connect(){

if(

connecting||

connected||

destroyed

){

return;

}

if(

!navigator.onLine

){

retry();

return;

}

connecting=true;

try{

socket=

new WebSocket(

url()

);

bind();

}catch(e){

connecting=false;

retry();

}

}

/* =====================================================
SOCKET
===================================================== */

function bind(){

socket.onopen=()=>{

connecting=false;

connected=true;

metrics.connectedAt=

Date.now();

reconnectDelay=

CONFIG.BASE_BACKOFF;

metrics.reconnects++;

emit(

"connected"

);

flush();

resubscribe();

heartbeatStart();

};

socket.onclose=()=>{

connected=false;

connecting=false;

heartbeatStop();

emit(

"disconnected"

);

retry();

};

socket.onerror=()=>{

metrics.failed++;

};

socket.onmessage=e=>{

metrics.received++;

let data;

try{

data=

JSON.parse(

e.data

);

}catch{

return;

}

if(

data.type==="pong"

){

return;

}

dedupe(

data

);

route(

data

);

};

}

/* =====================================================
RETRY
===================================================== */

function retry(){

if(

destroyed

||

reconnectTimer

){

return;

}

reconnectTimer=

setTimeout(()=>{

reconnectTimer=null;

connect();

},

reconnectDelay

);

reconnectDelay=

Math.min(

reconnectDelay*1.5,

CONFIG.MAX_BACKOFF

);

}

/* =====================================================
PING
===================================================== */

function heartbeatStart(){

heartbeatStop();

heartbeat=

setInterval(()=>{

send(

"ping"

);

},

CONFIG.HEARTBEAT

);

}

function heartbeatStop(){

clearInterval(

heartbeat

);

heartbeat=null;

}

/* =====================================================
QUEUE
===================================================== */

function send(

type,
payload={}

){

const msg=

JSON.stringify({

type,

...payload

});

if(

!connected

){

if(

queue.length>

CONFIG.QUEUE_LIMIT

){

queue.shift();

}

queue.push(

msg

);

return;

}

try{

socket.send(

msg

);

metrics.sent++;

}catch{}

}

function flush(){

while(

queue.length

&&

connected

){

socket.send(

queue.shift()

);

}

}

/* =====================================================
CHANNELS
===================================================== */

function subscribe(ch){

if(!ch)return;

channels.add(ch);

send(

"subscribe",

{

channel:ch

}

);

}

function unsubscribe(ch){

channels.delete(ch);

send(

"unsubscribe",

{

channel:ch

}

);

}

function resubscribe(){

channels.forEach(

subscribe

);

}

/* =====================================================
DEDUPE
===================================================== */

function dedupe(data){

const id=

JSON.stringify(data);

recent.add(id);

if(

recent.size>

CONFIG.MAX_EVENTS

){

recent.clear();

}

}

/* =====================================================
ROUTER
===================================================== */

function route(data){

if(

!data?.type

){

return;

}

emit(

data.type,

data

);

switch(data.type){

case"wallet_update":

window.API
?.syncWallet?.();

window.STATE
?.set(

"wallet.live",

data

);

break;

case"market_price":

window.STATE
?.set(

"market.live",

data

);

break;

case"mining_reward":

window.API
?.syncMining?.();

break;

case"airdrop":

window.API
?.syncAirdrop?.();

break;

case"notification":

notify(data);

break;

}

}

/* =====================================================
NOTIFY
===================================================== */

function notify(data){

document.dispatchEvent(

new CustomEvent(

"bloxio:notify",

{

detail:data

}

)

);

}

/* =====================================================
ONLINE
===================================================== */

window.addEventListener(

"online",

connect

);

window.addEventListener(

"offline",

()=>{

disconnect();

}

);

/* =====================================================
VISIBILITY
===================================================== */

document.addEventListener(

"visibilitychange",

()=>{

if(

document.hidden

){

heartbeatStop();

}else{

if(

connected

){

heartbeatStart();

}else{

connect();

}

}

}

);

/* =====================================================
CLOSE
===================================================== */

function disconnect(){

heartbeatStop();

socket?.close();

connected=false;

connecting=false;

}

/* =====================================================
DESTROY
===================================================== */

function destroy(){

destroyed=true;

disconnect();

listeners.clear();

queue.length=0;

}

/* =====================================================
AUTO
===================================================== */

connect();

/* =====================================================
EXPORT
===================================================== */

window.WS={

connect,

disconnect,

destroy,

send,

on,

emit,

subscribe,

unsubscribe,

metrics,

get connected(){

return connected;

},

get channels(){

return[

...channels

];

}

};

})();
