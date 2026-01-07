/* =====================================================
   APP CORE
===================================================== */

const API = ""; // نفس الدومين
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
   UI RENDER
===================================================== */

const UI = {
  renderWallet() {
    if (bx)   bx.textContent   = STATE.wallet.bx;
    if (ton)  ton.textContent  = STATE.wallet.ton;
    if (usdt) usdt.textContent = STATE.wallet.usdt;
  },

  showSection(id) {
    document.querySelectorAll(".section")
      .forEach(s => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");

    document.querySelectorAll("nav .item")
      .forEach(i => i.classList.remove("active"));
  }
};

/* =====================================================
   MARKET (Buy / Sell)
===================================================== */

const MARKET = {
  mode: "buy",

  setMode(m) {
    this.mode = m;
    if (btnBuy && btnSell) {
      btnBuy.classList.toggle("active", m === "buy");
      btnSell.classList.toggle("active", m === "sell");
    }
  },

  calcTotal(amount, asset) {
    if (!amount) return 0;
    return asset === "ton"
      ? amount * STATE.price.bx_ton
      : amount * STATE.price.bx_usdt;
  },

  async confirm(amount, asset) {
    if (!amount || amount <= 0) return;

    await post(`/market/${this.mode}`, {
      amount,
      against: asset
    });

    await STATE.load();
    CHART.tick(); // تحديث الرسم
  }
};

/* =====================================================
   WALLET ACTIONS
===================================================== */

const WALLET = {
  deposit(provider, amount = 10) {
    return post("/wallet/deposit", { provider, amount })
      .then(STATE.load);
  },

  withdraw(asset, amount, address) {
    if (!amount || !address) return;
    return post("/wallet/withdraw", {
      asset, amount, address
    }).then(STATE.load);
  }
};

/* =====================================================
   ANTI-ABUSE (Client)
===================================================== */

const COOLDOWN = {
  _t: {},
  allow(key, ms) {
    const now = Date.now();
    if (this._t[key] && now - this._t[key] < ms) return false;
    this._t[key] = now;
    return true;
  }
};

/* =====================================================
   CASINO (5 GAMES)
===================================================== */

const CASINO = {
  async play(game, bet, extra = {}) {
    if (!COOLDOWN.allow(`casino:${game}`, 1500))
      throw new Error("COOLDOWN");

    if (!bet || bet <= 0) throw new Error("INVALID_BET");

    const res = await post("/casino/play", {
      game, bet, ...extra
    });

    await STATE.load();
    return res;
  },

  dice(bet)    { return this.play("dice", bet); },
  crash(bet,x) { return this.play("crash", bet, { cashout:x }); },
  slots(bet)   { return this.play("slots", bet); },
  pvp(bet)     { return this.play("pvp", bet); },
  chicken(bet) { return this.play("chicken", bet); }
};

/* =====================================================
   MARKET CHART (Local / Internal)
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
   AIRDROP
===================================================== */

const AIRDROP = {
  state: {
    completed: 0,
    total: 5,
    claimable: false
  },

  async load() {
    const r = await get(`/airdrop/state?uid=${UID}`);
    this.state = r;
    this.render();
  },

  async complete(taskId) {
    await post("/airdrop/complete", { task_id: taskId });
    await this.load();
  },

  async claim() {
    if (!this.state.claimable) return;
    await post("/airdrop/claim", {});
    await STATE.load();
    await this.load();
  },

  render() {
    const p = document.getElementById("airdropProgress");
    const b = document.getElementById("airdropClaim");
    if (p) p.textContent = `${this.state.completed}/${this.state.total}`;
    if (b) b.disabled = !this.state.claimable;
  }
};
/* =====================================================
   BOOT
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  await STATE.load();
  await AIRDROP.load();
  CHART.tick();
});
/* =====================================================
   EXPOSE (HTML CALLS)
===================================================== */

window.App = {
  show: UI.showSection,
  marketBuy: () => MARKET.setMode("buy"),
  marketSell: () => MARKET.setMode("sell"),
  marketConfirm: (amount, asset) =>
    MARKET.confirm(Number(amount), asset),

  deposit: (p,a) => WALLET.deposit(p,a),
  withdraw: (asset, amount, addr) =>
    WALLET.withdraw(asset, Number(amount), addr),

  dice: (b)=>CASINO.dice(Number(b)),
  crash:(b,x)=>CASINO.crash(Number(b),x),
  slots:(b)=>CASINO.slots(Number(b)),
  pvp:(b)=>CASINO.pvp(Number(b)),
  chicken:(b)=>CASINO.chicken(Number(b))
};
