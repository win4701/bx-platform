"use strict";

/* =========================================================
   PART 1 — CORE & GLOBAL STATE (FOUNDATION)
   هذا الجزء لا يلمس UI مباشرة
========================================================= */

/* ================= DOM HELPERS ================= */

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
    if (token) {
      this.jwt = token;
      this.authenticated = true;
    }
  },

  set(jwt) {
    this.jwt = jwt;
    this.authenticated = true;
    localStorage.setItem("jwt", jwt);
  },

  clear() {
    this.jwt = null;
    this.authenticated = false;
    localStorage.removeItem("jwt");
  }
};

function authHeaders() {
  return USER.jwt
    ? { Authorization: "Bearer " + USER.jwt }
    : {};
}

function isAuthenticated() {
  return USER.authenticated === true;
}

/* ================= APP STATE ================= */
/*
  APP هو المصدر الوحيد للحالة العامة
  لا تُنشئ state خارجه
*/

const APP = {
  ready: false,
  view: "wallet", // wallet | market | casino | mining | airdrop

  init() {
    USER.load();
    this.ready = true;
  }
};

/* ================= SAFE FETCH ================= */
/*
  fetch موحّد:
  - لا crash
  - لا silent fail
*/

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
      console.error("API ERROR", path, res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("NETWORK ERROR", path, err);
    return null;
  }
}

/* ================= BOOT GUARD ================= */
/*
  يمنع أي كود من العمل قبل الجاهزية
*/

function whenReady(fn) {
  if (APP.ready) fn();
  else document.addEventListener("DOMContentLoaded", fn);
}
/* =========================================================
   PART 2 — NAVIGATION SYSTEM
   التحكم الكامل في الأقسام + bottom navigation
========================================================= */

/* ================= VIEWS REGISTRY ================= */
/*
  أي section يجب:
  - يكون له id مطابق
  - يكون له class="view"
*/

const VIEWS = ["wallet", "market", "casino", "mining", "airdrop"];

/* ================= NAVIGATE ================= */

function navigate(view) {
  if (!VIEWS.includes(view)) {
    console.warn("Unknown view:", view);
    return;
  }

  // إخفاء كل الأقسام
  VIEWS.forEach(v => {
    const el = $(v);
    if (el) el.classList.remove("active");
  });

  // إظهار القسم المطلوب
  const target = $(view);
  if (!target) {
    console.error("View element not found:", view);
    return;
  }
  target.classList.add("active");

  // تحديث حالة التطبيق
  APP.view = view;

  // تحديث أزرار التنقل
  updateNavButtons(view);

  // Side-effects آمنة (بدون منطق)
  onViewEnter(view);
}

/* ================= NAV BUTTONS ================= */

function updateNavButtons(activeView) {
  const buttons = $$(".bottom-nav button");

  buttons.forEach(btn => {
    const view = btn.dataset.view;
    btn.classList.toggle("active", view === activeView);
  });
}

/* ================= VIEW HOOK ================= */
/*
  لا منطق هنا
  فقط نقاط دخول نظيفة
*/

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
   PART 3 — WALLET ENGINE
   عرض الرصيد + تحميله بشكل آمن
========================================================= */

/* ================= WALLET STATE ================= */

const WALLET = {
  BX: 0,
  BNB: 0,
  SOL: 0,
  USDT: 0,

  loaded: false
};

/* ================= WALLET DOM MAP ================= */
/*
  يربط العملة بالعنصر في HTML
  لو عنصر غير موجود → لا crash
*/

