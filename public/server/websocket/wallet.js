/*=========================================================
FILE: server/websocket/wallet.js
BLOXIO WALLET SOCKET V3
BX + XBC + 65 ASSETS
=========================================================*/

"use strict";

module.exports=function(io){

const onlineUsers=new Map();

/*=========================================================
HELPERS
=========================================================*/
function emitWallet(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:update",
payload
);

}

function emitBalance(
userId,
coin,
balance
){

io.to(
`wallet:${userId}`
).emit(
"wallet:balance",
{
coin,
balance,
time:Date.now()
}
);

}

function emitDeposit(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:deposit",
payload
);

}

function emitWithdraw(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:withdraw",
payload
);

}

function emitTransfer(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:transfer",
payload
);

}

function emitSwap(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:swap",
payload
);

}

function emitMining(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:mining",
payload
);

}

function emitReward(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:reward",
payload
);

}

function emitVIP(
userId,
payload
){

io.to(
`wallet:${userId}`
).emit(
"wallet:vip",
payload
);

}

function emitNotification(
userId,
title,
message
){

io.to(
`wallet:${userId}`
).emit(
"wallet:notification",
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
"wallet:auth",
payload=>{

const userId=
payload?.userId;

if(!userId)
return;

socket.userId=
userId;

socket.join(
`wallet:${userId}`
);

onlineUsers.set(
userId,
socket.id
);

socket.emit(
"wallet:ready",
{
connected:true,
time:Date.now()
}
);

}
);

/*=========================================================
SYNC
=========================================================*/
socket.on(
"wallet:sync",
payload=>{

if(!socket.userId)
return;

emitWallet(
socket.userId,
payload
);

}
);

/*=========================================================
BALANCE
=========================================================*/
socket.on(
"wallet:balance",
payload=>{

if(!socket.userId)
return;

emitBalance(
socket.userId,
payload.coin,
payload.balance
);

}
);

/*=========================================================
DEPOSIT
=========================================================*/
socket.on(
"wallet:deposit",
payload=>{

if(!socket.userId)
return;

emitDeposit(
socket.userId,
payload
);

emitNotification(
socket.userId,
"Deposit",
`${payload.amount} ${payload.coin}`
);

}
);

/*=========================================================
WITHDRAW
=========================================================*/
socket.on(
"wallet:withdraw",
payload=>{

if(!socket.userId)
return;

emitWithdraw(
socket.userId,
payload
);

emitNotification(
socket.userId,
"Withdraw",
`${payload.amount} ${payload.coin}`
);

}
);

/*=========================================================
TRANSFER
=========================================================*/
socket.on(
"wallet:transfer",
payload=>{

if(!socket.userId)
return;

emitTransfer(
socket.userId,
payload
);

}
);

/*=========================================================
SWAP
=========================================================*/
socket.on(
"wallet:swap",
payload=>{

if(!socket.userId)
return;

emitSwap(
socket.userId,
payload
);

}
);

/*=========================================================
MINING
=========================================================*/
socket.on(
"wallet:mining",
payload=>{

if(!socket.userId)
return;

emitMining(
socket.userId,
payload
);

}
);

/*=========================================================
REWARDS
=========================================================*/
socket.on(
"wallet:reward",
payload=>{

if(!socket.userId)
return;

emitReward(
socket.userId,
payload
);

}
);

/*=========================================================
VIP
=========================================================*/
socket.on(
"wallet:vip",
payload=>{

if(!socket.userId)
return;

emitVIP(
socket.userId,
payload
);

}
);

/*=========================================================
PORTFOLIO
=========================================================*/
socket.on(
"wallet:portfolio",
payload=>{

if(!socket.userId)
return;

io.to(
`wallet:${socket.userId}`
).emit(
"wallet:portfolio",
payload
);

}
);

/*=========================================================
ASSETS
=========================================================*/
socket.on(
"wallet:assets",
payload=>{

if(!socket.userId)
return;

io.to(
`wallet:${socket.userId}`
).emit(
"wallet:assets",
payload
);

}
);

/*=========================================================
AIRDROP
=========================================================*/
socket.on(
"wallet:airdrop",
payload=>{

if(!socket.userId)
return;

io.to(
`wallet:${socket.userId}`
).emit(
"wallet:airdrop",
payload
);

}
);

/*=========================================================
XBC
=========================================================*/
socket.on(
"wallet:xbc",
payload=>{

if(!socket.userId)
return;

io.to(
`wallet:${socket.userId}`
).emit(
"wallet:xbc",
payload
);

}
);

/*=========================================================
BX
=========================================================*/
socket.on(
"wallet:bx",
payload=>{

if(!socket.userId)
return;

io.to(
`wallet:${socket.userId}`
).emit(
"wallet:bx",
payload
);

}
);

/*=========================================================
PING
=========================================================*/
socket.on(
"wallet:ping",
()=>{

socket.emit(
"wallet:pong",
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

onlineUsers.delete(
socket.userId
);

}

}
);

});

/*=========================================================
PUBLIC API
=========================================================*/
return{

onlineUsers,

emitWallet,
emitBalance,
emitDeposit,
emitWithdraw,
emitTransfer,
emitSwap,
emitMining,
emitReward,
emitVIP

};

};
