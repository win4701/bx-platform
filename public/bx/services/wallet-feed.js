/* =========================================================
   FILE: public/bx/services/wallet-feed.js
   BLOXIO WALLET FEED ENGINE 2026
   Depends:
   - coins.js
   - socket.js
========================================================= */

export const WalletFeed=(function(){

let connected=false;

const listeners=new Set();

const state={
totalUSD:0,
totalBX:0,
assets:new Map(),
main:[],
secondary:[],
extended:[],
lastUpdate:0
};

/* =========================================================
   CATEGORIES
========================================================= */

const MAIN=[
"BX","BTC","ETH","BNB","SOL",
"TON","USDT","USDC","XRP","TRX"
];

const SECONDARY=[
"LINK","AVAX","DOT","AAVE","LTC",
"BCH","XMR","DASH","ATOM","NEAR",
"ICP","ARB","OP","FIL","HBAR",
"SUI","APT","ETC","XLM","ADA"
];

const EXTENDED=[
"ZEC","XTZ","ALGO","UNI","MKR",
"SNX","1INCH","YFI","KSM","KCS",
"CAKE","HT","GBG","FLOW","CHZ",
"APE","PEPE","SHIB","BONK","WAVES",
"ICX","QTUM","BAT","ENJ","INJ",
"MASK","GMX","DOGE","DAI","POL",
"NEO","VET","TUSD"
];

/* =========================================================
   DEFAULT PRICES
========================================================= */

const PRICES={
BX:45,
BTC:65000,
ETH:3500,
BNB:700,
SOL:180,
TON:6,
USDT:1,
USDC:1,
XRP:0.7,
TRX:0.12
};

/* =========================================================
   HELPERS
========================================================= */

function emit(){

state.lastUpdate=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
"WalletFeed",
error
);

}

});

}

function createAsset(symbol){

const lower=
symbol.toLowerCase();

return{
symbol,
name:symbol,
icon:`/assets/images/coins/${lower}.png`,
balance:0,
locked:0,
price:PRICES[symbol]||0,
usdValue:0,
change24h:0
};

}

function ensureAsset(symbol){

if(
!state.assets.has(symbol)
){

state.assets.set(
symbol,
createAsset(symbol)
);

}

return state.assets.get(
symbol
);

}

/* =========================================================
   BUILD
========================================================= */

function buildAssets(){

[
...MAIN,
...SECONDARY,
...EXTENDED
].forEach(symbol=>{

ensureAsset(
symbol
);

});

state.main=
MAIN;

state.secondary=
SECONDARY;

state.extended=
EXTENDED;

}

/* =========================================================
   BALANCE
========================================================= */

function updateBalance(
symbol,
balance,
price
){

const asset=
ensureAsset(
symbol
);

asset.balance=
Number(balance)||0;

if(price){

asset.price=
Number(price)||0;

}

asset.usdValue=
asset.balance*
asset.price;

recalculate();

emit();

}

function updatePrice(
symbol,
price
){

const asset=
ensureAsset(
symbol
);

asset.price=
Number(price)||0;

asset.usdValue=
asset.balance*
asset.price;

recalculate();

emit();

}

function recalculate(){

let totalUSD=0;

let totalBX=0;

state.assets.forEach(asset=>{

totalUSD+=
asset.usdValue;

totalBX+=
asset.usdValue/45;

});

state.totalUSD=
totalUSD;

state.totalBX=
totalBX;

updateWalletHeader();

}

/* =========================================================
   HEADER
========================================================= */

function updateWalletHeader(){

const total=
document.getElementById(
"walletTotal"
);

const primary=
document.getElementById(
"walletIntelPrimary"
);

const secondary=
document.getElementById(
"walletIntelSecondary"
);

if(total){

total.textContent=
`$${state.totalUSD.toFixed(2)}`;

}

if(primary){

primary.textContent=
`${state.totalBX.toFixed(4)} BX`;

}

if(secondary){

secondary.textContent=
`${state.assets.size} Assets`;

}

}

/* =========================================================
   SEARCH
========================================================= */

