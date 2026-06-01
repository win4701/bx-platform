/* =========================================================
   FILE: public/bx/tournament.js
   BLOXIO TOURNAMENT ENGINE 2026
========================================================= */

window.BXTournament=(function(){

const listeners=new Set();

const joined=new Set();

const history=[];

const state={
active:0,
completed:0,
prizePool:0,
updatedAt:0,
tournaments:[]
};

const TOURNAMENTS=[

{
id:"crash_weekly",
name:"Crash Weekly",
game:"Crash",
entry:10,
prizePool:5000,
players:0,
endsAt:Date.now()+604800000
},

{
id:"dice_weekly",
name:"Dice Weekly",
game:"Dice",
entry:10,
prizePool:3000,
players:0,
endsAt:Date.now()+604800000
},

{
id:"limbo_weekly",
name:"Limbo Weekly",
game:"Limbo",
entry:10,
prizePool:3000,
players:0,
endsAt:Date.now()+604800000
},

{
id:"mines_weekly",
name:"Mines Weekly",
game:"Mines",
entry:10,
prizePool:3000,
players:0,
endsAt:Date.now()+604800000
}

];

/* =========================================================
   HELPERS
========================================================= */

function emit(){

state.active=
TOURNAMENTS.length;

state.prizePool=
TOURNAMENTS.reduce(
(total,item)=>
total+item.prizePool,
0
);

state.updatedAt=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
"TOURNAMENT",
error
);

}

});

render();

save();

}

function save(){

localStorage.setItem(
"bx_tournaments",
JSON.stringify(
Array.from(joined)
)
);

}

function load(){

const raw=
localStorage.getItem(
"bx_tournaments"
);

if(!raw){
return;
}

try{

JSON.parse(raw)
.forEach(id=>{

joined.add(id);

});

}catch(error){}

}

/* =========================================================
   JOIN
========================================================= */

function join(id){

const tournament=
TOURNAMENTS.find(
item=>item.id===id
);

if(!tournament){
return false;
}

if(
joined.has(id)
){
return true;
}

if(
window.WalletFeed
){

const asset=
WalletFeed.getAsset(
"BX"
);

if(
!asset||
asset.balance<
tournament.entry
){
return false;
}

WalletFeed.updateBalance(
"BX",
asset.balance-
tournament.entry
);

}

joined.add(id);

tournament.players++;

history.unshift({
type:"join",
id,
time:Date.now()
});

if(
window.NotificationFeed
){

NotificationFeed.add({
type:"success",
title:"Tournament Joined",
message:tournament.name
});

}

emit();

return true;

}

/* =========================================================
   LEADERBOARD
========================================================= */

function getLeaderboard(id){

return Array.from(
{length:20}
).map((_,index)=>({

rank:index+1,

user:`player${1000+index}`,

profit:Number(
(
Math.random()*5000
).toFixed(2)
)

}));

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const container=
document.getElementById(
"tournamentGrid"
);

if(!container){
return;
}

container.innerHTML=
TOURNAMENTS.map(item=>`
<div class="tournament-card">
<div>${item.name}</div>
<div>${item.game}</div>
<div>${item.prizePool} BX</div>
<div>${item.players}</div>
<button class="tournament-join" data-id="${item.id}">
${joined.has(item.id)?"Joined":"Join"}
</button>
</div>
`).join("");

bindButtons();

}

/* =========================================================
   BUTTONS
========================================================= */

function bindButtons(){

document
.querySelectorAll(
".tournament-join"
)
.forEach(btn=>{

btn.onclick=()=>{

join(
btn.dataset.id
);

};

});

}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents(){

window.addEventListener(
"bx:casino-win",
e=>{

history.unshift({
type:"win",
amount:e.detail?.amount||0,
time:Date.now()
});

}
);

}

/* =========================================================
   MOCK
========================================================= */

function mockPlayers(){

setInterval(()=>{

TOURNAMENTS.forEach(item=>{

item.players+=
Math.floor(
Math.random()*3
);

});

emit();

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
active:state.active,
completed:state.completed,
prizePool:state.prizePool,
tournaments:TOURNAMENTS,
joined:[...joined],
history:[...history]
};

}

/* =========================================================
   INIT
========================================================= */

function init(){

load();

bindEvents();

mockPlayers();

emit();

console.log(
"🏆 BLOXIO TOURNAMENT READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

join,

subscribe,

getState,

getLeaderboard

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXTournament.init()
)
:BXTournament.init();
