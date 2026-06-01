/* =========================================================
   FILE: public/bx/services/market-feed.js
   BLOXIO MARKET FEED ENGINE 2026
   Depends:
   - public/bx/services/binance.js
   - public/bx/socket.js
========================================================= */

import {Binance} from "./binance.js";

export const MarketFeed=(function(){

const BX_USDT_PRICE=45;

let currentQuote="BTC";

let marketState={
pair:"BX/BTC",
quote:"BTC",
quotePrice:65000,
bxPrice:0,
change:0,
volume:0,
high:0,
low:0,
bid:0,
ask:0,
spread:0,
updatedAt:0
};

const listeners=new Set();

/* =========================================================
   QUOTES
========================================================= */

const FALLBACK={
BTC:65000,
ETH:3500,
BNB:700,
SOL:180,
TON:6,
LTC:90,
BCH:500,
USDT:1,
USDC:1,
ZEC:35,
AAVE:180,
AVAX:40,
DOT:10,
LINK:18,
DASH:35,
XMR:170
};

/* =========================================================
   HELPERS
========================================================= */

function emit(){

listeners.forEach(
callback=>{

try{

callback(
{...marketState}
);

}catch(error){

console.error(
"MARKET_FEED_CALLBACK",
error
);

}

}
);

}

function computeBXPrice(){

if(
currentQuote==="USDT"||
currentQuote==="USDC"
){

marketState.bxPrice=
BX_USDT_PRICE;

}else{

marketState.bxPrice=
BX_USDT_PRICE/
(
marketState.quotePrice||1
);

}

marketState.updatedAt=
Date.now();

emit();

}

/* =========================================================
   TICKER
========================================================= */

function bindTicker(symbol){

Binance.subscribeTicker(
symbol,
payload=>{

marketState.quotePrice=
payload.price;

marketState.change=
(
(
payload.high-
payload.low
)
/
(
payload.low||1
)
)*100;

marketState.volume=
payload.volume;

marketState.high=
payload.high;

marketState.low=
payload.low;

computeBXPrice();

}
);

}

/* =========================================================
   BOOK
========================================================= */

function bindBookTicker(symbol){

Binance.subscribeBookTicker(
symbol,
payload=>{

marketState.bid=
payload.bid;

marketState.ask=
payload.ask;

marketState.spread=
Math.abs(
payload.ask-
payload.bid
);

emit();

}
);

}

/* =========================================================
   DEPTH
========================================================= */

function bindDepth(symbol){

Binance.subscribeDepth(
symbol,
payload=>{

window.dispatchEvent(
new CustomEvent(
"bx:market-depth",
{
detail:payload
}
)
);

}
);

}

/* =========================================================
   KLINE
========================================================= */

function bindKline(
symbol,
interval="1m"
){

Binance.subscribeKline(
symbol,
interval,
payload=>{

window.dispatchEvent(
new CustomEvent(
"bx:market-kline",
{
detail:payload
}
)
);

}
);

}

/* =========================================================
   PAIR
========================================================= */

function connect(symbol){

disconnect();

currentQuote=
String(symbol)
.toUpperCase();

marketState.quote=
currentQuote;

marketState.pair=
`BX/${currentQuote}`;

marketState.quotePrice=
FALLBACK[
currentQuote
]||1;

bindTicker(
currentQuote
);

bindBookTicker(
currentQuote
);

bindDepth(
currentQuote
);

bindKline(
currentQuote,
"1m"
);

computeBXPrice();

}

/* =========================================================
   TIMEFRAME
========================================================= */

function setTimeframe(
interval
){

Binance.unsubscribeKline(
currentQuote
);

bindKline(
currentQuote,
interval
);

}

/* =========================================================
   SUBSCRIBE
========================================================= */

function subscribe(
callback
){

listeners.add(
callback
);

callback(
{...marketState}
);

return()=>{

listeners.delete(
callback
);

};

}

/* =========================================================
   STATE
========================================================= */

function getState(){

return{
...marketState
};

}

/* =========================================================
   DISCONNECT
========================================================= */

function disconnect(){

Binance.unsubscribeTicker(
currentQuote
);

Binance.unsubscribeDepth(
currentQuote
);

Binance.unsubscribeBookTicker(
currentQuote
);

Binance.unsubscribeKline(
currentQuote
);

}

/* =========================================================
   MARKET HTML BINDINGS
========================================================= */

function bindMarketUI(){

subscribe(
state=>{

const pair=
document.getElementById(
"marketPair"
);

const price=
document.getElementById(
"marketPrice"
);

const volume=
document.getElementById(
"marketVolume"
);

const spread=
document.getElementById(
"spread"
);

const change=
document.getElementById(
"marketChange"
);

if(pair){

pair.textContent=
state.pair;

}

if(price){

price.textContent=
state.bxPrice
.toFixed(8);

}

if(volume){

volume.textContent=
"$"+
Math.round(
state.volume
).toLocaleString();

}

if(spread){

spread.textContent=
state.spread
.toFixed(4);

}

if(change){

change.textContent=
`${state.change.toFixed(2)}%`;

change.classList.toggle(
"positive",
state.change>=0
);

change.classList.toggle(
"negative",
state.change<0
);

}

}
);

}

/* =========================================================
   SOCKET.IO SYNC
========================================================= */

function bindSocket(){

if(
!window.BXSocket
){
return;
}

window.BXSocket.marketFeed(
payload=>{

window.dispatchEvent(
new CustomEvent(
"bx:market-live",
{
detail:payload
}
)
);

}
);

}

/* =========================================================
   INIT
========================================================= */

function init(){

connect(
"BTC"
);

bindMarketUI();

bindSocket();

console.log(
"📈 BLOXIO MARKET FEED READY"
);

}

/* =========================================================
   API
========================================================= */

return{
init,
connect,
disconnect,
subscribe,
getState,
setTimeframe
};

})();

window.MarketFeed=
MarketFeed;
