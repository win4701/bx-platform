/* =========================================================
   BLOXIO WALLET — PRO MAX (REALTIME + PAYMENTS)
========================================================= */

(function(){
'use strict';

const $ = id => document.getElementById(id);
const safe = n => Number(n)||0;

/* ================= STATE ================= */

const state = {
  balances:{},
  activePanel:null,
  deposit:null,
  ws:null
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
    const res = await fetch("/api/finance/balance");
    const data = await res.json();

    if(data.balances){
      state.balances = data.balances;
      renderBalances();
    }

  }catch(e){
    console.warn("sync fallback");
  }
}

/* ================= REALTIME (WS) ================= */

function connectWS(){

  try{

    const ws = new WebSocket(`wss://${location.host}/ws`);
    state.ws = ws;

    ws.onmessage = (e)=>{

      const msg = JSON.parse(e.data);

      if(msg.type === "wallet_update"){
        state.balances = msg.balances;
        renderBalances();
      }

      if(msg.type === "deposit_confirmed"){
        toast("Deposit confirmed","success");
        syncWallet();
      }

    };

    ws.onclose = ()=> setTimeout(connectWS,3000);

  }catch{
    setInterval(syncWallet,5000);
  }

}

/* ================= RENDER ================= */

function renderBalances(){

  let total = 0;

  Object.keys(state.balances).forEach(asset=>{

    const data = state.balances[asset];
    const val = safe(data.available || data);

    const el = $(`bal-${asset.toLowerCase()}`);
    if(el) el.textContent = val.toFixed(4);

    total += val;

  });

  if($("walletTotal")){
    $("walletTotal").textContent = "$"+total.toFixed(2);
  }

}

/* =========================================================
💰 DEPOSIT (REAL + QR + STATUS)
========================================================= */

async function handleDeposit(){

  const asset = $("depositAsset").value;
  const amount = safe(prompt("Enter amount USD"));

  if(!amount) return toast("Invalid amount","error");

  setStatus("depositStatus","Creating payment...");

  try{

    const data = await api("/api/payments/create",{ asset, amount });

    if(data.error) return toast(data.error,"error");

    state.deposit = data;

    $("depositAddressText").textContent = data.address;

    generateQR(data.address);

    showDepositStatus("Waiting payment...");

    monitorDeposit();

  }catch{
    toast("Server error","error");
  }

}

/* ================= QR ================= */

function generateQR(address){

  const canvas = $("depositQR");
  if(!canvas || !window.QRCode) return;

  canvas.innerHTML = "";

  new QRCode(canvas,{
    text: address,
    width: 160,
    height: 160
  });

}

/* ================= STATUS ================= */

function showDepositStatus(msg){
  if($("depositLiveStatus")){
    $("depositLiveStatus").textContent = msg;
  }
}

/* ================= MONITOR ================= */

function monitorDeposit(){

  let t = 0;

  const interval = setInterval(async ()=>{

    t++;

    if(t > 120){
      clearInterval(interval);
      showDepositStatus("Expired");
      return;
    }

    showDepositStatus("Waiting confirmations...");

    await syncWallet();

  },5000);

}

/* =========================================================
💸 WITHDRAW (SAFE UI)
========================================================= */

async function handleWithdraw(){

  const asset = $("withdrawAsset").value;
  const amount = safe($("withdrawAmount").value);
  const address = $("withdrawAddress").value;

  if(!amount) return toast("Invalid amount","error");
  if(!address) return toast("Address required","error");

  setStatus("withdrawStatus","Sending...");

  try{

    const data = await api("/api/payments/withdraw",{ asset, amount, address });

    if(data.error) return toast(data.error,"error");

    toast("Withdraw sent","success");

    syncWallet();

  }catch{
    toast("Server error","error");
  }

}

/* ================= TRANSFER ================= */

async function handleTransfer(){

  const asset = $("transferAsset").value;
  const amount = safe($("transferAmount").value);
  const to = $("transferTo").value;

  if(!amount) return toast("Invalid amount","error");
  if(!to) return toast("Recipient required","error");

  try{

    const data = await api("/api/finance/transfer",{ asset, amount, to_user: to });

    if(data.error) return toast(data.error,"error");

    toast("Transfer done","success");
    syncWallet();

  }catch{
    toast("Server error","error");
  }

}

/* ================= COPY ================= */

function copyDeposit(){
  const t = $("depositAddressText").textContent;
  if(!t) return;
  navigator.clipboard.writeText(t);
  toast("Copied","success");
}

/* ================= UI ================= */

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

/* ================= EVENTS ================= */

function bind(){

  document.addEventListener("click",(e)=>{

    if(e.target.dataset.walletOpen){
      document.querySelectorAll(".wallet-panel")
      .forEach(p=>p.classList.add("wallet-hidden"));

      $(e.target.dataset.walletOpen)?.classList.remove("wallet-hidden");
    }

    if(e.target.dataset.walletClose){
      $(e.target.dataset.walletClose)?.classList.add("wallet-hidden");
    }

    if(e.target.id==="generateDepositBtn") handleDeposit();
    if(e.target.id==="copyDepositBtn") copyDeposit();
    if(e.target.id==="submitWithdrawBtn") handleWithdraw();
    if(e.target.id==="submitTransferBtn") handleTransfer();

  });

}

/* ================= INIT ================= */

function init(){

  bind();
  connectWS();      // 🔥 realtime
  syncWallet();     // fallback

  console.log("🚀 WALLET PRO MAX READY");

}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();
