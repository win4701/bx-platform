/* =========================================================
   BLOXIO WALLET ENTERPRISE 2026
   Requires:
   - public/bx/data/coins.js
   - walletAssetsContainer
   - walletAssetSearch
   - walletTotal
   - walletStatus
========================================================= */

import {
COINS,
MAIN_ASSETS,
SECONDARY_ASSETS,
EXTENDED_ASSETS
} from "./data/coins.js";

(function(){

"use strict";

const $=id=>document.getElementById(id);
const safe=n=>Number(n)||0;

const state={
balances:{},
prices:{},
ws:null,
syncing:false,
activeGroup:"main",
activeAsset:null
};

async function api(url,body={}){
const res=await fetch(url,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(body)
});
return await res.json();
}

function getGroupAssets(){

if(state.activeGroup==="main"){
return MAIN_ASSETS;
}

if(state.activeGroup==="secondary"){
return SECONDARY_ASSETS;
}

return EXTENDED_ASSETS;

}

function getBalance(symbol){
return safe(
state.balances[symbol]
);
}

function buildAssetCard(asset){

const balance=
getBalance(asset.symbol);

return `
<div
class="wallet-asset-card"
data-symbol="${asset.symbol}"
data-group="${asset.group}">

<img
src="${asset.icon}"
alt="${asset.symbol}"
loading="lazy">

<div class="asset-meta">

<strong>
${asset.symbol}
</strong>

<span>
${asset.name}
</span>

</div>

<div class="asset-balance">

${balance.toFixed(4)}

</div>

</div>
`;

}

function renderAssets(){

const container=
$("walletAssetsContainer");

if(!container){
return;
}

container.innerHTML=
getGroupAssets()
.map(buildAssetCard)
.join("");

}

function renderWalletTotal(){

let total=0;

Object.entries(
state.balances
).forEach(([symbol,balance])=>{

const price=
safe(
state.prices[symbol]
);

total+=
safe(balance)*price;

});

if($("walletTotal")){
$("walletTotal").textContent=
"$"+
total.toFixed(2);
}

}

function renderBalances(){

renderAssets();
renderWalletTotal();

}

function openAssetSheet(symbol){

const asset=
COINS.find(
c=>c.symbol===symbol
);

if(!asset){
return;
}

state.activeAsset=
asset;

if($("assetSheetIcon")){
$("assetSheetIcon").src=
asset.icon;
}

if($("assetSheetSymbol")){
$("assetSheetSymbol").textContent=
asset.symbol;
}

if($("assetSheetName")){
$("assetSheetName").textContent=
asset.name;
}

renderNetworks(
asset.symbol
);

}

function renderNetworks(symbol){

const asset=
COINS.find(
c=>c.symbol===symbol
);

if(!asset){
return;
}

const select=
$("depositNetwork");

if(
!select ||
!asset.networks
){
return;
}

select.innerHTML=
asset.networks
.map(network=>
`<option value="${network}">${network}</option>`
)
.join("");

}

function bindCategories(){

document
.querySelectorAll(
".wallet-category-btn"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

document
.querySelectorAll(
".wallet-category-btn"
)
.forEach(el=>
el.classList.remove(
"active"
));

btn.classList.add(
"active"
);

state.activeGroup=
btn.dataset.group;

renderAssets();

});

});

}

function bindSearch(){

const input=
$("walletAssetSearch");

if(!input){
return;
}

input.addEventListener(
"input",
()=>{

const q=
input.value
.toLowerCase()
.trim();

const container=
$("walletAssetsContainer");

if(!container){
return;
}

const results=
COINS.filter(asset=>{

return (
asset.symbol
.toLowerCase()
.includes(q)

||

asset.name
.toLowerCase()
.includes(q)

);

});

container.innerHTML=
results
.map(buildAssetCard)
.join("");

});

}

