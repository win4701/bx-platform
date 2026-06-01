/* =========================================================
   FILE: public/bx/provably-fair.js
   BLOXIO PROVABLY FAIR ENGINE 2026
========================================================= */

window.BXProvablyFair=(function(){

const listeners=new Set();

const history=[];

const state={
serverSeed:"",
serverSeedHash:"",
clientSeed:"",
nonce:0,
verified:0,
updatedAt:0
};

/* =========================================================
   SHA256
========================================================= */

async function sha256(text){

const buffer=
await crypto.subtle.digest(
"SHA-256",
new TextEncoder().encode(text)
);

return Array.from(
new Uint8Array(buffer)
)
.map(item=>
item.toString(16).padStart(2,"0")
)
.join("");

}

/* =========================================================
   SEEDS
========================================================= */

async function generateServerSeed(){

state.serverSeed=
crypto.randomUUID()+
crypto.randomUUID();

state.serverSeedHash=
await sha256(
state.serverSeed
);

emit();

}

function generateClientSeed(){

state.clientSeed=
Math.random()
.toString(36)
.substring(2,16);

emit();

}

/* =========================================================
   RANDOM
========================================================= */

async function random(){

const hash=
await sha256(
`${state.serverSeed}:${state.clientSeed}:${state.nonce}`
);

state.nonce++;

return parseInt(
hash.substring(0,13),
16
)/0xfffffffffffff;

}

/* =========================================================
   DICE
========================================================= */

async function dice(){

const value=
await random();

return Number(
(value*100)
.toFixed(2)
);

}

/* =========================================================
   CRASH
========================================================= */

async function crash(){

const value=
await random();

const multiplier=
Math.max(
1,
(100/(1-value*99))
);

return Number(
multiplier.toFixed(2)
);

}

/* =========================================================
   LIMBO
========================================================= */

async function limbo(){

const value=
await random();

return Number(
(
1+
value*100
).toFixed(2)
);

}

/* =========================================================
   MINES
========================================================= */

async function mines(mines=3){

const positions=[];

while(
positions.length<mines
){

const pos=
Math.floor(
Math.random()*25
);

if(
!positions.includes(pos)
){

positions.push(pos);

}

}

return positions;

}

/* =========================================================
   VERIFY
========================================================= */

async function verify(payload){

const hash=
await sha256(
`${payload.serverSeed}:${payload.clientSeed}:${payload.nonce}`
);

return hash===payload.hash;

}

/* =========================================================
   HISTORY
========================================================= */

function addHistory(record){

history.unshift({
id:crypto.randomUUID(),
time:Date.now(),
...record
});

if(
history.length>500
){

history.pop();

}

}

/* =========================================================
   EVENTS
========================================================= */

async function createDiceResult(){

const result=
await dice();

addHistory({
game:"Dice",
result
});

return result;

}

async function createCrashResult(){

const result=
await crash();

addHistory({
game:"Crash",
result
});

return result;

}

async function createLimboResult(){

const result=
await limbo();

addHistory({
game:"Limbo",
result
});

return result;

}

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
error
);

}

});

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

async function init(){

await generateServerSeed();

generateClientSeed();

emit();

console.log(
"🎲 BLOXIO PROVABLY FAIR READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

dice,

crash,

limbo,

mines,

verify,

generateServerSeed,

generateClientSeed,

createDiceResult,

createCrashResult,

createLimboResult,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXProvablyFair.init()
)
:BXProvablyFair.init();