const WALLET_DOM = {
  BX: "bal-bx",
  BNB: "bal-bnb",
  SOL: "bal-sol",
  USDT: "bal-usdt"
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
/*
  - لا يعمل إذا المستخدم غير مسجل
  - لا يرمي exceptions
  - fallback آمن
*/

async function loadWallet() {
  if (!isAuthenticated()) {
    resetWallet();
    return;
  }

  const data = await safeFetch("/finance/wallet");

  if (!data) {
    console.warn("Wallet API unavailable, using local state");
    renderWallet();
    return;
  }

  applyWalletData(data);
}

/* ================= APPLY DATA ================= */

function applyWalletData(data) {
  // حماية من backend ناقص
  WALLET.BX   = Number(data.BX   ?? data.bx   ?? 0);
  WALLET.BNB  = Number(data.BNB  ?? data.bnb  ?? 0);
  WALLET.SOL  = Number(data.SOL  ?? data.sol  ?? 0);
  WALLET.USDT = Number(data.USDT ?? data.usdt ?? 0);

  WALLET.loaded = true;
  renderWallet();
}

/* ================= RESET ================= */

function resetWallet() {
  WALLET.BX = 0;
  WALLET.BNB = 0;
  WALLET.SOL = 0;
  WALLET.USDT = 0;
  WALLET.loaded = false;

  renderWallet();
                       }
/* =========================================================
   PART 4 — MARKET & CASINO (SAFE STUBS)
   بدون loops — بدون fetch — بدون مخاطرة
========================================================= */

/* ================= MARKET ================= */

const MARKET = {
  initialized: false,
  price: 0
};

function initMarket() {
  if (MARKET.initialized) return;

  MARKET.initialized = true;
  renderMarketPlaceholder();
}

function renderMarketPlaceholder() {
  const el = $("marketPlaceholder");
  if (!el) return;

  el.textContent = "Market loading…";
}

/* ================= CASINO ================= */

const CASINO = {
  initialized: false,
  activeGame: null
};

function initCasino() {
  if (CASINO.initialized) return;

  CASINO.initialized = true;
  renderCasinoPlaceholder();
}

function renderCasinoPlaceholder() {
  const el = $("casinoPlaceholder");
  if (!el) return;

  el.textContent = "Casino ready";
}

/* ================= SAFE EXIT ================= */
/*
  Hooks مستقبلية لو حبيت:
  stopMarket()
  stopCasino()
  (حاليًا فارغة لتجنّب أي loop)
*/

function stopMarket() {}
function stopCasino() {}

/* =========================================================
   PART 5 — MINING ENGINE (FINAL)
   3 Coins × 6 Plans — Zero ambiguity
========================================================= */

/* ================= MINING STATE ================= */

const MINING = {
  coin: "BX",
  subscription: null // { coin, planId, startedAt }
};

/* ================= MINING CONFIG ================= */

const MINING_COINS = ["BX", "BNB", "SOL"];

const MINING_PLANS = [
  { id: "starter",   name: "Starter",   roi: 2.5,  days: 10, min: 10,    max: 100 },
  { id: "basic",     name: "Basic",     roi: 5,    days: 21, min: 50,    max: 300 },
  { id: "golden",    name: "Golden",    roi: 8,    days: 30, min: 200,   max: 800 },
  { id: "advanced",  name: "Advanced",  roi: 12,   days: 45, min: 400,   max: 2500 },
  { id: "platine",   name: "Platine",   roi: 17,   days: 60, min: 750,   max: 9000 },
  { id: "infinity",  name: "Infinity",  roi: 25,   days: 90, min: 1000,  max: 20000 }
];

/* ================= RENDER ================= */

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
    const card = document.createElement("div");
    card.className = "card mining-plan";

    const subscribed =
      MINING.subscription &&
      MINING.subscription.planId === plan.id &&
      MINING.subscription.coin === MINING.coin;

    card.innerHTML = `
      <h4>${plan.name}</h4>
      <div class="mining-profit">${plan.roi}%</div>
      <ul>
        <li>Duration: ${plan.days} days</li>
        <li>Min: ${plan.min} ${MINING.coin}</li>
        <li>Max: ${plan.max} ${MINING.coin}</li>
      </ul>
      <button ${subscribed ? "disabled" : ""}>
        ${subscribed ? "Active" : "Subscribe"}
      </button>
    `;

    card.querySelector("button").onclick = () => {
      if (!subscribed) subscribeMining(plan.id);
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
   PART 6 — AIRDROP + BOOTSTRAP (FINAL GLUE)
   ترتيب الإقلاع + ربط كل الأجزاء
========================================================= */

/* ================= AIRDROP ================= */
/*
  Airdrop هنا UI-safe فقط
  لا توزيع أموال حقيقية
*/

const AIRDROP = {
  claimed: false
};

function initAirdrop() {
  const btn = $("airdropClaim");
  const status = $("airdropStatus");

  if (!btn || !status) return;

  btn.disabled = AIRDROP.claimed;

  btn.onclick = () => {
    if (AIRDROP.claimed) return;

    AIRDROP.claimed = true;
    btn.disabled = true;
    status.textContent = "Airdrop claimed successfully";
  };
}

/* ================= BOOTSTRAP ================= */
/*
  نقطة الإقلاع الوحيدة
  ممنوع تشغيل أي شيء خارجها
*/

function bootstrap() {
  // 1️⃣ تهيئة الأساس
  APP.init();

  // 2️⃣ ربط التنقل
  bindNavigation();

  // 3️⃣ ربط Mining Tabs (آمن حتى لو mining غير ظاهر)
  if (typeof renderMining === "function") {
    renderMining();
  }

  // 4️⃣ تحميل المحفظة إن أمكن
  if (typeof loadWallet === "function") {
    loadWallet();
  }

  // 5️⃣ الانتقال الافتراضي
  navigate(APP.view);
}

/* ================= START ================= */
/*
  لا DOM قبل الجاهزية
*/

document.addEventListener("DOMContentLoaded", bootstrap);
