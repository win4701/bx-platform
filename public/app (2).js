"use strict";

/* ================================================================================================
   PART 1 — CORE & CONTRACT LAYER
   -----------------------------------------------------------------------------------------------
   - ثوابت عامة
   - إعدادات التطبيق
   - حالة عامة (APP_STATE)
   - المستخدم والمصادقة
   - Helpers (DOM, logging, toast)
   - API contract (المسارات فقط)
=============================================================== */

/* =======================================================
   1.1 — API Base URL
========================================================= */

const API_BASE = "https://bx-backend.fly.dev"; // اكتب رابط الـ API هنا

/* =======================================================
   1.2 — App State
========================================================= */

const APP_STATE = {
  ready: false, // تعني أن التطبيق جاهز
  view: "wallet", // القسم النشط في الواجهة
  user: null, // تفاصيل المستخدم
  isLoading: false // حالة التحميل العامة
};

/* =======================================================
   1.3 — USER (من الـ LocalStorage أو الـ Cookie)
========================================================= */

const USER = {
  jwt: localStorage.getItem("jwt") || null, // JSON Web Token للمصادقة
  isAuthenticated() {
    return this.jwt !== null;
  },
  setToken(jwt) {
    this.jwt = jwt;
    localStorage.setItem("jwt", jwt);
  }
};

/* =======================================================
   1.4 — API Authorization Headers
========================================================= */

function authHeaders() {
  return USER.isAuthenticated() ? { Authorization: "Bearer " + USER.jwt } : {};
}

/* =======================================================
   1.5 — Helper functions (DOM, Toasts, Logging)
========================================================= */

// DOM helper (لإيجاد العناصر بسهولة)
function $(id) {
  return document.getElementById(id);
}

// توست للرسائل التنبيهية
function toast(message) {
  if (!message) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000); // الرسالة تختفي بعد 3 ثواني
}

// تسجيل الأخطاء في الـ console
function log(message) {
  console.log(message);
}

/* =======================================================
   1.6 — API Contract: Paths for FastAPI endpoints
========================================================= */

const API = {
  wallet: "/finance/wallet", // بيانات المحفظة
  casino: {
    play: "/casino/play", // لعب الكازينو
    history: "/casino/history"
  },
  mining: {
    start: "/bxing/mining/start", // بداية التعدين
    status: "/bxing/mining/status"
  },
  airdrop: {
    status: "/bxing/airdrop/status", // حالة الـ air drop
    claim: "/bxing/airdrop/claim" // المطالبة بالـ air drop
  }
};

/* ================================================================================================
   PART 2 — STATE & DATA LAYER (SINGLE SOURCE OF TRUTH)
   -----------------------------------------------------------------------------------------------
   - كل الحالات (Wallet / Market / Casino / Mining / Airdrop)
   - قيم افتراضية
   - بدون DOM
   - بدون fetch
=============================================================== */

/* =======================================================
   2.1 — Wallet State
========================================================= */

const WALLET_STATE = {
  BX: 0.0,
  USDT: 0.0,
  BNB: 0.0,
  ETH: 0.0,
  SOL: 0.0,
  TON: 0.0,
  BTC: 0.0,

  set(walletData) {
    this.BX = walletData.BX || 0;
    this.USDT = walletData.USDT || 0;
    this.BNB = walletData.BNB || 0;
    this.ETH = walletData.ETH || 0;
    this.SOL = walletData.SOL || 0;
    this.TON = walletData.TON || 0;
    this.BTC = walletData.BTC || 0;
  },

  update(asset, amount) {
    if (this.hasOwnProperty(asset)) {
      this[asset] += amount;
    }
  }
};

/* =======================================================
   2.2 — Market State (Market Price)
========================================================= */

const MARKET_STATE = {
  price: 0.0,
  pair: "BX/USDT",  // يمكن تغييره حسب السوق
  spread: 0.02,     // مثال: spread between buy and sell price
  set(price) {
    this.price = price;
  },
  updatePrice(newPrice) {
    this.price = newPrice;
  },
  setPair(pair) {
    this.pair = pair;
  }
};

/* =======================================================
   2.3 — Casino State
========================================================= */

const CASINO_STATE = {
  activeGame: null,
  isPlaying: false,
  result: null,

  setGame(gameId) {
    this.activeGame = gameId;
    this.result = null;
  },

  setResult(result) {
    this.result = result;
  },

  startGame() {
    this.isPlaying = true;
  },

  stopGame() {
    this.isPlaying = false;
  }
};

