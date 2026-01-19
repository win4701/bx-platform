'use strict';

/* ================================================================================================
   GLOBAL CORE
================================================================================================ */

/**
 * Base API endpoint (Fly.io backend)
 */
const API_BASE = "https://bx-backend.fly.dev";

/**
 * Internal application state
 */
const APP_STATE = {
  ready: false,
  currentSection: "wallet",
  lastTick: 0
};

/**
 * Utility: safe DOM getter
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * Utility: logger (can be disabled in production)
 */
function log(...args) {
  if (window.DEBUG_MODE) {
    console.log("[APP]", ...args);
  }
}

/* ================================================================================================
   CONFIGURATION
================================================================================================ */

/**
 * BX internal peg
 * This value NEVER changes on frontend
 */
const BX_FIXED_PRICE_USDT = 2; // 1 BX = 2 USDT

/**
 * BX chart visual bounds (for market animation only)
 */
const BX_CHART_MIN = BX_FIXED_PRICE_USDT * 0.9;
const BX_CHART_MAX = BX_FIXED_PRICE_USDT * 1.1;

/**
 * Market pairs supported
 */
const MARKET_PAIRS = [
  "BX/USDT",
  "BX/TON",
  "BX/BNB",
  "BX/SOL",
  "BX/BTC"
];

/**
 * Feature flags (do NOT remove existing sections, only toggle behavior)
 */
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

/**
 * User context (hydrated from backend after auth)
 */
const USER = {
  id: null,
  username: null,
  jwt: localStorage.getItem("jwt") || null,
  telegramId: null,
  binanceId: null,
  connectedWallet: null
};

/**
 * Authorization headers helper
 */
function authHeaders() {
  return USER.jwt
    ? { "Authorization": "Bearer " + USER.jwt }
    : {};
}

/**
 * Check if user is authenticated
 */
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

/**
 * Wallet balances (display only)
 */
let WALLET = {
  BX: 0,
  USDT: 0,
  TON: 0,
  BNB: 0,
  SOL: 0,
  BTC: 0
};

/**
 * Load wallet balances from backend
 */
async function loadWallet() {
  if (!FEATURES.WALLET || !isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/wallet", {
      headers: authHeaders()
    });
    if (!r.ok) return;
    WALLET = await r.json();
    renderWallet();
  } catch (e) {
    console.error("Wallet load error", e);
  }
}

/**
 * Render wallet balances into UI
 */
function renderWallet() {
  Object.keys(WALLET).forEach(asset => {
    const el = $(asset + "Balance");
    if (el) {
      el.textContent = WALLET[asset];
    }
  });

  // BX value in USDT (informational only)
  if ($("bxValueUSDT")) {
    $("bxValueUSDT").textContent =
      (WALLET.BX * BX_FIXED_PRICE_USDT).toFixed(2) + " USDT";
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

/**
 * External asset price (from global feed if available)
 */
function getExternalAssetPrice(asset) {
  return window.externalPrices?.[asset] || 1;
}

/**
 * Calculate base price for current pair
 */
function calculateBasePrice(pair) {
  const quote = pair.split("/")[1];

  if (quote === "USDT") {
    return BX_FIXED_PRICE_USDT;
  }

  return BX_FIXED_PRICE_USDT * getExternalAssetPrice(quote);
}

/**
 * Tick market price (visual movement only)
 */
function tickMarketPrice() {
  const base = calculateBasePrice(MARKET_STATE.pair);
  const volatility = 0.02;
  const drift = (Math.random() - 0.5) * volatility;

  let nextPrice = base + base * drift;

  nextPrice = Math.max(BX_CHART_MIN, Math.min(BX_CHART_MAX, nextPrice));

  MARKET_STATE.price = +nextPrice.toFixed(6);
  MARKET_STATE.history.push(MARKET_STATE.price);

  if (MARKET_STATE.history.length > 300) {
    MARKET_STATE.history.shift();
  }

  renderMarketPrice();
}

/**
 * Render market price
 */
function renderMarketPrice() {
  if ($("marketPrice")) {
    $("marketPrice").textContent = MARKET_STATE.price.toFixed(6);
  }

  if ($("marketFixedPrice")) {
    $("marketFixedPrice").textContent =
      BX_FIXED_PRICE_USDT.toFixed(2) + " USDT";
  }
}

/* ================================================================================================
   CHART
================================================================================================ */

/**
 * Render chart (simple hook – actual chart lib handled elsewhere)
 */
function renderMarketChart() {
  if (typeof window.drawChart === "function") {
    window.drawChart(MARKET_STATE.history);
  }
}

/* ================================================================================================
   ORDER BOOK (FAKE / ACTIVE)
================================================================================================ */

/**
 * Generate fake orders to simulate active market
 */
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

/**
 * Render order book into UI
 */
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
   MARKET LOOP
================================================================================================ */

/**
 * Start market loop (only when market section active)
 */
function startMarketLoop() {
  setInterval(() => {
    if (APP_STATE.currentSection !== "market") return;

    tickMarketPrice();
    generateMarketOrders();
    renderMarketChart();
  }, MARKET_TICK_MS);
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

/**
 * Verify fairness locally (optional UI helper)
 */
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

/**
 * Simulate fake users activity feed
 */
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

/* ================================================================================================
   CASINO INIT
================================================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!FEATURES.CASINO) return;

  // Default game
  selectCasinoGame(CASINO_GAMES[0].id);

  // Start fake activity
  startCasinoBots();
});

/* ================================================================================================
   MINING STATE
================================================================================================ */

const MINING_STATE = {
  activeBX: null,
  activeBNB: null,
  activeSOL: null,   // ✅ جديد
  history: []
};

/* ================================================================================================
   MINING PLANS (FIXED ORDER)
================================================================================================ */

const MINING_PLANS = [
  { id: "starter",  name: "Starter",       days: 15 },
  { id: "silver",   name: "Silver",        days: 30 },
  { id: "gold",     name: "Gold",          days: 45 },
  { id: "vip",      name: "VIP",           days: 60 },
  { id: "platinum", name: "Platinum VIP",  days: 90, horizontal: true }
];

/* ================================================================================================
   LOAD MINING DASHBOARD
================================================================================================ */

async function loadMining() {
  if (!FEATURES.MINING || !isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/mining/dashboard", {
      headers: authHeaders()
    });
    if (!r.ok) return;

    const data = await r.json();
    MINING_STATE.activeBX = data.bx || null;
    MINING_STATE.activeBNB = data.bnb || null;
    MINING_STATE.history = data.history || [];

    renderMining();
  } catch (e) {
    console.error("Mining load error", e);
  }
}

/* ================================================================================================
   RENDER MINING UI
================================================================================================ */

function renderMining() {
  renderMiningPlans();
  renderActiveMining();
  renderMiningHistory();
}

/**
 * Render available mining plans
 */
function renderMiningPlans() {
  if (!$("miningPlans")) return;

  $("miningPlans").innerHTML = MINING_PLANS.map(plan => {
    return `
      <div class="mining-plan ${plan.horizontal ? "horizontal" : ""}">
        <h3>${plan.name}</h3>
        <p>${plan.days} Days</p>
        <button onclick="subscribeBXMining('${plan.id}')">
          Start BX Mining
        </button>
      </div>
    `;
  }).join("");
}

/**
 * Render active mining status
 */
function renderActiveMining() {
  if (MINING_STATE.activeBX && $("activeBXMining")) {
    $("activeBXMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeBX);
  }

  if (MINING_STATE.activeBNB && $("activeBNBMining")) {
    $("activeBNBMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeBNB);
  }
}

/**
 * Render mining progress bar
 */
function renderMiningProgress(mining) {
  const progress =
    (mining.days_completed / mining.total_days) * 100;

  return `
    <div class="mining-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
      <p>${mining.days_completed} / ${mining.total_days} days</p>
      <p>Daily Profit: ${mining.daily_profit}</p>
      <p>Total Earned: ${mining.total_earned}</p>
    </div>
  `;
}

/* ================================================================================================
   SUBSCRIBE TO MINING
================================================================================================ */

/**
 * Subscribe BX mining
 */
async function subscribeBXMining(planId) {
  if (!planId) return;

  await fetch(API_BASE + "/mining/bx/subscribe", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId })
  });

  toast("BX Mining activated");
  loadMining();
}

