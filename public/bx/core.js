/* =========================================================
   BX CORE ENGINE (ULTRA FINAL)
========================================================= */

// ================= CONFIG =================

const CONFIG = {
  API: "https://api.bloxio.online",
  WS: "wss://api.bloxio.online"
};

// ================= GLOBAL STATE =================

window.APP = {
  view: null,
  user: null,
  ready: false
};

const SERVICES = {
  market: false,
  casino: false
};

// ================= API =================

async function api(path, options = {}){

  try{

    const res = await fetch(CONFIG.API + path,{
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + localStorage.getItem("token")
      },
      ...options
    });

    if(!res.ok){
      console.warn("API FAIL:", path);
      return null;
    }

    return await res.json();

  }catch(e){
    console.error("API ERROR:", path);
    return null;
  }

}

// ================= SAFE FETCH =================

window.safeFetch = (url, options={}) => api(url, options);

// ================= WS =================

let ws;
let reconnectTimer;

function connectWS(){

  if(ws) return;

  ws = new WebSocket(CONFIG.WS);

  ws.onopen = ()=>{
    console.log("🟢 WS connected");
  };

  ws.onmessage = (e)=>{
    try{
      const msg = JSON.parse(e.data);
      handleWS(msg);
    }catch(err){
      console.warn("WS parse error");
    }
  };

  ws.onclose = ()=>{
    console.log("🔴 WS disconnected");

    ws = null;

    reconnectTimer = setTimeout(()=>{
      connectWS();
    },3000);
  };

}

// ================= SUBSCRIBE =================

function subscribe(channel){

  if(!ws) connectWS();

  ws?.send(JSON.stringify({
    type:"subscribe",
    channel
  }));

  SERVICES[channel] = true;
}

// ================= UNSUBSCRIBE =================

function unsubscribe(channel){

  ws?.send(JSON.stringify({
    type:"unsubscribe",
    channel
  }));

  SERVICES[channel] = false;
}

// ================= STOP SERVICES =================

function stopServices(){

  Object.keys(SERVICES).forEach(s=>{
    if(SERVICES[s]) unsubscribe(s);
  });

}

// ================= NAVIGATION =================

function switchView(view){

  if(!view || APP.view === view) return;

  stopServices();

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
        subscribe("market");
        window.initMarket?.();
        break;

      case "casino":
        subscribe("casino");
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

// ================= WS HANDLER =================

function handleWS(msg){

  if(msg.channel === "market" && SERVICES.market){
    window.onMarketWS?.(msg);
  }

  if(msg.channel === "casino" && SERVICES.casino){
    window.onCasinoWS?.(msg);
  }

}

// ================= TELEGRAM =================

function initTelegram(){

  const tg = window.Telegram?.WebApp;

  if(!tg) return;

  tg.expand();
  tg.setHeaderColor("#0b0f1a");
  tg.setBackgroundColor("#0b0f1a");

  const user = tg.initDataUnsafe?.user;

  if(user){
    APP.user = user;

    console.log("TG USER:", user);
  }

}

// ================= INIT APP =================

document.addEventListener("DOMContentLoaded", async ()=>{

  console.log("🚀 BX CORE START");

  initTelegram();

  bindNavigation();

  connectWS();

  switchView("wallet");

  APP.ready = true;

});
