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

/* ================= ACTION ROUTER (AIRDROP / CARDS) ================= */

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const ACTION_MAP = {
    "go-wallet": "wallet",
    "go-market": "market",
    "go-casino": "casino",
    "go-mining": "mining",
    "go-airdrop": "airdrop"
  };

  const action = btn.dataset.action;
  const targetView = ACTION_MAP[action];

  if (!targetView) {
    log.warn("Unknown data-action:", action);
    return;
  }

  // هذا هو الربط الصحيح مع Router الحالي
  document.dispatchEvent(
    new CustomEvent("view:change", { detail: targetView })
  );
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

/* =========================
   VIEW BINDING (SSOT)
========================= */

let CURRENT_VIEW = null;

/* ================= ACTION ROUTER  ================= */

document.addEventListener("view:change", (e) => {
  const view = e.detail;
  if (!view || view === CURRENT_VIEW) return;

  log.info("VIEW CHANGE:", CURRENT_VIEW, "→", view);

   /* ========= EXIT OLD VIEW ========= */
  switch (CURRENT_VIEW) {
    case "market":
      stopMarket();
      if (MARKET.ws) {
        MARKET.ws.close();
        MARKET.ws = null;
        log.info("Market WS closed");
      }
      break;
  }

   /* ========= ENTER NEW VIEW ========= */
  switch (view) {
    case "wallet":
      loadWallet();
      break;

    case "market":
      initMarket();
      startMarket();
      connectExchange();   

      // إصلاح chart (بعد إظهار view)
      setTimeout(() => {
        if (MARKET.chart) {
          MARKET.chart.applyOptions({
            width: document.getElementById("marketChart").clientWidth
          });
        }
      }, 80);
      break;

    case "casino":
      initCasino();
      break;

    case "mining":
      renderMining();
      break;

    case "airdrop":
      loadAirdrop();
      break;
  }

  CURRENT_VIEW = view;
});

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
  // mock connect (جاهز للربط الحقيقي)
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

const MARKET = {
  pair: "BX/USDT",
  side: "buy",

  price: 0,
  prevPrice: 0,

  chart: null,
  candleSeries: null,
  volumeSeries: null,

  timer: null,
  initialized: false
};

/* =========================
   INIT
========================= */
function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;

  bindMarketPairs();
  bindTradeTabs();
  initMarketChart();
  updatePairLabel();

  console.log("[Market] ready");
}

/* =========================
   PAIRS
========================= */
function bindMarketPairs() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.onclick = () => {
      const pair = btn.dataset.pair;
      if (!pair || pair === MARKET.pair) return;

      MARKET.pair = pair;
      updatePairLabel();
      reloadMarket();
    };
  });
}

function updatePairLabel() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });

  const label = document.getElementById("marketPair");
  if (label) label.textContent = MARKET.pair.replace("/", " / ");
}

/* =========================
   PRICE FETCH
========================= */
async function fetchMarketPrice() {
  const data = await safeFetch(`/market/quote?pair=${MARKET.pair}`);
  if (!data || typeof data.price !== "number") return;

  MARKET.prevPrice = MARKET.price;
  MARKET.price = data.price;

  updatePriceUI();
  updateLiveCandle();
  updateVolume();
}

/* =========================
   PRICE UI
========================= */
function updatePriceUI() {
  const el = document.getElementById("marketPrice");
  if (!el) return;

  el.textContent = MARKET.price.toFixed(6);
  el.classList.remove("up", "down");

  if (MARKET.prevPrice) {
    el.classList.add(
      MARKET.price > MARKET.prevPrice ? "up" : "down"
    );
  }
}

/* ================= exchange ================= */

const EXCHANGE_WS = "wss://YOUR-FLY-APP.fly.dev/ws/exchange";

function connectExchange() {
  MARKET.ws = new WebSocket(EXCHANGE_WS);

  MARKET.ws.onmessage = e => {
    const msg = JSON.parse(e.data);

    if (msg.book) renderOrderBook(msg.book);
    if (msg.trades) renderTrades(msg.trades);
  };
}

function submitLimitOrder(amount, price) {
  MARKET.ws.send(JSON.stringify({
    type: "order",
    uid: USER.uid,           // من auth
    pair: MARKET.pair,
    side: MARKET.side,
    price,
    amount
  }));
}

