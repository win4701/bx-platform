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
================================================*/
function switchView(view) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  const target = document.getElementById(view);
  if (target) target.classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.view === view);
  });

  document.dispatchEvent(
    new CustomEvent("view:change", { detail: view })
  );
}
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-view]");
  if (btn) {
    switchView(btn.dataset.view);
    return;
  }

  const action = e.target.closest("[data-action]");
  if (!action) return;

  if (action.dataset.action === "go-casino") switchView("casino");
  if (action.dataset.action === "go-mining") switchView("mining");
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
  USDC: 0,
  BTC: 0,
  BNB: 0,
  ETH: 0,
  AVAX: 0,
  ZEC: 0,
  TON: 0,
  SOL: 0,
  LTC: 0,
  loaded: false
};

/* ================= DOM MAP ================= */

const WALLET_DOM = {
  BX: "bal-bx",
  USDT: "bal-usdt",
  USDC: "bal-usdc",
  BTC: "bal-btc",
  BNB: "bal-bnb",
  ETH: "bal-eth",
  AVAX: "bal-avax",
  ZEC: "bal-zec",
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
    WALLET.USDC = 0.00;
    WALLET.BTC = 0.00;
    WALLET.BNB = 0.00;
    WALLET.ETH = 0.00;
    WALLET.AVAX = 0.00;
    WALLET.ZEC = 0.00;
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

/* =================================== */

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
    { id:"p10", name:"Starter",  days:10, roi:2.5, min:5,   max:60  },
    { id:"p21", name:"Basic",    days:21, roi:5,   min:50,   max:250  },
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
      <h3>
        ${plan.name}
        ${plan.sub ? '<span class="sub-tag">SUB</span>' : ''}
      </h3>
      <div class="mining-profit">${plan.roi}%</div>
      <ul>
        <li>Time: ${plan.days} days</li>
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

/*=========================================================
   AIRDROP / TOPUP v6 — INSTITUTIONAL CLEAN
   Stable • Deterministic • No Break
=========================================================*/

const BX_REFERENCE = 38; // BX = 38 USDT (internal anchor)
const MIN_USDT = 5;

const STATE = {
  fiat: 0,
  usdt: 0,
  bx: 0,
  rate: 0,
  lockedUntil: 0,
  country: "",
  provider: "",
  phone: "",
  hedgeCost: 0
};

let RESERVE = 100000;
let EXPOSURE = 0;


/* ================= INIT ================= */

function initTopupV6() {
  const calc = document.getElementById("topup-calc");
  const confirm = document.getElementById("topup-confirm");

  if (calc) calc.onclick = calculate;
  if (confirm) confirm.onclick = confirmTopup;
}


/* ================= SAFE FETCH BINANCE ================= */

async function fetchP2P(fiat) {
  try {
    const res = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: "USDT",
          fiat,
          tradeType: "SELL",
          page: 1,
          rows: 5
        })
      }
    );

    const data = await res.json();
    const prices = data.data.map(x => parseFloat(x.adv.price));
    return prices.reduce((a,b)=>a+b,0) / prices.length;

  } catch {
    return 1; // fallback
  }
}


/* ================= CALCULATE ================= */

async function calculate() {

  const amount = parseFloat(document.getElementById("topup-amount")?.value);
  const country = document.getElementById("topup-country")?.value;
  const provider = document.getElementById("topup-provider")?.value;
  const phone = document.getElementById("topup-phone")?.value;

  if (!amount || amount <= 0) return;

  const p2p = await fetchP2P(country);

  const volatility = 0.01;
  const risk = 0.03;

  const baseRate = p2p * (1 + volatility + risk);

  const usdt = amount / baseRate;

  if (usdt < MIN_USDT) {
    renderError("Minimum 5 USDT");
    return;
  }

  const bx = usdt / BX_REFERENCE;

  STATE.fiat = amount;
  STATE.usdt = usdt;
  STATE.bx = bx;
  STATE.rate = baseRate;
  STATE.country = country;
  STATE.provider = provider;
  STATE.phone = phone;
  STATE.lockedUntil = Date.now() + 20000;

  render();
}


/* ================= RENDER ================= */

function render() {

  const box = document.getElementById("topup-result");
  if (!box) return;

  box.innerHTML = `
    <div class="topup-card">
      <div>Rate: ${STATE.rate.toFixed(4)}</div>
      <div>USDT: <b>${STATE.usdt.toFixed(2)}</b></div>
      <div>BX: <b>${STATE.bx.toFixed(4)}</b></div>
      <div class="lock"></div>
    </div>
  `;

  countdown();
}


/* ================= LOCK ================= */

function countdown() {
  const el = document.querySelector(".lock");
  if (!el) return;

  const int = setInterval(() => {
    const left = Math.floor((STATE.lockedUntil - Date.now()) / 1000);
    if (left <= 0) {
      el.innerText = "Expired";
      clearInterval(int);
      return;
    }
    el.innerText = `Lock ${left}s`;
  }, 1000);
}


/* ================= CONFIRM ================= */

async function confirmTopup() {

  if (Date.now() > STATE.lockedUntil) {
    toast("Rate expired");
    return;
  }

  if (STATE.usdt > RESERVE) {
    toast("Reserve insufficient");
    return;
  }

  RESERVE -= STATE.usdt;
  EXPOSURE += STATE.usdt;

  await fetch("/topup/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(STATE)
  });

  saveHistory();
  toast("Topup Executed");
}


/* ================= HISTORY ================= */

function saveHistory() {
  const list = JSON.parse(localStorage.getItem("topupHistory") || "[]");
  list.unshift({ ...STATE, time: Date.now() });
  localStorage.setItem("topupHistory", JSON.stringify(list.slice(0,50)));
}


/* ================= ERROR ================= */

function renderError(msg) {
  const box = document.getElementById("topup-result");
  if (box) box.innerHTML = `<div class="error">${msg}</div>`;
}


/* ================= TOAST ================= */

function toast(msg) {
  console.log(msg);
}


/* ================= AUTO INIT ================= */

document
  .querySelector('[data-view="airdrop"]')
  ?.addEventListener("click", () => {
    setTimeout(initTopupV6, 200);
  });
