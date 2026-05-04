/* =========================================================
   BLOXIO ADMIN ENGINE — PRO MAX
========================================================= */

"use strict";

const ADMIN = {

  state:{
    currentTab:"dashboard"
  },

  el:{},

  /* ================= INIT ================= */

  init(){

    this.cache();
    this.bindTabs();
    this.bindActions();
    this.boot();

  },

  /* ================= CACHE ================= */

  cache(){

    this.el.tabs = document.querySelectorAll(".admin-sidebar button");
    this.el.panels = document.querySelectorAll(".tab");

    this.el.stats = $("statsBox");
    this.el.logs  = $("logsBox");

  },

  /* ================= BOOT ================= */

  boot(){

    this.switchTab("dashboard");
    this.loadMockStats();
    this.log("ADMIN PANEL READY");

  },

  /* ================= TABS ================= */

  bindTabs(){

    this.el.tabs.forEach(btn=>{

      btn.onclick = ()=>{

        const tab = btn.dataset.tab;

        this.switchTab(tab);

      };

    });

  },

  switchTab(tab){

    this.state.currentTab = tab;

    // buttons
    this.el.tabs.forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === tab);
    });

    // panels
    this.el.panels.forEach(p=>{
      p.classList.remove("active");
    });

    $("tab-" + tab)?.classList.add("active");

    this.log("SWITCH TAB → " + tab);

  },

  /* ================= ACTIONS ================= */

  bindActions(){

    /* ===== USERS ===== */

    this.safeClick("banUser", ()=>{

      const id = $("userId").value;
      if(!id) return this.warn("User ID required");

      this.log("BAN USER → " + id);

    });

    this.safeClick("unbanUser", ()=>{

      const id = $("userId").value;
      if(!id) return this.warn("User ID required");

      this.log("UNBAN USER → " + id);

    });

    /* ===== WALLET ===== */

    this.safeClick("walletAdd", ()=>{

      const id = $("walletUser").value;
      const amount = $("walletAmount").value;

      if(!id || !amount) return this.warn("Missing data");

      this.log(`ADD ${amount} BX → USER ${id}`);

    });

    this.safeClick("walletRemove", ()=>{

      const id = $("walletUser").value;
      const amount = $("walletAmount").value;

      if(!id || !amount) return this.warn("Missing data");

      this.log(`REMOVE ${amount} BX → USER ${id}`);

    });

    /* ===== AIRDROP ===== */

    this.safeClick("airdropUpdate", ()=>{

      const val = $("airdropValue").value;

      this.log("AIRDROP UPDATE → " + val);

    });

    /* ===== MINING ===== */

    this.safeClick("miningUpdate", ()=>{

      const val = $("miningRate").value;

      this.log("MINING UPDATE → " + val);

    });

    /* ===== MARKET ===== */

    this.safeClick("marketUpdate", ()=>{

      const val = $("marketPrice").value;

      this.log("MARKET UPDATE → " + val);

    });

    /* ===== CASINO ===== */

    this.safeClick("casinoUpdate", ()=>{

      const val = $("casinoRtp").value;

      this.log("CASINO RTP → " + val);

    });

  },

  /* ================= HELPERS ================= */

  safeClick(id, fn){

    const el = $(id);
    if(!el) return;

    el.onclick = ()=>{

      try{
        fn();
      }catch(e){
        console.error(e);
        this.warn("Action failed");
      }

    };

  },

  warn(msg){

    this.log("⚠️ " + msg);

  },

  log(msg){

    if(!this.el.logs) return;

    const line = document.createElement("div");

    line.innerText =
      "[" + new Date().toLocaleTimeString() + "] " + msg;

    this.el.logs.prepend(line);

  },

  /* ================= MOCK (UI ONLY) ================= */

  loadMockStats(){

    if(!this.el.stats) return;

    this.el.stats.innerHTML = `
      <div class="stat"><h4>Users</h4><span>12,450</span></div>
      <div class="stat"><h4>Volume</h4><span>98,320 BX</span></div>
      <div class="stat"><h4>Active</h4><span>1,240</span></div>
      <div class="stat"><h4>Revenue</h4><span>12,930 BX</span></div>
    `;

  }

};

/* ================= START ================= */

function $(id){
  return document.getElementById(id);
}

window.addEventListener("DOMContentLoaded", ()=>{
  ADMIN.init();
});
