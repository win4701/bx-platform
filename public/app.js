"use strict";

/* =========================================================
   PART 1 — CORE & GLOBAL STATE (FINAL)
========================================================= */

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

/* ================= CONFIG ================= */

const API_BASE = "https://bx-backend.fly.dev";

/* ================= USER / AUTH ================= */

const USER = {
  jwt: null,
  authenticated: false,

  load() {
    const token = localStorage.getItem("jwt");
    if (token && typeof token === "string") {
      this.jwt = token;
      this.authenticated = true;
    }
  },

  set(token) {
    if (!token) return;
    this.jwt = token;
    this.authenticated = true;
    localStorage.setItem("jwt", token);
  },

  clear() {
    this.jwt = null;
    this.authenticated = false;
    localStorage.removeItem("jwt");
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
  view: "wallet", // wallet | market | casino | mining | airdrop

  init() {
    USER.load();
    this.ready = true;
  }
};

/* ================= SAFE FETCH ================= */

async function safeFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      console.error("API ERROR:", path, res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("NETWORK ERROR:", path, err);
    return null;
  }
   }
/* =========================================================
   PART 2 — NAVIGATION SYSTEM (FINAL). side effects
========================================================= */

const VIEWS = ["wallet", "market", "casino", "mining", "airdrop"];

/* ================= NAVIGATE ================= */

function navigate(view) {
  if (!APP.ready) return;

  if (!VIEWS.includes(view)) {
    console.warn("navigate(): unknown view →", view);
    return;
  }

  VIEWS.forEach(v => {
    const el = $(v);
    if (el) el.classList.remove("active");
  });

  const target = $(view);
  if (!target) {
    console.error("navigate(): missing DOM element →", view);
    return;
  }
  target.classList.add("active");

  APP.view = view;

  updateNavButtons(view);

  onViewEnter(view);
}

/* ================= NAV BUTTON STATE ================= */

function updateNavButtons(activeView) {
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
   }
/* =========================================================
   PART 3 — WALLET ENGINE (FINAL)
========================================================= */

/* ================= WALLET STATE ================= */

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

/* ================= WALLET DOM MAP ================= */

const WALLET_DOM = {
  BX: "bal-bx",
  USDT: "bal-usdt",
  BNB: "bal-bnb",
  ETH: "bal-eth"
  TON: "bal-ton",
  SOL: "bal-sol",
  BTC: "bal-btc"
};

/* ================= RENDER WALLET ================= */

function renderWallet() {
  Object.keys(WALLET_DOM).forEach(symbol => {
    const el = $(WALLET_DOM[symbol]);
    if (!el) return;

    const value = Number(WALLET[symbol] || 0);
    el.textContent = value.toFixed(2);
  });
}

/* ================= LOAD WALLET ================= */

async function loadWallet() {
  if (!isAuthenticated()) {
    resetWallet();
    return;
  }

  const data = await safeFetch("/finance/wallet");

  if (!data || typeof data !== "object") {
    console.warn("Wallet API unavailable, using local state");
    renderWallet();
    return;
  }

  applyWalletData(data);
}

/* ================= APPLY BACKEND DATA ================= */

function applyWalletData(data) {
  WALLET.BX   = Number(data.BX   ?? data.bx   ?? 0);
  WALLET.USDT  = Number(data.USDT  ?? data.usdt  ?? 0);
  WALLET.BNB  = Number(data.BNB  ?? data.bnb  ?? 0);
  WALLET.ETH = Number(data.ETH ?? data.eth ?? 0);
  WALLET.TON  = Number(data.TON  ?? data.ton  ?? 0);
  WALLET.SOL  = Number(data.SOL  ?? data.sol  ?? 0);
  WALLET.BTC = Number(data.BTC ?? data.btc ?? 0);

  WALLET.loaded = true;
  renderWallet();
}

/* ================= RESET WALLET ================= */

function resetWallet() {
  WALLET.BX = 0;
  WALLET.USDT = 0;
  WALLET.BNB = 0;
  WALLET.ETH = 0;
  WALLET.TON = 0;
  WALLET.SOL = 0;
  WALLET.BTC = 0;
  WALLET.loaded = false;

  renderWallet();
}
/* =========================================================
   PART 4 — MARKET & CASINO (FINAL SAFE LAYER)
========================================================= */

const MARKET = {
  initialized: false
};

function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;
  renderMarket();
}

function renderMarket() {
  const container = $("market");
  if (!container) return;

  const placeholder = container.querySelector(".market-placeholder");
  if (placeholder) {
    placeholder.textContent = "Market ready";
  }
}

/* ================= CASINO ================= */

const CASINO = {
  initialized: false
};

function initCasino() {
  if (CASINO.initialized) return;
  CASINO.initialized = true;
  renderCasino();
}

function renderCasino() {
  const container = $("casino");
  if (!container) return;

  const placeholder = container.querySelector(".casino-placeholder");
  if (placeholder) {
    placeholder.textContent = "Casino ready";
  }
}

/* ================= SAFE EXIT HOOKS ================= */

function stopMarket() {}
function stopCasino() {}

/* =========================================================
   PART 5 — MINING ENGINE (FINAL)
   3 Coins × 6 Plans — Stable & Predictable
========================================================= */

const MINING = {
  coin: "BX",            // BX | BNB | SOL
  subscription: null     // { coin, planId, startedAt }
};

/* ================= MINING CONFIG ================= */

const MINING_COINS = ["BX", "BNB", "SOL"];

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
  renderMiningTabs();
  renderMiningPlans();
}

/* ================= TABS ================= */

function renderMiningTabs() {
  const buttons = $$(".mining-tabs button");

  buttons.forEach(btn => {
    const coin = btn.dataset.coin;
    if (!MINING_COINS.includes(coin)) return;

    btn.classList.toggle("active", coin === MINING.coin);

    btn.onclick = () => {
      if (MINING.coin === coin) return;
      MINING.coin = coin;
      renderMining();
    };
  });
}

/* ================= PLANS ================= */

function renderMiningPlans() {
  const grid = $("miningGrid");
  if (!grid) return;

  grid.innerHTML = "";

  MINING_PLANS.forEach(plan => {
    const isActive =
      MINING.subscription &&
      MINING.subscription.planId === plan.id &&
      MINING.subscription.coin === MINING.coin;

    const card = document.createElement("div");
    card.className = "card mining-plan";

    card.innerHTML = `
      <h4>${plan.name}</h4>
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
    planId: plan.id,
    startedAt: Date.now()
  };

  renderMining();
       }
/* =========================================================
   PART 6 — BOOTSTRAP & AIRDROP (FINAL)
========================================================= */

/* ================= AIRDROP ================= */

const AIRDROP = {
  claimed: false
};

function initAirdrop() {
  const claimBtn = $("airdropClaim");
  const statusEl = $("airdropStatus");

  if (!claimBtn || !statusEl) return;

  claimBtn.disabled = AIRDROP.claimed;

  claimBtn.onclick = () => {
    if (AIRDROP.claimed) return;

    AIRDROP.claimed = true;
    claimBtn.disabled = true;
    statusEl.textContent = "Airdrop claimed successfully";
  };
}

/* ================= BOOTSTRAP =================*/

function bootstrap() {
  if (typeof APP !== "undefined" && typeof APP.init === "function") {
    APP.init();
  }

  if (typeof bindNavigation === "function") {
    bindNavigation();
  }

  if (typeof renderMining === "function") {
    renderMining();
  }

  if (typeof loadWallet === "function") {
    loadWallet();
  }

  if (typeof navigate === "function") {
    navigate(APP.view);
  }
}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded", bootstrap);
