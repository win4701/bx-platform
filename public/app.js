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
    binanceBtn.textContent = "Binance Pay (Coming Soon)";
  }
}

/* =========================================================
   PART 4 — MARKET + CASINO (General Update)
========================================================= */

const MARKET = {
  pair: "BX/USDT",
  price: 5,
  side: "buy" // buy | sell
};

const MARKET_PAIRS = [
  "BX/USDT",
  "BX/BTC",
  "BX/BNB",
  "BX/ETH",
  "BX/SOL",
  "BX/TON"
];

/* ================= MARKET BINDINGS ================= */

function bindMarketPairs() {
  const buttons = document.querySelectorAll("#pairScroll button");

  buttons.forEach(btn => {
    btn.onclick = () => {
      const pair = btn.dataset.pair;
      if (!pair || pair === MARKET.pair) return;

      MARKET.pair = pair;
      highlightActivePair();
      renderMarket();
    };
  });
}

function bindPairSelector() {
  const selector = $("pairSelector");
  if (!selector) return;

  selector.onclick = () => {
    const i = MARKET_PAIRS.indexOf(MARKET.pair);
    MARKET.pair = MARKET_PAIRS[(i + 1) % MARKET_PAIRS.length];

    highlightActivePair();
    renderMarket();
  };
}

function highlightActivePair() {
  document.querySelectorAll("#pairScroll button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });
}

/* ================= MARKET PRICE (SSOT) ================= */

async function updateMarketPrice() {
  try {
    // BX/USDT → asset = usdt
    const asset = MARKET.pair.split("/")[1].toLowerCase();

    const res = await fetch("/market/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset,        // usdt / bnb / eth / ton ...
        side: MARKET.side, // buy | sell
        amount: 1     // price per 1 BX
      })
    });

    const data = await res.json();

    if (!data || typeof data.price !== "number") return;

    MARKET.price = data.price;
  } catch (e) {
    console.warn("Quote fetch failed");
  }
}
/* ================= MARKET ================= */

function initMarket() {
   bindPairSelector(); 
   bindMarketPairs();

  if (MARKET.timer) return;

  MARKET.timer = setInterval(() => {
    if (APP.view === "market") {
      updateMarketPrice();
      renderMarket();
    }
  }, 1500);

  log.info("Market initialized");
}

function stopMarket() {
  clearInterval(MARKET.timer);
  MARKET.timer = null;
}

/* ================= CHART MARKET ================= */
let chartData = [];

function updateChart() {
  const canvas = $("marketChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;

  chartData.push(MARKET.price);
  if (chartData.length > 30) chartData.shift();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();

  chartData.forEach((p, i) => {
    const x = (i / 29) * canvas.width;
    const y = canvas.height - (p / Math.max(...chartData)) * canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#02c076";
  ctx.lineWidth = 2;
  ctx.stroke();
}



/*================= BUY & SELL 
================= */

function setTradeSide(side) {
  MARKET.side = side;

  const buyTab = $("buyTab");
  const sellTab = $("sellTab");
  const box = document.querySelector(".trade-box");
  const actionBtn = $("actionBtn");

  buyTab?.classList.toggle("active", side === "buy");
  sellTab?.classList.toggle("active", side === "sell");

  if (box) {
    box.classList.remove("buy", "sell");
    box.classList.add(side);
  }

  if (actionBtn) {
    if (side === "buy") {
      actionBtn.textContent = "Buy BX";
      actionBtn.classList.remove("sell");
      actionBtn.classList.add("buy");
    } else {
      actionBtn.textContent = "Sell BX";
      actionBtn.classList.remove("buy");
      actionBtn.classList.add("sell");
    }
  }
}

/* ================= MARKET PAIRS ================= */

function bindMarketPairs() {
  const buttons = $$(".market-pair");

  buttons.forEach(btn => {
    const pair = btn.dataset.pair;
    if (!pair) return;

    btn.onclick = () => {
      if (MARKET.pair === pair) return;

      MARKET.pair = pair;
      highlightActivePair();
      renderMarket();

      log.info("Market pair changed", pair);
    };
  });
}

function highlightActivePair() {
  $$(".market-pair").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.pair === MARKET.pair
    );
  });
}

/* ================= PRICE UPDATE ================= */
/* مؤقت: سيتم استبداله بسعر market.py */

function updateMarketPrice() {
  if (typeof MARKET.price !== "number" || MARKET.price <= 0) {
    MARKET.price = 1;
  }

  const drift = (Math.random() - 0.5) * 0.02;
  MARKET.price = Math.max(0.0001, MARKET.price + drift);
}

/* ================= RENDER MARKET ================= */

function renderMarket() {
  renderMarketPair();
  renderMarketPrice();
  renderTradeAction();
  updateChart();

  log.info("Market rendered", {
    pair: MARKET.pair,
    price: MARKET.price,
    side: MARKET.side
  });
}

function renderMarketPair() {
  const el = $("marketPair");
  if (!el) return;

  el.textContent = MARKET.pair.replace("/", " / ");
}

function renderMarketPrice() {
  const el = $("marketPrice");
  if (!el) return;

  el.textContent = Number(MARKET.price).toFixed(4);
}

function renderTradeAction() {
  const btn = $("actionBtn");
  if (!btn) return;

  const side = MARKET.side || "buy";

  btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
  btn.classList.remove("buy", "sell");
  btn.classList.add(side);
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
