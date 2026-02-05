"use strict";

/* =========================================================
   PART 1 — CORE / CONFIG / DEBUG
========================================================= */

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

/* ================= CONFIG ================= */

const API_BASE = "https://bx-backend.fly.dev";

/* ================= DEBUG MODE ================= */

const DEBUG = (() => {
  try {
    if (location.search.includes("debug=1")) return true;
    if (localStorage.getItem("DEBUG") === "1") return true;
  } catch (e) {}
  return false;
})();

/* ================= LOGGER ================= */

const log = {
  info(...args) {
    if (DEBUG) console.log("[INFO]", ...args);
  },
  warn(...args) {
    if (DEBUG) console.warn("[WARN]", ...args);
  },
  error(...args) {
    console.error("[ERROR]", ...args);
  }
};

/* ================= USER / AUTH ================= */

const USER = {
  jwt: null,
  authenticated: false,

  load() {
    try {
      const token = localStorage.getItem("jwt");
      if (token && typeof token === "string") {
        this.jwt = token;
        this.authenticated = true;
        log.info("JWT loaded");
      }
    } catch (e) {
      log.warn("JWT load failed");
    }
  },

  set(token) {
    if (!token) return;
    this.jwt = token;
    this.authenticated = true;
    try {
      localStorage.setItem("jwt", token);
    } catch (e) {}
    log.info("JWT set");
  },

  clear() {
    this.jwt = null;
    this.authenticated = false;
    try {
      localStorage.removeItem("jwt");
    } catch (e) {}
    log.info("JWT cleared");
  }
};

function isAuthenticated() {
  return USER.authenticated === true;
}

function authHeaders() {
  return USER.jwt
    ? { Authorization: "Bearer " + USER.jwt }
    : {};
}

/* ================= APP STATE ================= */

const APP = {
  ready: false,
  view: "wallet", 

  init() {
    USER.load();
    this.ready = true;
    log.info("APP initialized");
  }
};

/* ================= SAFE FETCH ================= */

async function safeFetch(path, options = {}) {
  try {
    log.info("FETCH →", path);

    const res = await fetch(API_BASE + path, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      log.error("API ERROR", path, res.status);
      return null;
    }

    const data = await res.json();
    log.info("FETCH OK ←", path);
    return data;

  } catch (err) {
    log.error("NETWORK ERROR", path, err);
    return null;
  }
  }

/* =========================================================
   PART 2 — NAVIGATION (General Update)
========================================================= */

const VIEWS = ["wallet", "market", "casino", "mining", "airdrop"];

/*================= APP ROUTER ================= */

document.addEventListener("DOMContentLoaded", () => {
  const views = document.querySelectorAll(".view");
  const navButtons = document.querySelectorAll(".bottom-nav button");

  function showView(id) {
    views.forEach(v => v.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");

    navButtons.forEach(b =>
      b.classList.toggle("active", b.dataset.view === id)
    );

    // إشعار الأقسام (hooks)
    document.dispatchEvent(new CustomEvent("view:change", { detail: id }));
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view) showView(view);
    });
  });

  // view افتراضي
  showView("wallet");
});


/* ================= NAV BUTTONS ================= */

function syncNavButtons(activeView) {
  const buttons = $$(".bottom-nav button");

  buttons.forEach(btn => {
    const view = btn.dataset.view;
    if (!view) return;

    btn.classList.toggle("active", view === activeView);
  });
}

/* ================= VIEW ENTER HOOK ================= */

function onViewEnter(view) {
  switch (view) {
    case "wallet":
      if (typeof loadWallet === "function") loadWallet();
      break;

    case "market":
  if (typeof initMarket === "function") initMarket();
  startMarket();          
  break;

    case "casino":
      if (typeof initCasino === "function") initCasino();
      break;

    case "mining":
      if (typeof renderMining === "function") renderMining();
      break;

    case "airdrop":
      if (typeof initAirdrop === "function") initAirdrop();
      break;
  }
}

/* ================= BIND NAVIGATION ================= */

function bindNavigation() {
  const buttons = $$(".bottom-nav button");

  buttons.forEach(btn => {
    const view = btn.dataset.view;
    if (!view) return;

    btn.addEventListener("click", () => {
      navigate(view);
    });
  });

  log.info("Navigation bound");
}
/* =========================================================
   PART 3 — WALLET (General Update)
========================================================= */

const WALLET = {
  BX: 0,
  USDT: 0,
  BNB: 0,
  ETH: 0,
  TON: 0,
  SOL: 0,
  BTC: 0,
  loaded: false
};

/* ================= DOM MAP ================= */