/* =============== CHART ========================= */

function initMarketChart() {
  const el = document.getElementById("marketChart");
  if (!el || MARKET.chart) return;

  MARKET.chart = LightweightCharts.createChart(el, {
    width: el.clientWidth,
    height: 300,
    layout: {
      background: { color: "#020617" },
      textColor: "#94a3b8"
    },
    grid: {
      vertLines: { color: "#0f172a" },
      horzLines: { color: "#0f172a" }
    },
    rightPriceScale: { borderColor: "#1e293b" },
    timeScale: { borderColor: "#1e293b", timeVisible: true }
  });

  MARKET.candleSeries = MARKET.chart.addCandlestickSeries({
    upColor: "#22c55e",
    downColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
    borderVisible: false
  });

  MARKET.volumeSeries = MARKET.chart.addHistogramSeries({
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: { top: 0.75, bottom: 0 }
  });
}

/* ============= CANDLE + VOLUME ================ */

function updateLiveCandle() {
  if (!MARKET.candleSeries) return;

  const t = Math.floor(Date.now() / 1000);
  const open = MARKET.prevPrice || MARKET.price;

  MARKET.candleSeries.update({
    time: t,
    open,
    high: Math.max(open, MARKET.price),
    low: Math.min(open, MARKET.price),
    close: MARKET.price
  });
}

function updateVolume() {
  if (!MARKET.volumeSeries) return;

  MARKET.volumeSeries.update({
    time: Math.floor(Date.now() / 1000),
    value: Math.random() * 100 + 10, // demo volume
    color:
      MARKET.price >= MARKET.prevPrice
        ? "rgba(34,197,94,.8)"
        : "rgba(239,68,68,.8)"
  });
}

/* =========================
   BUY / SELL UI
========================= */
function bindTradeTabs() {
  document.getElementById("buyTab")
    ?.addEventListener("click", () => setSide("buy"));

  document.getElementById("sellTab")
    ?.addEventListener("click", () => setSide("sell"));
}

