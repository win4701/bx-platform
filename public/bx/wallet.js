/* =========================================================
   BLOXIO WALLET — FINAL ULTIMATE SYSTEM
========================================================= */

(function(){
'use strict';

const $ = id => document.getElementById(id);
const safe = n => Number(n)||0;

/* =========================================================
📊 ASSETS SYSTEM
========================================================= */

const ASSETS = {
  BX:{name:"Bloxio",d:4},
  USDT:{name:"Tether",d:2},
  USDC:{name:"USD Coin",d:2},
  BTC:{name:"Bitcoin",d:8},
  ETH:{name:"Ethereum",d:6},
  BNB:{name:"BNB",d:4},
  SOL:{name:"Solana",d:4},
  TON:{name:"Toncoin",d:4},
  AVAX:{name:"Avalanche",d:4},
  LTC:{name:"Litecoin",d:4},
  ZEC:{name:"Zcash",d:4}
};

/* =========================================================
📦 STATE
========================================================= */

const state = {
  balances:{},
  ws:null,
  syncing:false
};

/* =========================================================
🌐 API
========================================================= */

async function api(url, body){
  const res = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  return await res.json();
}

/* =========================================================
⚡ WEBSOCKET ENGINE
========================================================= */

function connectWS(){

  try{

    const ws = new WebSocket(`wss://${location.host}/ws`);
    state.ws = ws;

    ws.onopen = ()=> console.log("⚡ WS CONNECTED");

    ws.onmessage = (e)=>{

      const msg = JSON.parse(e.data);

      /* WALLET */
      if(msg.type==="wallet_update"){
        state.balances = msg.balances || state.balances;
        renderBalances();
      }

      /* CASINO */
      if(msg.type==="casino_balance"){
        state.balances.BX = msg.balance;
        renderBalances();
      }

      /* MINING */
      if(msg.type==="mining_reward"){
        state.balances.BX = safe(state.balances.BX) + msg.amount;
        renderBalances();
        toast("Mining +" + msg.amount);
      }

      /* MARKET */
      if(msg.type==="market_balance"){
        state.balances = msg.balances;
        renderBalances();
      }

      /* DEPOSIT */
      if(msg.type==="deposit_pending"){
        setStatus("depositStatus","Pending...");
      }

      if(msg.type==="deposit_confirmed"){
        toast("Deposit confirmed 💰");
        syncWallet();
      }

      /* TRANSFER */
      if(msg.type==="transfer_in"){
        toast("Received funds 💸");
        syncWallet();
      }

      /* FRAUD */
      if(msg.type==="fraud_alert"){
        toast("Security alert ⚠️");
      }

    };

    ws.onclose = ()=>{
      setTimeout(connectWS,2000);
    };

  }catch{
    setInterval(syncWallet,5000);
  }

}

/* =========================================================
🔁 SYNC FALLBACK
========================================================= */

async function syncWallet(){

  if(state.syncing) return;
  state.syncing = true;

  try{
    const res = await fetch("/api/wallet");
    const data = await res.json();

    if(data.balances){
      state.balances = data.balances;
      renderBalances();
    }

  }catch{}

  state.syncing = false;
}

/* =========================================================
💰 RENDER
========================================================= */

function renderBalances(){

  let total = 0;

  Object.entries(state.balances).forEach(([asset,val])=>{

    const meta = ASSETS[asset] || {d:4};
    const value = safe(val);

    const el = $(`bal-${asset.toLowerCase()}`);
    if(el) el.textContent = value.toFixed(meta.d);

    total += value;

  });

  if($("walletTotal")){
    $("walletTotal").textContent = "$"+total.toFixed(2);
  }

}

/* =========================================================
💰 DEPOSIT
========================================================= */

async function handleDeposit(){

  const asset = $("depositAsset")?.value;
  const amount = safe($("depositAmount")?.value || 0);

  setStatus("depositStatus","Generating address...");

  const data = await api("/api/payments/create",{
    asset,
    amount: amount || undefined
  });

  if(data?.address){

    $("depositAddressText").textContent = data.address;

    if(window.QRCode && $("depositQR")){
      $("depositQR").classList.remove("hidden");
      $("depositQR").innerHTML = "";
      new QRCode($("depositQR"), data.address);
    }

    toast("Send crypto to address");

  }else{
    toast("Deposit error");
  }

}

/* =========================================================
💸 WITHDRAW
========================================================= */

async function handleWithdraw(){

  const asset = $("withdrawAsset")?.value;
  const amount = safe($("withdrawAmount")?.value);
  const address = $("withdrawAddress")?.value;

  if(!amount || !address) return toast("Invalid input");

  setStatus("withdrawStatus","Processing...");

  const data = await api("/api/payments/withdraw",{ asset, amount, address });

  if(data?.error){
    toast(data.error);
  }else{
    toast("Withdraw sent");
    syncWallet();
  }

}

/* =========================================================
💸 TRANSFER PRO
========================================================= */

async function handleTransfer(){

  const asset = $("transferAsset")?.value || "BX";
  const amount = safe($("transferAmount")?.value);
  const to = $("transferUser")?.value?.trim();

  if(!amount) return toast("Invalid amount");
  if(!to) return toast("Enter user ID or email");

  setStatus("transferStatus","Processing...");

  const data = await api("/api/finance/transfer",{ asset, amount, to });

  if(data?.error){
    toast(data.error);
  }else{
    toast("Transfer sent 💸");
    syncWallet();
    resetTransfer();
  }

}

function resetTransfer(){
  if($("transferAmount")) $("transferAmount").value="";
  if($("transferUser")) $("transferUser").value="";
}

/* =========================================================
📋 COPY
========================================================= */

function copyDeposit(){

  const txt = $("depositAddressText")?.textContent;
  if(!txt || txt==="—") return;

  navigator.clipboard.writeText(txt);
  toast("Copied");

}

/* =========================================================
🔐 ANTI-FRAUD UI
========================================================= */

function antiFraud(){

  window.addEventListener("blur",()=>console.warn("focus lost"));

  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){
      console.warn("tab hidden");
    }
  });

}

