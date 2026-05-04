/* =========================================================
   BLOXIO ADMIN ENGINE — ULTRA PRO MAX
========================================================= */

"use strict";

const ADMIN = {

  state:{
    currentTab:"dashboard",
    loading:false
  },

  el:{},

  /* =========================================================
     INIT
  ========================================================= */

  async init(){

    this.cache();

    await this.protect(); // 🔐 guard

    this.bindTabs();
    this.bindActions();
    this.bindRealtime();

    this.boot();

  },

  /* =========================================================
     PROTECTION (SUPERADMIN ONLY)
  ========================================================= */

  async protect(){

    const token = localStorage.getItem("token");

    if(!token){
      return this.redirect();
    }

    try{

      const res = await fetch("/api/auth/me",{
        headers:{ Authorization:"Bearer "+token }
      });

      const data = await res.json();

      if(!data?.user || data.user.role !== "superadmin"){
        return this.redirect();
      }

      this.user = data.user;

      this.log("ACCESS GRANTED → " + data.user.email);

    }catch(e){

      return this.redirect();

    }

  },

  redirect(){
    location.href = "/";
  },

  /* =========================================================
     CACHE
  ========================================================= */

  cache(){

    this.el.tabs   = document.querySelectorAll(".admin-sidebar button");
    this.el.panels = document.querySelectorAll(".tab");

    this.el.logs  = $("logsBox");
    this.el.stats = $("statsBox");

  },

  /* =========================================================
     BOOT
  ========================================================= */

  boot(){

    this.switchTab("dashboard");
    this.loadStats();

    this.log("ADMIN READY");

  },

  /* =========================================================
     TABS
  ========================================================= */

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

    this.el.tabs.forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === tab);
    });

    this.el.panels.forEach(p=>{
      p.classList.remove("active");
    });

    $("tab-"+tab)?.classList.add("active");

    this.log("TAB → " + tab);

  },

  /* =========================================================
     ACTIONS (CONNECTED TO API)
  ========================================================= */

  bindActions(){

    /* ===== USERS ===== */

    this.safe("banUser", async ()=>{

      const userId = $("userId").value;

      await this.api("/admin/user/ban",{userId});

      this.success("User banned");

    });

    this.safe("unbanUser", async ()=>{

      const userId = $("userId").value;

      await this.api("/admin/user/unban",{userId});

      this.success("User unbanned");

    });

    /* ===== WALLET ===== */

    this.safe("walletAdd", async ()=>{

      const userId = $("walletUser").value;
      const amount = $("walletAmount").value;

      await this.api("/admin/wallet/add",{userId,amount});

      this.success("Balance added");

    });

    this.safe("walletRemove", async ()=>{

      const userId = $("walletUser").value;
      const amount = $("walletAmount").value;

      await this.api("/admin/wallet/remove",{userId,amount});

      this.success("Balance removed");

    });

    /* ===== AIRDROP ===== */

    this.safe("airdropUpdate", async ()=>{

      const reward = $("airdropValue").value;

      await this.api("/admin/airdrop/update",{reward});

      this.success("Airdrop updated");

    });

    /* ===== MINING ===== */

    this.safe("miningUpdate", async ()=>{

      const rate = $("miningRate").value;

      await this.api("/admin/mining/update",{rate});

      this.success("Mining updated");

    });

    /* ===== MARKET ===== */

    this.safe("marketUpdate", async ()=>{

      const price = $("marketPrice").value;

      await this.api("/admin/market/update",{price});

      this.success("Market updated");

    });

    /* ===== CASINO ===== */

    this.safe("casinoUpdate", async ()=>{

      const rtp = $("casinoRtp").value;

      await this.api("/admin/casino/update",{rtp});

      this.success("Casino updated");

    });

  },

  /* =========================================================
     API WRAPPER
  ========================================================= */

  async api(url, body={}){

    try{

      const res = await API.post(url, body);

      if(!res || res.error){
        throw new Error(res?.error || "API error");
      }

      this.log("API OK → " + url);

      return res;

    }catch(e){

      this.error(e.message);
      throw e;

    }

  },

  /* =========================================================
     REALTIME (WS + STATE)
  ========================================================= */

  bindRealtime(){

    if(window.WS){

      WS.on("wallet:update", ()=> this.loadStats());
      WS.on("mining:reward", ()=> this.loadStats());
      WS.on("notify", (d)=> this.log("🔔 " + d.message));

    }

    if(window.STATE){

      STATE.on("*", ()=>{
        // optional reactive updates
      });

    }

  },

  /* =========================================================
     STATS
  ========================================================= */

  async loadStats(){

    try{

      const res = await API.get("/admin/dashboard");

      if(res.error) return;

      this.el.stats.innerHTML = `
        <div class="stat"><h4>Users</h4><span>${res.users}</span></div>
        <div class="stat"><h4>Volume</h4><span>${res.volume}</span></div>
        <div class="stat"><h4>Revenue</h4><span>${res.revenue}</span></div>
        <div class="stat"><h4>Active</h4><span>${res.active}</span></div>
      `;

    }catch{}

  },

  /* =========================================================
     HELPERS
  ========================================================= */

  safe(id, fn){

    const el = $(id);
    if(!el) return;

    el.onclick = async ()=>{

      if(this.state.loading) return;

      try{

        this.state.loading = true;

        await fn();

      }catch(e){

      }finally{

        this.state.loading = false;

      }

    };

  },

  log(msg){

    if(!this.el.logs) return;

    const el = document.createElement("div");

    el.innerText =
      "[" + new Date().toLocaleTimeString() + "] " + msg;

    this.el.logs.prepend(el);

  },

  success(msg){
    this.log("✅ " + msg);
  },

  error(msg){
    this.log("❌ " + msg);
  }

};

/* =========================================================
   HELPERS
========================================================= */

function $(id){
  return document.getElementById(id);
}

/* =========================================================
   START
========================================================= */

window.addEventListener("DOMContentLoaded", ()=>{
  ADMIN.init();
});
