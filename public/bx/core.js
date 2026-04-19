// =====================================================
// BLOXIO CORE — CLEAN ENGINE (NO ROUTER)
// =====================================================

'use strict';

// ================= CONFIG =================
const CONFIG = {
  API: "https://api.bloxio.online",
  WS: "wss://api.bloxio.online"
};

// ================= GLOBAL =================
window.APP = window.APP || {
  user: null,
  ready: false
};

// ================= TELEGRAM =================
async function initTelegram(){

  const tg = window.Telegram?.WebApp;
  if(!tg) return;

  try{

    tg.expand();
    tg.setHeaderColor("#0b0f1a");
    tg.setBackgroundColor("#0b0f1a");

    const user = tg.initDataUnsafe?.user;
    if(!user) return;

    APP.user = user;

    console.log("👤 TG USER:", user);

    // auto login
    const res = await fetch(CONFIG.API + "/auth/telegram", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        telegram_id: user.id,
        username: user.username
      })
    });

    const data = await res.json();

    if(data?.token){
      localStorage.setItem("token", data.token);
    }

  }catch(e){
    console.warn("TG init failed");
  }

}

// ================= WS =================
function initWS(){

  if(!window.WS) return;

  try{
    WS.connect();
  }catch(e){
    console.warn("WS connect error");
  }

}

// ================= SAFE START MODULES =================
function safeInit(){

  try{

    // Wallet preload (optional safe)
    window.WALLET?.init?.();

    // Market minimal preload
    window.initMarket?.();

    // Casino preload
    window.CASINO?.init?.();

    // Mining preload
    window.renderMining?.();

    // Airdrop preload
    window.initAirdrop?.();

  }catch(e){
    console.warn("Module preload error", e);
  }

}

// ================= READY =================
function ready(){

  APP.ready = true;

  console.log("🚀 BX CORE READY");

}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async ()=>{

  console.log("🚀 BX CORE START (CLEAN)");

  await initTelegram();

  initWS();

  safeInit();

  ready();

});
