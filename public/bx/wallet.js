/* =========================================================
   BLOXIO WALLET — FULL WORKING SYSTEM (HTML MATCHED)
========================================================= */

(function(){
'use strict';

const $ = id => document.getElementById(id);
const safe = n => Number(n)||0;

/* ================= STATE ================= */

const state = {
  balances:{},
  activePanel:null
};

/* ================= API ================= */

async function api(url, body){
  const res = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function syncWallet(){

  try{
    const res = await fetch("/api/wallet");
    const data = await res.json();

    if(data.balances){
      state.balances = data.balances;
      renderBalances();
    }

  }catch(e){
    console.error("sync error",e);
  }
}

/* ================= RENDER ================= */

function renderBalances(){

  let total = 0;

  Object.keys(state.balances).forEach(asset=>{
    const val = safe(state.balances[asset]);

    const el = $(`bal-${asset.toLowerCase()}`);
    if(el) el.textContent = val.toFixed(4);

    total += val;
  });

  if($("walletTotal")){
    $("walletTotal").textContent = "$"+total.toFixed(2);
  }
}

/* ================= PANELS ================= */

function openPanel(id){

  document.querySelectorAll(".wallet-panel")
    .forEach(p=>p.classList.add("wallet-hidden"));

  const panel = $(id);
  if(panel){
    panel.classList.remove("wallet-hidden");
    state.activePanel = id;
  }
}

function closePanel(id){
  const panel = $(id);
  if(panel){
    panel.classList.add("wallet-hidden");
    state.activePanel = null;
  }
}

/* ================= DEPOSIT ================= */

async function handleDeposit(){

  const asset = $("depositAsset").value;

  setStatus("depositStatus","Generating...");

  try{

    const data = await api("/api/nowpayments/deposit",{ asset });

    if(data.error) return toast(data.error,"error");

    $("depositAddressText").textContent = data.address;

    toast("Deposit address ready","success");

  }catch{
    toast("Server error","error");
  }
}

/* ================= COPY ================= */

function copyDeposit(){

  const text = $("depositAddressText").textContent;

  navigator.clipboard.writeText(text);
  toast("Copied","success");
}

/* ================= WITHDRAW ================= */

async function handleWithdraw(){

  const asset = $("withdrawAsset").value;
  const amount = safe($("withdrawAmount").value);
  const address = $("withdrawAddress").value;

  if(!amount) return toast("Invalid amount","error");
  if(!address) return toast("Address required","error");

  setStatus("withdrawStatus","Processing...");

  try{

    const data = await api("/api/nowpayments/withdraw",{
      asset, amount, address
    });

    if(data.error) return toast(data.error,"error");

    toast("Withdraw done","success");

    syncWallet();

  }catch{
    toast("Server error","error");
  }
}

/* ================= TRANSFER ================= */

async function handleTransfer(){

  const asset = $("transferAsset").value;
  const amount = safe($("transferAmount").value);

  const to =
    $("transferTelegram").value ||
    $("transferTo").value;

  if(!amount) return toast("Invalid amount","error");
  if(!to) return toast("Recipient required","error");

  try{

    const data = await api("/api/wallet/transfer",{
      asset, amount, to
    });

    if(data.error) return toast(data.error,"error");

    toast("Transfer done","success");

    syncWallet();

  }catch{
    toast("Server error","error");
  }
}

/* ================= WALLETCONNECT ================= */

async function connectWallet(){

  try{

    const provider = new WalletConnectProvider.default({
      rpc:{1:"https://mainnet.infura.io/v3/"}
    });

    await provider.enable();

    const web3 = new Web3(provider);
    const acc = await web3.eth.getAccounts();

    $("walletConnectBtn").textContent = "Connected";
    toast(acc[0].slice(0,6),"success");

  }catch{
    toast("WalletConnect failed","error");
  }
}

/* ================= BINANCE ================= */

async function binancePay(){

  try{

    const res = await fetch("/api/binance/create-order",{method:"POST"});
    const data = await res.json();

    if(data.error) return toast(data.error,"error");

    window.open(data.checkoutUrl,"_blank");

  }catch{
    toast("Binance error","error");
  }
}

/* ================= SEARCH ================= */

function bindSearch(){

  const input = $("walletAssetSearch");
  if(!input) return;

  input.addEventListener("input",()=>{

    const val = input.value.toLowerCase();

    document.querySelectorAll(".wallet-row").forEach(row=>{
      const asset = row.dataset.asset.toLowerCase();

      row.style.display = asset.includes(val) ? "" : "none";
    });

  });

}

/* ================= INTELLIGENCE ================= */

function bindIntelligence(){

  $("walletIntelPrimary")?.addEventListener("click",()=>{
    openPanel("depositPanel");
  });

  $("walletIntelSecondary")?.addEventListener("click",()=>{
    document.querySelector('[data-view="market"]').click();
  });

}

/* ================= EVENTS ================= */

function bind(){

  document.addEventListener("click",(e)=>{

    // open panels
    if(e.target.dataset.walletOpen){
      openPanel(e.target.dataset.walletOpen);
    }

    // close panels
    if(e.target.dataset.walletClose){
      closePanel(e.target.dataset.walletClose);
    }

    // actions
    if(e.target.id==="generateDepositBtn") handleDeposit();
    if(e.target.id==="copyDepositBtn") copyDeposit();
    if(e.target.id==="submitWithdrawBtn") handleWithdraw();
    if(e.target.id==="submitTransferBtn") handleTransfer();

    if(e.target.id==="walletConnectBtn") connectWallet();
    if(e.target.id==="binanceConnectBtn") binancePay();

  });

}

/* ================= UI ================= */

function toast(msg,type){

  console.log(msg);

  const el = $("walletStatus");
  if(!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

  setTimeout(()=>el.classList.add("hidden"),2000);
}

function setStatus(id,msg){
  const el = $(id);
  if(el){
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}

/* ================= INIT ================= */

function init(){

  bind();
  bindSearch();
  bindIntelligence();

  syncWallet();
  setInterval(syncWallet,5000);

  console.log("💀 WALLET FULL READY");

}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();
