'use strict';

/* ================================================================================================
   GLOBAL CORE
================================================================================================ */

const API_BASE = "https://bx-backend.fly.dev";

const APP_STATE = {
  ready: false,
  currentSection: "wallet"
};

function $(id) {
  return document.getElementById(id);
}

function log(...args) {
  if (window.DEBUG_MODE) console.log("[APP]", ...args);
}

/* ================================================================================================
   CONFIGURATION
================================================================================================ */

const MARKET_PAIRS = ["BX/USDT", "BX/TON", "BX/BNB", "BX/SOL", "BX/BTC"];

const FEATURES = {
  WALLET: true,
  MARKET: true,
  CASINO: true,
  MINING: true,
  AIRDROP: true,
  PARTNERS: true
};


/* ================================================================================================
   USER & AUTH
================================================================================================ */

const USER = {
  jwt: localStorage.getItem("jwt") || null
};

function authHeaders() {
  return USER.jwt ? { Authorization: "Bearer " + USER.jwt } : {};
}

function isAuthenticated() {
  return !!USER.jwt;
}

/* ================================================================================================
   PROVABLY FAIR (CLIENT SIDE)
================================================================================================ */

/**
 * Client Seed
 * - Editable from UI
 * - Stored in localStorage
 * - Sent with every casino play
 */
let CLIENT_SEED = localStorage.getItem("client_seed") || "1.2.3.4";

/**
 * Update client seed
 */
function setClientSeed(seed) {
  if (!seed || typeof seed !== "string") return;
  CLIENT_SEED = seed;
  localStorage.setItem("client_seed", seed);
  log("Client seed updated:", seed);
}

/**
 * Load current fairness state (server seed hash)
 */
async function loadFairness() {
  try {
    const r = await fetch(API_BASE + "/casino/fairness");
    if (!r.ok) return;
    const data = await r.json();
    if ($("serverSeedHash")) {
      $("serverSeedHash").textContent = data.server_seed_hash;
    }
  } catch (e) {
    console.error("Fairness load error", e);
  }
}

/**
 * Reveal server seed (after round)
 */
async function revealServerSeed() {
  try {
    const r = await fetch(API_BASE + "/casino/reveal");
    if (!r.ok) return;
    const data = await r.json();
    alert("Server Seed:\n" + data.server_seed);
  } catch (e) {
    console.error("Reveal error", e);
  }
}

/* ================================================================================================
   UI NOTIFICATIONS
================================================================================================ */

/**
 * Simple toast notification
 */
function toast(message) {
  if (!message) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ================================================================================================
   WALLET (DISPLAY + ACTION HOOKS)
================================================================================================ */

let WALLET = {
  BX: 0,
  USDT: 0,
  BNB: 0,
  SOL: 0,
  TON: 0,
  BTC: 0
};

const BALANCE_IDS = {
  BX: "bal-bx",
  USDT: "bal-usdt",
  BNB: "bal-bnb",
  SOL: "bal-sol",
  TON: "bal-ton",
  BTC: "bal-btc"
};

function renderWallet() {
  Object.keys(WALLET).forEach(asset => {
    const el = $(BALANCE_IDS[asset]);
    if (el) el.textContent = WALLET[asset];
  });
}
async function loadWallet() {
  if (!FEATURES.WALLET || !isAuthenticated()) return;
  try {
    const r = await fetch(API_BASE + "/wallet", { headers: authHeaders() });
    if (!r.ok) return;
    WALLET = await r.json();
    renderWallet();
  } catch (e) {
    console.error("Wallet error", e);
  }
}

/* -----------------------------------------------------------------------------------------------
   WALLET ACTIONS (HOOKS ONLY)
------------------------------------------------------------------------------------------------ */

/**
 * Deposit (UI hook)
 */
function deposit() {
  toast("Deposit request initiated");
}

/**
 * Withdraw BNB (request only)
 */
async function withdrawBNB(amount) {
  if (!amount || amount <= 0) return;

  await fetch(API_BASE + "/withdraw/bnb", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount })
  });

  toast("Withdraw request submitted");
}

