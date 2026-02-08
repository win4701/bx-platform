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
  BTC: 0,
  BNB: 0,
  ETH: 0,
  AVAX: 0,
  TON: 0,
  SOL: 0,
  LTC: 0,
  loaded: false
};

/* ================= DOM MAP ================= */

const WALLET_DOM = {
  BX: "bal-bx",
  USDT: "bal-usdt",
  BTC: "bal-btc",
  BNB: "bal-bnb",
  ETH: "bal-eth",
  AVAX: "bal-avax",
  TON: "bal-ton",
  SOL: "bal-sol",
  LTC: "bal-ltc",
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
    WALLET.BTC = 0.00;
    WALLET.BNB = 0.00;
    WALLET.ETH = 0.00;
    WALLET.AVAX = 0.00;
    WALLET.TON = 0.00;
    WALLET.SOL = 0.00;
    WALLET.LTC = 0.00;
    WALLET.loaded = true;

    log.info("Wallet loaded (UI fallback)");
  }

  renderWallet();
  renderWalletConnections();
}

/* ======================================================
   CONNECT WALLET – SSOT (TON + EVM)
====================================================== */

const WALLET_STATE = {
  type: null,          // ton | evm
  address: null,
  connected: false
};

/* ================= UI RENDER ================= */

function renderWalletButtons() {
  const wcBtn = document.getElementById("walletConnectBtn");
  const binanceBtn = document.getElementById("binanceConnectBtn");

  if (wcBtn) {
    wcBtn.classList.toggle("connected", WALLET_STATE.connected);
    wcBtn.textContent = WALLET_STATE.connected
      ? `Wallet Connected`
      : `Connect Wallet`;
  }

  if (binanceBtn) {
    binanceBtn.textContent = "Binance Pay (Coming Soon)";
    binanceBtn.disabled = true;
  }
}

/* ================= TON WALLETCONNECT ================= */

let tonConnectUI = null;

function initTonConnect() {
  if (!window.TON_CONNECT_UI) return;

  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://your-domain.com/tonconnect-manifest.json",
    buttonRootId: "walletConnectBtn"
  });

  tonConnectUI.onStatusChange(wallet => {
    if (!wallet) return;

    WALLET_STATE.type = "ton";
    WALLET_STATE.address = wallet.account.address;
    WALLET_STATE.connected = true;

    saveWalletSession();
    notifyBackend();
    renderWalletButtons();

    console.log("TON connected:", WALLET_STATE.address);
  });
}

/* ================= EVM WALLETCONNECT ================= */

async function connectEVM() {
  if (!window.WalletConnectProvider || !window.Web3) return;

  const provider = new WalletConnectProvider.default({
    rpc: {
      1: "https://rpc.ankr.com/eth",
      56: "https://rpc.ankr.com/bsc"
    }
  });

  await provider.enable();
  const web3 = new Web3(provider);
  const accounts = await web3.eth.getAccounts();

  WALLET_STATE.type = "evm";
  WALLET_STATE.address = accounts[0];
  WALLET_STATE.connected = true;

  saveWalletSession();
  notifyBackend();
  renderWalletButtons();

  console.log("EVM connected:", WALLET_STATE.address);
}

/* ================= SESSION ================= */

function saveWalletSession() {
  localStorage.setItem("wallet_session", JSON.stringify(WALLET_STATE));
}

function restoreWalletSession() {
  const saved = localStorage.getItem("wallet_session");
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    Object.assign(WALLET_STATE, data);
  } catch {}
}

/* ================= BACKEND SYNC ================= */

function notifyBackend() {
  fetch("/api/wallet/connect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.token || ""}`
    },
    body: JSON.stringify({
      type: WALLET_STATE.type,
      address: WALLET_STATE.address
    })
  }).catch(() => {});
}

/* ================= WITHDRAW ================= */

async function requestWithdraw(asset, amount, toAddress) {
  if (!WALLET_STATE.connected) {
    alert("Connect wallet first");
    return;
  }

  const res = await fetch("/api/withdraw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.token || ""}`
    },
    body: JSON.stringify({
      asset,
      amount,
      address: toAddress
    })
  });

  const data = await res.json();
  alert(data.message || "Withdraw submitted");
}

/* ================= DEPOSIT ================= */

