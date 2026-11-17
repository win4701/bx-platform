/* =========================================================
   FILE: public/bx/services/binance.js
   BLOXIO ENTERPRISE BINANCE ENGINE 2026
========================================================= */

export const Binance=(function(){

const BASE_WS="wss://stream.binance.com:9443/ws";

const PAIRS={
BTC:"btcusdt",
ETH:"ethusdt",
BNB:"bnbusdt",
SOL:"solusdt",
TON:"tonusdt",
LTC:"ltcusdt",
BCH:"bchusdt",
ZEC:"zecusdt",
AAVE:"aaveusdt",
AVAX:"avaxusdt",
DOT:"dotusdt",
LINK:"linkusdt",
DASH:"dashusdt",
XMR:"xmrusdt"
};

const sockets=new Map();

const handlers={
ticker:new Map(),
depth:new Map(),
bookTicker:new Map(),
kline:new Map()
};

/* =========================================================
   HELPERS
========================================================= */

function normalize(symbol){

return String(symbol||"")
.toUpperCase()
.trim();

}

function getPair(symbol){

return PAIRS[
normalize(symbol)
];

}

function createSocket(url,key){

close(key);

const ws=
new WebSocket(url);

sockets.set(
key,
ws
);

return ws;

}

function close(key){

const ws=
sockets.get(key);

if(!ws){
return;
}

ws.onopen=null;
ws.onmessage=null;
ws.onerror=null;
ws.onclose=null;

ws.close();

sockets.delete(key);

}

function emit(type,symbol,payload){

const key=
`${type}:${symbol}`;

const callback=
handlers[type].get(
key
);

if(callback){

callback(
payload
);

}

}

/* =========================================================
   TICKER
========================================================= */

function subscribeTicker(
symbol,
callback
){

const pair=
getPair(symbol);

if(!pair){
return;
}

const key=
`ticker:${symbol}`;

handlers.ticker.set(
key,
callback
);

const ws=
createSocket(
`${BASE_WS}/${pair}@miniTicker`,
key
);

ws.onmessage=e=>{

const data=
JSON.parse(
e.data
);

emit(
"ticker",
symbol,
{
symbol,
price:Number(data.c),
open:Number(data.o),
high:Number(data.h),
low:Number(data.l),
volume:Number(data.q),
eventTime:data.E
}
);

};

ws.onerror=()=>{

console.error(
"TICKER_ERROR",
symbol
);

};

ws.onclose=()=>{

setTimeout(
()=>subscribeTicker(
symbol,
callback
),
3000
);

};

}

/* =========================================================
   DEPTH
========================================================= */

function subscribeDepth(
symbol,
callback
){

const pair=
getPair(symbol);

if(!pair){
return;
}

const key=
`depth:${symbol}`;

handlers.depth.set(
key,
callback
);

const ws=
createSocket(
`${BASE_WS}/${pair}@depth20@100ms`,
key
);

ws.onmessage=e=>{

const data=
JSON.parse(
e.data
);

emit(
"depth",
symbol,
{
symbol,
bids:data.bids||[],
asks:data.asks||[]
}
);

};

ws.onerror=()=>{

console.error(
"DEPTH_ERROR",
symbol
);

};

ws.onclose=()=>{

setTimeout(
()=>subscribeDepth(
symbol,
callback
),
3000
);

};

}

/* =========================================================
   BOOK TICKER
========================================================= */

function subscribeBookTicker(
symbol,
callback
){

const pair=
getPair(symbol);

if(!pair){
return;
}

const key=
`bookTicker:${symbol}`;

handlers.bookTicker.set(
key,
callback
);

const ws=
createSocket(
`${BASE_WS}/${pair}@bookTicker`,
key
);

ws.onmessage=e=>{

const data=
JSON.parse(
e.data
);

emit(
"bookTicker",
symbol,
{
symbol,
bid:Number(data.b),
bidQty:Number(data.B),
ask:Number(data.a),
askQty:Number(data.A)
}
);

};

ws.onerror=()=>{

console.error(
"BOOK_ERROR",
symbol
);

};

ws.onclose=()=>{

setTimeout(
()=>subscribeBookTicker(
symbol,
callback
),
3000
);

};

}

/* =========================================================
   KLINE
========================================================= */

function subscribeKline(
symbol,
interval="1m",
callback
){

const pair=
getPair(symbol);

if(!pair){
return;
}

const key=
`kline:${symbol}`;

handlers.kline.set(
key,
callback
);

const ws=
createSocket(
`${BASE_WS}/${pair}@kline_${interval}`,
key
);

ws.onmessage=e=>{

const data=
JSON.parse(
e.data
);

const k=
data.k;

emit(
"kline",
symbol,
{
symbol,
interval,
time:Math.floor(
k.t/1000
),
open:Number(k.o),
high:Number(k.h),
low:Number(k.l),
close:Number(k.c),
volume:Number(k.v),
closed:k.x
}
);

};

ws.onerror=()=>{

console.error(
"KLINE_ERROR",
symbol
);

};

ws.onclose=()=>{

setTimeout(
()=>subscribeKline(
symbol,
interval,
callback
),
3000
);

};

}

/* =========================================================
   UNSUBSCRIBE
========================================================= */

function unsubscribeTicker(
symbol
){

close(
`ticker:${symbol}`
);

}

function unsubscribeDepth(
symbol
){

close(
`depth:${symbol}`
);

}

function unsubscribeBookTicker(
symbol
){

close(
`bookTicker:${symbol}`
);

}

function unsubscribeKline(
symbol
){

close(
`kline:${symbol}`
);

}

/* =========================================================
   CLOSE ALL
========================================================= */

function closeAll(){

sockets.forEach(
(_,key)=>close(key)
);

handlers.ticker.clear();
handlers.depth.clear();
handlers.bookTicker.clear();
handlers.kline.clear();

}

/* =========================================================
   PAIRS
========================================================= */

function getSupportedPairs(){

return Object.keys(
PAIRS
);

}

/* =========================================================
   API
========================================================= */

return{
PAIRS,
getPair,
getSupportedPairs,
subscribeTicker,
subscribeDepth,
subscribeBookTicker,
subscribeKline,
unsubscribeTicker,
unsubscribeDepth,
unsubscribeBookTicker,
unsubscribeKline,
closeAll
};

})();

window.Binance=Binance;
