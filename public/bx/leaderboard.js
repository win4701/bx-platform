/*=========================================================
FILE: public/bx/leaderboard.js
BLOXIO LEADERBOARD ENGINE V3
BX + XBC
=========================================================*/

window.BXLeaderboard=(function(){

const listeners=new Set();

const categories=[

"casino",
"mining",
"vip",
"referral",
"holders"

];

const boards={

casino:[],
mining:[],
vip:[],
referral:[],
holders:[]

};

const state={

category:"casino",

updatedAt:0,

totalPlayers:0

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
"LEADERBOARD_ENGINE",
error
);

}

});

render();

}

function uuid(){

return crypto.randomUUID
?crypto.randomUUID()
:Math.random().toString(36).slice(2);

}

/*=========================================================
PLAYER
=========================================================*/
function addPlayer({

category="casino",

user,

score=0,

vip="VIP0",

coin="BX"

}){

if(
!boards[category]
){
return false;
}

const board=
boards[category];

const existing=
board.find(
entry=>
entry.user===user
);

if(existing){

existing.score+=
Number(score);

}else{

board.push({

id:uuid(),

user,

score:
Number(score),

vip,

coin,

updatedAt:
Date.now()

});

}

sortBoard(
category
);

emit();

return true;

}

/*=========================================================
SORT
=========================================================*/
function sortBoard(category){

boards[category]
.sort(
(a,b)=>
b.score-a.score
);

boards[category]=
boards[category]
.slice(0,100);

state.totalPlayers=

Object.values(
boards
)
.reduce(
(sum,list)=>
sum+list.length,
0
);

}

/*=========================================================
TOP 3
=========================================================*/
function getTop3(category){

return(
boards[category]||[]
).slice(0,3);

}

/*=========================================================
CATEGORY
=========================================================*/
function setCategory(category){

if(
!categories.includes(
category
)
){
return;
}

state.category=
category;

emit();

}

/*=========================================================
RENDER
=========================================================*/
function render(){

const list=
document.getElementById(
"casinoLeaderboard"
);

const top3=
document.getElementById(
"casinoLeaderboardTop3"
);

if(list){

list.innerHTML=

boards[
state.category
]

.map(
(entry,index)=>`

<div class="leaderboard-row">

<div class="leaderboard-rank">
#${index+1}
</div>

<div class="leaderboard-user">

<span>
${entry.user}
</span>

<small>
${entry.vip}
</small>

</div>

<div class="leaderboard-score">

${entry.score}

${entry.coin}

</div>

</div>

`
)

.join("");

}

if(top3){

top3.innerHTML=

getTop3(
state.category
)

.map(
(entry,index)=>`

<div class="leaderboard-top-card">

<div>
#${index+1}
</div>

<div>
${entry.user}
</div>

<div>
${entry.score}
${entry.coin}
</div>

</div>

`
)

.join("");

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
"leaderboard:update",
payload=>{

addPlayer(
payload
);

}
);

}

/*=========================================================
EVENTS
=========================================================*/
function bindEvents(){

window.addEventListener(
"bx:casino-win",
event=>{

addPlayer({

category:"casino",

user:
event.detail?.user||
"guest",

score:
event.detail?.amount||
0,

coin:"BX"

});

}
);

window.addEventListener(
"bx:mining-claim",
event=>{

addPlayer({

category:"mining",

user:
event.detail?.user||
"guest",

score:
event.detail?.amount||
0,

coin:
event.detail?.coin||
"BX"

});

}
);

window.addEventListener(
"bx:vip-upgrade",
event=>{

addPlayer({

category:"vip",

user:
event.detail?.user||
"guest",

score:
event.detail?.level||
0,

coin:"VIP"

});

}
);

window.addEventListener(
"bx:referral-success",
event=>{

addPlayer({

category:"referral",

user:
event.detail?.user||
"guest",

score:1,

coin:"REF"

});

}
);

}

/*=========================================================
MOCK
=========================================================*/
function startMock(){

if(window.BXSocket)
return;

setInterval(()=>{

const category=

categories[
Math.floor(
Math.random()*
categories.length
)
];

addPlayer({

category,

user:
`player${Math.floor(Math.random()*9999)}`,

score:
Math.floor(
Math.random()*10000
),

vip:
`VIP${Math.floor(Math.random()*10)}`,

coin:
Math.random()>0.5
?"BX"
:"XBC"

});

},5000);

}

/*=========================================================
BUTTONS
=========================================================*/
function bindButtons(){

document
.querySelectorAll(
"[data-leaderboard]"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

setCategory(
btn.dataset.leaderboard
);

}
);

});

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

boards

};

}

/*=========================================================
INIT
=========================================================*/
function init(){

bindSocket();

bindEvents();

bindButtons();

startMock();

emit();

console.log(
"🏆 BLOXIO LEADERBOARD READY"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

addPlayer,

setCategory,

getTop3,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXLeaderboard.init()
)
:BXLeaderboard.init();