/* =========================================================
🔍 SEARCH
========================================================= */

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

/* =========================================================
🎯 EVENTS
========================================================= */

function bind(){

  document.addEventListener("click",(e)=>{

    /* PANELS */
    if(e.target.dataset.walletOpen){
      document.querySelectorAll(".wallet-panel")
        .forEach(p=>p.classList.add("wallet-hidden"));

      $(e.target.dataset.walletOpen)?.classList.remove("wallet-hidden");
    }

    if(e.target.dataset.walletClose){
      $(e.target.dataset.walletClose)?.classList.add("wallet-hidden");
    }

    /* QUICK ACTIONS */
    if(e.target.id==="depositNowBtn" || e.target.id==="openDepositBtn"){
      $("depositPanel")?.classList.remove("wallet-hidden");
    }

    if(e.target.id==="exploreMarketBtn"){
      document.querySelectorAll(".view")
        .forEach(v=>v.classList.remove("active"));

      $("market")?.classList.add("active");
    }

    /* ACTIONS */
    if(e.target.id==="generateDepositBtn") handleDeposit();
    if(e.target.id==="copyDepositBtn") copyDeposit();
    if(e.target.id==="submitWithdrawBtn") handleWithdraw();
    if(e.target.id==="submitTransferBtn") handleTransfer();

  });

}

/* =========================================================
🔔 UI
========================================================= */

function toast(msg){

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

/* =========================================================
🚀 INIT
========================================================= */

function init(){

  bind();
  bindSearch();

  connectWS();
  syncWallet();
  antiFraud();

  console.log("🚀 WALLET FINAL SYSTEM READY");

}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();
