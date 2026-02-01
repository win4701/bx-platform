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

/* ================= NAVIGATE ================= */

function navigate(view) {
  if (!APP.ready) return;

  if (!VIEWS.includes(view)) {
    log.warn("navigate(): unknown view", view);
    return;
  }

  VIEWS.forEach(v => {
    const el = $(v);
    if (el) el.classList.remove("active");
  });

  const target = $(view);
  if (!target) {
    log.error("navigate(): missing section", view);
    return;
  }
  target.classList.add("active");

  APP.view = view;

  syncNavButtons(view);

  onViewEnter(view);

  log.info("Navigated to", view);
}

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

/* ================= CONNECTION STATUS ================= */

function renderWalletConnections() {
  const wcBtn = $("walletConnectBtn");
  const binanceBtn = $("binanceConnectBtn");

  if (wcBtn) {
    wcBtn.disabled = true;
    wcBtn.textContent = "WalletConnect (Coming Soon)";
  }

  if (binanceBtn) {
    binanceBtn.disabled = true;
    binanceBtn.textContent = "Binance (Coming Soon)";
  }
}

/* =========================================================
   PART 4 — MARKET + CASINO (General Update)
========================================================= */

const MARKET = {
  pair: "BX/USDT",
  price: 2.0000,
  timer: null
};

/* ================= MARKET ================= */

function initMarket() {
  bindMarketPairs();

  if (MARKET.timer) return;

  MARKET.timer = setInterval(() => {
    if (APP.view === "market") {
      updateMarketPrice();
      renderMarket();
    }
  }, 1200);

  log.info("Market initialized");
}

function stopMarket() {
  clearInterval(MARKET.timer);
  MARKET.timer = null;
}

/* ================= MARKET PAIRS ================= */

function bindMarketPairs() {
  const buttons = $$(".market-pair");

  buttons.forEach(btn => {
    const pair = btn.dataset.pair;
    if (!pair) return;

    btn.addEventListener("click", () => {
      MARKET.pair = pair;
      renderMarket();
      log.info("Market pair changed:", pair);
    });
  });
}

/* ================= PRICE UPDATE ================= */

function updateMarketPrice() {
  const drift = (Math.random() - 0.5) * 0.03;
  MARKET.price = Math.max(0.1, MARKET.price + drift);
}

/* ================= RENDER MARKET ================= */

function renderMarket() {
  const pairEl = $("marketPair");
  const priceEl = $("marketPrice");

  if (pairEl) pairEl.textContent = MARKET.pair;
  if (priceEl) priceEl.textContent = MARKET.price.toFixed(4);
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

  CASINO.history.splice(10);

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
   PART 5 — MINING (General Update)
   UI Mining Engine — بدون كسر HTML/CSS
========================================================= */

const MINING = {
  coin: "BX",
  subscription: null // { coin, planId }
};

/* ================= RISK CONFIG ================= */

const MINING_RISK = {
  BX: { multiplier: 1.0, label: "Low" },
  BNB: { multiplier: 1.35, label: "Medium" },
  SOL: { multiplier: 1.8, label: "High" }
};

/* ================= PLANS ================= */

const MINING_PLANS = [
  { id: "starter",  name: "Starter",  roi: 2.5,  days: 10, min: 10,    max: 100 },
  { id: "basic",    name: "Basic",    roi: 5,    days: 21, min: 50,    max: 300 },
  { id: "golden",   name: "Golden",   roi: 8,    days: 30, min: 200,   max: 800 },
  { id: "advanced", name: "Advanced", roi: 12,   days: 45, min: 400,   max: 2500 },
  { id: "platine",  name: "Platine",  roi: 17,   days: 60, min: 750,   max: 9000 },
  { id: "infinity", name: "Infinity", roi: 25,   days: 90, min: 1000,  max: 20000 }
];

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
    if (!MINING_RISK[coin]) return;

    btn.classList.toggle("active", coin === MINING.coin);

    btn.onclick = () => {
      if (MINING.coin === coin) return;
      MINING.coin = coin;
      renderMining();
      log.info("Mining coin changed:", coin);
    };
  });
}

/* ================= PLANS RENDER ================= */

function renderMiningPlans() {
  const grid = $("miningGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const risk = MINING_RISK[MINING.coin];

  MINING_PLANS.forEach(plan => {
    const adjustedRoi = (plan.roi * risk.multiplier).toFixed(1);

    const isActive =
      MINING.subscription &&
      MINING.subscription.planId === plan.id &&
      MINING.subscription.coin === MINING.coin;

    const card = document.createElement("div");
    card.className = "card mining-plan";

    card.innerHTML = `
      <h4>${plan.name}</h4>
      <div class="mining-profit">
        ${adjustedRoi}%
        <span class="risk-tag">${risk.label}</span>
      </div>
      <ul>
        <li>Duration: ${plan.days} days</li>
        <li>Min: ${plan.min} ${MINING.coin}</li>
        <li>Max: ${plan.max} ${MINING.coin}</li>
      </ul>
      <button ${isActive ? "disabled" : ""}>
        ${isActive ? "Active" : "Subscribe"}
      </button>
    `;

    const btn = card.querySelector("button");
    btn.onclick = () => {
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

  const plan = MINING_PLANS.find(p => p.id === planId);
  if (!plan) return;

  MINING.subscription = {
    coin: MINING.coin,
    planId: plan.id
  };

  log.info("Mining subscribed:", MINING.subscription);
  renderMining();
}
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