/**
 * Transfer BX to another user via Telegram ID
 */
async function transferBX(targetTelegramId, amount) {
  if (!targetTelegramId || amount <= 0) return;

  await fetch(API_BASE + "/wallet/transfer", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      telegram_id: targetTelegramId,
      amount
    })
  });

  toast("BX transfer sent");
}

/* ================================================================================================
   INITIALIZATION (PART 1)
================================================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  log("App initializing (Part 1)");

  if (isAuthenticated()) {
    loadWallet();
    loadFairness();
  }

  APP_STATE.ready = true;
});


/* ================================================================================================
   MARKET STATE
================================================================================================ */

let MARKET_STATE = {
  pair: "BX/USDT",
  price: BX_FIXED_PRICE_USDT,
  history: [],
  orders: {
    buy: [],
    sell: []
  },
  lastUpdate: 0
};

/* ================================================================================================
   MARKET PAIR MANAGEMENT
================================================================================================ */

/**
 * Switch active trading pair
 */
function switchMarketPair(pair) {
  if (!MARKET_PAIRS.includes(pair)) return;

  MARKET_STATE.pair = pair;
  MARKET_STATE.history = [];
  MARKET_STATE.orders.buy = [];
  MARKET_STATE.orders.sell = [];

  renderMarketPair(pair);
}

/**
 * Render selected pair in UI
 */
function renderMarketPair(pair) {
  if ($("marketPair")) {
    $("marketPair").textContent = pair;
  }
}

/* ================================================================================================
   PRICE ENGINE
================================================================================================ */

const BX_FIXED_PRICE_USDT = 2;
const BX_CHART_MIN = BX_FIXED_PRICE_USDT * 0.9;
const BX_CHART_MAX = BX_FIXED_PRICE_USDT * 1.1;
const MARKET_TICK_MS = 1200;

let MARKET_STATE = {
  pair: "BX/USDT",
  price: BX_FIXED_PRICE_USDT
};

let marketTimer = null;

/* ================= BASE PRICE ================= */

function calculateBasePrice(pair) {
  const quote = pair.split("/")[1];

  switch (quote) {
    case "USDT": return BX_FIXED_PRICE_USDT;
    case "BNB":  return BX_FIXED_PRICE_USDT * 0.95;
    case "SOL":  return BX_FIXED_PRICE_USDT * 0.97;
    case "TON":  return BX_FIXED_PRICE_USDT * 0.96;
    case "BTC":  return BX_FIXED_PRICE_USDT * 1.05;
    default:     return BX_FIXED_PRICE_USDT;
  }
}

/* ================= PRICE TICK ================= */

function tickMarketPrice() {
  const base = calculateBasePrice(MARKET_STATE.pair);

  // نسبة التذبذب (±2%)
  const drift = (Math.random() - 0.5) * 0.02;

  let nextPrice = base + base * drift;

  // حماية النطاق السعري
  nextPrice = Math.max(
    BX_CHART_MIN,
    Math.min(BX_CHART_MAX, nextPrice)
  );

  MARKET_STATE.price = +nextPrice.toFixed(6);

  // تحديث السعر في الواجهة
  renderMarketPrice();

  // تحديث الشارت إن كان مفعّل
  if (priceChart) {
    priceChart.data.labels.push("");
    priceChart.data.datasets[0].data.push(MARKET_STATE.price);

    if (priceChart.data.labels.length > 30) {
      priceChart.data.labels.shift();
      priceChart.data.datasets[0].data.shift();
    }

    priceChart.update();
  }
}

/* ================= LOOP CONTROL ================= */

function startMarketLoop() {
  if (marketTimer) return;

  marketTimer = setInterval(() => {
    if (APP_STATE.currentSection !== "market") return;
    tickMarketPrice();
  }, MARKET_TICK_MS);
}

function stopMarketLoop() {
  clearInterval(marketTimer);
  marketTimer = null;
}
/* ================================================================================================
   CHART
================================================================================================ */

