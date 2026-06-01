/* =========================================================
   BLOXIO ENTERPRISE SERVER 2026
   FILE: server/app.js
   Express + Socket.IO + Redis Ready
========================================================= */

require("dotenv").config();

const path=require("path");
const http=require("http");
const express=require("express");
const compression=require("compression");
const helmet=require("helmet");
const cors=require("cors");
const {Server}=require("socket.io");

/* =========================================================
   APP
========================================================= */

const app=express();
const server=http.createServer(app);

/* =========================================================
   CONFIG
========================================================= */

const PORT=process.env.PORT||3000;
const CLIENT_ORIGIN=process.env.CLIENT_ORIGIN||"*";

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(helmet({crossOriginEmbedderPolicy:false}));
app.use(compression());
app.use(cors({origin:CLIENT_ORIGIN,credentials:true}));
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true}));

/* =========================================================
   STATIC
========================================================= */

app.use(express.static(path.join(__dirname,"../public")));

/* =========================================================
   SOCKET.IO
========================================================= */

const io=new Server(server,{
cors:{
origin:CLIENT_ORIGIN,
methods:["GET","POST"]
},
transports:["websocket","polling"]
});

/* =========================================================
   MEMORY STATE
========================================================= */

const STATE={
online:0,
users:new Map(),
market:{
pair:"BX/BTC",
price:0.00069241,
change:0.00,
volume:0
},
casino:{
online:0,
volume:0,
lastWin:0
},
mining:{
hashrate:0,
miners:0
}
};

/* =========================================================
   SOCKET AUTH
========================================================= */

io.use((socket,next)=>{

socket.userId=
socket.handshake.auth?.userId||
socket.id;

next();

});

/* =========================================================
   CONNECTION
========================================================= */

io.on("connection",socket=>{

STATE.online++;

STATE.users.set(
socket.id,
{
id:socket.id,
connectedAt:Date.now()
}
);

socket.emit(
"connected",
{
success:true,
socketId:socket.id,
serverTime:Date.now()
}
);

socket.emit(
"market:init",
STATE.market
);

socket.emit(
"casino:init",
STATE.casino
);

socket.emit(
"mining:init",
STATE.mining
);

io.emit(
"system:online",
{
count:STATE.online
}
);

socket.on(
"market:subscribe",
pair=>{

socket.join(
`market:${pair}`
);

}
);

socket.on(
"casino:subscribe",
()=>{

socket.join(
"casino"
);

}
);

socket.on(
"wallet:subscribe",
userId=>{

socket.join(
`wallet:${userId}`
);

}
);

socket.on(
"disconnect",
()=>{

STATE.online--;

STATE.users.delete(
socket.id
);

io.emit(
"system:online",
{
count:STATE.online
}
);

}
);

});

/* =========================================================
   API
========================================================= */

app.get(
"/api/health",
(req,res)=>{

res.json({
success:true,
name:"BLOXIO",
status:"online",
online:STATE.online,
timestamp:Date.now()
});

}
);

app.get(
"/api/market",
(req,res)=>{

res.json(
STATE.market
);

}
);

app.get(
"/api/casino",
(req,res)=>{

res.json(
STATE.casino
);

}
);

app.get(
"/api/mining",
(req,res)=>{

res.json(
STATE.mining
);

}
);

/* =========================================================
   MARKET FEED
========================================================= */

function emitMarketFeed(){

const delta=
(Number(
(Math.random()*2-1).toFixed(4)
));

STATE.market.price=
Math.max(
0.00000001,
STATE.market.price+delta/10000
);

STATE.market.change=
delta;

STATE.market.volume+=
Math.floor(
Math.random()*1000
);

io.emit(
"market:update",
STATE.market
);

}

setInterval(
emitMarketFeed,
1000
);

/* =========================================================
   CASINO FEED
========================================================= */

function emitCasinoFeed(){

const payload={
user:`player${Math.floor(Math.random()*9999)}`,
game:["Crash","Dice","Limbo","Mines","Plinko"][Math.floor(Math.random()*5)],
bet:Number((Math.random()*500).toFixed(2)),
profit:Number((Math.random()*1500).toFixed(2)),
time:Date.now()
};

io.to("casino").emit(
"casino:bet",
payload
);

}

setInterval(
emitCasinoFeed,
2500
);

/* =========================================================
   MINING FEED
========================================================= */

function emitMiningFeed(){

STATE.mining.hashrate=
Math.floor(
Math.random()*1000000
);

STATE.mining.miners=
Math.floor(
Math.random()*5000
);

io.emit(
"mining:update",
STATE.mining
);

}

setInterval(
emitMiningFeed,
5000
);

/* =========================================================
   WALLET FEED
========================================================= */

function emitWalletUpdate(
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

/* =========================================================
   AIRDROP FEED
========================================================= */

function emitAirdropUpdate(){

io.emit(
"airdrop:update",
{
reward:Number(
(Math.random()*50).toFixed(2)
),
time:Date.now()
}
);

}

setInterval(
emitAirdropUpdate,
15000
);

/* =========================================================
   INDEX
========================================================= */

app.get(
"*",
(req,res)=>{

res.sendFile(
path.join(
__dirname,
"../public/index.html"
)
);

}
);

/* =========================================================
   START
========================================================= */

server.listen(
PORT,
()=>{

console.log("=================================");
console.log("BLOXIO ENTERPRISE SERVER");
console.log(`PORT: ${PORT}`);
console.log(`ONLINE: http://localhost:${PORT}`);
console.log("SOCKET.IO READY");
console.log("MARKET READY");
console.log("CASINO READY");
console.log("MINING READY");
console.log("AIRDROP READY");
console.log("=================================");

}
);

/* =========================================================
   EXPORTS
========================================================= */

module.exports={
app,
server,
io,
STATE,
emitWalletUpdate
};
