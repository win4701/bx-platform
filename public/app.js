/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";

/* =========================================================
   TELEGRAM MINI APP (OPTIONAL)
========================================================= */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  document.body.classList.add("tma");
}

/* =========================================================
   HAPTIC (DIFFERENT FOR BUY / BET)
========================================================= */
function haptic(type){
  // Web
  if (navigator.vibrate){
    const map = { buy:[20], bet:[40] };
    navigator.vibrate(map[type] || 20);
  }
  // Telegram
  if (tg?.HapticFeedback){
    tg.HapticFeedback.impactOccurred(type === "bet" ? "medium" : "light");
  }
}

/* =========================================================
   NAVIGATION (NO display:none)
========================================================= */
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".bottom-nav button");
const tabs = ["wallet","market","casino","mining","airdrop"];
let currentIndex = 0;

function showTab(id){
  views.forEach(v=>v.classList.remove("active"));
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("active");
  document.body.dataset.mode = id;

  navBtns.forEach(b=>b.classList.remove("active"));
  document.querySelector(`.bottom-nav button[data-tab="${id}"]`)
    ?.classList.add("active");

  currentIndex = tabs.indexOf(id);
}

navBtns.forEach(btn=>{
  btn.addEventListener("click",()=>{
    showTab(btn.dataset.tab);
  });
});

// default
showTab("wallet");

/* Swipe navigation */
let sx=0, ex=0;
document.addEventListener("touchstart",e=>sx=e.changedTouches[0].screenX);
document.addEventListener("touchend",e=>{
  ex=e.changedTouches[0].screenX;
  const d = ex-sx;
  if (Math.abs(d)<60) return;
  if (d<0 && currentIndex<tabs.length-1) currentIndex++;
  if (d>0 && currentIndex>0) currentIndex--;
  showTab(tabs[currentIndex]);
});

/* =========================================================
   WALLET (UI ONLY)
========================================================= */
async function loadBalances(){
  try{
    const r = await fetch(`${API_BASE}/wallet/balances`);
    const b = await r.json();
    setVal("bal-bx", b.BX);
    setVal("bal-usdt", b.USDT);
    setVal("bal-ton", b.TON);
    setVal("bal-sol", b.SOL);
    setVal("bal-btc", b.BTC, 8);
    updateBetTooltip();
  }catch(e){}
}

function setVal(id,val,dec=2){
  const el=document.getElementById(id);
  if(!el) return;
  el.textContent = val!==undefined ? Number(val).toFixed(dec) : "0";
}

function getBXBalance(){
  return Number(document.getElementById("bal-bx")?.textContent || 0);
}

/* =========================================================
   MARKET (PAIR + BUY HIGHLIGHT)
========================================================= */
function getCurrentPair(){
  return document.getElementById("pair")?.value || "BX / USDT";
}

function highlightBuy(){
  showTab("market");
  const buy=document.querySelector(".btn.buy");
  if(!buy) return;
  buy.classList.add("highlight");
  setTimeout(()=>buy.classList.remove("highlight"),2600);
  haptic("buy");
}

/* =========================================================
   BET TOOLTIP (ICON + CIRCULAR PROGRESS)
========================================================= */
function updateBetTooltip(){
  const bx = getBXBalance();
  const pct = Math.min(Math.round((bx/1)*100),100);
  const pair = getCurrentPair();
  const quote = pair.split("/")[1].trim();

  document.querySelectorAll(".bet-btn").forEach(btn=>{
    btn.style.setProperty("--p", pct);

    if (bx>0){
      btn.classList.remove("disabled");
      btn.dataset.tip = "Place your bet with BX";
    } else {
      btn.classList.add("disabled");
      btn.dataset.tip = `Convert ${quote} → BX`;
    }
  });
}

/* =========================================================
   BET / PLAY BUTTONS (XBET STYLE)
========================================================= */
document.querySelectorAll(".play-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    // Demo only
  });
});

document.addEventListener("click",e=>{
  const betBtn = e.target.closest(".bet-btn");
  if (!betBtn) return;

  if (betBtn.classList.contains("disabled")){
    updateBetTooltip();
    highlightBuy();
  } else {
    haptic("bet");
    // start game (UI only)
  }
});

/* =========================================================
   MARKET BUY / SELL (UI GATE ONLY)
========================================================= */
document.querySelector(".btn.buy")?.addEventListener("click",()=>{
  haptic("buy");
  // UI success simulation
  setTimeout(loadBalances,400);
});

document.querySelector(".btn.sell")?.addEventListener("click",()=>{
  haptic("buy");
});

/* =========================================================
   PAIR CHANGE
========================================================= */
document.getElementById("pair")?.addEventListener("change",()=>{
  updateBetTooltip();
});

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded",()=>{
  loadBalances();
  updateBetTooltip();
});