/* =======================================================
   2.4 — Mining State
========================================================= */

const MINING_STATE = {
  activePlan: null,
  isMining: false,
  estimatedReturn: 0.0,
  availablePlans: [
    { name: "Starter", roi: 0.025, min: 10, max: 100, days: 10 },
    { name: "Basic", roi: 0.05, min: 50, max: 300, days: 21 },
    { name: "Golden", roi: 0.08, min: 200, max: 800, days: 30 }
  ], // الخطط الافتراضية
  setPlan(plan) {
    this.activePlan = plan;
  },

  startMining() {
    this.isMining = true;
  },

  stopMining() {
    this.isMining = false;
  },

  setEstimatedReturn(returnAmount) {
    this.estimatedReturn = returnAmount;
  }
};

/* =======================================================
   2.5 — Airdrop State
========================================================= */

const AIRDROP_STATE = {
  claimed: false,
  reward: 2.5,  // Example reward
  setStatus(claimed, reward) {
    this.claimed = claimed;
    this.reward = reward || 2.5;
  },

  claimAirdrop() {
    this.claimed = true;
  }
};

/* ================================================================================================
   PART 3 — API ACTIONS LAYER (BACKEND CONTRACT)
   -----------------------------------------------------------------------------------------------
   - التعامل مع API (Backend)
   - تحديث البيانات (STATE)
   - لا يتعامل مع DOM
   - لا يتعامل مع UI مباشرة
=============================================================== */

/* =======================================================
   3.1 — Load Wallet (Get user wallet data)
========================================================= */

async function loadWallet() {
  const data = await safeFetch(API.wallet);
  if (!data) {
    toast("Failed to load wallet.");
    return;
  }

  // تحديث حالة wallet بعد استلام البيانات
  WALLET_STATE.set(data);
  renderWallet(); // بعد تحديث الـ STATE، رندر الواجهة
}

/* =======================================================
   3.2 — Play Casino (Send play request to the backend)
========================================================= */

async function playCasino(gameId, betAmount) {
  if (!gameId || betAmount <= 0) {
    toast("Invalid game or bet amount.");
    return;
  }

  const result = await safeFetch(API.casino.play, {
    method: "POST",
    body: JSON.stringify({
      game: gameId,
      bet: betAmount,
      client_seed: localStorage.getItem("client_seed") || "default"
    })
  });

  if (!result) {
    toast("Casino service unavailable");
    return;
  }

  // تحديث حالة الكازينو بعد اللعب
  CASINO_STATE.setResult(result);
  renderCasinoUI(result); // عرض النتيجة
}

/* =======================================================
   3.3 — Start Mining (Send mining request)
========================================================= */

async function startMining(asset, plan) {
  if (!asset || !plan) {
    toast("Invalid asset or plan.");
    return;
  }

  const result = await safeFetch(API.mining.start, {
    method: "POST",
    body: JSON.stringify({
      asset,
      plan
    })
  });

  if (!result) {
    toast("Mining service unavailable");
    return;
  }

  // تحديث حالة التعدين بعد البدء
  MINING_STATE.setPlan(plan);
  MINING_STATE.startMining();
  renderMiningPlans(); // إعادة عرض خطط التعدين بعد البدء
}

/* =======================================================
   3.4 — Load Mining Status (Get active mining data)
========================================================= */

async function loadMiningStatus() {
  const data = await safeFetch(API.mining.status);
  if (!data) {
    toast("Failed to load mining status.");
    return;
  }

  // تحديث حالة التعدين النشطة
  MINING_STATE.setPlan(data.plan);
  MINING_STATE.setEstimatedReturn(data.estimatedReturn);
  renderActiveMining(); // عرض حالة التعدين النشطة
}

/* =======================================================
   3.5 — Airdrop Status (Get user airdrop status)
========================================================= */

async function loadAirdropStatus() {
  const data = await safeFetch(API.airdrop.status);
  if (!data) {
    toast("Failed to load airdrop status.");
    return;
  }

  // تحديث حالة الـ airdrop
  AIRDROP_STATE.setStatus(data.claimed, data.reward);
  renderAirdrop(); // عرض حالة الـ airdrop
}

/* =======================================================
   3.6 — Claim Airdrop (Send claim request)
========================================================= */

