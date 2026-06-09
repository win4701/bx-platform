/*=========================================================
FILE: public/bx/rain.js
BLOXIO RAIN ENGINE V2
BX + XBC
=========================================================*/
window.BXRain=(function(){

const listeners=new Set();
const history=[];

const SUPPORTED_COINS=[
"BX",
"XBC"
];

const state={

active:false,

id:null,

coin:"BX",

amount:0,

players:0,

maxPlayers:0,

claimed:0,

remaining:0,

rewardPerUser:0,

createdAt:0,

expiresAt:0,

ended:false,

history:[]

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

/*=========================================================
VALIDATION
=========================================================*/
function validCoin(coin){

return SUPPORTED_COINS
.includes(coin);

}

/*=========================================================
CREATE
=========================================================*/
function create({

coin="BX",

amount=100,

players=10,

duration=300

}={}){

if(
!validCoin(coin)
){
return false;
}

const reward=
amount/players;

state.active=true;

state.id=uuid();

state.coin=coin;

state.amount=
Number(amount);

state.players=0;

state.maxPlayers=
Number(players);

state.claimed=0;

state.remaining=
Number(amount);

state.rewardPerUser=
reward;

state.createdAt=
Date.now();

state.expiresAt=
Date.now()+
(duration*1000);

state.ended=false;

emit();

if(window.BXSocket){

BXSocket.emit(
"rain:create",
getState()
);

}

if(window.BXChat){

BXChat.createRain?.(
amount,
coin,
players
);

}

return true;

}

/*=========================================================
JOIN
=========================================================*/
function join(){

if(
!state.active||
state.ended
){
return false;
}

if(
state.players>=
state.maxPlayers
){
return false;
}

state.players++;

emit();

if(window.BXSocket){

BXSocket.emit(
"rain:join",
{
id:state.id,
players:state.players
}
);

}

return true;

}

/*=========================================================
CLAIM
=========================================================*/
function claim(){

if(
!state.active||
state.ended
){
return false;
}

if(
state.claimed>=
state.maxPlayers
){
return false;
}

const reward=
state.rewardPerUser;

state.claimed++;

state.remaining=
Math.max(
0,
state.remaining-reward
);

if(
window.BXWallet
){

BXWallet.credit?.(
state.coin,
reward
);

}

if(
window.Wallet
){

Wallet.credit?.(
state.coin,
reward
);

}

if(window.BXSocket){

BXSocket.emit(
"rain:claim",
{
id:state.id,
coin:state.coin,
amount:reward
}
);

}

if(
state.claimed>=
state.maxPlayers
){

finish();

}else{

emit();

}

return reward;

}

/*=========================================================
FINISH
=========================================================*/
function finish(){

state.active=false;

state.ended=true;

history.unshift({

id:state.id,

coin:state.coin,

amount:state.amount,

players:state.maxPlayers,

claimed:state.claimed,

createdAt:
state.createdAt,

endedAt:
Date.now()

});

if(
history.length>100
){

history.length=100;

}

state.history=
[...history];

emit();

if(window.BXSocket){

BXSocket.emit(
"rain:end",
{
id:state.id
}
);

}

}

/*=========================================================
TIMER
=========================================================*/
function timer(){

setInterval(()=>{

if(
!state.active||
state.ended
){
return;
}

if(
Date.now()>=
state.expiresAt
){

finish();

}

},1000);

}

/*=========================================================
RENDER
=========================================================*/
function render(){

const amount=
document.getElementById(
"rainAmount"
);

const coin=
document.getElementById(
"rainCoin"
);

const players=
document.getElementById(
"rainPlayers"
);

const remaining=
document.getElementById(
"rainRemaining"
);

const timerEl=
document.getElementById(
"rainTimer"
);

if(amount){

amount.textContent=
Number(
state.amount
).toFixed(2);

}

if(coin){

coin.textContent=
state.coin;

}

if(players){

players.textContent=
`${state.players}/${state.maxPlayers}`;

}

if(remaining){

remaining.textContent=
Number(
state.remaining
).toFixed(2);

}

if(
timerEl&&
state.active
){

const left=
Math.max(
0,
Math.floor(
(
state.expiresAt-
Date.now()
)/1000
)
);

timerEl.textContent=
`${left}s`;

}

}

/*=========================================================
SOCKET
=========================================================*/
function bindSocket(){

if(!window.BXSocket){
return;
}

BXSocket.on(
"rain:create",
payload=>{

Object.assign(
state,
payload
);

emit();

}
);

BXSocket.on(
"rain:join",
payload=>{

state.players=
payload.players;

emit();

}
);

BXSocket.on(
"rain:end",
()=>{

state.active=false;

state.ended=true;

emit();

}
);

}

/*=========================================================
BUTTONS
=========================================================*/
function bindButtons(){

document
.getElementById(
"joinRainBtn"
)
?.addEventListener(
"click",
join
);

document
.getElementById(
"claimRainBtn"
)
?.addEventListener(
"click",
claim
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

bindSocket();

bindButtons();

timer();

emit();

console.log(
"🌧️ BLOXIO RAIN READY"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

create,

join,

claim,

finish,

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
