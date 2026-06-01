/* =========================================================
   BLOXIO CHART ENGINE 2026
   public/bx/chart.js
   TradingView Lightweight Charts
   Binance WebSocket
========================================================= */

window.BXChart=(function(){

let chart=null;
let candleSeries=null;
let volumeSeries=null;
let socket=null;

let currentSymbol="btcusdt";
let currentTimeframe="1m";

const TIMEFRAME_MAP={
"1m":"1m",
"5m":"5m",
"15m":"15m",
"1h":"1h",
"4h":"4h",
"1d":"1d",
"1w":"1w"
};

const CHART_CONFIG={
layout:{background:{color:"#07111F"},textColor:"#D6E0F5",fontSize:12,fontFamily:"Inter,Arial,sans-serif"},
grid:{vertLines:{color:"rgba(255,255,255,.04)"},horzLines:{color:"rgba(255,255,255,.04)"}},
crosshair:{mode:1},
rightPriceScale:{borderColor:"rgba(255,255,255,.08)"},
timeScale:{borderColor:"rgba(255,255,255,.08)",timeVisible:true,secondsVisible:false},
handleScroll:true,
handleScale:true
};

/* =========================================================
   CREATE
========================================================= */

function createChart(){

const container=
document.getElementById(
"marketChart"
);

if(!container){
return;
}

chart=
LightweightCharts.createChart(
container,
{
...CHART_CONFIG,
width:container.clientWidth,
height:getChartHeight()
}
);

candleSeries=
chart.addCandlestickSeries({
upColor:"#00FFC2",
downColor:"#FF4D6D",
borderVisible:false,
wickUpColor:"#00FFC2",
wickDownColor:"#FF4D6D"
});

volumeSeries=
chart.addHistogramSeries({
priceScaleId:"",
priceFormat:{
type:"volume"
}
});

window.addEventListener(
"resize",
resizeChart
);

}

/* =========================================================
   HEIGHT
========================================================= */

function getChartHeight(){

if(window.innerWidth<480){
return 260;
}

if(window.innerWidth<768){
return 320;
}

if(window.innerWidth<1200){
return 380;
}

return 460;

}

/* =========================================================
   RESIZE
========================================================= */

function resizeChart(){

if(!chart){
return;
}

const container=
document.getElementById(
"marketChart"
);

if(!container){
return;
}

chart.applyOptions({
width:container.clientWidth,
height:getChartHeight()
});

}

/* =========================================================
   SOCKET
========================================================= */

function connectKline(){

if(socket){

socket.close();

socket=null;

}

socket=
new WebSocket(
`wss://stream.binance.com:9443/ws/${currentSymbol}@kline_${currentTimeframe}`
);

socket.onmessage=e=>{

const data=
JSON.parse(
e.data
);

if(!data.k){
return;
}

updateCandle(
data.k
);

};

socket.onerror=()=>{

console.error(
"CHART_SOCKET_ERROR"
);

};

}

/* =========================================================
   CANDLE UPDATE
========================================================= */

function updateCandle(kline){

const time=
Math.floor(
kline.t/1000
);

candleSeries.update({
time,
open:Number(kline.o),
high:Number(kline.h),
low:Number(kline.l),
close:Number(kline.c)
});

volumeSeries.update({
time,
value:Number(kline.v)
});

updateTooltip(
Number(kline.c),
Number(kline.h),
Number(kline.l)
);

}

/* =========================================================
   TOOLTIP
========================================================= */

function updateTooltip(
price,
high,
low
){

const tooltip=
document.getElementById(
"marketTooltip"
);

if(!tooltip){
return;
}

tooltip.innerHTML=
`<div class="tooltip-price">${price.toFixed(8)}</div><div class="tooltip-high">H ${high.toFixed(8)}</div><div class="tooltip-low">L ${low.toFixed(8)}</div>`;

}

/* =========================================================
   PAIR
========================================================= */

function setPair(symbol){

if(!symbol){
return;
}

currentSymbol=
symbol.toLowerCase();

connectKline();

}

/* =========================================================
   TIMEFRAME
========================================================= */

function setTimeframe(tf){

if(
!TIMEFRAME_MAP[
tf
]
){
return;
}

currentTimeframe=tf;

connectKline();

}

/* =========================================================
   RESET
========================================================= */

function clearChart(){

if(!chart){
return;
}

chart.remove();

chart=null;

candleSeries=null;

volumeSeries=null;

createChart();

connectKline();

}

/* =========================================================
   DESTROY
========================================================= */

function destroy(){

if(socket){

socket.close();

socket=null;

}

if(chart){

chart.remove();

chart=null;

}

}

/* =========================================================
   INIT
========================================================= */

function init(){

createChart();

connectKline();

console.log(
"📈 BX CHART READY"
);

}

/* =========================================================
   API
========================================================= */

return{
init,
destroy,
setPair,
setTimeframe,
clearChart
};

})();

/* =========================================================
   AUTO INIT
========================================================= */

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>window.BXChart.init()
)
:window.BXChart.init();
