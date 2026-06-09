/*=========================================================
FILE: server/websocket/mining.js
BLOXIO MINING SOCKET V3
BX | ETC | LTC | TRX | BNB | SOL | XRP | USDC | DOGE | TON
=========================================================*/

"use strict";

module.exports=function(io){

const onlineMiners=new Map();

const activeMiners=new Map();

const miningPools=new Map();

const supportedCoins=[

"BX",
"ETC",
"LTC",
"TRX",
"BNB",
"SOL",
"XRP",
"USDC",
"DOGE",
"TON"

];

/*=========================================================
POOLS
=========================================================*/
supportedCoins.forEach(coin=>{

miningPools.set(
coin,
{
coin,
miners:0,
hashrate:0,
rewards:0,
blocks:0
}
);

});

/*=========================================================
HELPERS
=========================================================*/
function room(coin){
return `mining:${coin}`;
}

function broadcast(event,payload){
io.emit(event,payload);
}

function broadcastCoin(
coin,
event,
payload
){

io.to(
room(coin)
).emit(
event,
payload
);

}

function notify(
userId,
title,
message
){

io.to(
`miner:${userId}`
).emit(
"mining:notification",
{
title,
message,
time:Date.now()
}
);

}

function updatePool(
coin,
hashrate=0,
reward=0
){

const pool=
miningPools.get(coin);

if(!pool)
return;

pool.hashrate+=
Number(hashrate)||0;

pool.rewards+=
Number(reward)||0;

broadcastCoin(
coin,
"mining:pool",
pool
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
"mining:auth",
payload=>{

const userId=
payload?.userId;

if(!userId)
return;

socket.userId=
userId;

socket.join(
`miner:${userId}`
);

onlineMiners.set(
userId,
socket.id
);

socket.emit(
"mining:ready",
{
connected:true,
time:Date.now()
}
);

}
);

/*=========================================================
JOIN COIN
=========================================================*/
socket.on(
"mining:join",
payload=>{

const coin=
payload?.coin;

if(
!supportedCoins.includes(
coin
)
){
return;
}

socket.join(
room(coin)
);

const pool=
miningPools.get(
coin
);

pool.miners++;

broadcastCoin(
coin,
"mining:join",
{
coin,
miners:
pool.miners
}
);

}
);

/*=========================================================
LEAVE COIN
=========================================================*/
socket.on(
"mining:leave",
payload=>{

const coin=
payload?.coin;

if(
!supportedCoins.includes(
coin
)
){
return;
}

socket.leave(
room(coin)
);

const pool=
miningPools.get(
coin
);

pool.miners=
Math.max(
0,
pool.miners-1
);

broadcastCoin(
coin,
"mining:leave",
{
coin,
miners:
pool.miners
}
);

}
);

/*=========================================================
START
=========================================================*/
socket.on(
"mining:start",
payload=>{

const miner={

userId:
socket.userId,

coin:
payload.coin,

plan:
payload.plan,

hashrate:
payload.hashrate,

startedAt:
Date.now(),

status:"active"

};

activeMiners.set(
socket.userId,
miner
);

broadcastCoin(
payload.coin,
"mining:start",
miner
);

notify(
socket.userId,
"Mining Started",
`${payload.coin}`
);

}
);

/*=========================================================
STOP
=========================================================*/
socket.on(
"mining:stop",
()=>{

const miner=
activeMiners.get(
socket.userId
);

if(!miner)
return;

miner.status=
"stopped";

broadcastCoin(
miner.coin,
"mining:stop",
miner
);

activeMiners.delete(
socket.userId
);

notify(
socket.userId,
"Mining Stopped",
miner.coin
);

}
);

/*=========================================================
HASHRATE
=========================================================*/
socket.on(
"mining:hashrate",
payload=>{

const miner=
activeMiners.get(
socket.userId
);

if(!miner)
return;

miner.hashrate=
payload.hashrate;

updatePool(
miner.coin,
payload.hashrate,
0
);

broadcastCoin(
miner.coin,
"mining:hashrate",
{
userId:
socket.userId,
hashrate:
payload.hashrate
}
);

}
);

/*=========================================================
REWARD
=========================================================*/
socket.on(
"mining:reward",
payload=>{

const miner=
activeMiners.get(
socket.userId
);

if(!miner)
return;

updatePool(
miner.coin,
0,
payload.amount
);

io.to(
`miner:${socket.userId}`
).emit(
"mining:reward",
{
coin:
miner.coin,
amount:
payload.amount,
time:
Date.now()
}
);

notify(
socket.userId,
"Mining Reward",
`${payload.amount} ${miner.coin}`
);

}
);

/*=========================================================
CLAIM
=========================================================*/
socket.on(
"mining:claim",
payload=>{

io.to(
`miner:${socket.userId}`
).emit(
"mining:claim",
{
coin:
payload.coin,
amount:
payload.amount,
time:
Date.now()
}
);

broadcast(
"mining:claimed",
{
userId:
socket.userId,
coin:
payload.coin,
amount:
payload.amount
}
);

}
);

/*=========================================================
BOOST
=========================================================*/
socket.on(
"mining:boost",
payload=>{

broadcast(
"mining:boost",
{
userId:
socket.userId,
coin:
payload.coin,
boost:
payload.boost
}
);

}
);

/*=========================================================
PLAN
=========================================================*/
socket.on(
"mining:plan",
payload=>{

io.to(
`miner:${socket.userId}`
).emit(
"mining:plan",
payload
);

}
);

/*=========================================================
BLOCK
=========================================================*/
socket.on(
"mining:block",
payload=>{

const pool=
miningPools.get(
payload.coin
);

if(!pool)
return;

pool.blocks++;

broadcastCoin(
payload.coin,
"mining:block",
{
coin:
payload.coin,
blocks:
pool.blocks,
reward:
payload.reward
}
);

}
);

/*=========================================================
LEADERBOARD
=========================================================*/
socket.on(
"mining:leaderboard",
payload=>{

broadcast(
"mining:leaderboard",
payload
);

}
);

/*=========================================================
STATS
=========================================================*/
socket.on(
"mining:stats",
payload=>{

broadcast(
"mining:stats",
payload
);

}
);

/*=========================================================
SYNC
=========================================================*/
socket.on(
"mining:sync",
()=>{

socket.emit(
"mining:sync",
{
online:
onlineMiners.size,

active:
activeMiners.size,

coins:
supportedCoins,

pools:
Array.from(
miningPools.values()
)

}
);

}
);

/*=========================================================
PING
=========================================================*/
socket.on(
"mining:ping",
()=>{

socket.emit(
"mining:pong",
{
time:Date.now()
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

onlineMiners.delete(
socket.userId
);

activeMiners.delete(
socket.userId
);

broadcast(
"mining:offline",
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

onlineMiners,

activeMiners,

miningPools,

supportedCoins,

broadcast,

broadcastCoin,

updatePool

};

};