function renderMarketChart() {
  if (typeof window.drawChart=="function") {
    window.drawChart(MARKET_STATE.history);
  }
}

let priceChart = null;

function initMarketChart() {
  const ctx = document.getElementById("priceChart");
  if (!ctx || priceChart) return;

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: "#22c55e",
        tension: 0.35,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

/* ====================================================================
   ORDER BOOK (FAKE / ACTIVE)
=============================================================== */

function generateMarketOrders() {
  const buyOrders = [];
  const sellOrders = [];

  for (let i = 0; i < 12; i++) {
    buyOrders.push({
      price: +(MARKET_STATE.price * (1 - Math.random() / 40)).toFixed(6),
      amount: +(Math.random() * 100).toFixed(2)
    });

    sellOrders.push({
      price: +(MARKET_STATE.price * (1 + Math.random() / 40)).toFixed(6),
      amount: +(Math.random() * 100).toFixed(2)
    });
  }

  MARKET_STATE.orders.buy = buyOrders.sort((a, b) => b.price - a.price);
  MARKET_STATE.orders.sell = sellOrders.sort((a, b) => a.price - b.price);

  renderOrderBook();
}

function renderOrderBook() {
  if ($("buyOrders")) {
    $("buyOrders").innerHTML = MARKET_STATE.orders.buy
      .map(o => `<div>${o.price} / ${o.amount}</div>`)
      .join("");
  }

  if ($("sellOrders")) {
    $("sellOrders").innerHTML = MARKET_STATE.orders.sell
      .map(o => `<div>${o.price} / ${o.amount}</div>`)
      .join("");
  }
}

/* ================================================================================================
   BUY / SELL (UI HOOKS – SIMULATED)
================================================================================================ */

/**
 * Buy BX (simulated)
 */
function buyBX(amount) {
  if (!amount || amount <= 0) return;
  toast("Buy order placed");
}

/**
 * Sell BX (simulated)
 */
function sellBX(amount) {
  if (!amount || amount <= 0) return;
  toast("Sell order placed");
}

/* ================================================================================================
   MARKET INITIALIZATION
================================================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!FEATURES.MARKET) return;

  renderMarketPair(MARKET_STATE.pair);
  startMarketLoop();
});

/* ================================================================================================
   CASINO STATE
================================================================================================ */

const CASINO_STATE = {
  activeGame: null,
  isPlaying: false,
  lastResult: null,
  botsEnabled: true
};

/* ================================================================================================
   CASINO GAMES REGISTRY (12)
================================================================================================ */

const CASINO_GAMES = [
  { id: "coinflip",     name: "Coin Flip" },
  { id: "roulette",    name: "Roulette" },
  { id: "limbo",       name: "Limbo" },
  { id: "chickenroad", name: "Chicken Road" },
  { id: "dice",        name: "Dice" },
  { id: "crash",       name: "Crash" },
  { id: "slot7",       name: "Slot 7" },
  { id: "fortune",     name: "Wheel of Fortune" },
  { id: "coins4x4",    name: "Coins 4x4" },
  { id: "plinko",      name: "Plinko" },
  { id: "hilo",        name: "Hi-Lo" },
  { id: "airboss",     name: "Air Boss" }
];

/* ================================================================================================
   CASINO UI
================================================================================================ */

/**
 * Select casino game
 */
function selectCasinoGame(gameId) {
  if (!CASINO_GAMES.find(g => g.id === gameId)) return;

  CASINO_STATE.activeGame = gameId;
  CASINO_STATE.lastResult = null;

  if ($("casinoGameName")) {
    const game = CASINO_GAMES.find(g => g.id === gameId);
    $("casinoGameName").textContent = game.name;
  }
}

/* ================================================================================================
   CASINO SOUND & ANIMATION (ISOLATED)
================================================================================================ */

const CASINO_SOUNDS = {
  click: new Audio("/sounds/casino/click.mp3"),
  win:   new Audio("/sounds/casino/win.mp3"),
  lose:  new Audio("/sounds/casino/lose.mp3")
};

function playCasinoSound(type) {
  if (!FEATURES.CASINO) return;
  const sound = CASINO_SOUNDS[type];
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(()=>{});
}

/* ================================================================================================
   CASINO PLAY (BACKEND)
================================================================================================ */

/**
 * Play casino game
 */
async function playCasino(gameId, betAmount) {
  if (!FEATURES.CASINO) return;
  if (CASINO_STATE.isPlaying) return;
  if (!CASINO_GAMES.find(g => g.id === gameId)) return;
  if (!betAmount || betAmount <= 0) return;

  CASINO_STATE.isPlaying = true;
  playCasinoSound("click");

  try {
    const r = await fetch(API_BASE + "/casino/play", {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        game: gameId,
        bet: betAmount,
        client_seed: CLIENT_SEED
      })
    });

    if (!r.ok) throw new Error("Casino play failed");

    const result = await r.json();
    CASINO_STATE.lastResult = result;

    handleCasinoResult(result);
  } catch (e) {
    console.error("Casino error", e);
  } finally {
    CASINO_STATE.isPlaying = false;
  }
}

