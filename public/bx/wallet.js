/* =========================================================
   BLOXIO — WALLET FINAL REAL SYSTEM
   (NowPayments + Binance Pay + Sync + Safe UI)
========================================================= */

(function () {
'use strict';

/* ================= CONFIG ================= */

const API = {
  WALLET: "/api/wallet",
  DEPOSIT: "/api/nowpayments/deposit",
  WITHDRAW: "/api/nowpayments/withdraw",
  TRANSFER: "/api/wallet/transfer",
  BINANCE: "/api/binance/create-order"
};

const ASSETS = ['BX','USDT','USDC','BTC','BNB','ETH','AVAX','ZEC','TON','SOL','LTC'];

/* ================= STATE ================= */

const state = {
  balances:{},
  depositAddress:''
};

const $ = id => document.getElementById(id);
const safe = n => Number(n)||0;

/* ================= CORE ================= */

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
    const res = await fetch(API.WALLET);
    const data = await res.json();

    if(data.balances){
      state.balances = data.balances;
      render();
    }

  }catch{
    console.error("sync error");
  }
}

/* ================= RENDER ================= */

function render(){

  let total = 0;

  ASSETS.forEach(a=>{
    const el = $(`bal-${a.toLowerCase()}`);
    const val = safe(state.balances[a]);

    if(el) el.textContent = val.toFixed(4);

    total += val;
  });

  if($("walletTotal")){
    $("walletTotal").textContent = "$"+total.toFixed(2);
  }
}

/* ================= DEPOSIT ================= */

async function deposit(){

  const asset = $("depositAsset").value;

  setStatus("depositStatus","Generating...");

  try{

    const data = await api(API.DEPOSIT,{ asset });

    if(data.error) return toast(data.error,"error");

    state.depositAddress = data.address;

    $("depositAddressText").textContent = data.address;

    toast("Deposit address ready","success");

  }catch{
    toast("Server error","error");
  }
}

/* ================= WITHDRAW ================= */

async function withdraw(){

  const asset = $("withdrawAsset").value;
  const amount = safe($("withdrawAmount").value);
  const address = $("withdrawAddress").value;

  if(!amount) return toast("Invalid amount","error");
  if(!address) return toast("Address required","error");

  setStatus("withdrawStatus","Processing...");

  try{

    const data = await api(API.WITHDRAW,{
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

async function transfer(){

  const asset = $("transferAsset").value;
  const amount = safe($("transferAmount").value);
  const to =
    $("transferTelegram").value ||
    $("transferTo").value;

  if(!amount) return toast("Invalid amount","error");
  if(!to) return toast("Recipient required","error");

  try{

    const data = await api(API.TRANSFER,{
      asset, amount, to
    });

    if(data.error) return toast(data.error,"error");

    toast("Transfer done","success");

    syncWallet();

  }catch{
    toast("Server error","error");
  }
}

/* ================= BINANCE PAY ================= */

async function binancePay(){

  try{

    const res = await fetch(API.BINANCE,{ method:"POST" });
    const data = await res.json();

    if(data.error) return toast(data.error,"error");

    window.open(data.checkoutUrl,"_blank");

  }catch{
    toast("Binance error","error");
  }
}

/* ================= WALLETCONNECT ================= */

async function connectWallet(){

  try{

    const provider = new WalletConnectProvider.default({
      rpc: {1:"https://mainnet.infura.io/v3/"}
    });

    await provider.enable();

    const web3 = new Web3(provider);
    const acc = await web3.eth.getAccounts();

    toast("Connected: "+acc[0].slice(0,6),"success");

  }catch{
    toast("WalletConnect failed","error");
  }
}

/* ================= UI ================= */

function toast(msg,type){

  const el = $("walletToast");
  if(!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

  setTimeout(()=>el.classList.add("hidden"),2000);
}

function setStatus(id,msg){
  const el = $(id);
  if(el) el.textContent = msg;
}

/* ================= EVENTS ================= */

function bind(){

  $("generateDepositBtn")?.addEventListener("click",deposit);
  $("submitWithdrawBtn")?.addEventListener("click",withdraw);
  $("submitTransferBtn")?.addEventListener("click",transfer);

  $("walletConnectBtn")?.addEventListener("click",connectWallet);
  $("binanceConnectBtn")?.addEventListener("click",binancePay);
}

/* ================= INIT ================= */

function init(){

  bind();

  syncWallet();
  setInterval(syncWallet,5000);

  window.addEventListener("bx:balances:updated", syncWallet);

  console.log("💀 WALLET FINAL READY");
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();
