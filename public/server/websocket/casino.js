/*=========================================================
FILE: server/websocket/casino.js
BLOXIO CASINO SOCKET V3
BX + XBC
=========================================================*/

"use strict";

module.exports=function(io){

const onlinePlayers=new Map();
const activeGames=new Map();
const liveBets=[];
const liveWins=[];
const jackpots={
crash:0,
mines:0,
plinko:0,
wheel:0
};

/*=========================================================
HELPERS
=========================================================*/
function room(game){
return `casino:${game}`;
}

function broadcast(event,payload){
io.emit(event,payload);
}

function broadcastGame(game,event,payload){
io.to(room(game)).emit(event,payload);
}

function pushBet(bet){

liveBets.unshift(bet);

if(liveBets.length>200){
liveBets.length=200;
}

broadcast(
"casino:bet",
bet
);

}

function pushWin(win){

liveWins.unshift(win);

if(liveWins.length>200){
liveWins.length=200;
}

broadcast(
"casino:win",
win
);

}

function updateJackpot(game,amount){

if(
!jackpots[game]
&&jackpots[game]!==0
){
return;
}

jackpots[game]+=Number(amount)||0;

broadcast(
"casino:jackpot",
{
game,
amount:
jackpots[game]
}
);

}

function notification(
userId,
title,
message
){

io.to(
`casino:user:${userId}`
).emit(
"casino:notification",
{
title,
message,
time:Date.now()
}
);

}

/*=========================================================
CONNECTION
=========================================================*/
io.on(
"connection",
socket=>{

/*=========================================================
AUTH
=========================================================*/
socket.on(
"casino:auth",
payload=>{

const userId=
payload?.userId;

if(!userId)
return;

socket.userId=
userId;

socket.join(
`casino:user:${userId}`
);

onlinePlayers.set(
userId,
socket.id
);

socket.emit(
"casino:ready",
{
connected:true,
time:Date.now()
}
);

}
);

/*=========================================================
JOIN GAME
=========================================================*/
socket.on(
"casino:join",
payload=>{

const game=
payload?.game;

if(!game)
return;

socket.join(
room(game)
);

broadcastGame(
game,
"casino:playerJoin",
{
userId:
socket.userId,
game
}
);

}
);

/*=========================================================
LEAVE GAME
=========================================================*/
socket.on(
"casino:leave",
payload=>{

const game=
payload?.game;

if(!game)
return;

socket.leave(
room(game)
);

broadcastGame(
game,
"casino:playerLeave",
{
userId:
socket.userId,
game
}
);

}
);

/*=========================================================
BET
=========================================================*/
socket.on(
"casino:bet",
payload=>{

const bet={

id:
Date.now().toString(),

userId:
socket.userId,

game:
payload.game,

coin:
payload.coin,

amount:
Number(
payload.amount
),

time:
Date.now()

};

pushBet(bet);

updateJackpot(
payload.game,
bet.amount*0.01
);

}
);

/*=========================================================
WIN
=========================================================*/
socket.on(
"casino:win",
payload=>{

const win={

id:
Date.now().toString(),

userId:
socket.userId,

game:
payload.game,

coin:
payload.coin,

bet:
payload.bet,

profit:
payload.profit,

multiplier:
payload.multiplier,

time:
Date.now()

};

pushWin(win);

notification(
socket.userId,
"Casino Win",
`${win.profit} ${win.coin}`
);

}
);

/*=========================================================
CRASH
=========================================================*/
socket.on(
"casino:crash",
payload=>{

broadcast(
"casino:crash",
payload
);

}
);

/*=========================================================
MINES
=========================================================*/
socket.on(
"casino:mines",
payload=>{

broadcast(
"casino:mines",
payload
);

}
);

/*=========================================================
PLINKO
=========================================================*/
socket.on(
"casino:plinko",
payload=>{

broadcast(
"casino:plinko",
payload
);

}
);

/*=========================================================
WHEEL
=========================================================*/
socket.on(
"casino:wheel",
payload=>{

broadcast(
"casino:wheel",
payload
);

}
);

/*=========================================================
TOURNAMENT
=========================================================*/
socket.on(
"casino:tournament",
payload=>{

broadcast(
"casino:tournament",
payload
);

}
);

/*=========================================================
LEADERBOARD
=========================================================*/
socket.on(
"casino:leaderboard",
payload=>{

broadcast(
"casino:leaderboard",
payload
);

}
);

/*=========================================================
RAIN
=========================================================*/
socket.on(
"casino:rain",
payload=>{

broadcast(
"casino:rain",
payload
);

}
);

/*=========================================================
TIP
=========================================================*/
socket.on(
"casino:tip",
payload=>{

broadcast(
"casino:tip",
payload
);

}
);

/*=========================================================
CHAT
=========================================================*/
socket.on(
"casino:chat",
payload=>{

broadcast(
"casino:chat",
payload
);

}
);

/*=========================================================
BIG WIN
=========================================================*/
socket.on(
"casino:bigwin",
payload=>{

broadcast(
"casino:bigwin",
payload
);

}
);

/*=========================================================
LIVE FEED
=========================================================*/
socket.on(
"casino:feed",
payload=>{

broadcast(
"casino:feed",
payload
);

}
);

/*=========================================================
PROVABLY FAIR
=========================================================*/
socket.on(
"casino:fair",
payload=>{

broadcast(
"casino:fair",
payload
);

}
);

/*=========================================================
ACTIVE GAME
=========================================================*/
socket.on(
"casino:active",
payload=>{

activeGames.set(
payload.game,
payload
);

broadcast(
"casino:active",
payload
);

}
);

/*=========================================================
STATS
=========================================================*/
socket.on(
"casino:stats",
payload=>{

broadcast(
"casino:stats",
payload
);

}
);

/*=========================================================
PING
=========================================================*/
socket.on(
"casino:ping",
()=>{

socket.emit(
"casino:pong",
{
time:Date.now()
}
);

}
);

/*=========================================================
SYNC
=========================================================*/
socket.on(
"casino:sync",
()=>{

socket.emit(
"casino:sync",
{
online:
onlinePlayers.size,

jackpots,

bets:
liveBets.slice(0,50),

wins:
liveWins.slice(0,50),

games:
Array.from(
activeGames.values()
)

}
);

}
);

/*=========================================================
DISCONNECT
=========================================================*/
socket.on(
"disconnect",
()=>{

if(
socket.userId
){

onlinePlayers.delete(
socket.userId
);

broadcast(
"casino:offline",
{
userId:
socket.userId
}
);

}

}
);

});

/*=========================================================
PUBLIC API
=========================================================*/
return{

onlinePlayers,
activeGames,
liveBets,
liveWins,
jackpots,

broadcast,
broadcastGame,

pushBet,
pushWin,
updateJackpot

};

};
