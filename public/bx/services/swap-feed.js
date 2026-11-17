/* =========================================================
   FILE: public/bx/services/swap-feed.js
   BLOXIO SWAP ENGINE 2026
   Depends:
   - binance.js
   - wallet-feed.js
========================================================= */

import {Binance} from "./binance.js";
import {WalletFeed} from "./wallet-feed.js";

export const SwapFeed=(function(){

const BX_USDT_PRICE=45;

let currentFrom="USDT";
let currentTo="BX";

let currentAmount=0;

let currentSlippage=0.5;

const listeners=new Set();

const history=[];

const state={
from:"USDT",
to:"BX",
amount:0,
fromPrice:1,
toPrice:45,
receive:0,
fee:0,
slippage:0.5,
minimum:1,
maximum:1000000,
rate:45,
updatedAt:0
};

const PRICE_CACHE={
BX:45,
USDT:1,
USDC:1,
BTC:65000,
ETH:3500,
BNB:700,
SOL:180,
TON:6,
LTC:90,
BCH:500,
ZEC:35,
AAVE:180,
AVAX:40,
DOT:10,
LINK:18,
DASH:35,
XMR:170
};

const SUPPORTED=[
"USDT",
"USDC",
"BTC",
"ETH",
"BNB",
"SOL",
"TON",
"LTC",
"BCH",
"ZEC",
"AAVE",
"AVAX",
"DOT",
"LINK",
"DASH",
"XMR",
"BX"
];

/* =========================================================
   HELPERS
========================================================= */

function emit(){

state.updatedAt=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
"SWAP_FEED",
error
);

}

});

updateUI();

}

function updateUI(){

const receive=
document.getElementById(
"estimatedReceive"
);

const slippage=
document.getElementById(
"slippage"
);

if(receive){

receive.value=
Number(
state.receive
).toFixed(8);

}

if(slippage){

slippage.value=
`${state.slippage}%`;

}

}

/* =========================================================
   PRICE
========================================================= */

function getPrice(symbol){

return PRICE_CACHE[
symbol
]||0;

}

function setPrice(
symbol,
price
){

PRICE_CACHE[
symbol
]=Number(price)||0;

}

/* =========================================================
   BINANCE
========================================================= */

function bindBinance(){

SUPPORTED.forEach(symbol=>{

if(
symbol==="BX"||
symbol==="USDT"||
symbol==="USDC"
){
return;
}

Binance.subscribeTicker(
symbol,
payload=>{

setPrice(
symbol,
payload.price
);

calculate();

}
);

});

}

/* =========================================================
   CALCULATE
========================================================= */

function calculate(){

const fromPrice=
getPrice(
currentFrom
);

const toPrice=
getPrice(
currentTo
);

state.from=
currentFrom;
state.to=
currentTo;
state.amount=
currentAmount;
state.fromPrice=
fromPrice;
state.toPrice=
toPrice;
state.slippage=
currentSlippage;

const usdValue=
currentAmount*
fromPrice;

let receive=
0;

if(
currentTo==="BX"
){

receive=
usdValue/
BX_USDT_PRICE;

state.rate=
BX_USDT_PRICE;

}else{

receive=
usdValue/
toPrice;

state.rate=
toPrice;

}

const fee=
receive*0.0025;

const slippageImpact=
receive*
(
currentSlippage/
100
);

state.fee=fee;

state.receive=
Math.max(
0,
receive-
fee-
slippageImpact
);

emit();

}

/* =========================================================
   PAIRS
========================================================= */

function setFrom(symbol){

if(
!SUPPORTED.includes(
symbol
)
){
return;
}

currentFrom=
symbol;

calculate();

}

function setTo(symbol){

if(
!SUPPORTED.includes(
symbol
)
){
return;
}

currentTo=
symbol;

calculate();

}

function setAmount(value){

currentAmount=
Number(value)||0;

calculate();

}

function setSlippage(value){

currentSlippage=
Number(value)||0.5;

calculate();

}

/* =========================================================
   HISTORY
========================================================= */

function addHistory(record){

history.unshift(
{
id:crypto.randomUUID(),
timestamp:Date.now(),
...record
}
);

if(
history.length>100
){

history.pop();

}

}

function getHistory(){

return[
...history
];

}

/* =========================================================
   EXECUTE
========================================================= */

function execute(){

if(
currentAmount<=0
){
return false;
}

const asset=
WalletFeed.getAsset(
currentFrom
);

if(
!asset
){
return false;
}

if(
asset.balance<
currentAmount
){
return false;
}

WalletFeed.updateBalance(
currentFrom,
asset.balance-
currentAmount
);

const receiveAsset=
WalletFeed.getAsset(
currentTo
);

const receiveBalance=
receiveAsset
?receiveAsset.balance
:0;

WalletFeed.updateBalance(
currentTo,
receiveBalance+
state.receive
);

addHistory({
from:currentFrom,
to:currentTo,
amount:currentAmount,
receive:state.receive,
fee:state.fee
});

window.dispatchEvent(
new CustomEvent(
"bx:swap-complete",
{
detail:getState()
}
)
);

return true;

}

/* =========================================================
   UI BIND
========================================================= */

function bindUI(){

const amount=
document.getElementById(
"swapAmount"
);

const button=
document.getElementById(
"swapButton"
);

const from=
document.getElementById(
"swapFromAsset"
);

const to=
document.getElementById(
"swapToAsset"
);

const slippage=
document.getElementById(
"slippage"
);

amount?.addEventListener(
"input",
e=>{

setAmount(
e.target.value
);

}
);

from?.addEventListener(
"change",
e=>{

setFrom(
e.target.value
);

}
);

to?.addEventListener(
"change",
e=>{

setTo(
e.target.value
);

}
);

slippage?.addEventListener(
"input",
e=>{

setSlippage(
e.target.value
);

}
);

button?.addEventListener(
"click",
()=>{

execute();

}
);

}

/* =========================================================
   STATE
========================================================= */

function getState(){

return{
...state
};

}

function subscribe(callback){

listeners.add(
callback
);

callback(
getState()
);

return()=>{

listeners.delete(
callback
);

};

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindBinance();

bindUI();

calculate();

console.log(
"🔄 BLOXIO SWAP READY"
);

}

/* =========================================================
   API
========================================================= */

return{
init,
subscribe,
getState,
getHistory,
execute,
setFrom,
setTo,
setAmount,
setSlippage
};

})();

window.SwapFeed=
SwapFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>SwapFeed.init()
)
:SwapFeed.init();
