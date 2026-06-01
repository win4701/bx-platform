/* =========================================================
   FILE: public/bx/leaderboard.js
   BLOXIO LEADERBOARD ENGINE 2026
========================================================= */

window.BXLeaderboard=(function(){

const listeners=new Set();

const state={
period:"weekly",
updatedAt:0,
players:[]
};

function emit(){

state.updatedAt=Date.now();

listeners.forEach(callback=>{

try{

callback(getState());

}catch(error){

console.error(
"LEADERBOARD",
error
);

}

});

render();

}

function getState(){

return{
...state,
players:[...state.players]
};

}

function addPlayer(payload={}){

const index=
state.players.findIndex(
item=>item.user===payload.user
);

if(index===-1){

state.players.push({
user:payload.user,
profit:Number(payload.profit||0),
wager:Number(payload.wager||0),
wins:Number(payload.wins||0),
vip:payload.vip||"Bronze"
});

}else{

state.players[index].profit+=Number(payload.profit||0);
state.players[index].wager+=Number(payload.wager||0);
state.players[index].wins+=Number(payload.wins||0);

}

sort();

emit();

}

function sort(){

state.players.sort(
(a,b)=>b.profit-a.profit
);

state.players=
state.players.slice(
0,
100
);

}

function render(){

const container=
document.getElementById(
"leaderboardGrid"
);

if(!container){
return;
}

container.innerHTML=
state.players.map(
(player,index)=>`
<div class="leaderboard-row">
<div>#${index+1}</div>
<div>${player.user}</div>
<div>${player.vip}</div>
<div>${player.wins}</div>
<div>${player.profit.toFixed(2)}</div>
</div>
`
).join("");

}

function bindEvents(){

window.addEventListener(
"bx:casino-win",
e=>{

addPlayer({
user:e.detail.user||"player",
profit:Number(e.detail.amount||0),
wins:1
});

}
);

window.addEventListener(
"bx:vip-upgrade",
()=>{

emit();

}
);

}

function subscribe(callback){

listeners.add(callback);

callback(getState());

return()=>{

listeners.delete(callback);

};

}

function setPeriod(period){

state.period=period;

emit();

}

function mock(){

setInterval(()=>{

addPlayer({
user:`player${Math.floor(Math.random()*9999)}`,
profit:Number((Math.random()*5000).toFixed(2)),
wins:Math.floor(Math.random()*100),
vip:["Bronze","Silver","Gold","Platinum","Diamond"][Math.floor(Math.random()*5)]
});

},10000);

}

function init(){

bindEvents();

mock();

emit();

console.log(
"🏆 BLOXIO LEADERBOARD READY"
);

}

return{
init,
subscribe,
getState,
setPeriod,
addPlayer
};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXLeaderboard.init()
)
:BXLeaderboard.init();
