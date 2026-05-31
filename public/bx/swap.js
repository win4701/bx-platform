/* =========================================================
   BLOXIO SWAP ENGINE ENTERPRISE 2026
   BX FIXED PRICE = 45 USDT
   LIVE MARKET PRICES
   public/bx/swap.js
========================================================= */

import { SWAP_ASSETS } from "./data/coins.js";

(function(){

"use strict";

const $=id=>document.getElementById(id);
const safe=n=>Number(n)||0;

const BX_USDT_PRICE=45;

const state={prices:{BX:BX_USDT_PRICE},quote:null,loading:false,lastUpdate:0};

async function api(url,body={}){
const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
if(!res.ok) throw new Error("API_ERROR");
return await res.json();
}

async function loadMarketPrices(){

try{

const res=await fetch("/api/market/prices");
const data=await res.json();

if(data?.prices){

state.prices={
...data.prices,
BX:BX_USDT_PRICE
};

state.lastUpdate=Date.now();

updateQuote();

return;

}

}catch(err){

console.warn("PRICE_FEED_ERROR",err);

}

}

function populateAssets(){

const select=$("swapFromAsset");

if(!select) return;

select.innerHTML=
SWAP_ASSETS
.filter(asset=>asset.symbol!=="BX")
.map(asset=>`<option value="${asset.symbol}">${asset.symbol}</option>`)
.join("");

}

function getAssetPrice(symbol){

return safe(
state.prices[symbol]
);

}

function calculateReceive(fromAsset,amount){

const fromPrice=
getAssetPrice(fromAsset);

if(!fromPrice) return 0;

const usdtValue=
amount*fromPrice;

const bxReceive=
usdtValue/BX_USDT_PRICE;

return bxReceive;

}

function updateQuote(){

const fromAsset=
$("swapFromAsset")?.value;

const amount=
safe(
$("swapAmount")?.value
);

if(
!fromAsset ||
!amount
){

if($("estimatedReceive")){
$("estimatedReceive").value="0";
}

return;

}

const marketPrice=
getAssetPrice(fromAsset);

if(!marketPrice){

if($("estimatedReceive")){
$("estimatedReceive").value="0";
}

return;

}

const slippage=
safe(
$("slippage")?.value
||0.5
);

const feeRate=0.003;

const receiveRaw=
calculateReceive(
fromAsset,
amount
);

const fee=
receiveRaw*feeRate;

const receive=
(receiveRaw-fee)*
(1-(slippage/100));

state.quote={
from:fromAsset,
to:"BX",
amount,
marketPrice,
bxPrice:BX_USDT_PRICE,
fee,
slippage,
receive
};

if($("marketPrice")){
$("marketPrice").textContent=
marketPrice.toFixed(8)+" USDT";
}

if($("execPrice")){
$("execPrice").textContent=
BX_USDT_PRICE.toFixed(2)+" USDT";
}

if($("spread")){
$("spread").textContent=
slippage.toFixed(2)+"%";
}

if($("estimatedReceive")){
$("estimatedReceive").value=
receive.toFixed(6);
}

}

async function executeSwap(){

if(state.loading) return;
if(!state.quote) return;

state.loading=true;

try{

setStatus(
"swapStatus",
"Executing Swap..."
);

const payload={
from:state.quote.from,
to:"BX",
amount:state.quote.amount,
marketPrice:state.quote.marketPrice,
bxPrice:BX_USDT_PRICE,
receive:state.quote.receive
};

const data=
await api(
"/api/swap/execute",
payload
);

if(data?.error){

toast(data.error);

state.loading=false;

return;

}

toast(
"Swap Completed"
);

resetSwap();

window.dispatchEvent(
new CustomEvent(
"wallet-sync"
)
);

}catch(err){

toast(
"Swap Failed"
);

console.error(err);

}

state.loading=false;

}

function resetSwap(){

if($("swapAmount")){
$("swapAmount").value="";
}

if($("estimatedReceive")){
$("estimatedReceive").value="";
}

state.quote=null;

}

function bindInputs(){

[
"swapFromAsset",
"swapAmount",
"slippage"
]
.forEach(id=>{

const el=$(id);

if(!el) return;

el.addEventListener(
"input",
updateQuote
);

el.addEventListener(
"change",
updateQuote
);

});

}

function bindQuickAmounts(){

document
.querySelectorAll(
"[data-swap-percent]"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

const balance=
safe(
btn.dataset.balance
);

const percent=
safe(
btn.dataset.swapPercent
);

const amount=
balance*
(percent/100);

if($("swapAmount")){
$("swapAmount").value=
amount.toFixed(8);
}

updateQuote();

});

});

}

function bindExternalWalletLaunch(){

window.addEventListener(
"wallet-swap-open",
e=>{

const symbol=
e.detail?.symbol;

if(
symbol &&
$("swapFromAsset")
){

$("swapFromAsset").value=
symbol;

updateQuote();

}

}
);

}

function startLiveFeed(){

loadMarketPrices();

setInterval(
loadMarketPrices,
15000
);

}

function toast(msg){

const el=
$("walletStatus");

if(!el) return;

el.textContent=msg;

el.classList.remove(
"hidden"
);

setTimeout(()=>{

el.classList.add(
"hidden"
);

},2500);

}

function setStatus(id,msg){

const el=$(id);

if(!el) return;

el.textContent=msg;

el.classList.remove(
"hidden"
);

}

function bind(){

if($("swapButton")){

$("swapButton")
.addEventListener(
"click",
executeSwap
);

}

}

function init(){

populateAssets();

bindInputs();

bindQuickAmounts();

bindExternalWalletLaunch();

bind();

startLiveFeed();

updateQuote();

console.log(
"🚀 BLOXIO LIVE SWAP ENGINE READY"
);

console.log(
"BX FIXED PRICE:",
BX_USDT_PRICE,
"USDT"
);

}

if(
document.readyState===
"loading"
){

document.addEventListener(
"DOMContentLoaded",
init
);

}else{

init();

}

})();