function getDepositAddress(asset) {
  if (!WALLET_STATE.connected) return null;

  return fetch(`/api/deposit/address?asset=${asset}`, {
    headers: {
      Authorization: `Bearer ${localStorage.token || ""}`
    }
  }).then(r => r.json());
}

/* ================= EVENTS ================= */

function bindWalletUI() {
  const wcBtn = document.getElementById("walletConnectBtn");

  if (wcBtn) {
    wcBtn.addEventListener("click", () => {
      if (window.TON_CONNECT_UI) {
        initTonConnect();
      } else {
        connectEVM();
      }
    });
  }
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  restoreWalletSession();
  bindWalletUI();
  renderWalletButtons();
});

/* =================================================
   MARKET.JS — FULL ENGINE (CANVAS FIRST)
================================================= */

const MARKET_CFG = {
  BASE_PRICE: 12,
  TICK_MS: 1000,
  LEVELS: 12,
  EMA_PERIOD: 14,
  FEE: 0.001,
};

/* ================= STATE ================= */
const Market = {
  running: false,
  timer: null,
  ws: null,

  pair: "BX/USDT",
  last: MARKET_CFG.BASE_PRICE,
  prev: MARKET_CFG.BASE_PRICE,

  bids: [],
  asks: [],
  trades: [],

  ema: null,
  vwap: null,
  pv: 0,
  vol: 0,

  side: "buy",
};

/* ================= DOM ================= */
const $m = id => document.getElementById(id);

const DOM = {
  canvas: $m("marketCanvas"),
  price: $m("marketPrice"),
  approx: $m("marketApprox"),
  bids: $m("bids"),
  asks: $m("asks"),
  ladder: $m("priceLadder"),
  trades: $m("tradesList"),
  amount: $m("orderAmount"),
  execPrice: $m("execPrice"),
  slippage: $m("slippage"),
};

const ctx = DOM.canvas?.getContext("2d");

/* ================= INIT / STOP ================= */
function initMarket() {
  if (Market.running) return;
  if (!DOM.canvas || !ctx) return;

  Market.running = true;
  Market.last = MARKET_CFG.BASE_PRICE;
  Market.prev = MARKET_CFG.BASE_PRICE;
  Market.trades = [];
  Market.ema = null;
  Market.vwap = null;
  Market.pv = 0;
  Market.vol = 0;

  bindPairs();
  bindOrderPreview();

  startFakeFeed();
  connectTradesWS(); // Fake الآن – Real لاحقًا

  console.info("[MARKET] init");
}

function stopMarket() {
  Market.running = false;

  if (Market.timer) {
    clearInterval(Market.timer);
    Market.timer = null;
  }

  if (Market.ws) {
    Market.ws.close();
    Market.ws = null;
  }

  console.info("[MARKET] stopped");
}

/* ================= PAIRS ================= */
function bindPairs() {
  document.querySelectorAll(".pair-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".pair-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      Market.pair = btn.dataset.pair;
      Market.last = MARKET_CFG.BASE_PRICE;
      Market.prev = MARKET_CFG.BASE_PRICE;
    };
  });
}

/* ================= FAKE MARKET FEED ================= */
function startFakeFeed() {
  Market.timer = setInterval(fakeTick, MARKET_CFG.TICK_MS);
}

function fakeTick() {
  if (!Market.running) return;

  Market.prev = Market.last;
  Market.last = +(
    Market.last + (Math.random() - 0.5) * 0.05
  ).toFixed(4);

  genOrderBook();
  pushTrade();
  updateIndicators();

  renderAll();
}

/* ================= ORDER BOOK ================= */
function genOrderBook() {
  Market.bids = [];
  Market.asks = [];

  for (let i = 1; i <= MARKET_CFG.LEVELS; i++) {
    Market.bids.push({
      price: +(Market.last - i * 0.01).toFixed(4),
      qty: +(Math.random() * 3 + 0.5).toFixed(3),
    });
    Market.asks.push({
      price: +(Market.last + i * 0.01).toFixed(4),
      qty: +(Math.random() * 3 + 0.5).toFixed(3),
    });
  }
}

/* ================= TRADES ================= */
function pushTrade() {
  Market.trades.unshift({
    price: Market.last,
    qty: +(Math.random() * 2).toFixed(3),
    side: Market.last >= Market.prev ? "buy" : "sell",
    time: new Date().toLocaleTimeString(),
  });

  Market.trades = Market.trades.slice(0, 30);
}

