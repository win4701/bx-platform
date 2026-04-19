/* =========================================================
   BX CORE ENGINE (FINAL STABLE - NO CONFLICT)
========================================================= */

// ================= CONFIG =================

const CONFIG = {
  API: "https://api.bloxio.online",
  WS: "wss://api.bloxio.online"
};

// ================= GLOBAL =================

window.APP = {
  view: null,
  user: null,
  ready: false
};

// ================= NAVIGATION =================

function switchView(view){

  if(!view || APP.view === view) return;

  // 🔥 stop WS services (from ws.js)
  if(window.WS){
    WS.channels?.forEach(c => WS.unsubscribe(c));
  }

  // hide all
  document.querySelectorAll(".view").forEach(v=>{
    v.style.display = "none";
    v.classList.remove("active");
  });

  // show current
  const el = document.getElementById(view);

  if(!el){
    console.warn("View not found:", view);
    return;
  }

  el.style.display = "block";
  el.classList.add("active");

  // 🔥 update nav active
  document.querySelectorAll(".bottom-nav button")
    .forEach(b => b.classList.remove("active"));

  document.querySelector(`[data-view="${view}"]`)
    ?.classList.add("active");

  APP.view = view;

  loadView(view);
}

// ================= LOAD VIEW =================

function loadView(view){

  try{

    switch(view){

      case "wallet":
        window.WALLET?.init();
        break;

      case "market":
        window.WS?.subscribe("market");
        window.initMarket?.();
        break;

      case "casino":
        window.WS?.subscribe("casino");
        window.CASINO?.init();
        break;

      case "mining":
        window.renderMining?.();
        break;

      case "airdrop":
        window.initAirdrop?.();
        break;

    }

  }catch(e){
    console.error("View crash:", view, e);
  }

}

// ================= NAV UI =================

function bindNavigation(){

  document.querySelectorAll(".bottom-nav button")
    .forEach(btn=>{
      btn.onclick = ()=>{
        switchView(btn.dataset.view);
      };
    });

}

// ================= TELEGRAM =================

async function initTelegram(){

  const tg = window.Telegram?.WebApp;

  if(!tg) return;

  tg.expand();
  tg.setHeaderColor("#0b0f1a");
  tg.setBackgroundColor("#0b0f1a");

  const user = tg.initDataUnsafe?.user;

  if(!user) return;

  APP.user = user;

  console.log("👤 TG USER:", user);

  // 🔥 auto login
  try{

    const res = await API.post("/auth/telegram", {
      telegram_id:user.id,
      username:user.username
    });

    if(res?.token){
      localStorage.setItem("token", res.token);
    }

  }catch(e){
    console.warn("TG login failed");
  }

}

// ================= INIT =================

document.addEventListener("DOMContentLoaded", async ()=>{

  console.log("🚀 BX CORE START");

  bindNavigation();

  await initTelegram();

  // 🔥 start WS (from ws.js)
  window.WS?.connect();

  // default view
  switchView("wallet");

  APP.ready = true;

});