async function claimAirdrop() {
  const result = await safeFetch(API.airdrop.claim, { method: "POST" });

  if (!result) {
    toast("Airdrop service unavailable");
    return;
  }

  // تحديث حالة الـ airdrop بعد المطالبة
  AIRDROP_STATE.claimAirdrop();
  renderAirdrop(); // عرض حالة الـ airdrop
  }

/* ================================================================================================
   PART 4 — UI RENDERING & USER INTERACTION
   -----------------------------------------------------------------------------------------------
   - التعامل مع DOM فقط
   - قراءة STATE
   - رسم البيانات
   - bind events البسيطة
   - بدون fetch
=============================================================== */

/* =======================================================
   4.1 — Render Wallet (Update wallet data in UI)
========================================================= */

function renderWallet() {
  if (!APP_STATE.ready || !WALLET_STATE) return;

  Object.entries(WALLET_STATE).forEach(([asset, amount]) => {
    const elementId = `bal-${asset.toLowerCase()}`;
    const element = $(elementId);
    if (element) element.textContent = amount.toFixed(2);
  });
}

/* =======================================================
   4.2 — Render Market Price (Display market price)
========================================================= */

function renderMarketPrice() {
  if (!APP_STATE.ready || MARKET_STATE.price === 0) return;

  const priceElement = $("lastPrice");
  if (priceElement) {
    priceElement.textContent = MARKET_STATE.price.toFixed(4);
  }
}

/* =======================================================
   4.3 — Render Casino UI (Display active game and result)
========================================================= */

function renderCasinoUI(result) {
  if (!APP_STATE.ready || !CASINO_STATE) return;

  const gameElement = $("activeGame");
  const resultElement = $("gameResult");

  if (gameElement) {
    gameElement.textContent = `Active Game: ${CASINO_STATE.activeGame || "None"}`;
  }

  if (resultElement) {
    resultElement.textContent = `Result: ${result ? result.win ? "You Win!" : "You Lose!" : "Waiting..."}`;
  }
}

/* =======================================================
   4.4 — Render Mining Plans (Display mining plans)
========================================================= */

/* =======================================================
   4.4 — Render Mining Plans (Display mining plans)
========================================================= */

function renderMiningPlans() {
  if (!APP_STATE.ready || !MINING_STATE || !MINING_STATE.availablePlans) return;

  const plansContainer = $("miningPlansContainer");
  if (!plansContainer) return;

  plansContainer.innerHTML = ""; // Clear existing plans

  // عرض الخطط المتاحة بناءً على MINING_STATE
  MINING_STATE.availablePlans.forEach(plan => {
    const planElement = document.createElement("div");
    planElement.classList.add("miningPlan");
    planElement.innerHTML = `
      <div>${plan.name}</div>
      <div>ROI: ${plan.roi * 100}%</div>
      <div>Investment: ${plan.min} - ${plan.max}</div>
      <div>Duration: ${plan.days} days</div>
    `;
    plansContainer.appendChild(planElement);
  });
}

/* =======================================================
   4.5 — Render Active Mining (Display active mining status)
========================================================= */

function renderActiveMining() {
  if (!APP_STATE.ready || !MINING_STATE) return;

  const activeMiningElement = $("activeMining");
  const roiElement = $("activeMiningROI");
  const returnElement = $("estimatedReturn");

  if (activeMiningElement) {
    activeMiningElement.textContent = `Active Plan: ${MINING_STATE.activePlan || "None"}`;
  }

  if (roiElement && MINING_STATE.activePlan) {
    roiElement.textContent = `ROI: ${MINING_STATE.activePlan.roi * 100}%`;
  }

  if (returnElement && MINING_STATE.estimatedReturn) {
    returnElement.textContent = `Estimated Return: ${MINING_STATE.estimatedReturn.toFixed(2)} USDT`;
  }
}

/* =======================================================
   4.6 — Render Airdrop (Display airdrop status)
========================================================= */

function renderAirdrop() {
  if (!APP_STATE.ready || !AIRDROP_STATE) return;

  const airdropStatusElement = $("airdropStatus");
  const airdropRewardElement = $("airdropReward");

  if (airdropStatusElement) {
    airdropStatusElement.textContent = AIRDROP_STATE.claimed ? "Claimed" : "Not Claimed";
  }

  if (airdropRewardElement) {
    airdropRewardElement.textContent = `Reward: ${AIRDROP_STATE.reward} USDT`;
  }
}