/**
 * Handle casino result
 */
function handleCasinoResult(result) {
  if (!result) return;

  if (result.win) {
    playCasinoSound("win");
    toast("You Win!");
  } else {
    playCasinoSound("lose");
    toast("You Lose!");
  }

  updateCasinoUI(result);
  loadWallet();
}

/* ================================================================================================
   CASINO – RECENT BIG WINS (DYNAMIC)
================================================================================================ */

const BIG_WINS_GAMES = [
  "Limbo", "Crash", "Roulette", "Plinko", "Hi-Lo", "Dice"
];

function generateFakeBigWin() {
  const user = "@user" + Math.floor(Math.random() * 9000);
  const game = BIG_WINS_GAMES[Math.floor(Math.random() * BIG_WINS_GAMES.length)];
  const amount = Math.floor(Math.random() * 400 + 50); // 50 – 450 BX

  return { user, game, amount };
}

function renderBigWin(win) {
  const list = document.getElementById("bigWinsList");
  if (!list) return;

  const row = document.createElement("div");
  row.className = "big-win-row";
  row.innerHTML = `
    <span class="user">${win.user}</span>
    <span class="game">${win.game}</span>
    <span class="amount">+${win.amount} BX</span>
  `;

  list.prepend(row);

  // ✨ Animation
  row.style.opacity = "0";
  row.style.transform = "translateY(10px)";
  setTimeout(() => {
    row.style.transition = "all .25s ease";
    row.style.opacity = "1";
    row.style.transform = "translateY(0)";
  }, 10);

  if (list.children.length > 5) {
    list.removeChild(list.lastChild);
  }
}

/* ================================================================================================
   CASINO RESULT RENDER
================================================================================================ */

function updateCasinoUI(result) {
  if ($("casinoResult")) {
    $("casinoResult").textContent = JSON.stringify(result, null, 2);
  }

  if ($("casinoNonce")) {
    $("casinoNonce").textContent = result.nonce ?? "-";
  }

  if ($("casinoServerHash")) {
    $("casinoServerHash").textContent = result.server_seed_hash ?? "-";
  }
}

/* ================================================================================================
   PROVABLY FAIR VERIFY (CLIENT SIDE)
================================================================================================ */

function verifyFairness(serverSeed, clientSeed, nonce) {
  if (!serverSeed || !clientSeed) return null;

  const input = `${serverSeed}:${clientSeed}:${nonce}`;
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
    .then(buf => {
      return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    });
}

/* ================================================================================================
   FAKE USERS / BOTS ACTIVITY
================================================================================================ */

function startCasinoBots() {
  if (!CASINO_STATE.botsEnabled) return;

  setInterval(() => {
    if (APP_STATE.currentSection !== "casino") return;

    const fakeUser = "User" + Math.floor(Math.random() * 9000);
    const fakeGame = CASINO_GAMES[Math.floor(Math.random() * CASINO_GAMES.length)].name;
    const fakeBet = (Math.random() * 10).toFixed(2);
    const fakeWin = Math.random() > 0.6;

    renderCasinoBotActivity(fakeUser, fakeGame, fakeBet, fakeWin);
  }, 2000);
}

