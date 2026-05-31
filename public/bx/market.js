/* =========================================================
   BLOXIO MARKET ENTERPRISE 2026
   market.js
   Binance WebSocket + Lightweight Chart
   Compatible With market.html
   Source: 0
========================================================= */

const BX_USDT_PRICE=45;
const $=id=>document.getElementById(id);

const MARKET={
pair:"BX/BTC",
quote:"BTC",
tradeSide:"buy",
price:0,
prevPrice:0,
quotePrice:65000,
volume:0,
tickerWS:null,
depthWS:null,
heartbeat:null,
trades:[],
orderBook:{bids:[],asks:[]},

symbols:{
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
AVAX:40,
DOT:10,
LINK:18,
DASH:35,
XMR:170
},

init(){

this.bindAssets();
this.bindSearch();
this.bindTradeTabs();
this.bindTradeForm();
this.bindMobileTabs();
this.bindChartToolbar();

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

if(window.BXChart){

const pairSymbol=
this.symbols[
symbol
];

if(pairSymbol){

window.BXChart.setPair(
pairSymbol
);

}

}

},

/* =========================================================
   BINANCE MINI TICKER
========================================================= */

connectTicker(){

if(this.tickerWS){

this.tickerWS.close();

}

const stream=
this.symbols[
this.quote
];

if(!stream){

this.quotePrice=1;

this.calculateBX();

return;

}

this.tickerWS=
new WebSocket(
`wss://stream.binance.com:9443/ws/${stream}@miniTicker`
);

this.tickerWS.onopen=()=>{

document
.querySelector(
".market-live-dot"
)
?.classList.add(
"online"
);

};

this.tickerWS.onmessage=e=>{

const data=
JSON.parse(
e.data
);

this.quotePrice=
Number(data.c)||0;

this.volume=
Number(data.q)||0;

this.calculateBX();

};

this.tickerWS.onerror=()=>{

this.quotePrice=
this.fallback[
this.quote
]||1;

this.calculateBX();

};

this.tickerWS.onclose=()=>{

document
.querySelector(
".market-live-dot"
)
?.classList.remove(
"online"
);

};

},

/* =========================================================
   DEPTH
========================================================= */

connectDepth(){

if(this.depthWS){

this.depthWS.close();

}

const stream=
this.symbols[
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

this.orderBook.bids=
data.bids||[];

this.orderBook.asks=
data.asks||[];

this.renderOrderBook();

};

},

/* =========================================================
   BX PRICE
========================================================= */

calculateBX(){

this.prevPrice=
this.price;

if(
this.quote==="USDT"||
this.quote==="USDC"
){

this.price=
BX_USDT_PRICE;

}else{

this.price=
BX_USDT_PRICE/
(this.quotePrice||1);

}

this.updateStats();

},

/* =========================================================
   HEADER STATS
========================================================= */

updateStats(){

if($("marketPrice")){

$("marketPrice").textContent=
this.price.toFixed(8);

}

if($("marketVolume")){

$("marketVolume").textContent=
"$"+
Math.round(
this.volume
).toLocaleString();

}

if($("execPrice")){

$("execPrice").value=
this.price.toFixed(8);

}

const change=
this.prevPrice
?
(
(
this.price-
this.prevPrice
)
/
this.prevPrice
)*100
:0;

if($("marketChange")){

$("marketChange").textContent=
`${change.toFixed(2)}%`;

$("marketChange").classList.toggle(
"positive",
change>=0
);

$("marketChange").classList.toggle(
"negative",
change<0
);

}

if($("spread")){

$("spread").textContent=
"0.05%";

}

this.updateTooltip();

this.updateOrderTotal();

this.updateIntel();

},

/* =========================================================
   TOOLTIP
========================================================= */

updateTooltip(){

const tooltip=
$("marketTooltip");

if(!tooltip){
return;
}

tooltip.innerHTML=
`${this.pair} ${this.price.toFixed(8)}`;

},

/* =========================================================
   ORDER BOOK
========================================================= */

renderOrderBook(){

const grid=
$("orderBookGrid");

if(!grid){
return;
}

const asks=
this.orderBook.asks
.slice(0,10)
.map(row=>`
<div class="orderbook-row ask">
<span>${Number(row[0]).toFixed(8)}</span>
<span>${Number(row[1]).toFixed(4)}</span>
</div>
`).join("");

const bids=
this.orderBook.bids
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
   TRADE TABS
========================================================= */

bindTradeTabs(){

$("buyTab")
?.addEventListener(
"click",
()=>{

this.tradeSide="buy";

$("buyTab")
?.classList.add(
"active"
);

$("sellTab")
?.classList.remove(
"active"
);

$("actionBtn").textContent=
"BUY BX";

}
);

$("sellTab")
?.addEventListener(
"click",
()=>{

this.tradeSide="sell";

$("sellTab")
?.classList.add(
"active"
);

$("buyTab")
?.classList.remove(
"active"
);

$("actionBtn").textContent=
"SELL BX";

}
);

},

/* =========================================================
   TRADE FORM
========================================================= */

bindTradeForm(){

$("orderAmount")
?.addEventListener(
"input",
()=>this.updateOrderTotal()
);

$("actionBtn")
?.addEventListener(
"click",
()=>this.executeTrade()
);

},

updateOrderTotal(){

const amount=
Number(
$("orderAmount")
?.value
)||0;

const total=
amount*
this.price;

if($("orderTotal")){

$("orderTotal").value=
total.toFixed(8);

}

},

executeTrade(){

const amount=
Number(
$("orderAmount")
?.value
)||0;

if(amount<=0){
return;
}

const trade={
time:new Date()
.toLocaleTimeString(),
side:this.tradeSide,
price:this.price,
amount
};

this.trades.unshift(
trade
);

if(
this.trades.length>50
){

this.trades.pop();

}

this.renderHistory();

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
this.trades.map(
trade=>`
<div class="trade-row">
<span>${trade.time}</span>
<span>${trade.side.toUpperCase()}</span>
<span>${trade.price.toFixed(8)}</span>
<span>${trade.amount}</span>
</div>
`
).join("");

},

/* =========================================================
   INTEL
========================================================= */

updateIntel(){

const diff=
Math.abs(
this.price-
this.prevPrice
);

const trend=
this.price>=this.prevPrice
?"Bullish"
:"Bearish";

const volatility=
diff<0.001
?"Low"
:diff<0.01
?"Medium"
:"High";

const sentiment=
diff<0.001
?"Stable"
:"Positive";

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

$("marketSearch")
?.addEventListener(
"input",
e=>{

const query=
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
.includes(query)
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
.forEach(
btn=>btn.classList.remove(
"active"
)
);

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
   CHART TOOLBAR
========================================================= */

bindChartToolbar(){

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
.forEach(
x=>x.classList.remove(
"active"
)
);

btn.classList.add(
"active"
);

if(window.BXChart){

const map={
"1M":"1m",
"5M":"5m",
"15M":"15m",
"1H":"1h",
"4H":"4h",
"1D":"1d",
"1W":"1w"
};

window.BXChart
.setTimeframe(
map[
btn.textContent
]
);

}

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
.forEach(
btn=>btn.classList.remove(
"active"
)
);

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

if(!dot){
return;
}

dot.classList.toggle(
"online",
this.tickerWS &&
this.tickerWS.readyState===1
);

},
3000
);

}

};

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>MARKET.init()
)
:MARKET.init();
