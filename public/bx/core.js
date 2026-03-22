// ================= CONFIG =================
const CONFIG = {
  API: "https://api.bloxio.online",
  WS: "wss://api.bloxio.online"
};

// ================= STATE =================
window.APP = {
  view: null
};

const SERVICES = {
  market: false,
  casino: false
};

// ================= API =================
async function api(path, options = {}) {

  try{

    const res = await fetch(CONFIG.API + path, {
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + localStorage.getItem("token")
      },
      ...options
    });

    if (!res.ok) return null;

    return await res.json();

  }catch(e){
    console.error("API error:", path);
    return null;
  }

}

// ================= WS =================
let ws;

function connectWS(){

  if (ws) return;

  ws = new WebSocket(CONFIG.WS);

  ws.onopen = () => console.log("WS connected");

  ws.onmessage = (e)=>{
    const msg = JSON.parse(e.data);
    handleWS(msg);
  };

}

function subscribe(channel){
  ws?.send(JSON.stringify({ type:"subscribe", channel }));
  SERVICES[channel] = true;
}

function unsubscribe(channel){
  ws?.send(JSON.stringify({ type:"unsubscribe", channel }));
  SERVICES[channel] = false;
}

function stopServices(){

  if (SERVICES.market) unsubscribe("market");
  if (SERVICES.casino) unsubscribe("casino");

}

// ================= NAV =================
function switchView(view){

  if (!view || APP.view === view) return;

  stopServices();

  document.querySelectorAll(".view").forEach(v=>{
    v.classList.remove("active");
    v.style.display = "none";
  });

  const el = document.getElementById(view);
  if (!el) return;

  el.style.display = "block";
  el.classList.add("active");

  APP.view = view;

  loadView(view);
}

// ================= LOADER =================
function loadView(view){

  switch(view){

    case "wallet":
      loadWallet?.();
      break;

    case "market":
      subscribe("market");
      initMarket?.();
      break;

    case "casino":
      subscribe("casino");
      initCasino?.();
      break;

    case "mining":
      renderMining?.();
      break;

    case "airdrop":
      initAirdrop?.();
      break;

  }

}

// ================= NAV UI =================
function bindNavigation(){

  document.querySelectorAll(".bottom-nav button")
    .forEach(btn=>{
      btn.onclick = () => switchView(btn.dataset.view);
    });

}

// ================= WS HANDLER =================
function handleWS(msg){

  if (msg.channel === "market" && SERVICES.market){
    window.onMarketWS?.(msg);
  }

  if (msg.channel === "casino" && SERVICES.casino){
    window.onCasinoWS?.(msg);
  }

}