const WALLET_DOM = {
  BX: "bal-bx",
  USDT: "bal-usdt",
  BNB: "bal-bnb",
  ETH: "bal-eth",
  TON: "bal-ton",
  SOL: "bal-sol",
  BTC: "bal-btc"
};

/* ================= RENDER ================= */

function renderWallet() {
  let total = 0;

  Object.keys(WALLET_DOM).forEach(symbol => {
    const el = $(WALLET_DOM[symbol]);
    if (!el) return;

    const value = Number(WALLET[symbol] || 0);
    el.textContent = value.toFixed(2);
    total += value;
  });

  const totalEl = $("walletTotal");
  if (totalEl) {
    totalEl.textContent = total.toFixed(2);
  }
}

function loadWallet() {
  if (!WALLET.loaded) {
    WALLET.BX = 0.00;
    WALLET.USDT = 0.00;
    WALLET.BNB = 0.00;
    WALLET.ETH = 0.00;
    WALLET.TON = 0.00;
    WALLET.SOL = 0.00;
    WALLET.BTC = 0.00;
    WALLET.loaded = true;

    log.info("Wallet loaded (UI fallback)");
  }

  renderWallet();
  renderWalletConnections();
}

/* ================= CONNECTION STATE (SSOT) ================= */

const CONNECTIONS = {
  walletconnect: {
    available: true,
    connected: false,
    label: "WalletConnect"
  },
  binance: {
    available: false,
    connected: false,
    label: "Binance Pay"
  }
};

/* ================= CONNECTION RENDER ================= */

function renderWalletConnections() {
  renderConnectionButton("walletConnectBtn", CONNECTIONS.walletconnect);
  renderConnectionButton("binanceConnectBtn", CONNECTIONS.binance);
}

function renderConnectionButton(id, state) {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.classList.remove("connected", "disconnected");
  btn.disabled = false;

  if (!state.available) {
    btn.textContent = `${state.label} (Coming Soon)`;
    btn.disabled = true;
    btn.classList.add("disconnected");
    return;
  }

  if (state.connected) {
    btn.textContent = `${state.label} Connected`;
    btn.classList.add("connected");
    return;
  }

  btn.textContent = `Connect ${state.label}`;
  btn.classList.add("disconnected");
}

/* ================= CONNECTION HANDLERS ================= */

function bindWalletConnections() {
  const wc = document.getElementById("walletConnectBtn");
  const binance = document.getElementById("binanceConnectBtn");

  if (wc) {
    wc.addEventListener("click", onWalletConnect);
  }

  if (binance) {
    binance.addEventListener("click", onBinancePay);
  }
}

function onWalletConnect() {
  // mock
  CONNECTIONS.walletconnect.connected = true;
  renderWalletConnections();

  console.log("WalletConnect connected (mock)");
}

function onBinancePay() {
  alert("Binance Pay coming soon");
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  bindWalletConnections();
  renderWalletConnections();
});

/* =========================================================
   PART 4 — MARKET + CASINO (General Update)
=================================*/

/* ===================== MARKET ENGINE ===================== */

const marketState = {
  pair: 'BX/USDT',
  price: 0.00012,
  candles: [],
  orderBook: { bids: [], asks: [] }
};

/* -------- CHART (Candles Canvas) -------- */
const canvas = document.getElementById('marketChart');
const ctx = canvas?.getContext('2d');

function drawChart() {
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const w = canvas.width / marketState.candles.length;
  marketState.candles.forEach((c,i)=>{
    const x = i * w + w/2;
    const high = canvas.height - c.h * 1000000;
    const low  = canvas.height - c.l * 1000000;
    const open = canvas.height - c.o * 1000000;
    const close= canvas.height - c.c * 1000000;

    ctx.strokeStyle = c.c >= c.o ? '#02C076' : '#F84960';
    ctx.beginPath();
    ctx.moveTo(x, high);
    ctx.lineTo(x, low);
    ctx.stroke();

    ctx.lineWidth = w/3;
    ctx.beginPath();
    ctx.moveTo(x, open);
    ctx.lineTo(x, close);
    ctx.stroke();
  });
}

/* -------- ORDER BOOK -------- */
function renderOrderBook() {
  const bids = document.getElementById('bids');
  const asks = document.getElementById('asks');
  if (!bids || !asks) return;

  bids.innerHTML = marketState.orderBook.bids
    .map(o=>`<div class="row"><span>${o.p}</span><span>${o.q}</span></div>`).join('');

  asks.innerHTML = marketState.orderBook.asks
    .map(o=>`<div class="row"><span>${o.p}</span><span>${o.q}</span></div>`).join('');
}

