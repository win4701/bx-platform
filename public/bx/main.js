// ===============================
// BX MAIN (PRO MAX CONTROLLER)
// ===============================

window.APP = {
  booted: false
};

// ================= BOOT =================

document.addEventListener("DOMContentLoaded", () => {

  console.log("🚀 BX APP BOOT");

  initNavigation();
  initStateBindings();
  initGlobalEvents();

  // 🔥 start websocket
  if(window.WS){
    WS.connect();
  }

  // 🔥 default view
  STATE.set("ui.view", "wallet");

  APP.booted = true;

});

// ================= NAVIGATION =================

function initNavigation(){

  document.querySelectorAll("[data-view]").forEach(el => {

    el.addEventListener("click", () => {

      const view = el.dataset.view;

      if (!view) return;

      STATE.set("ui.view", view);

    });

  });

}

// ================= STATE BINDINGS =================

function initStateBindings(){

  // 🔥 view change
  STATE.subscribe("ui.view", (view) => {
    renderView(view);
    runModule(view);
  });

}

// ================= VIEW RENDER =================

function renderView(view){

  // hide all
  document.querySelectorAll(".view").forEach(v=>{
    v.style.display = "none";
  });

  // show current
  const el = document.getElementById(view);

  if(el){
    el.style.display = "block";
  }

  console.log("📺 View:", view);

}

// ================= MODULE RUNNER =================

function runModule(view){

  try{

    switch(view){

      case "wallet":
        window.WALLET?.init();
        break;

      case "market":
        window.loadMarket?.();
        break;

      case "casino":
        window.CASINO?.init();
        break;

      case "mining":
        window.loadMining?.();
        break;

      case "airdrop":
        window.loadAirdrop?.();
        break;

      default:
        console.warn("Unknown module:", view);
    }

  }catch(e){
    console.error("Module crash:", view, e);
  }

}

// ================= GLOBAL EVENTS =================

function initGlobalEvents(){

  // 🔴 errors
  window.addEventListener("error", e=>{
    console.error("Global Error:", e.message);
  });

  window.addEventListener("unhandledrejection", e=>{
    console.error("Promise Error:", e.reason);
  });

  // 🔄 visibility (resume WS)
  document.addEventListener("visibilitychange", () => {

    if(document.visibilityState === "visible"){
      if(window.WS && !WS.connected){
        WS.connect();
      }
    }

  });

}

// ================= HELPERS =================

window.$ = (id)=> document.getElementById(id);
window.$$ = (sel)=> document.querySelectorAll(sel);
