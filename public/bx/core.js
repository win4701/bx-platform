// ==========================================
// BX CORE ENGINE — AUTH SAFE VERSION
// ==========================================

// ================= CONFIG =================
const CONFIG = {
  API: "https://api.bloxio.online",
  WS: "wss://api.bloxio.online"
};

// ================= GLOBAL =================
window.APP = {
  view: null,
  user: null,
  ready: false,
  started: false // 🔥 يمنع التشغيل المكرر
};

// ================= NAVIGATION =================
function switchView(view){

  if(!view || APP.view === view) return;

  // 🔥 stop WS
  if(window.WS){
    WS.channels?.forEach(c => WS.unsubscribe(c));
  }

  // hide all
  document.querySelectorAll(".view").forEach(v=>{
    v.style.display = "none";
    v.classList.remove("active");
  });

  const el = document.getElementById(view);

  if(!el){
    console.warn("View not found:", view);
    return;
  }

  el.style.display = "block";
  el.classList.add("active");

  // nav active
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

// ================= NAV =================
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

  // 🔥 optional login (public safe)
  try{
    const res = await API.post("/auth/telegram", {
      telegram_id:user.id,
      username:user.username
    });

    if(res?.token){
      localStorage.setItem("jwt", res.token);
    }

  }catch(e){
    console.warn("TG login skipped");
  }
}

// ================= START ENGINE =================
async function startApp(){

  if(APP.started) return;
  APP.started = true;

  console.log("🚀 BX START (AUTH PASSED)");

  bindNavigation();

  await initTelegram();

  // WS
  window.WS?.connect();

  // 🔥 لا تجبر wallet
  const hash = location.hash.replace("#","");
  const view = hash || "wallet";

  switchView(view);

  APP.ready = true;
}

// ================= AUTH HOOK =================

// 🔥 هذا أهم شيء
window.startBX = startApp;

// ================= BOOT =================
document.addEventListener("DOMContentLoaded", ()=>{

  console.log("⏳ CORE READY (waiting auth)");

  // ❌ لا تشغل التطبيق هنا
  // ✔️ AUTH هو من يشغله

});