async function syncWallet(){

if(state.syncing){
return;
}

state.syncing=true;

try{

const res=
await fetch(
"/api/wallet"
);

const data=
await res.json();

if(data.balances){

state.balances=
data.balances;

}

if(data.prices){

state.prices=
data.prices;

}

renderBalances();

}catch(err){

console.error(err);

}

state.syncing=false;

}

function connectWS(){

try{

const ws=
new WebSocket(
`wss://${location.host}/ws`
);

state.ws=ws;

ws.onmessage=(e)=>{

const msg=
JSON.parse(
e.data
);

switch(msg.type){

case "wallet_update":

state.balances=
msg.balances ||
state.balances;

renderBalances();

break;

case "market_prices":

state.prices=
msg.prices ||
state.prices;

renderWalletTotal();

break;

case "deposit_confirmed":

toast(
"Deposit Confirmed"
);

syncWallet();

break;

case "transfer_in":

toast(
"Transfer Received"
);

syncWallet();

break;

case "airdrop_claim":

state.balances.BX=
safe(
state.balances.BX
)+
safe(
msg.amount
);

renderBalances();

break;

}

};

ws.onclose=()=>{

setTimeout(
connectWS,
3000
);

};

}catch{

setInterval(
syncWallet,
5000
);

}

}

async function handleDeposit(){

const asset=
$("depositAsset")
?.value;

const amount=
safe(
$("depositAmount")
?.value
);

setStatus(
"depositStatus",
"Generating..."
);

const data=
await api(
"/api/payments/create",
{
asset,
amount
}
);

if(data?.address){

$("depositAddressText")
.textContent=
data.address;

toast(
"Address Generated"
);

}else{

toast(
"Deposit Error"
);

}

}

async function handleWithdraw(){

const asset=
$("withdrawAsset")
?.value;

const amount=
safe(
$("withdrawAmount")
?.value
);

const address=
$("withdrawAddress")
?.value;

if(
!amount ||
!address
){
return;
}

setStatus(
"withdrawStatus",
"Processing..."
);

const data=
await api(
"/api/payments/withdraw",
{
asset,
amount,
address
}
);

if(data?.error){

toast(
data.error
);

return;

}

toast(
"Withdraw Sent"
);

syncWallet();

}

async function handleTransfer(){

const asset=
$("transferAsset")
?.value ||
"BX";

const amount=
safe(
$("transferAmount")
?.value
);

const to=
$("transferUser")
?.value
?.trim();

if(
!amount ||
!to
){
return;
}

setStatus(
"transferStatus",
"Processing..."
);

const data=
await api(
"/api/finance/transfer",
{
asset,
amount,
to
}
);

if(data?.error){

toast(
data.error
);

return;

}

toast(
"Transfer Sent"
);

syncWallet();

}

function launchSwap(){

if(
!state.activeAsset
){
return;
}

if(
state.activeAsset.symbol==="BX"
){
return;
}

if($("swapFromAsset")){
$("swapFromAsset").value=
state.activeAsset.symbol;
}

if($("swapToAsset")){
$("swapToAsset").value=
"BX";
}

}

function toast(msg){

const el=
$("walletStatus");

if(!el){
return;
}

el.textContent=
msg;

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

if(!el){
return;
}

el.textContent=msg;

el.classList.remove(
"hidden"
);

}

function bind(){

document.addEventListener(
"click",
e=>{

const card=
e.target.closest(
".wallet-asset-card"
);

if(card){

openAssetSheet(
card.dataset.symbol
);

}

if(
e.target.id===
"generateDepositBtn"
){
handleDeposit();
}

if(
e.target.id===
"submitWithdrawBtn"
){
handleWithdraw();
}

if(
e.target.id===
"submitTransferBtn"
){
handleTransfer();
}

if(
e.target.id===
"walletQuickSwap"
){
launchSwap();
}

}
);

}

function init(){

bind();
bindSearch();
bindCategories();

renderAssets();

connectWS();
syncWallet();

console.log(
"🚀 BLOXIO WALLET ENTERPRISE READY"
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
