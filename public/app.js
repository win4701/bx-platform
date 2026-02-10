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

/* ================= BOOTSTRAP ================= */



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

/* =================================================
   MARKET.JS — FULL ENGINE (CANVAS FIRST)
================================================= */

(function MarketModule(){
  if (window.__MARKET_SCOPED__) return;
  window.__MARKET_SCOPED__ = true;

  /* =========================
     CONFIG
     ========================= */
  const CFG = {
    BX_BASE_USDT: 38,
    BOOK_ROWS: 15,
    BOOK_STEP: 0.001,
    CHART_POINTS: 120,
  };

  const REF = {
    USDT:'btcusdt', BTC:'btcusdt', ETH:'ethusdt', BNB:'bnbusdt',
    SOL:'solusdt', LTC:'ltcusdt', ZEC:'zecusdt', AVAX:'avaxusdt'
  };

  /* =========================
     STATE (SINGLE SOURCE)
     ========================= */
  const S = {
    base:'BX', quote:'USDT',
    refSymbol:'btcusdt', refPrice:null,
    bxPrice:CFG.BX_BASE_USDT,
    ws:null,
    chart:null, series:null, chartData:[],
    frozen:false,
    adv:{ drift:0, vol:0.0006, pauseP:0.08, pauseUntil:0 }
  };

  /* =========================
     DOM CACHE (MARKET ONLY)
     ========================= */
  const D = {
    view:()=>document.querySelector('.market-view'),
    price:()=>document.getElementById('marketPrice'),
    approx:()=>document.getElementById('marketApprox'),
    bids:()=>document.getElementById('bids'),
    asks:()=>document.getElementById('asks'),
    ladder:()=>document.getElementById('priceLadder'),
    chartEl:()=>document.getElementById('bxChart'),
    spread:()=>document.getElementById('spreadValue')
  };

  /* =========================
     SAFE START / STOP
     ========================= */
  let started=false;
  function start(){
    if (started || !D.view()) return;
    started=true;
    initChart(); initOrderBook(); bindPairs(); switchPair('USDT');
  }
  function stop(){
    try{ if(S.ws && S.ws.readyState<=1){ S.ws.close(); S.ws=null; } }catch(e){}
    started=false;
  }
  window.MarketBaseline={ start, stop };

  document.addEventListener('DOMContentLoaded',()=>{ if(D.view()) start(); });
  document.addEventListener('view:change',e=>{ e.detail==='market'?start():stop(); });

  /* =========================
     PAIRS (3: Smooth switch)
     ========================= */
  function bindPairs(){
    document.querySelectorAll('.market-view [data-quote]').forEach(b=>{
      b.onclick=()=>{ 
        document.querySelectorAll('.market-view [data-quote]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active'); smoothSwitch(); switchPair(b.dataset.quote);
      };
    });
  }
  function smoothSwitch(){
    const p=D.price(), c=D.chartEl();
    if(p){ p.style.opacity=0; setTimeout(()=>p.style.opacity=1,220); }
    if(c){ c.style.opacity=0; setTimeout(()=>c.style.opacity=1,220); }
  }
  function switchPair(q){
    S.quote=q; S.refSymbol=REF[q]||'btcusdt';
    S.refPrice=null; S.chartData=[]; if(S.series) S.series.setData([]);
    connectRefWS();
  }

  /* =========================
     PRICE FEED (1: realistic)
     ========================= */
  function computeBX(ref){
    const now=Date.now();
    if(now<S.adv.pauseUntil) return S.bxPrice;
    if(Math.random()<S.adv.pauseP) S.adv.pauseUntil=now+800+Math.random()*1200;

    const d=(ref-S.refPrice)/S.refPrice;
    S.adv.drift+=d*0.35; S.adv.drift*=0.98;
    const noise=(Math.random()-0.5)*S.adv.vol;
    return CFG.BX_BASE_USDT*(1+S.adv.drift+noise);
  }
  function connectRefWS(){
    if(S.ws){ try{S.ws.close();}catch(e){} S.ws=null; }
    S.ws=new WebSocket(`wss://stream.binance.com:9443/ws/${S.refSymbol}@trade`);
    S.ws.onmessage=e=>{
      const p=Number(JSON.parse(e.data).p); if(!p) return;
      if(!S.refPrice){ S.refPrice=p; return; }
      S.bxPrice=computeBX(p); S.refPrice=p;
      updatePriceUI(); updateChart(S.bxPrice); renderBook(S.bxPrice);
    };
  }

  /* =========================
     UI PRICE
     ========================= */
  function updatePriceUI(){
    const p=D.price(), a=D.approx();
    if(p) p.textContent=S.bxPrice.toFixed(2);
    if(a) a.textContent=`≈ ${S.bxPrice.toFixed(2)} ${S.quote}`;
  }

  /* =========================
     ORDER BOOK (2,5,6)
     ========================= */

const bidRows = [], askRows = [], priceRows = [];

function initOrderBook() {
  const bids = document.getElementById('bids');
  const asks = document.getElementById('asks');
  const ladder = document.getElementById('priceLadder');
  if (!bids || !asks || !ladder) return;

  for (let i = 0; i < MARKET.ROWS; i++) {
    const b = document.createElement('div');
    const p = document.createElement('div');
    const a = document.createElement('div');

    b.className = 'row buy';
    p.className = 'ladder-row';
    a.className = 'row sell';

    bids.appendChild(b);
    ladder.appendChild(p);
    asks.appendChild(a);

    bidRows.push(b);
    priceRows.push(p);
    askRows.push(a);
  }
}

function renderOrderBook(mid) {
  if (STATE.frozen) return;
  for (let i = 0; i < MARKET.ROWS; i++) {
    const step = (i + 1) * 0.0008;
    const bid = mid * (1 - step);
    const ask = mid * (1 + step);

    bidRows[i].textContent = bid.toFixed(4);
    askRows[i].textContent = ask.toFixed(4);
    priceRows[i].textContent = ((bid + ask) / 2).toFixed(4);
  }
}
   
  /* =========================
     CHART (4)
     ========================= */
  function initChart(){
    if(S.chart||!D.chartEl()||!window.LightweightCharts) return;
    S.chart=LightweightCharts.createChart(D.chartEl(),{
      layout:{background:{color:'transparent'},textColor:'#9aa4ad'},
      grid:{vertLines:{visible:false},horzLines:{visible:false}},
      timeScale:{visible:false}
    });
    S.series=S.chart.addLineSeries({color:'#00c176',lineWidth:2});
  }
  function updateChart(v){
    const pt={time:Math.floor(Date.now()/1000),value:v};
    S.chartData.push(pt); if(S.chartData.length>CFG.CHART_POINTS) S.chartData.shift();
    S.series.update(pt);
  }

  /* =========================
     EXECUTION (7,8)
     ========================= */
  const Wallet={ balance:10000, pos:0, avg:0 };
  function fakeExec(side, qty){
    const impact=qty*0.0008;
    S.bxPrice+= side==='buy'?impact:-impact;
    updatePriceUI(); updateChart(S.bxPrice); renderBook(S.bxPrice);
    updateWallet(side, qty, S.bxPrice);
  }
  function updateWallet(side, q, p){
    if(side==='buy'){
      Wallet.avg=(Wallet.avg*Wallet.pos+q*p)/(Wallet.pos+q);
      Wallet.pos+=q; Wallet.balance-=q*p;
    }else{ Wallet.pos-=q; Wallet.balance+=q*p; }
    const w=document.getElementById('walletBalance'); if(w) w.textContent=Wallet.balance.toFixed(2);
  }
  function fillPrice(v){
    const i=document.getElementById('orderPrice'); if(i) i.value=Number(v).toFixed(4);
  }

})();

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