/**
 * Render fake activity line
 */
function renderCasinoBotActivity(user, game, bet, win) {
  if (!$("casinoActivity")) return;

  const line = document.createElement("div");
  line.className = win ? "win" : "lose";
  line.textContent =
    `${user} played ${game} with ${bet} BX ${win ? "and WON" : "and LOST"}`;

  $("casinoActivity").prepend(line);

  if ($("casinoActivity").children.length > 20) {
    $("casinoActivity").removeChild(
      $("casinoActivity").lastChild
    );
  }
}

/*================================================================================================
   CASINO INIT
================================================================================================ */

const CASINO_STATE = {
  isPlaying: false,
  lastGame: null
};

/* ================= CAN PLAY CHECK ================= */

function canPlayCasino() {
  return isAuthenticated() && WALLET.BX > 0 && !CASINO_STATE.isPlaying;
}

/* ================= GAME BINDING ================= */

function bindCasinoGames() {
  document.querySelectorAll("#casino .game").forEach(card => {
    card.addEventListener("click", () => {
      const game = card.dataset.game;
      const betAmount = 1; // BX (قابل للتطوير لاحقًا)

      if (!isAuthenticated()) {
        toast("Please login first");
        return;
      }

      if (WALLET.BX < betAmount) {
        toast("Insufficient BX balance");
        return;
      }

      playCasino(game, betAmount);
    });
  });
}

/* ================= PLAY CASINO ================= */

async function playCasino(gameId, betAmount) {
  if (CASINO_STATE.isPlaying) return;

  if (WALLET.BX < betAmount) {
    toast("Insufficient BX balance");
    return;
  }

  CASINO_STATE.isPlaying = true;
  CASINO_STATE.lastGame = gameId;

  try {
    const r = await fetch(API_BASE + "/casino/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        game: gameId,
        bet: betAmount
      })
    });

    if (!r.ok) throw new Error("Casino play failed");

    const data = await r.json();

    // تحديث الرصيد
    WALLET.BX = data.balance;
    renderWallet();

    // Big Win (إن وجد)
    if (data.win && data.amount >= 100) {
      pushBigWin(gameId, data.amount);
    }

  } catch (e) {
    console.error("Casino error", e);
    toast("Casino error, try again");
  } finally {
    CASINO_STATE.isPlaying = false;
  }
}

/* ================= INIT ================= */

function initCasino() {
  bindCasinoGames();
}
/*==================================================================
          MINING STATE
   
================================================================= */

const MINING_STATE = {
  activeBX: null,
  activeBNB: null,
  activeSOL: null,   // ✅ جديد
  history: []
};

/* =====================================================
   MINING CONFIG (SINGLE SOURCE OF TRUTH)
===================================================== */

const MINING_CONFIG = {
  BX: [
    { id:"p10", name:"Starter",  days:10, roi:2.5 },
    { id:"p21", name:"Basic",    days:21, roi:5 },
    { id:"p30", name:"Golden",   days:30, roi:8 },
    { id:"p45", name:"Advanced", days:45, roi:12 },
    { id:"p60", name:"Platine",      days:60, roi:17 },
    { id:"p90", name:"Infinity", days:90, roi:25, vip:true }
  ],
  SOL: [
    { id:"p10", name:"Starter",  days:10, roi:1 },
    { id:"p21", name:"Basic",    days:21, roi:2.8 },
    { id:"p30", name:"Golden",   days:30, roi:4 },
    { id:"p45", name:"Advanced", days:45, roi:7 },
    { id:"p60", name:"Platine",      days:60, roi:9 },
    { id:"p90", name:"Infinity", days:90, roi:14, vip:true }
  ],
  BNB: [
    { id:"p10", name:"Starter",  days:10, roi:0.8 },
    { id:"p21", name:"Basic",    days:21, roi:1.8 },
    { id:"p30", name:"Golden",   days:30, roi:3 },
    { id:"p45", name:"Advanced", days:45, roi:5 },
    { id:"p60", name:"Platine",      days:60, roi:7 },
    { id:"p90", name:"Infinity", days:90, roi:11, vip:true }
  ]
};

