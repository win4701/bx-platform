/* =========================================================
   BLOXIO WALLET — FINAL COMPLETE (NO BREAK VERSION)
========================================================= */

(function(){
'use strict';

const $ = id => document.getElementById(id);
const safe = n => Number(n)||0;

/* ================= STATE ================= */

const state = {
  balances:{},
  syncing:false
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

  if(state.syncing) return;
  state.syncing = true;

  try{

    const res = await fetch("/api/wallet");
    const data = await res.json();

    if(data && data.balances){
      state.balances = data.balances;
      renderBalances();
    }

  }catch(e){
    console.error("wallet sync error", e);
  }

  state.syncing = false;
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
💰 DEPOSIT (NO POPUP — CORRECT FLOW)
========================================================= */

async function handleDeposit(){

  const asset = $("depositAsset")?.value;
  const amount = safe($("depositAmount")?.value || 0);

  if(!asset) return toast("Select asset");

  setStatus("depositStatus","Generating address...");

  try{

    const data = await api("/api/payments/create",{
      asset,
      amount: amount || undefined
    });

    if(!data || data.error){
      return toast(data?.error || "Deposit failed");
    }

    $("depositAddressText").textContent = data.address || "Error";

    // QR optional
    if(window.QRCode && $("depositQR")){
      $("depositQR").classList.remove("hidden");
      $("depositQR").innerHTML = "";
      new QRCode($("depositQR"), {
        text: data.address,
        width: 160,
        height: 160
      });
    }

    toast("Send crypto to address");

  }catch{
    toast("Server error");
  }

}

/* =========================================================
📋 COPY ADDRESS
========================================================= */

function copyDeposit(){

  const txt = $("depositAddressText")?.textContent;

  if(!txt || txt==="—"){
    return toast("No address");
  }

  navigator.clipboard.writeText(txt);
  toast("Copied");

}

/* =========================================================
💸 WITHDRAW
========================================================= */

async function handleWithdraw(){

  const asset = $("withdrawAsset")?.value;
  const amount = safe($("withdrawAmount")?.value);
  const address = $("withdrawAddress")?.value;

  if(!amount) return toast("Invalid amount");
  if(!address) return toast("Address required");

  setStatus("withdrawStatus","Processing...");

  try{

    const data = await api("/api/payments/withdraw",{
      asset,
      amount,
      address
    });

    if(data?.error){
      return toast(data.error);
    }

    toast("Withdraw sent");
    syncWallet();

  }catch{
    toast("Server error");
  }

}

/* =========================================================
🔁 TRANSFER
========================================================= */

async function handleTransfer(){

  const asset = $("transferAsset")?.value;
  const amount = safe($("transferAmount")?.value);

  const to =
    $("transferTelegram")?.value ||
    $("transferTo")?.value;

  if(!amount) return toast("Invalid amount");
  if(!to) return toast("Recipient required");

  try{

    const data = await api("/api/finance/transfer",{
      asset,
      amount,
      to_user: to
    });

    if(data?.error){
      return toast(data.error);
    }

    toast("Transfer done");
    syncWallet();

  }catch{
    toast("Server error");
  }

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

    // open panel
    if(e.target.dataset.walletOpen){
      document.querySelectorAll(".wallet-panel")
        .forEach(p=>p.classList.add("wallet-hidden"));

      $(e.target.dataset.walletOpen)?.classList.remove("wallet-hidden");
    }

    // close panel
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
🚀 INIT
========================================================= */

function init(){

  bind();
  bindSearch();

  syncWallet();
  setInterval(syncWallet,7000); // stable polling

  console.log("✅ WALLET FINAL COMPLETE READY");

}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();