/* =======================================================
   4.7 — Bind Events (Add event listeners)
========================================================= */

function bindEvents() {
  // Example for button clicks (can be expanded)
  $("claimAirdropButton")?.addEventListener("click", () => {
    claimAirdrop();
  });

  $("startMiningButton")?.addEventListener("click", () => {
    startMining("BX", "Starter");
  });

  $("playCasinoButton")?.addEventListener("click", () => {
    playCasino("blackjack", 10);
  });
}

"use strict";

/* ================================================================================================
   PART 5 — ORCHESTRATION & LIFECYCLE
   -----------------------------------------------------------------------------------------------
   - التحكم في التوقيت
   - navigation
   - loops (start/stop)
   - DOMContentLoaded
   - ربط الأجزاء السابقة
=============================================================== */

/* =======================================================
   5.1 — Initialize Application (On DOMContentLoaded)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // إعداد الـ navigation بين الأقسام
  bindNavigation();

  // تحميل البيانات الأولية (مثل المحفظة)
  loadWallet();

  // التحقق من حالة التعدين
  loadMiningStatus();

  // التحقق من حالة الـ airdrop
  loadAirdropStatus();

  // بدء التفاعل مع السوق (Market)
  startMarket();

  // تحديد أن التطبيق جاهز
  APP_STATE.ready = true;

  // تحميل البيانات الافتراضية
  navigate(APP_STATE.view);
});

/* =======================================================
   5.2 — Navigation (Control view transitions)
========================================================= */

function navigate(view) {
  if (!view) return;

  // تحديث الحالة الحالية (view)
  APP_STATE.view = view;

  // إخفاء جميع الأقسام
  document.querySelectorAll(".view").forEach(v =>
    v.classList.remove("active")
  );

  // إظهار القسم الحالي
  const target = document.getElementById(view);
  if (target) target.classList.add("active");

  // تحديث حالة الـ bottom navigation
  document.querySelectorAll(".bottom-nav button").forEach(b =>
    b.classList.remove("active")
  );

  const btn = document.querySelector(
    `.bottom-nav button[data-view="${view}"]`
  );
  if (btn) btn.classList.add("active");

  // تنفيذ أي عمليات بناء على القسم الحالي
  if (view === "market") {
    startMarket();
  } else if (view === "casino") {
    startCasino();
  } else {
    stopMarket();
    stopCasino();
  }
}

/* =======================================================
   5.3 — Start/Stop Market Loop (Simulate market behavior)
========================================================= */

let marketLoopTimer = null;

function startMarket() {
  if (marketLoopTimer) return; // لا نبدأ إلا إذا كانت الدورة متوقفة
  marketLoopTimer = setInterval(() => {
    if (!APP_STATE.ready || APP_STATE.view !== "market") return;
    MARKET_STATE.price += (Math.random() - 0.5) * 0.02;
    renderMarketPrice(); // تحديث عرض السعر
  }, 1200); // كل 1.2 ثانية
}

function stopMarket() {
  if (marketLoopTimer) {
    clearInterval(marketLoopTimer);
    marketLoopTimer = null;
  }
}

/* =======================================================
   5.4 — Start/Stop Casino (Start/Stop game bots)
========================================================= */

let casinoBotsTimer = null;

function startCasino() {
  if (casinoBotsTimer) return; // لا نبدأ إلا إذا كانت الدورة متوقفة
  casinoBotsTimer = setInterval(() => {
    if (!APP_STATE.ready || APP_STATE.view !== "casino") return;
    playCasino("blackjack", 10); // المثال: بدء لعبة كازينو افتراضية
  }, 5000); // كل 5 ثواني
}

function stopCasino() {
  if (casinoBotsTimer) {
    clearInterval(casinoBotsTimer);
    casinoBotsTimer = null;
  }
}

/* =======================================================
   5.5 — Auto Bind Navigation (To link navigation events)
========================================================= */

function bindNavigation() {
  // ربط الأزرار بالأحداث
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.view);
  });
}

/* =======================================================
   5.6 — Automatic Actions for Specific Views
========================================================= */

function startAutoActions() {
  if (APP_STATE.view === "market") {
    startMarket(); // ابدأ السوق مباشرة
  }

  if (APP_STATE.view === "casino") {
    startCasino(); // ابدأ الكازينو مباشرة
  }
                          }
