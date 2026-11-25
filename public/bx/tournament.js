/*=========================================================
FILE: public/bx/tournament.js
BLOXIO TOURNAMENT ENGINE V2
BX + XBC
=========================================================*/
window.BXTournament=(function(){

const listeners=new Set();
const tournaments=[];

const TYPES=[
"casino",
"mining",
"referral",
"vip"
];

const COINS=[
"BX",
"XBC"
];

const state={
active:null,
total:0,
updatedAt:0
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

state.updatedAt=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
"TOURNAMENT_ENGINE",
error
);

}

});

render();

}

/*=========================================================
CREATE
=========================================================*/
function create({

name,

type="casino",

coin="BX",

prize=1000,

maxPlayers=100,

duration=86400

}){

if(
!TYPES.includes(type)
){
return false;
}

if(
!COINS.includes(coin)
){
return false;
}

const tournament={

id:uuid(),

name:
name||
`${coin} Tournament`,

type,

coin,

prize:
Number(prize),

players:0,

maxPlayers,

status:"active",

createdAt:
Date.now(),

endsAt:
Date.now()+
(duration*1000),

leaderboard:[],

winner:null

};

tournaments.unshift(
tournament
);

state.total=
tournaments.length;

if(
!state.active
){

state.active=
tournament.id;

}

emit();

if(window.BXSocket){

BXSocket.emit(
"tournament:create",
tournament
);

}

if(window.BXChat){

BXChat.systemMessage?.(
`${tournament.name} started`,
"global",
"TOURNAMENT"
);

}

return tournament;

}

/*=========================================================
JOIN
=========================================================*/
function join(id,user){

const tournament=
find(id);

if(!tournament){
return false;
}

if(
tournament.status!=="active"
){
return false;
}

if(
tournament.players>=
tournament.maxPlayers
){
return false;
}

tournament.players++;

emit();

if(window.BXSocket){

BXSocket.emit(
"tournament:join",
{
id,
user
}
);

}

return true;

}

/*=========================================================
SCORE
=========================================================*/
function addScore(
id,
user,
score
){

const tournament=
find(id);

if(!tournament){
return false;
}

const existing=

tournament.leaderboard
.find(
entry=>
entry.user===user
);

if(existing){

existing.score+=
Number(score);

}else{

tournament.leaderboard.push({

user,

score:
Number(score)

});

}

tournament.leaderboard.sort(
(a,b)=>
b.score-a.score
);

tournament.leaderboard=
tournament.leaderboard
.slice(0,100);

emit();

return true;

}

/*=========================================================
FINISH
=========================================================*/
function finish(id){

const tournament=
find(id);

if(!tournament){
return false;
}

if(
tournament.status===
"ended"
){
return false;
}

tournament.status=
"ended";

tournament.winner=
tournament.leaderboard[0]
||null;

emit();

if(window.BXSocket){

BXSocket.emit(
"tournament:end",
{
id,
winner:
tournament.winner
}
);

}

if(
window.BXChat&&
tournament.winner
){

BXChat.systemMessage?.(

`${tournament.winner.user}
won
${tournament.prize}
${tournament.coin}`,

"global",

"TOURNAMENT"

);

}

return true;

}

/*=========================================================
AUTO END
=========================================================*/
function timer(){

setInterval(()=>{

const now=
Date.now();

tournaments.forEach(
tournament=>{

if(
tournament.status!==
"active"
){
return;
}

if(
now>=
tournament.endsAt
){

finish(
tournament.id
);

}

}
);

},1000);

}

/*=========================================================
FIND
=========================================================*/
function find(id){

return tournaments.find(
item=>
item.id===id
);

}

/*=========================================================
RENDER
=========================================================*/
function render(){

const list=
document.getElementById(
"casinoTournamentList"
);

if(!list){
return;
}

list.innerHTML=
tournaments
.slice(0,20)
.map(item=>{

const left=
Math.max(
0,
Math.floor(
(
item.endsAt-
Date.now()
)/1000
)
);

return`

<div class="tournament-card">

<div class="tournament-head">

<strong>
${item.name}
</strong>

<span>
${item.coin}
</span>

</div>

<div class="tournament-body">

<div>
Type:
${item.type}
</div>

<div>
Prize:
${item.prize}
${item.coin}
</div>

<div>
Players:
${item.players}/
${item.maxPlayers}
</div>

<div>
Time:
${left}s
</div>

<div>
Status:
${item.status}
</div>

</div>

</div>

`;

})
.join("");

}

/*=========================================================
SOCKET
=========================================================*/
function bindSocket(){

if(!window.BXSocket){
return;
}

BXSocket.on(
"tournament:create",
payload=>{

if(
find(payload.id)
){
return;
}

tournaments.unshift(
payload
);

emit();

}
);

BXSocket.on(
"tournament:join",
payload=>{

const tournament=
find(payload.id);

if(!tournament){
return;
}

tournament.players++;

emit();

}
);

BXSocket.on(
"tournament:end",
payload=>{

const tournament=
find(payload.id);

if(!tournament){
return;
}

tournament.status=
"ended";

tournament.winner=
payload.winner;

emit();

}
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

tournaments:
[...tournaments]

};

}

/*=========================================================
INIT
=========================================================*/
function init(){

bindSocket();

timer();

emit();

console.log(
"🏆 BLOXIO TOURNAMENT READY"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

create,

join,

addScore,

finish,

find,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXTournament.init()
)
:BXTournament.init();
