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

const VIEW_NODES = document.querySelectorAll(".view");
const NAV_BTNS = document.querySelectorAll(".bottom-nav button");

function switchView(viewId) {
  if (!viewId) return;

  VIEW_NODES.forEach(v => v.classList.remove("active"));
  NAV_BTNS.forEach(b => b.classList.remove("active"));

  const view = document.getElementById(viewId);
  const btn = document.querySelector(`.bottom-nav button[data-view="${viewId}"]`);

  if (view) view.classList.add("active");
  if (btn) btn.classList.add("active");

  document.dispatchEvent(
    new CustomEvent("view:change", { detail: viewId })
  );
}

/* ================= BOOTSTRAP ================= */

document.addEventListener("DOMContentLoaded", () => {
  NAV_BTNS.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  });

  switchView("wallet"); // default view
});

/* ================= VIEW LIFECYCLE (SSOT) ================= */

let CURRENT_VIEW = null;

document.addEventListener("view:change", e => {
  const view = e.detail;
  if (!view || view === CURRENT_VIEW) return;

  /* ===== EXIT OLD VIEW ===== */
  switch (CURRENT_VIEW) {
    case "market":
      if (typeof stopMarket === "function") stopMarket();
      if (window.depthWS) {
        window.depthWS.close();
        window.depthWS = null;
      }
      break;
  }

  CURRENT_VIEW = view;

  /* ===== ENTER NEW VIEW ===== */
  switch (view) {
    case "wallet":
      if (typeof loadWallet === "function") loadWallet();
      break;

    case "market":
      if (typeof initMarket === "function") initMarket();
      if (typeof startPriceFeed === "function") startPriceFeed();
      if (typeof connectDepthWS === "function") connectDepthWS();
      break;

    case "casino":
      if (typeof initCasino === "function") initCasino();
      break;

    case "mining":
      if (typeof renderMining === "function") renderMining();
      break;

    case "airdrop":
      if (typeof loadAirdrop === "function") loadAirdrop();
      break;
  }
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

/* =================================================
   MARKET — FULL ENGINE (BX EXCHANGE)
================================================= */

const BX_USDT_PRICE = 12;
const FEE_RATE = 0.001; // 0.1%

const FALLBACK_PRICES = {
  USDT: 1,
  ETH: 2070,
  BNB: 630,
  BTC: 69000,
  SOL: 86,
  TON: 1.5
};

const MARKET_PRICES = { ...FALLBACK_PRICES };

let priceTimer = null;
let depthWS = null;

/* ================= STATE ================= */

const MARKET = {
  pair: "BX/USDT",
  side: "buy",
  price: BX_USDT_PRICE,
  lockedPrice: null,

  chart: null,
  candleSeries: null,
  emaSeries: null,
  vwapSeries: null,

  depthChart: null,
  bidSeries: null,
  askSeries: null,

  candles: [],
  initialized: false
};

/* ================= PRICE ENGINE ================= */

async function fetchRealPrices() {
  const symbols = ["ETHUSDT", "BNBUSDT", "BTCUSDT", "SOLUSDT", "TONUSDT"];
  for (const s of symbols) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${s}`
      );
      const data = await res.json();
      MARKET_PRICES[s.replace("USDT", "")] = parseFloat(data.price);
    } catch {}
  }
}

function startPriceFeed() {
  fetchRealPrices();
  if (priceTimer) clearInterval(priceTimer);
  priceTimer = setInterval(fetchRealPrices, 30000);
}

function stopPriceFeed() {
  if (priceTimer) clearInterval(priceTimer);
  priceTimer = null;
}

function getPairPrice(pair) {
  const [, quote] = pair.split("/");
  if (quote === "USDT") return BX_USDT_PRICE;
  return +(BX_USDT_PRICE / (MARKET_PRICES[quote] || 1)).toFixed(8);
}

/* ================= UI ================= */

function updatePriceUI() {
  const price = getPairPrice(MARKET.pair);
  MARKET.price = price;

  const quote = MARKET.pair.split("/")[1];
  const priceEl = document.getElementById("marketPrice");
  const approxEl = document.getElementById("marketApprox");

  if (priceEl) priceEl.textContent = `${price} ${quote}`;
  if (approxEl)
    approxEl.textContent = `≈ ${(price * (MARKET_PRICES[quote] || 1)).toFixed(2)} USDT`;
}

function updatePairUI() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });

  const pairEl = document.getElementById("marketPair");
  if (pairEl) pairEl.textContent = MARKET.pair.replace("/", " / ");
}

function updateWalletUI() {
  document.getElementById("walletBX").textContent = WALLET.BX.toFixed(4);
  document.getElementById("walletUSDT").textContent = WALLET.USDT.toFixed(2);
}

/* ================= PAIRS ================= */

function bindPairs() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.onclick = () => {
      MARKET.pair = btn.dataset.pair;
      updatePairUI();
      updatePriceUI();
      loadStaticChart();
      connectDepthWS();
    };
  });
}

/* ================= CHART ================= */

function initChart() {
  const el = document.getElementById("marketChart");
  if (!el || MARKET.chart) return;

  MARKET.chart = LightweightCharts.createChart(el, {
    height: 300,
    layout: { background: { color: "#020617" }, textColor: "#94a3b8" }
  });

  MARKET.candleSeries = MARKET.chart.addCandlestickSeries();
  MARKET.emaSeries = MARKET.chart.addLineSeries({ color: "#facc15" });
  MARKET.vwapSeries = MARKET.chart.addLineSeries({ color: "#38bdf8" });
}

function loadStaticChart() {
  const now = Math.floor(Date.now() / 1000);
  MARKET.candles = [];

  for (let i = 30; i >= 0; i--) {
    MARKET.candles.push({
      time: now - i * 60,
      open: MARKET.price,
      high: MARKET.price * 1.01,
      low: MARKET.price * 0.99,
      close: MARKET.price,
      volume: Math.random() * 50 + 10
    });
  }

  MARKET.candleSeries.setData(MARKET.candles);
  MARKET.emaSeries.setData(calcEMA(MARKET.candles));
  MARKET.vwapSeries.setData(calcVWAP(MARKET.candles));
}

function calcEMA(data, p = 20) {
  let k = 2 / (p + 1);
  let ema = data[0].close;
  return data.map(c => {
    ema = c.close * k + ema * (1 - k);
    return { time: c.time, value: ema };
  });
}

function calcVWAP(data) {
  let pv = 0, vol = 0;
  return data.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * c.volume;
    vol += c.volume;
    return { time: c.time, value: pv / vol };
  });
}

/* ================= DEPTH WS ================= */

function connectDepthWS() {
  disconnectDepthWS();

  const quote = MARKET.pair.split("/")[1];
  const MAP = {
    USDT: "ethusdt",
    ETH: "ethusdt",
    BNB: "bnbusdt",
    BTC: "btcusdt",
    SOL: "solusdt",
    TON: "tonusdt"
  };

  depthWS = new WebSocket(
    `wss://stream.binance.com:9443/ws/${MAP[quote]}@depth20@100ms`
  );

  depthWS.onmessage = e => {
    const d = JSON.parse(e.data);
    updateOrderBook(d);
    updateDepthChart(d);
  };
}

function disconnectDepthWS() {
  if (depthWS) depthWS.close();
  depthWS = null;
}

/* ================= ORDER BOOK ================= */

function updateOrderBook(d) {
  const bidsEl = document.getElementById("bids");
  const asksEl = document.getElementById("asks");
  if (!bidsEl || !asksEl) return;

  bidsEl.innerHTML = "";
  asksEl.innerHTML = "";

  d.bids.slice(0, 10).forEach(([p, q]) => {
    bidsEl.innerHTML += `<div class="row buy">${(MARKET.price / p).toFixed(6)} • ${q}</div>`;
  });

  d.asks.slice(0, 10).forEach(([p, q]) => {
    asksEl.innerHTML += `<div class="row sell">${(MARKET.price / p).toFixed(6)} • ${q}</div>`;
  });
}

/* ================= DEPTH CHART ================= */

function initDepthChart() {
  const el = document.getElementById("depthChart");
  if (!el || MARKET.depthChart) return;

  MARKET.depthChart = LightweightCharts.createChart(el, { height: 180 });
  MARKET.bidSeries = MARKET.depthChart.addAreaSeries({ lineColor: "#22c55e" });
  MARKET.askSeries = MARKET.depthChart.addAreaSeries({ lineColor: "#ef4444" });
}

function updateDepthChart(d) {
  let bc = 0, ac = 0;
  MARKET.bidSeries.setData(
    d.bids.slice(0, 10).map(([p, q]) => ({
      time: (MARKET.price / p),
      value: (bc += parseFloat(q))
    }))
  );
  MARKET.askSeries.setData(
    d.asks.slice(0, 10).map(([p, q]) => ({
      time: (MARKET.price / p),
      value: (ac += parseFloat(q))
    }))
  );
}

/* ================= WALLET ================= */

async function loadWallet() {
  const res = await fetch("/api/wallet", {
    headers: { Authorization: `Bearer ${USER.jwt}` }
  });
  WALLET = await res.json();
  updateWalletUI();
}

/* ================= ORDERS ================= */

function submitLimitOrder() {
  const amount = parseFloat(document.getElementById("orderAmount").value);
  if (!amount || amount <= 0) return alert("Invalid amount");

  const lockedPrice = MARKET.price;
  const quote = MARKET.pair.split("/")[1];
  const total = amount * lockedPrice;
  const fee = total * FEE_RATE;

  if (MARKET.side === "buy") {
    if (WALLET.USDT < total + fee) return alert("Insufficient USDT");
    WALLET.USDT -= total + fee;
    WALLET.BX += amount;
  } else {
    if (WALLET.BX < amount) return alert("Insufficient BX");
    WALLET.BX -= amount;
    WALLET.USDT += total - fee;
  }

  updateWalletUI();
  alert("Order executed ✔️");
}

/* ================= INIT ================= */

function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;

  bindPairs();
  initChart();
  initDepthChart();
  updatePairUI();
  updatePriceUI();
  loadStaticChart();
}

/* ================= LIFECYCLE ================= */

document.addEventListener("view:change", e => {
  if (e.detail === "market") {
    initMarket();
    startPriceFeed();
    connectDepthWS();
    loadWallet();
  } else {
    stopPriceFeed();
    disconnectDepthWS();
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
