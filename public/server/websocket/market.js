/*=========================================================
FILE: server/websocket/market.js
BLOXIO MARKET SOCKET V4
PRE-LAUNCH + DAO + BX MARKET
=========================================================*/

"use strict";

module.exports=function(io){

const subscribers=new Map();

const trades=[];
const candles=[];
const orderBook={
bids:[],
asks:[]
};

const market={

status:"prelaunch",

dao:true,

launchAt:
new Date(
"2026-01-01T00:00:00Z"
).getTime(),

pair:"BX/USDT",

price:0.50,

open:0.50,

high:0.50,

low:0.50,

close:0.50,

change:0,

volume:0,

spread:0,

holders:0,

updatedAt:Date.now()

};

const PAIRS=[

"BX/USDT",
"BX/USDC",
"BX/BTC",
"BX/ETH",
"BX/BNB",
"BX/SOL",
"BX/TON",
"BX/XRP",
"BX/TRX",
"BX/LTC",
"BX/DOGE"

];

/*=========================================================
HELPERS
=========================================================*/
function now(){
return Date.now();
}

function updateMarket(){

market.updatedAt=
now();

io.emit(
"market:update",
market
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

function random(min,max){

return(
Math.random()*
(max-min)
)+min;

}

function pushTrade(trade){

trades.unshift(
trade
);

if(
trades.length>500
){

trades.length=500;

}

broadcast(
"market:trade",
trade
);

}

function updatePrice(price){

market.price=
Number(price);

market.close=
market.price;

market.high=
Math.max(
market.high,
market.price
);

market.low=
Math.min(
market.low,
market.price
);

market.change=
(
(
market.close-
market.open
)
/
market.open
)*100;

updateMarket();

}

function addVolume(volume){

market.volume+=
Number(volume)||0;

updateMarket();

}

function createCandle(){

candles.unshift({

time:now(),

open:
market.open,

high:
market.high,

low:
market.low,

close:
market.close,

volume:
market.volume

});

if(
candles.length>1000
){

candles.length=1000;

}

}

/*=========================================================
DAO TIMER
=========================================================*/
function checkLaunch(){

if(
Date.now()>=
market.launchAt
){

market.dao=false;

market.status="live";

broadcast(
"market:live",
market
);

}

}

/*=========================================================
ORDERBOOK
=========================================================*/
function seedOrderBook(){

orderBook.bids=[];
orderBook.asks=[];

for(
let i=0;
i<25;
i++
){

orderBook.bids.push({

price:
(
market.price-
random(
0.0001,
0.01
)
).toFixed(6),

amount:
random(
100,
5000
).toFixed(2)

});

orderBook.asks.push({

price:
(
market.price+
random(
0.0001,
0.01
)
).toFixed(6),

amount:
random(
100,
5000
).toFixed(2)

});

}

broadcast(
"market:orderbook",
orderBook
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
"market:auth",
payload=>{

const userId=
payload?.userId;

if(!userId)
return;

socket.userId=
userId;

socket.join(
`market:${userId}`
);

subscribers.set(
userId,
socket.id
);

socket.emit(
"market:ready",
{

status:
market.status,

dao:
market.dao,

launchAt:
market.launchAt,

pair:
market.pair

}
);

}
);

/*=========================================================
SYNC
=========================================================*/
socket.on(
"market:sync",
()=>{

socket.emit(
"market:sync",
{

market,

pairs:PAIRS,

trades:
trades.slice(
0,
100
),

candles:
candles.slice(
0,
200
),

orderBook

}
);

}
);

/*=========================================================
PAIR
=========================================================*/
socket.on(
"market:pair",
payload=>{

if(
!PAIRS.includes(
payload.pair
)
){
return;
}

socket.emit(
"market:pair",
payload
);

}
);

/*=========================================================
BUY
=========================================================*/
socket.on(
"market:buy",
payload=>{

if(
market.dao
){
return;
}

const trade={

id:
crypto.randomUUID(),

type:"buy",

userId:
socket.userId,

pair:
payload.pair,

amount:
payload.amount,

price:
market.price,

time:
now()

};

pushTrade(
trade
);

addVolume(
payload.amount
);

}
);

/*=========================================================
SELL
=========================================================*/
socket.on(
"market:sell",
payload=>{

if(
market.dao
){
return;
}

const trade={

id:
crypto.randomUUID(),

type:"sell",

userId:
socket.userId,

pair:
payload.pair,

amount:
payload.amount,

price:
market.price,

time:
now()

};

pushTrade(
trade
);

addVolume(
payload.amount
);

}
);

/*=========================================================
ORDERBOOK
=========================================================*/
socket.on(
"market:book",
()=>{

socket.emit(
"market:orderbook",
orderBook
);

}
);

/*=========================================================
WATCHLIST
=========================================================*/
socket.on(
"market:watch",
payload=>{

socket.emit(
"market:watch",
payload
);

}
);

/*=========================================================
PING
=========================================================*/
socket.on(
"market:ping",
()=>{

socket.emit(
"market:pong",
{
time:now()
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

subscribers.delete(
socket.userId
);

}

}
);

});

/*=========================================================
SIMULATION
=========================================================*/
setInterval(()=>{

checkLaunch();

if(
market.dao
){
return;
}

const move=
random(
-0.002,
0.002
);

updatePrice(
Math.max(
0.01,
market.price+move
)
);

seedOrderBook();

},3000);

/*=========================================================
CANDLES
=========================================================*/
setInterval(()=>{

createCandle();

},60000);

/*=========================================================
SYSTEM
=========================================================*/
setInterval(()=>{

updateMarket();

},10000);

/*=========================================================
PUBLIC API
=========================================================*/
return{

market,trades,candles,
orderBook,subscribers,updatePrice,
addVolume,broadcast

};};