/* =====================================================
   STATE
===================================================== */

let ACTIVE_MINING_COIN = "BX";

/* =====================================================
   LOAD MINING
===================================================== */

async function loadMining(){
  if (!FEATURES.MINING) return;

  renderMiningPlans();
  if (!isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/mining/dashboard", {
      headers: authHeaders()
    });
    if (!r.ok) return;

    const data = await r.json();
    MINING_STATE.activeBX  = data.bx  || null;
    MINING_STATE.activeBNB = data.bnb || null;
    MINING_STATE.activeSOL = data.sol || null;
    MINING_STATE.history  = data.history || [];

    renderActiveMining();
    renderMiningHistory();
  } catch (e) {
    console.error("Mining load error", e);
  }
}

/* =====================================================
   RENDER
===================================================== */

function renderMining(){
  renderMiningPlans();
  renderActiveMining();
  renderMiningHistory();
}

function renderMiningPlans(){
  const grid = document.getElementById("miningGrid");
  if (!grid) return;

  grid.innerHTML = "";

  MINING_CONFIG[ACTIVE_MINING_COIN].forEach(plan => {

    const card = document.createElement("div");
    card.className = "mining-plan" + (plan.vip ? " vip" : "");

    card.innerHTML = `
      ${plan.vip ? `<span class="badge">VIP</span>` : ""}
      <h4>${plan.name}</h4>
<div class="mining-profit">${plan.roi}%</div>
      <ul>
        <li><span>Duration</span><strong>${plan.days} days</strong></li>
        <li><span>Min</span><strong>Auto</strong></li>
        <li><span>Max</span><strong>Auto</strong></li>
      </ul>

      <button onclick="subscribeMining('${plan.id}')">
        Subscribe ${ACTIVE_MINING_COIN}
      </button>
    `;

    grid.appendChild(card);
  });
}

/* =====================================================
   ACTIVE MINING
===================================================== */

function renderActiveMining(){
  if (MINING_STATE.activeBX && document.getElementById("activeBXMining")) {
    document.getElementById("activeBXMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeBX);
  }
  if (MINING_STATE.activeBNB && document.getElementById("activeBNBMining")) {
    document.getElementById("activeBNBMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeBNB);
  }
  if (MINING_STATE.activeSOL && document.getElementById("activeSOLMining")) {
    document.getElementById("activeSOLMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeSOL);
  }
}

function renderMiningProgress(m){
  const p = (m.days_completed / m.total_days) * 100;
  return `
    <div class="mining-progress">
      <div class="bar"><div style="width:${p}%"></div></div>
      <small>${m.days_completed} / ${m.total_days} days</small>
      <small>Earned: ${m.total_earned}</small>
    </div>
  `;
}

/* =====================================================
   SUBSCRIBE
===================================================== */

async function subscribeMining(planId){
  const url =
    ACTIVE_MINING_COIN === "BX"  ? "/mining/bx/subscribe"  :
    ACTIVE_MINING_COIN === "BNB" ? "/mining/bnb/subscribe" :
                                   "/mining/sol/subscribe";

  await fetch(API_BASE + url, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId })
  });

  toast(`${ACTIVE_MINING_COIN} mining activated`);
  loadMining();
}

/* =====================================================
   HISTORY
===================================================== */

function renderMiningHistory(){
  const box = document.getElementById("miningHistory");
  if (!box) return;

  box.innerHTML = MINING_STATE.history.map(h => `
    <div class="history-item">
      <span>${h.date}</span>
      <span>${h.coin}</span>
      <span>${h.amount}</span>
    </div>
  `).join("");
}

