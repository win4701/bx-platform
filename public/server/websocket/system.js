/*=========================================================
FILE: server/websocket/system.js
BLOXIO SYSTEM SOCKET V3
GLOBAL REALTIME ENGINE
=========================================================*/

"use strict";

module.exports=function(io){

const onlineUsers=new Map();

const metrics={

online:0,

wallets:0,

casinoPlayers:0,

miners:0,

activeSwaps:0,

activeGames:0,

activeTournaments:0,

totalDeposits:0,

totalWithdrawals:0,

totalTrades:0,

totalRewards:0,

updatedAt:Date.now()

};

const announcements=[];

const notifications=[];

/*=========================================================
HELPERS
=========================================================*/
function now(){
return Date.now();
}

function emitMetrics(){

metrics.online=
onlineUsers.size;

metrics.updatedAt=
now();

io.emit(
"system:metrics",
metrics
);

}

function broadcast(
event,
payload
){

io.emit(
event,
payload
);

}

function notify(
userId,
title,
message,
type="info"
){

const payload={

id:
crypto.randomUUID(),

title,

message,

type,

time:
now()

};

notifications.unshift(
payload
);

io.to(
`user:${userId}`
).emit(
"system:notification",
payload
);

}

function announcement(
title,
message
){

const payload={

id:
crypto.randomUUID(),

title,

message,

time:
now()

};

announcements.unshift(
payload
);

if(
announcements.length>100
){

announcements.length=100;

}

broadcast(
"system:announcement",
payload
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
"system:auth",
payload=>{

const userId=
payload?.userId;

if(!userId)
return;

socket.userId=
userId;

socket.join(
`user:${userId}`
);

onlineUsers.set(
userId,
{
socketId:
socket.id,
connectedAt:
now()
}
);

socket.emit(
"system:ready",
{
connected:true,
serverTime:
now()
}
);

emitMetrics();

}
);

/*=========================================================
HEARTBEAT
=========================================================*/
socket.on(
"system:ping",
()=>{

socket.emit(
"system:pong",
{
time:now()
}
);

}
);

/*=========================================================
SYNC
=========================================================*/
socket.on(
"system:sync",
()=>{

socket.emit(
"system:sync",
{

metrics,

announcements:
announcements.slice(
0,
20
),

notifications:
notifications.slice(
0,
20
)

}
);

}
);

/*=========================================================
STATUS
=========================================================*/
socket.on(
"system:status",
payload=>{

broadcast(
"system:status",
payload
);

}
);

/*=========================================================
ANNOUNCEMENTS
=========================================================*/
socket.on(
"system:announcement",
payload=>{

announcement(
payload.title,
payload.message
);

}
);

/*=========================================================
NOTIFICATIONS
=========================================================*/
socket.on(
"system:notify",
payload=>{

notify(

payload.userId,

payload.title,

payload.message,

payload.type

);

}
);

/*=========================================================
WALLET EVENTS
=========================================================*/
socket.on(
"wallet:deposit",
payload=>{

metrics.totalDeposits++;

broadcast(
"system:walletDeposit",
payload
);

emitMetrics();

}
);

socket.on(
"wallet:withdraw",
payload=>{

metrics.totalWithdrawals++;

broadcast(
"system:walletWithdraw",
payload
);

emitMetrics();

}
);

/*=========================================================
CASINO EVENTS
=========================================================*/
socket.on(
"casino:bet",
payload=>{

metrics.activeGames++;

broadcast(
"system:casinoBet",
payload
);

emitMetrics();

}
);

socket.on(
"casino:win",
payload=>{

broadcast(
"system:casinoWin",
payload
);

}
);

/*=========================================================
MINING EVENTS
=========================================================*/
socket.on(
"mining:start",
payload=>{

metrics.miners++;

broadcast(
"system:miningStart",
payload
);

emitMetrics();

}
);

socket.on(
"mining:stop",
payload=>{

metrics.miners=
Math.max(
0,
metrics.miners-1
);

broadcast(
"system:miningStop",
payload
);

emitMetrics();

}
);

socket.on(
"mining:claim",
payload=>{

broadcast(
"system:miningClaim",
payload
);

}
);

/*=========================================================
SWAP EVENTS
=========================================================*/
socket.on(
"swap:create",
payload=>{

metrics.activeSwaps++;

broadcast(
"system:swapCreate",
payload
);

emitMetrics();

}
);

socket.on(
"swap:complete",
payload=>{

metrics.totalTrades++;

metrics.activeSwaps=
Math.max(
0,
metrics.activeSwaps-1
);

broadcast(
"system:swapComplete",
payload
);

emitMetrics();

}
);

/*=========================================================
TOURNAMENT
=========================================================*/
socket.on(
"tournament:start",
payload=>{

metrics.activeTournaments++;

broadcast(
"system:tournamentStart",
payload
);

emitMetrics();

}
);

socket.on(
"tournament:end",
payload=>{

metrics.activeTournaments=
Math.max(
0,
metrics.activeTournaments-1
);

broadcast(
"system:tournamentEnd",
payload
);

emitMetrics();

}
);

/*=========================================================
REWARDS
=========================================================*/
socket.on(
"reward:claim",
payload=>{

metrics.totalRewards++;

broadcast(
"system:rewardClaim",
payload
);

emitMetrics();

}
);

/*=========================================================
DAO
=========================================================*/
socket.on(
"dao:vote",
payload=>{

broadcast(
"system:daoVote",
payload
);

}
);

socket.on(
"dao:proposal",
payload=>{

broadcast(
"system:daoProposal",
payload
);

}
);

/*=========================================================
MARKET
=========================================================*/
socket.on(
"market:open",
payload=>{

broadcast(
"system:marketOpen",
payload
);

}
);

socket.on(
"market:close",
payload=>{

broadcast(
"system:marketClose",
payload
);

}
);

/*=========================================================
SERVER MESSAGE
=========================================================*/
socket.on(
"system:broadcast",
payload=>{

broadcast(
"system:broadcast",
payload
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

onlineUsers.delete(
socket.userId
);

emitMetrics();

}

}
);

});

/*=========================================================
SYSTEM TIMER
=========================================================*/
setInterval(()=>{

emitMetrics();

},10000);

/*=========================================================
PUBLIC API
=========================================================*/
return{

onlineUsers,

metrics,

announcement,

notify,

broadcast,

emitMetrics

};

};
