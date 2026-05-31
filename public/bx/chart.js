/* public/bx/chart.js */

window.BXChart=(function(){

let chart=null;

let candleSeries=null;

let volumeSeries=null;

let currentSymbol="btcusdt";

let currentInterval="1m";

let ws=null;

function create(){

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
width:container.clientWidth,
height:420,
layout:{
background:{
color:"#07111F"
},
textColor:"#C7D5E0"
},
grid:{
vertLines:{
color:"rgba(255,255,255,.04)"
},
horzLines:{
color:"rgba(255,255,255,.04)"
}
},
crosshair:{
mode:1
},
rightPriceScale:{
borderColor:"rgba(255,255,255,.08)"
},
timeScale:{
borderColor:"rgba(255,255,255,.08)",
timeVisible:true
}
}
);

candleSeries=
chart.addCandlestickSeries();

volumeSeries=
chart.addHistogramSeries({
priceScaleId:""
});

window.addEventListener(
"resize",
()=>{
chart.applyOptions({
width:
container.clientWidth
});
}
);

}

function connect(
symbol="btcusdt",
interval="1m"
){

currentSymbol=symbol;

currentInterval=interval;

if(ws){

ws.close();

}

ws=
new WebSocket(
`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`
);

ws.onmessage=e=>{

const data=
JSON.parse(
e.data
);

const k=
data.k;

const time=
Math.floor(
k.t/1000
);

candleSeries.update({
time,
open:Number(k.o),
high:Number(k.h),
low:Number(k.l),
close:Number(k.c)
});

volumeSeries.update({
time,
value:Number(k.v)
});

};

}

function setPair(symbol){

connect(
symbol,
currentInterval
);

}

function setTimeframe(interval){

connect(
currentSymbol,
interval
);

}

function init(){

create();

connect();

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

setTimeframe(
btn.dataset.timeframe
);

}
);

});

}

return{
init,
setPair,
setTimeframe
};

})();
