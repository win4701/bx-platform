/* =====================================================
   APP CORE
===================================================== */

const API = ""; // same origin
const UID =
  window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "demo";

/* ---------- HTTP ---------- */
async function post(path, data = {}) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: UID, ...data })
  });
  if (!r.ok) throw new Error("API_ERROR");
  return r.json();
}

async function get(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error("API_ERROR");
  return r.json();
}

/* =====================================================
   STATE (Wallet + Price)
===================================================== */

const STATE = {
  wallet: { bx: 0, ton: 0, usdt: 0 },
  price: {
    bx_ton: 0.955489564,
    bx_usdt: 0.717872729
  },

  async load() {
    try {
      const s = await get(`/state?uid=${UID}`);
      this.wallet = {
        bx: s.bx ?? 0,
        ton: s.ton ?? 0,
        usdt: s.usdt ?? 0
      };
      UI.renderWallet();
    } catch {}
  }
};

/* =====================================================
   UI
===================================================== */

const UI = {
  renderWallet() {
    if (window.bx)   bx.textContent   = STATE.wallet.bx;
    if (window.ton)  ton.textContent  = STATE.wallet.ton;
    if (window.usdt) usdt.textContent = STATE.wallet.usdt;
  },

  showSection(id) {
    document.querySelectorAll(".section")
      .forEach(s => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  },

  /* ---- Mining UI helpers ---- */
  setMiningStatus(text){
    const s = document.getElementById("miningStatus");
    if (s) s.textContent = text;
  },
  updateMiningTimer(sec){
    const t = document.getElementById("miningTimer");
    if (!t) return;
    const m = String(Math.max(sec,0)/60|0).padStart(2,"0");
    const s = String(Math.max(sec,0)%60).padStart(2,"0");
    t.textContent = `${m}:${s}`;
  },
  updateMiningProgress(r){
    const f = document.getElementById("miningFill");
    if (f) f.style.width = Math.min(r*100,100)+"%";
  },
  renderMiningHistory(list){
    const h = document.getElementById("miningHistory");
    if (!h) return;
    h.innerHTML = list.map(i=>{
      const r = Object.entries(i.rewards)
        .map(([k,v])=>`+${v.toFixed(4)} ${k.toUpperCase()}`)
        .join(" ");
      return `<div>${i.ts} — ${r}</div>`;
    }).join("");
  }
};

/* =====================================================
   MARKET (Buy / Sell + Chart)
===================================================== */

const MARKET = {
  mode: "buy",

  setMode(m) {
    this.mode = m;
    if (window.btnBuy && window.btnSell) {
      btnBuy.classList.toggle("active", m === "buy");
      btnSell.classList.toggle("active", m === "sell");
    }
  },

  async confirm(amount, asset) {
    if (!amount || amount <= 0) return;
    await post(`/market/${this.mode}`, { amount, against: asset });
    await STATE.load();
    CHART.tick();
  }
};

/* =====================================================
   MARKET CHART (Internal)
===================================================== */

const CHART = {
  data: [],
  max: 30,

  tick() {
    const price = STATE.price.bx_ton;
    this.data.push(price);
    if (this.data.length > this.max) this.data.shift();
    this.draw();
  },

  draw() {
    const c = document.getElementById("bxChart");
    if (!c) return;
    const ctx = c.getContext("2d");
    const w = c.width = c.offsetWidth;
    const h = c.height;

    ctx.clearRect(0,0,w,h);

    const max = Math.max(...this.data);
    const min = Math.min(...this.data);
    const r = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = "#7FCF9A";
    ctx.lineWidth = 2;

    this.data.forEach((p,i)=>{
      const x = (i/(this.max-1))*w;
      const y = h - ((p-min)/r)*h;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
};

/* =====================================================
   WALLET (Binance / RedotPay / TON)
===================================================== */

const WALLET = {
  deposit(provider, amount){
    if (!amount || amount <= 0) return;
    return post("/wallet/deposit", {
      provider,
      amount: Number(amount)
    }).then(STATE.load);
  },

  withdraw(provider, amount, address){
    if (!amount || !address) return;
    return post("/wallet/withdraw", {
      provider,   // binance | redotpay | ton
      amount: Number(amount),
      address
    }).then(STATE.load);
  }
};

/* =====================================================
   ANTI-ABUSE (Client)
===================================================== */

const COOLDOWN = {
  _t: {},
  allow(key, ms){
    const now = Date.now();
    if (this._t[key] && now - this._t[key] < ms) return false;
    this._t[key] = now;
    return true;
  }
};

/* =====================================================
   CASINO (5 Games)
===================================================== */

const CASINO = {
  async play(game, bet, extra = {}) {
    if (!COOLDOWN.allow(`casino:${game}`, 1500))
      throw new Error("COOLDOWN");
    if (!bet || bet <= 0)
      throw new Error("INVALID_BET");

    const res = await post("/casino/play", {
      game, bet, ...extra
    });

    await STATE.load();
    return res;
  },

  dice(b){ return this.play("dice", b); },
  crash(b,x){ return this.play("crash", b, { cashout:x }); },
  slots(b){ return this.play("slots", b); },
  pvp(b){ return this.play("pvp", b); },
  chicken(b){ return this.play("chicken", b); }
};

/* =====================================================
   AIRDROP
===================================================== */

const AIRDROP = {
  state: { completed:0, total:5, claimable:false },

  async load(){
    const r = await get(`/airdrop/state?uid=${UID}`);
    this.state = r;
    this.render();
  },

  async complete(taskId){
    await post("/airdrop/complete", { task_id: taskId });
    await this.load();
  },

  async claim(){
    if (!this.state.claimable) return;
    await post("/airdrop/claim", {});
    await STATE.load();
    await this.load();
  },

  render(){
    const p = document.getElementById("airdropProgress");
    const b = document.getElementById("airdropClaim");
    const f = document.getElementById("airdropBar");

    if (p) p.textContent = `${this.state.completed}/${this.state.total}`;
    if (b) b.disabled = !this.state.claimable;
    if (f) f.style.width =
      (this.state.completed/this.state.total*100)+"%";
  }
};

/* =====================================================
   MINING (BX + TON)
===================================================== */

const MINING = {
  active:{ bx:false, ton:false },
  rate:{ bx:0.02, ton:0.0003 },
  plan:"silver",
  interval:60,
  lastTick:0,
  timer:null,
  history:[],

  start(asset){
    if (!COOLDOWN.allow("mining:start", 3000)) return;
    this.active[asset] = true;
    this.lastTick = Date.now();
    this.loop();
    UI.setMiningStatus("Running");
  },

  stop(asset){
    this.active[asset] = false;
    if (!this.active.bx && !this.active.ton){
      clearInterval(this.timer);
      this.timer = null;
      UI.setMiningStatus("Stopped");
    }
  },

  setPlan(p){ this.plan = p; },
  multiplier(){ return this.plan === "gold" ? 2 : 1; },

  loop(){
    if (this.timer) return;
    this.timer = setInterval(()=>this.tick(),1000);
  },

  async tick(){
    const now = Date.now();
    const elapsed = Math.floor((now-this.lastTick)/1000);
    const left = this.interval - elapsed;

    UI.updateMiningTimer(left);
    UI.updateMiningProgress(elapsed/this.interval);

    if (left>0) return;
    this.lastTick = now;

    const rewards = {};
    if (this.active.bx)
      rewards.bx = this.rate.bx*this.multiplier();
    if (this.active.ton)
      rewards.ton = this.rate.ton*this.multiplier();
    if (!Object.keys(rewards).length) return;

    await post("/mining/claim", rewards);
    await STATE.load();

    this.history.unshift({
      ts:new Date().toLocaleTimeString(),
      rewards
    });
    if (this.history.length>10) this.history.pop();
    UI.renderMiningHistory(this.history);
  }
};

/* =====================================================
   BOOT
===================================================== */

document.addEventListener("DOMContentLoaded", async ()=>{
  await STATE.load();
  await AIRDROP.load();
  CHART.tick();
});

/* =====================================================
   EXPOSE (HTML CALLS)
===================================================== */

window.App = {
  show:(id)=>UI.showSection(id),

  marketBuy:()=>MARKET.setMode("buy"),
  marketSell:()=>MARKET.setMode("sell"),
  marketConfirm:(a,asset)=>MARKET.confirm(Number(a),asset),

  deposit:(p,a)=>WALLET.deposit(p,a),
  withdraw:(p,a,addr)=>WALLET.withdraw(p,a,addr),

  dice:(b)=>CASINO.dice(Number(b)),
  crash:(b,x)=>CASINO.crash(Number(b),x),
  slots:(b)=>CASINO.slots(Number(b)),
  pvp:(b)=>CASINO.pvp(Number(b)),
  chicken:(b)=>CASINO.chicken(Number(b)),

  airdropTask:(id)=>AIRDROP.complete(id),
  airdropClaim:()=>AIRDROP.claim(),

  miningStart:(a)=>MINING.start(a),
  miningStop:(a)=>MINING.stop(a),
  miningPlan:(p)=>MINING.setPlan(p)
};