function setSide(side) {
  MARKET.side = side;

  document.getElementById("buyTab")
    ?.classList.toggle("active", side === "buy");

  document.getElementById("sellTab")
    ?.classList.toggle("active", side === "sell");

  const box = document.getElementById("tradeBox");
  if (box) {
    box.classList.toggle("buy", side === "buy");
    box.classList.toggle("sell", side === "sell");
  }

  const btn = document.getElementById("actionBtn");
  if (btn) {
    btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
    btn.className = `action-btn ${side}`;
  }
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

function reloadMarket() {
  stopMarket();
  MARKET.price = 0;
  MARKET.prevPrice = 0;

  const el = document.getElementById("marketPrice");
  if (el) el.textContent = "--";

  startMarket();
}

/* =========================
   VIEW BINDING (CRITICAL)
========================= */
document.addEventListener("view:change", (e) => {
  if (e.detail === "market") {
    initMarket();
    startMarket();
    setTimeout(() => {
      if (MARKET.chart) {
        MARKET.chart.applyOptions({
          width: document.getElementById("marketChart").clientWidth
        });
      }
    }, 60);
  } else {
    stopMarket();
  }
});

/* =====================================================
   CASINO.JS — FULL UPDATE (Telegram + WebApp Safe)
===================================================== */

const CASINO = {
  currentGame: null,
  flags: {},
  ws: null
};

/* =====================================================
   GAME UI SCHEMA (12 GAMES)
===================================================== */

const GAME_UI = {
  coinflip: ["bet"],
  crash: ["bet", "multiplier"],
  limbo: ["bet", "multiplier"],
  dice: ["bet", "multiplier"],
  slot: ["bet"],
  plinko: ["bet", "multiplier"],
  hilo: ["bet", "choice"],
  airboss: ["bet", "multiplier"],
  fruit_party: ["bet"],
  banana_farm: ["bet"],
  blackjack_fast: ["bet"],
  birds_party: ["bet"]
};

/* =====================================================
   SOUND FX (Telegram-friendly)
===================================================== */

const sounds = {
  win: new Audio("/assets/sounds/win.mp3"),
  lose: new Audio("/assets/sounds/lose.mp3")
};

function playSound(type) {
  try {
    sounds[type].currentTime = 0;
    sounds[type].play();
  } catch (_) {}
}

/* =====================================================
   CARD ANIMATION (WIN / LOSE)
===================================================== */

function animateGameResult(game, win) {
  const card = document.querySelector(`.game[data-game="${game}"]`);
  if (!card) return;

  card.classList.remove("win", "lose");
  card.classList.add(win ? "win" : "lose");

  setTimeout(() => {
    card.classList.remove("win", "lose");
  }, 900);
}

/* =====================================================
   BIND CASINO CARDS
===================================================== */

function bindCasinoGames() {
  document.querySelectorAll(".game[data-game]").forEach(card => {
    const game = card.dataset.game;

    if (CASINO.flags[game] === false) {
      card.classList.add("disabled");
      card.onclick = () => alert(" Game disabled");
      return;
    }

    card.classList.remove("disabled");
    card.onclick = () => openCasinoGame(game);
  });
}

/* =====================================================
   OPEN GAME
===================================================== */

function openCasinoGame(game) {
  CASINO.currentGame = game;

  document.querySelectorAll(".game").forEach(g =>
    g.classList.remove("active")
  );

  const card = document.querySelector(`.game[data-game="${game}"]`);
  if (card) card.classList.add("active");

  renderGameUI(game);
}

/* =====================================================
   RENDER GAME UI
===================================================== */

function renderGameUI(game) {
  const box = $("casinoGameBox");
  if (!box) return;

  const fields = GAME_UI[game] || ["bet"];
  let html = `<h3>${game.replace("_", " ").toUpperCase()}</h3>`;

  fields.forEach(f => {
    if (f === "choice") {
      html += `
        <select id="choice">
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>`;
    } else {
      html += `<input id="${f}" type="number" placeholder="${f}">`;
    }
  });

  html += `<button id="playBtn">Play</button>`;
  box.innerHTML = html;

  $("playBtn").onclick = startCasinoGame;
}

/* =====================================================
   START GAME
===================================================== */

async function startCasinoGame() {
  if (!isAuthenticated()) {
    alert("Please login first");
    return;
  }

  const game = CASINO.currentGame;
  if (!game) return;

  const bet = Number($("bet")?.value || 0);
  if (bet <= 0) {
    alert("Invalid bet");
    return;
  }

  const payload = {
    uid: USER.uid,
    game,
    bet,
    multiplier: Number($("multiplier")?.value || null),
    choice: $("choice")?.value || null,
    client_seed: Date.now().toString()
  };

  const res = await safeFetch("/casino/play", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!res) {
    alert("Game failed");
    return;
  }

  handleCasinoResult(res);
}

/* =====================================================
   HANDLE RESULT
===================================================== */

function handleCasinoResult(res) {
  animateGameResult(res.game, res.win);
  playSound(res.win ? "win" : "lose");

  alert(
    res.win
      ? ` WIN!\nPayout: ${res.payout}`
      : ` LOSE`
  );
}

/* =====================================================
   BIG WINS — WEBSOCKET TICKER
===================================================== */

function initBigWinsTicker() {
  try {
    CASINO.ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/big-wins`
    );

    CASINO.ws.onmessage = e => {
      const w = JSON.parse(e.data);
      pushBigWin(w);
    };
  } catch (_) {}
}

function pushBigWin(w) {
  const box = $("bigWinsList");
  if (!box) return;

  const row = document.createElement("div");
  row.className = "big-win-row";
  row.innerHTML = `
    <span>${w.user}</span>
    <span>${w.game}</span>
    <strong>+${w.amount} BX</strong>
  `;

  box.prepend(row);
  setTimeout(() => row.remove(), 8000);
}

/* =====================================================
   GAME FLAGS (ADMIN LIVE TOGGLE)
===================================================== */

async function refreshGameFlags() {
  try {
    const res = await fetch("/casino/flags");
    if (!res.ok) return;

    CASINO.flags = await res.json();
    bindCasinoGames();
  } catch (_) {}
}

/* =====================================================
   INIT
===================================================== */

function initCasino() {
  refreshGameFlags();
  initBigWinsTicker();

  setInterval(refreshGameFlags, 10000);
  console.info("Casino initialized");
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