/**
 * Subscribe BNB mining
 */
async function subscribeBNBMining(planId, amount) {
  if (!planId || amount <= 0) return;

  await fetch(API_BASE + "/mining/bnb/subscribe", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId, amount })
  });

  toast("BNB Mining activated");
  loadMining();
}
async function subscribeSOLMining(planId, amount) {
  if (!planId || amount <= 0) return;

  await fetch(API_BASE + "/mining/sol/subscribe", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId, amount })
  });

  toast("SOL Mining activated");
  loadMining();
}

/* ================================================================================================
   MINING HISTORY
================================================================================================ */

function renderMiningHistory() {
  if (!$("miningHistory")) return;

  $("miningHistory").innerHTML = MINING_STATE.history
    .map(entry => `
      <div class="history-item">
        <span>${entry.date}</span>
        <span>${entry.coin}</span>
        <span>${entry.amount}</span>
      </div>
    `)
    .join("");
}

/* ================================================================================================
   DAILY UPDATE HOOK (DISPLAY ONLY)
================================================================================================ */

/**
 * Called after backend daily job
 */
function onMiningDayUpdate() {
  loadMining();
  loadWallet();
}

/* ================================================================================================
   MINING INIT
================================================================================================ */

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
   PARTNERS SECTION
================================================================================================ */

const PARTNERS = [
  { name: "Temu",     logo: "/img/partners/temu.png" },
  { name: "Samsung",  logo: "/img/partners/samsung.png" },
  { name: "Apple",    logo: "/img/partners/apple.png" },
  { name: "Nike",     logo: "/img/partners/nike.png" }
];

/**
 * Render partners
 */
function renderPartners() {
  if (!FEATURES.PARTNERS || !$("partners")) return;

  $("partners").innerHTML = PARTNERS.map(p => `
    <div class="partner">
      <img src="${p.logo}" alt="${p.name}">
      <span>${p.name}</span>
    </div>
  `).join("");
}

/* ================================================================================================
   GLOBAL NAVIGATION
================================================================================================ */

function navigate(section) {
  if (!section) return;

  APP_STATE.currentSection = section;

  document.querySelectorAll(".section").forEach(sec => {
    sec.style.display = "none";
  });

  const active = $(section);
  if (active) active.style.display = "block";

  // تحديثات ذكية حسب القسم
  if (section === "wallet") loadWallet();
  if (section === "market") {}
  if (section === "casino") {}
  if (section === "mining") loadMining();
  if (section === "airdrop") loadAirdrop();
}
/* ================================================================================================
   FINAL INIT
================================================================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🔗 ربط القائمة تلقائيًا بدون data-nav أو ids
  autoBindNavigation();

  // 🧭 الانتقال إلى القسم الافتراضي
  navigate(APP_STATE.currentSection);

  // 🎁 Airdrop + Referrals
  if (FEATURES.AIRDROP) {
    loadAirdrop();
    loadReferrals();
  }

  // 🤝 Partners
  if (FEATURES.PARTNERS) {
    renderPartners();
  }

  log("Application fully initialized (FINAL)");
});