/* ================= INDICATORS ================= */
function updateIndicators() {
  const price = Market.last;
  const volume = Math.random() * 3 + 1;

  Market.pv += price * volume;
  Market.vol += volume;
  Market.vwap = Market.pv / Market.vol;

  const k = 2 / (MARKET_CFG.EMA_PERIOD + 1);
  Market.ema = Market.ema === null
    ? price
    : price * k + Market.ema * (1 - k);
}

/* ================= RENDER ================= */
function renderAll() {
  renderPrice();
  renderBook();
  renderLadder();
  renderTrades();
  renderCanvas();
  previewOrder();
}

function renderPrice() {
  if (!DOM.price) return;

  DOM.price.textContent = Market.last.toFixed(4);
  DOM.approx.textContent = `≈ ${Market.last.toFixed(2)} USDT`;

  DOM.price.classList.remove("up", "down");
  if (Market.last > Market.prev) DOM.price.classList.add("up");
  if (Market.last < Market.prev) DOM.price.classList.add("down");
}

function renderBook() {
  DOM.bids.innerHTML = Market.bids
    .map(b => `<div class="row buy"><span>${b.price}</span><span>${b.qty}</span></div>`)
    .join("");

  DOM.asks.innerHTML = Market.asks
    .map(a => `<div class="row sell"><span>${a.price}</span><span>${a.qty}</span></div>`)
    .join("");
}

function renderLadder() {
  DOM.ladder.innerHTML = `
    ${Market.asks.slice(0,6).reverse().map(a=>`<div class="ladder sell">${a.price}</div>`).join("")}
    <div class="ladder mid">${Market.last}</div>
    ${Market.bids.slice(0,6).map(b=>`<div class="ladder buy">${b.price}</div>`).join("")}
  `;
}

function renderTrades() {
  DOM.trades.innerHTML = Market.trades
    .map(t => `
      <div class="trade ${t.side}">
        <span>${t.price}</span>
        <span>${t.qty}</span>
        <span>${t.time}</span>
      </div>`)
    .join("");
}

/* ================= CANVAS ================= */
function renderCanvas() {
  const w = DOM.canvas.width;
  const h = DOM.canvas.height;
  ctx.clearRect(0, 0, w, h);

  const midY = h / 2;
  const scale = 6;
  const y = p => midY - (p - Market.last) * scale;

  Market.bids.forEach(b => {
    ctx.fillStyle = "rgba(34,197,94,0.25)";
    ctx.fillRect(0, y(b.price), w / 2, 6);
  });

  Market.asks.forEach(a => {
    ctx.fillStyle = "rgba(239,68,68,0.25)";
    ctx.fillRect(w / 2, y(a.price), w / 2, 6);
  });

  drawLine(Market.last, "#ffffff");
  drawLine(Market.ema, "#facc15");
  drawLine(Market.vwap, "#a855f7");

  function drawLine(val, color) {
    if (!val) return;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y(val));
    ctx.lineTo(w, y(val));
    ctx.stroke();
  }
}

/* ================= SLIPPAGE PREVIEW ================= */
function estimateExecution(qty) {
  let remain = qty;
  let cost = 0;

  for (const a of Market.asks) {
    const take = Math.min(remain, a.qty);
    cost += take * a.price;
    remain -= take;
    if (!remain) break;
  }

  if (remain > 0) return null;

  const exec = cost / qty;
  const best = Market.asks[0].price;
  const slip = Math.abs(exec - best) / best * 100;

  return { exec, slip };
}

function previewOrder() {
  const qty = +DOM.amount?.value;
  if (!qty) return;

  const r = estimateExecution(qty);
  if (!r) return;

  DOM.execPrice.textContent = r.exec.toFixed(4);
  DOM.slippage.textContent = r.slip.toFixed(2) + "%";
}

function bindOrderPreview() {
  if (DOM.amount) DOM.amount.oninput = previewOrder;
}

/* ================= TRADES WS (READY FOR REAL) ================= */
function connectTradesWS() {
  // Fake WS placeholder – replace URL later
  // Market.ws = new WebSocket("wss://api/ws/market/" + Market.pair);
}

/* ================= EXPORT ================= */
window.initMarket = initMarket;
window.stopMarket = stopMarket;
    
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
