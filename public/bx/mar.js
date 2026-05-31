/* =========================================================
   BLOXIO MARKET ENTERPRISE 2026
   Binance WebSocket Edition
   Compatible With market.html
   HTML Reference: 0
========================================================= */

const BX_USDT_PRICE=45;
const $=id=>document.getElementById(id);
const safe=v=>Number(v)||0;

const Market={
pair:"BX/BTC",
quote:"BTC",
tradeSide:"buy",
marketPrice:0,
previousPrice:0,
quotePrice:65000,
volume24h:0,
tickerWS:null,
depthWS:null,
heartbeat:null,
trades:[],
depth:{bids:[],asks:[]},

quotes:{
BTC:"btcusdt",
ETH:"ethusdt",
BNB:"bnbusdt",
SOL:"solusdt",
TON:"tonusdt",
LTC:"ltcusdt",
BCH:"bchusdt",
USDT:null,
USDC:null,
ZEC:"zecusdt",
AAVE:"aaveusdt",
AVAX:"avaxusdt",
DOT:"dotusdt",
LINK:"linkusdt",
DASH:"dashusdt",
XMR:"xmrusdt"
},

fallback:{
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
AVAX:45,
DOT:10,
LINK:20,
DASH:40,
XMR:170
},

init(){

this.bindAssets();
this.bindSearch();
this.bindTradeTabs();
this.bindOrderInputs();
this.bindTimeframes();
this.bindMobileTabs();
this.bindTradeButton();

this.connectPair("BTC");

this.startHeartbeat();

},

/* =========================================================
   PAIRS
========================================================= */

connectPair(symbol){

this.quote=symbol;

this.pair=`BX/${symbol}`;

if($("marketPair")){
$("marketPair").textContent=this.pair;
}

this.connectTicker();

this.connectDepth();

},

/* =========================================================
   BINANCE TICKER
========================================================= */

connectTicker(){

if(this.tickerWS){

this.tickerWS.close();

}

const stream=this.quotes[this.quote];

if(!stream){

this.quotePrice=1;

this.calculateBX();

return;

}

this.tickerWS=
new WebSocket(
`wss://stream.binance.com:9443/ws/${stream}@miniTicker`
);

this.tickerWS.onmessage=e=>{

const data=
JSON.parse(
e.data
);

this.quotePrice=
safe(data.c);

this.volume24h=
safe(data.q);

this.calculateBX();

};

this.tickerWS.onerror=()=>{

this.quotePrice=
this.fallback[
this.quote
]||1;

this.calculateBX();

};

},

/* =========================================================
   BINANCE DEPTH
========================================================= */

connectDepth(){

if(this.depthWS){

this.depthWS.close();

}

const stream=
this.quotes[
this.quote
];

if(!stream){
return;
}

this.depthWS=
new WebSocket(
`wss://stream.binance.com:9443/ws/${stream}@depth20@100ms`
);

this.depthWS.onmessage=e=>{

const data=
JSON.parse(
e.data
);

this.depth.bids=
data.bids||[];

this.depth.asks=
data.asks||[];

this.renderOrderBook();

};

},

/* =========================================================
   BX PRICE
========================================================= */

calculateBX(){

this.previousPrice=
this.marketPrice;

if(
this.quote==="USDT"||
this.quote==="USDC"
){

this.marketPrice=
BX_USDT_PRICE;

}else{

this.marketPrice=
BX_USDT_PRICE/
(this.quotePrice||1);

}

this.updateMarket();

},

/* =========================================================
   UI
========================================================= */

updateMarket(){

if($("marketPrice")){
$("marketPrice").textContent=
this.marketPrice.toFixed(8);
}

if($("execPrice")){
$("execPrice").value=
this.marketPrice.toFixed(8);
}

if($("marketVolume")){
$("marketVolume").textContent=
"$"+
Math.round(
this.volume24h
).toLocaleString();
}

this.updateChange();

this.updateOrderTotal();

this.updateIntel();

this.updateTooltip();

},

updateChange(){

const el=
$("marketChange");

if(!el){
return;
}

const change=
this.previousPrice
?
(
(
this.marketPrice-
this.previousPrice
)
/
this.previousPrice
)*100
:0;

el.textContent=
`${change.toFixed(2)}%`;

el.classList.toggle(
"positive",
change>=0
);

el.classList.toggle(
"negative",
change<0
);

},

updateTooltip(){

const tooltip=
$("marketTooltip");

if(!tooltip){
return;
}

tooltip.innerHTML=
`<strong>${this.pair}</strong> ${this.marketPrice.toFixed(8)}`;

},

/* =========================================================
   ORDERBOOK
========================================================= */

renderOrderBook(){

const grid=
$("orderBookGrid");

if(!grid){
return;
}

const asks=
this.depth.asks
.slice(0,10)
.map(row=>`
<div class="orderbook-row ask">
<span>${Number(row[0]).toFixed(8)}</span>
<span>${Number(row[1]).toFixed(4)}</span>
</div>
`).join("");

const bids=
this.depth.bids
.slice(0,10)
.map(row=>`
<div class="orderbook-row bid">
<span>${Number(row[0]).toFixed(8)}</span>
<span>${Number(row[1]).toFixed(4)}</span>
</div>
`).join("");

grid.innerHTML=
asks+bids;

},

/* =========================================================
   TRADE
========================================================= */

bindTradeTabs(){

$("buyTab")?.addEventListener(
"click",
()=>{

this.tradeSide="buy";

$("buyTab")?.classList.add(
"active"
);

$("sellTab")?.classList.remove(
"active"
);

$("actionBtn").textContent=
"BUY BX";

}
);

$("sellTab")?.addEventListener(
"click",
()=>{

this.tradeSide="sell";

$("sellTab")?.classList.add(
"active"
);

$("buyTab")?.classList.remove(
"active"
);

$("actionBtn").textContent=
"SELL BX";

}
);

},

bindTradeButton(){

$("actionBtn")?.addEventListener(
"click",
()=>this.executeTrade()
);

},

executeTrade(){

const amount=
safe(
$("orderAmount")?.value
);

if(amount<=0){
return;
}

const trade={
time:new Date()
.toLocaleTimeString(),
side:this.tradeSide,
price:this.marketPrice,
amount
};

this.trades.unshift(
trade
);

if(
this.trades.length>25
){

this.trades.pop();

}

this.renderHistory();

window.dispatchEvent(
new CustomEvent(
"market-order",
{
detail:{
pair:this.pair,
side:this.tradeSide,
amount,
price:this.marketPrice
}
}
)
);

},

/* =========================================================
   HISTORY
========================================================= */

renderHistory(){

const grid=
$("tradeHistoryGrid");

if(!grid){
return;
}

grid.innerHTML=
this.trades.map(t=>`
<div class="trade-row">
<span>${t.time}</span>
<span>${t.side.toUpperCase()}</span>
<span>${t.price.toFixed(8)}</span>
<span>${t.amount}</span>
</div>
`).join("");

},

/* =========================================================
   TOTAL
========================================================= */

bindOrderInputs(){

$("orderAmount")?.addEventListener(
"input",
()=>this.updateOrderTotal()
);

},

updateOrderTotal(){

const amount=
safe(
$("orderAmount")?.value
);

const total=
amount*
this.marketPrice;

if($("orderTotal")){

$("orderTotal").value=
total.toFixed(8);

}

},

/* =========================================================
   INTEL
========================================================= */

updateIntel(){

const trend=
this.marketPrice>=this.previousPrice
?"Bullish"
:"Bearish";

const diff=
Math.abs(
this.marketPrice-
this.previousPrice
);

const volatility=
diff<0.001
?"Low"
:diff<0.01
?"Medium"
:"High";

const sentiment=
diff<0.001
?"Stable"
:"Active";

if($("marketTrend")){
$("marketTrend").textContent=
trend;
}

if($("marketSentiment")){
$("marketSentiment").textContent=
sentiment;
}

if($("marketVolatility")){
$("marketVolatility").textContent=
volatility;
}

if($("marketLiquidity")){
$("marketLiquidity").textContent=
"Strong";
}

},

/* =========================================================
   SEARCH
========================================================= */

bindSearch(){

$("marketSearch")?.addEventListener(
"input",
e=>{

const q=
e.target.value
.toLowerCase();

document
.querySelectorAll(
".market-asset"
)
.forEach(asset=>{

asset.style.display=
asset.textContent
.toLowerCase()
.includes(q)
?"flex"
:"none";

});

}
);

},

/* =========================================================
   ASSETS
========================================================= */

bindAssets(){

document
.querySelectorAll(
".market-asset"
)
.forEach(asset=>{

asset.addEventListener(
"click",
()=>{

document
.querySelectorAll(
".market-asset"
)
.forEach(x=>
x.classList.remove(
"active"
));

asset.classList.add(
"active"
);

const pair=
asset.dataset.pair;

this.connectPair(
pair.replace(
"BX/",
""
)
);

}
);

});

},

/* =========================================================
   TIMEFRAMES
========================================================= */

bindTimeframes(){

document
.querySelectorAll(
".chart-time"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

document
.querySelectorAll(
".chart-time"
)
.forEach(x=>
x.classList.remove(
"active"
));

btn.classList.add(
"active"
);

}
);

});

},

/* =========================================================
   MOBILE
========================================================= */

bindMobileTabs(){

document
.querySelectorAll(
".market-mobile-tab"
)
.forEach(tab=>{

tab.addEventListener(
"click",
()=>{

document
.querySelectorAll(
".market-mobile-tab"
)
.forEach(x=>
x.classList.remove(
"active"
));

tab.classList.add(
"active"
);

}
);

});

},

/* =========================================================
   HEARTBEAT
========================================================= */

startHeartbeat(){

clearInterval(
this.heartbeat
);

this.heartbeat=
setInterval(
()=>{

const dot=
document.querySelector(
".market-live-dot"
);

if(dot){

dot.classList.toggle(
"online",
this.tickerWS &&
this.tickerWS.readyState===1
);

}

},
3000
);

}

};

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>Market.init()
)
:Market.init();