function search(query){

query=
String(query||"")
.toUpperCase();

const assets=
Array.from(
state.assets.values()
);

if(!query){

return assets;

}

return assets.filter(asset=>
asset.symbol.includes(query)
);

}

/* =========================================================
   FILTER
========================================================= */

function getMainAssets(){

return state.main.map(
symbol=>state.assets.get(
symbol
)
);

}

function getSecondaryAssets(){

return state.secondary.map(
symbol=>state.assets.get(
symbol
)
);

}

function getExtendedAssets(){

return state.extended.map(
symbol=>state.assets.get(
symbol
)
);

}

/* =========================================================
   RENDER
========================================================= */

function renderAssets(type="main"){

const container=
document.getElementById(
"walletAssetsGrid"
);

if(!container){
return;
}

let assets=[];

if(type==="main"){
assets=getMainAssets();
}

if(type==="secondary"){
assets=getSecondaryAssets();
}

if(type==="extended"){
assets=getExtendedAssets();
}

container.innerHTML=
assets.map(asset=>`
<div class="wallet-asset-card" data-symbol="${asset.symbol}">
<img src="${asset.icon}" alt="${asset.symbol}" loading="lazy">
<div class="wallet-asset-info">
<strong>${asset.symbol}</strong>
<span>${asset.balance.toFixed(6)}</span>
</div>
<div class="wallet-asset-value">
$${asset.usdValue.toFixed(2)}
</div>
</div>
`).join("");

}

/* =========================================================
   SEARCH INPUT
========================================================= */

function bindSearch(){

const input=
document.getElementById(
"walletAssetSearch"
);

if(!input){
return;
}

input.addEventListener(
"input",
e=>{

const results=
search(
e.target.value
);

const container=
document.getElementById(
"walletAssetsGrid"
);

if(!container){
return;
}

container.innerHTML=
results.map(asset=>`
<div class="wallet-asset-card">
<img src="${asset.icon}" alt="${asset.symbol}">
<div class="wallet-asset-info">
<strong>${asset.symbol}</strong>
<span>${asset.balance.toFixed(6)}</span>
</div>
<div class="wallet-asset-value">
$${asset.usdValue.toFixed(2)}
</div>
</div>
`).join("");

}
);

}

/* =========================================================
   CATEGORY TABS
========================================================= */

function bindTabs(){

document
.querySelectorAll(
"[data-wallet-tab]"
)
.forEach(tab=>{

tab.addEventListener(
"click",
()=>{

document
.querySelectorAll(
"[data-wallet-tab]"
)
.forEach(btn=>
btn.classList.remove(
"active"
)
);

tab.classList.add(
"active"
);

renderAssets(
tab.dataset.walletTab
);

}
);

});

}

/* =========================================================
   SOCKET
========================================================= */

function bindSocket(){

if(
!window.BXSocket
){
return;
}

window.BXSocket.walletFeed(
payload=>{

connected=true;

if(
payload.asset
){

updateBalance(
payload.asset,
payload.balance,
payload.price
);

}

}
);

}

/* =========================================================
   MOCK
========================================================= */

function startMockMode(){

state.assets.forEach(asset=>{

asset.balance=
Number(
(Math.random()*100)
.toFixed(6)
);

asset.price=
asset.price||
1;

asset.usdValue=
asset.balance*
asset.price;

});

recalculate();

renderAssets(
"main"
);

emit();

}

/* =========================================================
   API
========================================================= */

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

function getState(){

return{
totalUSD:state.totalUSD,
totalBX:state.totalBX,
main:getMainAssets(),
secondary:getSecondaryAssets(),
extended:getExtendedAssets(),
lastUpdate:state.lastUpdate
};

}

function getAsset(symbol){

return state.assets.get(
symbol
);

}

/* =========================================================
   INIT
========================================================= */

function init(){

buildAssets();

bindSearch();

bindTabs();

bindSocket();

startMockMode();

console.log(
"💳 BLOXIO WALLET FEED READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{
init,
subscribe,
getState,
getAsset,
updateBalance,
updatePrice,
renderAssets,
search
};

})();

window.WalletFeed=
WalletFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>WalletFeed.init()
)
:WalletFeed.init();