/* -------- MOCK WEBSOCKET -------- */
setInterval(()=>{
  const last = marketState.price;
  const next = +(last + (Math.random()-0.5)*0.000002).toFixed(6);
  marketState.price = next;

  const candle = {
    o:last,
    c:next,
    h:Math.max(last,next),
    l:Math.min(last,next)
  };
  marketState.candles.push(candle);
  if (marketState.candles.length > 30) marketState.candles.shift();

  marketState.orderBook.bids = Array.from({length:5},(_,i)=>({
    p:(next - i*0.000001).toFixed(6),
    q:(Math.random()*100).toFixed(2)
  }));

  marketState.orderBook.asks = Array.from({length:5},(_,i)=>({
    p:(next + i*0.000001).toFixed(6),
    q:(Math.random()*100).toFixed(2)
  }));

  const priceEl = document.querySelector('.last-price');
  if (priceEl) priceEl.textContent = next.toFixed(6);

  drawChart();
  renderOrderBook();
}, 1000);

/* -------- INIT -------- */
for(let i=0;i<20;i++){
  marketState.candles.push({
    o:marketState.price,
    c:marketState.price,
    h:marketState.price,
    l:marketState.price
  });
}

/* =========================
   LIFECYCLE
========================= */
function startMarket() {
  if (MARKET.timer) return;
  fetchMarketPrice();
  MARKET.timer = setInterval(fetchMarketPrice, 2000);
}

function stopMarket() {
  if (MARKET.timer) {
    clearInterval(MARKET.timer);
    MARKET.timer = null;
  }
}

async function reloadMarket() {
  await fetchMarketPrice();
}

/* =================================================
   CASINO
================================================= */

const CASINO = {
  history: []
};

/* ================= INIT CASINO ================= */

function initCasino() {
  addCasinoResult();
  log.info("Casino initialized");
}

/* ================= ADD RESULT ================= */

function addCasinoResult() {
  const win = Math.random() > 2.5;

  CASINO.history.unshift({
    result: win ? "WIN" : "LOSE",
    time: new Date().toLocaleTimeString()
  });

  CASINO.history.splice(8);

  renderCasinoHistory();
}

/* ================= RENDER HISTORY ================= */

function renderCasinoHistory() {
  const el = $("casinoHistory");
  if (!el) return;

  el.innerHTML = CASINO.history
    .map(item => `
      <div class="casino-row ${item.result.toLowerCase()}">
        ${item.result} — ${item.time}
      </div>
    `)
    .join("");
     }

/* =========================================================
   PART 5 — MINING (Per-Coin Plans)
========================================================= */

/* ================= STATE ================= */

const MINING = {
  coin: "BX",
  subscription: null // { coin, planId }
};

/* ================= PLANS BY COIN ================= */

const MINING_PLANS_BY_COIN = {
  BX: [
    { id:"p10", name:"Starter",  days:10, roi:2.5, min:10,   max:100  },
    { id:"p21", name:"Basic",    days:21, roi:5,   min:50,   max:300  },
    { id:"p30", name:"Golden",   days:30, roi:8,   min:200,  max:800  },
    { id:"p45", name:"Pro", days:45, roi:12,  min:400,  max:2500 },
    { id:"p60", name:"Platine",  days:60, roi:17,  min:750,  max:9000 },
    { id:"p90", name:"Infinity", days:90, roi:25,  min:1000, max:20000, sub:true }
  ],

  SOL: [
    { id:"p10", name:"Starter",  days:10, roi:1,   min:1,    max:5   },
    { id:"p21", name:"Basic",    days:21, roi:2.8, min:10,   max:50  },
    { id:"p30", name:"Golden",   days:30, roi:4,   min:40,   max:160 },
    { id:"p45", name:"Pro", days:45, roi:7,   min:120,  max:500 },
    { id:"p60", name:"Platine",  days:60, roi:9,   min:200,  max:1000 },
    { id:"p90", name:"Infinity", days:90, roi:14,  min:500,  max:2500, sub:true }
  ],

  BNB: [
    { id:"p10", name:"Starter",  days:10, roi:0.8, min:0.05, max:1   },
    { id:"p21", name:"Basic",    days:21, roi:1.8, min:1,    max:4   },
    { id:"p30", name:"Golden",   days:30, roi:3,   min:5,    max:50  },
    { id:"p45", name:"Pro", days:45, roi:5,   min:10,   max:100 },
    { id:"p60", name:"Platine",  days:60, roi:7,   min:15,   max:150 },
    { id:"p90", name:"Infinity", days:90, roi:11,  min:25,   max:200, sub:true }
  ]
};