/* =====================================================
   COIN SWITCH
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mining-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".mining-tabs button")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      ACTIVE_MINING_COIN = btn.dataset.coin;
      renderMiningPlans();
    });
  });
});
/* =====================================================
   INIT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!FEATURES.MINING) return;
  loadMining();
});

      
/* ================================================================================================
   AIRDROP STATE
================================================================================================ */

const AIRDROP_STATE = {
  claimed: false,
  referrals: 0,
  rewardBX: 0
};

/* ================================================================================================
   AIRDROP ACTIONS
================================================================================================ */

/**
 * Claim airdrop reward
 */
async function claimAirdrop() {
  if (!FEATURES.AIRDROP || !isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/airdrop/claim", {
      method: "POST",
      headers: authHeaders()
    });

    if (!r.ok) return;

    const data = await r.json();
    AIRDROP_STATE.claimed = true;
    AIRDROP_STATE.rewardBX = data.reward || 0;

    toast("Airdrop claimed");
    loadWallet();
    renderAirdrop();
  } catch (e) {
    console.error("Airdrop claim error", e);
  }
}

/**
 * Load airdrop status
 */
async function loadAirdrop() {
  if (!FEATURES.AIRDROP || !isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/airdrop/status", {
      headers: authHeaders()
    });

    if (!r.ok) return;

    const data = await r.json();
    AIRDROP_STATE.claimed = data.claimed;
    AIRDROP_STATE.referrals = data.referrals;
    AIRDROP_STATE.rewardBX = data.reward;

    renderAirdrop();
  } catch (e) {
    console.error("Airdrop load error", e);
  }
}

/* ================================================================================================
   AIRDROP RENDER
================================================================================================ */

function renderAirdrop() {
  if ($("airdropStatus")) {
    $("airdropStatus").textContent =
      AIRDROP_STATE.claimed ? "Claimed" : "Available";
  }

  if ($("airdropReward")) {
    $("airdropReward").textContent =
      AIRDROP_STATE.rewardBX + " BX";
  }

  if ($("airdropReferrals")) {
    $("airdropReferrals").textContent =
      AIRDROP_STATE.referrals;
  }
}

/* ================================================================================================
   REFERRAL SYSTEM
================================================================================================ */

/**
 * Copy referral link
 */
function copyReferralLink() {
  if (!USER.id) return;

  const link = `${location.origin}/?ref=${USER.id}`;
  navigator.clipboard.writeText(link);
  toast("Referral link copied");
}

/**
 * Load referral stats
 */
async function loadReferrals() {
  if (!isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/referrals", {
      headers: authHeaders()
    });
    if (!r.ok) return;

    const data = await r.json();
    AIRDROP_STATE.referrals = data.count || 0;

    renderAirdrop();
  } catch (e) {
    console.error("Referral load error", e);
  }
}

/* ================================================================================================
   GLOBAL NAVIGATION
================================================================= */

function navigate(section) {
  if (!section) return;

  APP_STATE.currentSection = section;

  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  const target = document.getElementById(section);
  if (target) target.classList.add("active");

  document.querySelectorAll("[data-view]").forEach(b =>
    b.classList.remove("active")
  );

  const btn = document.querySelector(`[data-view="${section}"]`);
  if (btn) btn.classList.add("active");

  // Market
  if (section === "market") {
    initMarketChart();
    startMarketLoop();
  } else {
    stopMarketLoop();
  }

  // Casino
  if (section === "casino") {
    startBigWinsFeed?.();
  } else {
    stopBigWinsFeed?.();
  }
}
         
/* ================================================================================================
   FINAL INIT
================================================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  autoBindNavigation();     // 🔑 ربط الأزرار
  navigate("wallet");      // 🔑 عرض الصفحة الأولى
});

  /* =======================
     MINING INIT (REQUIRED)
  ======================= */
  ACTIVE_MINING_COIN = "BX";   
  renderMiningPlans();           

  if (FEATURES.AIRDROP && isAuthenticated()) loadAirdrop();
  if (FEATURES.PARTNERS) renderPartners();

  APP_STATE.ready = true;
  log("APP READY");
});
