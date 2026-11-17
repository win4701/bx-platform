/* =========================================================
   FILE: public/bx/services/casino-feed.js
   BLOXIO CASINO FEED ENGINE 2026
   Depends:
   - public/bx/socket.js
========================================================= */

export const CasinoFeed=(function(){

let connected=false;

let casinoState={
online:0,
volume:0,
wins:0,
bets:0,
lastGame:null,
lastBet:null,
leaderboard:[],
recentBets:[],
recentWins:[]
};

const listeners=new Set();

/* =========================================================
   GAMES
========================================================= */

const GAMES=[
"Crash",
"Dice",
"Limbo",
"Plinko",
"Mines",
"Coinflip",
"Blackjack",
"HiLo",
"Slots",
"FruitParty",
"BananaFarm",
"AirBoss"
];

/* =========================================================
   HELPERS
========================================================= */

function emit(){

listeners.forEach(callback=>{

try{

callback(
{
...casinoState
}
);

}catch(error){

console.error(
"CASINO_FEED_ERROR",
error
);

}

});

}

function addRecentBet(payload){

casinoState.recentBets.unshift(
payload
);

if(
casinoState.recentBets.length>100
){

casinoState.recentBets.pop();

}

}

function addRecentWin(payload){

casinoState.recentWins.unshift(
payload
);

if(
casinoState.recentWins.length>100
){

casinoState.recentWins.pop();

}

}

function updateLeaderboard(payload){

const index=
casinoState.leaderboard.findIndex(
row=>row.user===payload.user
);

if(index===-1){

casinoState.leaderboard.push({
user:payload.user,
profit:payload.profit
});

}else{

casinoState.leaderboard[index].profit+=
payload.profit;

}

casinoState.leaderboard.sort(
(a,b)=>b.profit-a.profit
);

casinoState.leaderboard=
casinoState.leaderboard.slice(
0,
20
);

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

window.BXSocket.subscribeCasino();

window.BXSocket.casinoFeed(
payload=>{

connected=true;

casinoState.bets++;

casinoState.volume+=
Number(
payload.bet||0
);

casinoState.lastGame=
payload.game;

casinoState.lastBet=
payload;

addRecentBet(
payload
);

if(
payload.profit>0
){

casinoState.wins++;

addRecentWin(
payload
);

updateLeaderboard(
payload
);

}

updateCasinoWidgets();

emit();

}
);

}

/* =========================================================
   CASINO WIDGETS
========================================================= */

function updateCasinoWidgets(){

const wallet=
document.getElementById(
"casinoWalletText"
);

const online=
document.getElementById(
"casinoOnlineText"
);

const volume=
document.getElementById(
"casinoVolumeText"
);

if(wallet){

wallet.textContent=
"BX";

}

if(online){

online.textContent=
casinoState.online
.toLocaleString();

}

if(volume){

volume.textContent=
casinoState.volume
.toLocaleString();

}

renderTicker();

}

/* =========================================================
   TICKER
========================================================= */

function renderTicker(){

const track=
document.getElementById(
"casinoTickerTrack"
);

if(!track){
return;
}

track.innerHTML=
casinoState.recentBets
.slice(0,20)
.map(row=>`
<div class="casino-ticker-item">
<span>${row.user}</span>
<span>${row.game}</span>
<span>${row.bet}</span>
<span>${row.profit}</span>
</div>
`)
.join("");

}

/* =========================================================
   GAME METRICS
========================================================= */

function getGameStats(game){

const rows=
casinoState.recentBets.filter(
item=>item.game===game
);

const wagers=
rows.reduce(
(total,row)=>
total+Number(row.bet||0),
0
);

return{
game,
players:rows.length,
wagers,
volume:wagers
};

}

/* =========================================================
   GRID DATA
========================================================= */

function getGames(){

return GAMES.map(game=>{

const stats=
getGameStats(
game
);

return{
name:game,
players:stats.players,
volume:stats.volume,
houseEdge:"1%",
rtp:"99%",
provablyFair:true
};

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
{
...casinoState
}
);

return()=>{

listeners.delete(
callback
);

};

}

/* =========================================================
   GETTERS
========================================================= */

function getState(){

return{
...casinoState
};

}

function getRecentBets(){

return[
...casinoState.recentBets
];

}

function getRecentWins(){

return[
...casinoState.recentWins
];

}

function getLeaderboard(){

return[
...casinoState.leaderboard
];

}

function isConnected(){

return connected;

}

/* =========================================================
   ONLINE COUNTER
========================================================= */

function startOnlineCounter(){

setInterval(()=>{

casinoState.online=
Math.max(
100,
casinoState.recentBets.length*3+
Math.floor(
Math.random()*500
)
);

emit();

},5000);

}

/* =========================================================
   MOCK FALLBACK
========================================================= */

function startMockMode(){

setInterval(()=>{

const payload={
user:`player${Math.floor(Math.random()*99999)}`,
game:GAMES[
Math.floor(
Math.random()*GAMES.length
)
],
bet:Number(
(
Math.random()*500
).toFixed(2)
),
profit:Number(
(
Math.random()*2000
).toFixed(2)
)
};

casinoState.bets++;

casinoState.volume+=
payload.bet;

addRecentBet(
payload
);

if(
payload.profit>0
){

casinoState.wins++;

addRecentWin(
payload
);

updateLeaderboard(
payload
);

}

emit();

},3000);

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindSocket();

startOnlineCounter();

if(
!window.BXSocket
){

startMockMode();

}

console.log(
"🎰 BLOXIO CASINO FEED READY"
);

}

/* =========================================================
   API
========================================================= */

return{
init,
subscribe,
getState,
getGames,
getRecentBets,
getRecentWins,
getLeaderboard,
isConnected
};

})();

window.CasinoFeed=
CasinoFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>CasinoFeed.init()
)
:CasinoFeed.init();