/* ================= ENTRY ================= */

function renderMining() {
  bindMiningTabs();
  renderMiningPlans();
}

/* ================= COIN TABS ================= */

function bindMiningTabs() {
  const buttons = $$(".mining-tabs button");

  buttons.forEach(btn => {
    const coin = btn.dataset.coin;
    if (!MINING_PLANS_BY_COIN[coin]) return;

    btn.classList.toggle("active", coin === MINING.coin);

    btn.onclick = () => {
      if (MINING.coin === coin) return;
      MINING.coin = coin;
      renderMining();
      log.info("Mining coin switched:", coin);
    };
  });
}

/* ================= PLANS RENDER ================= */

function renderMiningPlans() {
  const grid = $("miningGrid");
  if (!grid) return;

  const plans = MINING_PLANS_BY_COIN[MINING.coin] || [];
  grid.innerHTML = "";

  plans.forEach(plan => {
    const isActive =
      MINING.subscription &&
      MINING.subscription.coin === MINING.coin &&
      MINING.subscription.planId === plan.id;

    const card = document.createElement("div");
    card.className = "card mining-plan";

    card.innerHTML = `
      <h4>
        ${plan.name}
        ${plan.sub ? '<span class="sub-tag">SUB</span>' : ''}
      </h4>
      <div class="mining-profit">${plan.roi}%</div>
      <ul>
        <li>Duration: ${plan.days} days</li>
        <li>Min: ${plan.min} ${MINING.coin}</li>
        <li>Max: ${plan.max} ${MINING.coin}</li>
      </ul>
      <button ${isActive ? "disabled" : ""}>
        ${isActive ? "Active" : "Subscribe"}
      </button>
    `;

    card.querySelector("button").onclick = () => {
      if (!isActive) subscribeMining(plan.id);
    };

    grid.appendChild(card);
  });
}

/* ================= SUBSCRIBE ================= */

function subscribeMining(planId) {
  if (MINING.subscription) {
    alert("You already have an active mining subscription.");
    return;
  }

  MINING.subscription = {
    coin: MINING.coin,
    planId
  };

  log.info("Mining subscription:", MINING.subscription);
  renderMining();
       }

       /* =========================================================
   PART   / CONFIG / Airdrop 
========================================================= */

async function loadAirdrop() {
  try {
    const response = await apiGet("/bxing/airdrop/status");

    const airdropStatusText = response.claimed
      ? " You've already claimed your Airdrop!"
      : `Reward: ${response.reward} BX`;

    document.getElementById("airdrop-status").textContent = airdropStatusText;

    document.getElementById("claim-airdrop").classList.toggle("hidden", response.claimed);

  } catch (error) {
    console.error("Error loading airdrop status", error);
    document.getElementById("airdrop-status").textContent = " Failed to load Airdrop status";
  }
}

/* ================= Airdrop  Calim ================= */

async function claimAirdrop() {
  try {
    const response = await apiPost("/bxing/airdrop/claim");

    if (response.status === "ok") {
      loadAirdrop();  
      alert(" You've successfully claimed your Airdrop!");
    } else {
      alert(" You have already claimed your Airdrop.");
    }

  } catch (error) {
    console.error("Error claiming Airdrop", error);
    alert(" Something went wrong while claiming your Airdrop.");
  }
}
  
   
/* ================= Airdrop Click ================= */
const apiGet = (url) => safeFetch(url, { method: "GET" });
const apiPost = (url, body = {}) =>
  safeFetch(url, {
    method: "POST",
    body: JSON.stringify(body)
  });

/* ================= Airdrop Loader ================= */

document.querySelector('[data-view="airdrop"]').addEventListener('click', function() {
  navigate("airdrop");
  loadAirdrop();  
});

/* =========================================================
   PART 6 — BOOTSTRAP (General Update)
========================================================= */

function bootstrap() {
  if (typeof APP !== "undefined" && typeof APP.init === "function") {
    APP.init();
  }

  if (typeof bindNavigation === "function") {
    bindNavigation();
  }

  if (typeof loadWallet === "function") {
    loadWallet();
  }

  if (APP.view === "market" && typeof initMarket === "function") {
    initMarket();
  }

  if (APP.view === "casino" && typeof initCasino === "function") {
    initCasino();
  }

  if (typeof renderMining === "function") {
    renderMining();
  }

  if (typeof navigate === "function") {
    navigate(APP.view);
  }

  log.info("Bootstrap completed");
}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded", bootstrap);
