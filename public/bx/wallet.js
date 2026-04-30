/* =========================================================
   BLOXIO WALLET — FINAL STABLE (HTML MATCH VERSION)
========================================================= */

(function(){
'use strict';

const $ = id => document.getElementById(id);
const safe = n => Number(n)||0;

/* ================= STATE ================= */

const state = {
  balances:{}
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

/* ================= SYNC ================= */

async function syncWallet(){

  try{

    const res = await fetch("/api/wallet");
    const data = await res.json();

    if(data.balances){
      state.balances = data.balances;
      renderBalances();
    }

  }catch(e){
    console.error("wallet sync error",e);
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

/* =========================================================
💰 DEPOSIT
========================================================= */

async function handleDeposit(){

  const asset = $("depositAsset").value;
  const amount = safe(prompt("Enter amount USD"));

  if(!amount){
    return toast("Invalid amount","error");
  }

  setStatus("depositStatus","Creating payment...");

  try{

    const data = await api("/api/payments/create",{
      asset,
      amount
    });

    if(data.error){
      return toast(data.error,"error");
    }

    $("depositAddressText").textContent = data.address;

    toast("Send crypto to this address","success");

  }catch{
    toast("Server error","error");
  }

}

/* =========================================================
💸 WITHDRAW
========================================================= */

async function handleWithdraw(){

  const asset = $("withdrawAsset").value;
  const amount = safe($("withdrawAmount").value);
  const address = $("withdrawAddress").value;

  if(!amount){
    return toast("Invalid amount","error");
  }

  if(!address){
    return toast("Address required","error");
  }

  setStatus("withdrawStatus","Processing...");

  try{

    const data = await api("/api/payments/withdraw",{
      asset,
      amount,
      address
    });

    if(data.error){
      return toast(data.error,"error");
    }

    toast("Withdraw sent","success");

    syncWallet();

  }catch{
    toast("Server error","error");
  }

}

/* =========================================================
🔁 TRANSFER
========================================================= */

async function handleTransfer(){

  const asset = $("transferAsset").value;
  const amount = safe($("transferAmount").value);

  const to =
    $("transferTelegram").value ||
    $("transferTo").value;

  if(!amount){
    return toast("Invalid amount","error");
  }

  if(!to){
    return toast("Recipient required","error");
  }

  try{

    const data = await api("/api/finance/transfer",{
      asset,
      amount,
      to_user: to
    });

    if(data.error){
      return toast(data.error,"error");
    }

    toast("Transfer done","success");

    syncWallet();

  }catch{
    toast("Server error","error");
  }

}

/* =========================================================
📋 COPY ADDRESS
========================================================= */

function copyDeposit(){

  const txt = $("depositAddressText").textContent;

  if(!txt || txt === "—"){
    return;
  }

  navigator.clipboard.writeText(txt);

  toast("Copied","success");

}

/* =========================================================
🔔 UI
========================================================= */

function toast(msg){

  const el = $("walletStatus");

  if(!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

  setTimeout(()=>{
    el.classList.add("hidden");
  },2000);

}

function setStatus(id,msg){

  const el = $(id);

  if(!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

}

/* =========================================================
🎯 EVENTS
========================================================= */

function bind(){

  document.addEventListener("click",(e)=>{

    // panels
    if(e.target.dataset.walletOpen){
      document.querySelectorAll(".wallet-panel")
        .forEach(p=>p.classList.add("wallet-hidden"));

      $(e.target.dataset.walletOpen)?.classList.remove("wallet-hidden");
    }

    if(e.target.dataset.walletClose){
      $(e.target.dataset.walletClose)?.classList.add("wallet-hidden");
    }

    // actions
    if(e.target.id==="generateDepositBtn") handleDeposit();
    if(e.target.id==="copyDepositBtn") copyDeposit();
    if(e.target.id==="submitWithdrawBtn") handleWithdraw();
    if(e.target.id==="submitTransferBtn") handleTransfer();

  });

}

/* =========================================================
🚀 INIT
========================================================= */

function init(){

  bind();

  syncWallet();
  setInterval(syncWallet,5000);

  console.log("✅ WALLET FINAL READY");

}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();
