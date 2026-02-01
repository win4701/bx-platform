"use strict";

/* =========================================================
   PART 1 — CORE & GLOBAL STATE (FINAL)
   هذا الجزء هو الأساس ولا يجب كسره
========================================================= */

/* ================= DOM HELPERS ================= */
/* آمنة — لا ترمي أخطاء */

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

/* ================= CONFIG ================= */

const API_BASE = "https://bx-backend.fly.dev";

/* ================= USER / AUTH ================= */
/*
  USER هو المصدر الوحيد للمصادقة
  ممنوع قراءة localStorage خارج هذا الكائن
*/

const USER = {
  jwt: null,
  authenticated: false,

  load() {
    const token = localStorage.getItem("jwt");
    if (token && typeof token === "string") {
      this.jwt = token;
      this.authenticated = true;
    }
  },

  set(token) {
    if (!token) return;
    this.jwt = token;
    this.authenticated = true;
    localStorage.setItem("jwt", token);
  },

  clear() {
    this.jwt = null;
    this.authenticated = false;
    localStorage.removeItem("jwt");
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
/*
  APP هو المصدر الوحيد لحالة التطبيق العامة
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
  - لا رمي exceptions
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
      console.error("API ERROR:", path, res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("NETWORK ERROR:", path, err);
    return null;
  }
   }
/* =========================================================
   PART 2 — NAVIGATION SYSTEM (FINAL)
   التحكم الكامل في الأقسام بدون أي side effects
========================================================= */

/* ================= VIEW REGISTRY ================= */
/*
  أي View:
  - لازم يكون له id مطابق
  - class="view"
*/

const VIEWS = ["wallet", "market", "casino", "mining", "airdrop"];

/* ================= NAVIGATE ================= */

function navigate(view) {
  if (!APP.ready) return;

  if (!VIEWS.includes(view)) {
    console.warn("navigate(): unknown view →", view);
    return;
  }

  // 1️⃣ إخفاء كل الأقسام
  VIEWS.forEach(v => {
    const el = $(v);
    if (el) el.classList.remove("active");
  });

  // 2️⃣ إظهار القسم المطلوب
  const target = $(view);
  if (!target) {
    console.error("navigate(): missing DOM element →", view);
    return;
  }
  target.classList.add("active");

  // 3️⃣ تحديث الحالة العامة
  APP.view = view;

  // 4️⃣ تحديث أزرار التنقل
  updateNavButtons(view);

  // 5️⃣ Hook دخول القسم (آمن)
  onViewEnter(view);
}

/* ================= NAV BUTTON STATE ================= */

function updateNavButtons(activeView) {
  const buttons = $$(".bottom-nav button");

  buttons.forEach(btn => {
    const view = btn.dataset.view;
    if (!view) return;

    btn.classList.toggle("active", view === activeView);
  });
}

/* ================= VIEW ENTER HOOK ================= */
/*
  لا منطق ثقيل هنا
  فقط استدعاء دوال إن وُجدت
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
/*
  يُستدعى مرة واحدة فقط في bootstrap
*/

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
   PART 3 — WALLET ENGINE (FINAL)
   تحميل + عرض الرصيد بشكل آمن
========================================================= */

/* ================= WALLET STATE ================= */
/*
  WALLET هو المصدر الوحيد لبيانات الرصيد
*/

const WALLET = {
  BX: 0,
  BNB: 0,
  SOL: 0,
  USDT: 0,
  loaded: false
};

/* ================= WALLET DOM MAP ================= */
/*
  ربط العملة بالعنصر في HTML
  لو عنصر غير موجود → تجاهل بدون crash
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
  - لا يعمل بدون مصادقة
  - لا يرمي Exceptions
  - fallback آمن
*/

async function loadWallet() {
  if (!isAuthenticated()) {
    resetWallet();
    return;
  }

  const data = await safeFetch("/finance/wallet");

  if (!data || typeof data !== "object") {
    console.warn("Wallet API unavailable, using local state");
    renderWallet();
    return;
  }

  applyWalletData(data);
}

/* ================= APPLY BACKEND DATA ================= */
/*
  تطبيع البيانات لحماية اختلاف backend
*/

function applyWalletData(data) {
  WALLET.BX   = Number(data.BX   ?? data.bx   ?? 0);
  WALLET.BNB  = Number(data.BNB  ?? data.bnb  ?? 0);
  WALLET.SOL  = Number(data.SOL  ?? data.sol  ?? 0);
  WALLET.USDT = Number(data.USDT ?? data.usdt ?? 0);

  WALLET.loaded = true;
  renderWallet();
}

/* ================= RESET WALLET ================= */

function resetWallet() {
  WALLET.BX = 0;
  WALLET.BNB = 0;
  WALLET.SOL = 0;
  WALLET.USDT = 0;
  WALLET.loaded = false;

  renderWallet();
}
/* =========================================================
   PART 4 — MARKET & CASINO (FINAL SAFE LAYER)
   Stubs مستقرة بدون أي مخاطرة
========================================================= */

/* ================= MARKET ================= */

const MARKET = {
  initialized: false
};

function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;
  renderMarket();
}

function renderMarket() {
  const container = $("market");
  if (!container) return;

  const placeholder = container.querySelector(".market-placeholder");
  if (placeholder) {
    placeholder.textContent = "Market ready";
  }
}

/* ================= CASINO ================= */

const CASINO = {
  initialized: false
};

function initCasino() {
  if (CASINO.initialized) return;
  CASINO.initialized = true;
  renderCasino();
}

function renderCasino() {
  const container = $("casino");
  if (!container) return;

  const placeholder = container.querySelector(".casino-placeholder");
  if (placeholder) {
    placeholder.textContent = "Casino ready";
  }
}

/* ================= SAFE EXIT HOOKS ================= */
/*
  Hooks مستقبلية — فارغة عن قصد
  لا loops
  لا cleanup الآن
*/

function stopMarket() {}
function stopCasino() {}
/* =========================================================
   PART 5 — MINING ENGINE (FINAL)
   3 Coins × 6 Plans — Stable & Predictable
========================================================= */

/* ================= MINING STATE ================= */

const MINING = {
  coin: "BX",            // BX | BNB | SOL
  subscription: null     // { coin, planId, startedAt }
};

/* ================= MINING CONFIG ================= */

const MINING_COINS = ["BX", "BNB", "SOL"];

const MINING_PLANS = [
  { id: "starter",  name: "Starter",  roi: 2.5,  days: 10, min: 10,    max: 100 },
  { id: "basic",    name: "Basic",    roi: 5,    days: 21, min: 50,    max: 300 },
  { id: "golden",   name: "Golden",   roi: 8,    days: 30, min: 200,   max: 800 },
  { id: "advanced", name: "Advanced", roi: 12,   days: 45, min: 400,   max: 2500 },
  { id: "platine",  name: "Platine",  roi: 17,   days: 60, min: 750,   max: 9000 },
  { id: "infinity", name: "Infinity", roi: 25,   days: 90, min: 1000,  max: 20000 }
];

/* ================= ENTRY ================= */

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
      if (MINING.coin === coin) return;
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
    const isActive =
      MINING.subscription &&
      MINING.subscription.planId === plan.id &&
      MINING.subscription.coin === MINING.coin;

    const card = document.createElement("div");
    card.className = "card mining-plan";

    card.innerHTML = `
      <h4>${plan.name}</h4>
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

    const btn = card.querySelector("button");
    btn.onclick = () => {
      if (!isActive) subscribeMining(plan.id);
    };

    grid.appendChild(card);
  });
}

/* ================= SUBSCRIBE ================= */

function subscribeMining(planId) {
  // حماية من تعدد الاشتراكات
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
   PART 6 — BOOTSTRAP & AIRDROP (FINAL)
   الإقلاع النهائي وربط كل الأجزاء
========================================================= */

/* ================= AIRDROP ================= */
/*
  Airdrop UI-only
  لا توزيع أموال حقيقية
  لا API إجباري
*/

const AIRDROP = {
  claimed: false
};

function initAirdrop() {
  const claimBtn = $("airdropClaim");
  const statusEl = $("airdropStatus");

  if (!claimBtn || !statusEl) return;

  claimBtn.disabled = AIRDROP.claimed;

  claimBtn.onclick = () => {
    if (AIRDROP.claimed) return;

    AIRDROP.claimed = true;
    claimBtn.disabled = true;
    statusEl.textContent = "Airdrop claimed successfully";
  };
}

/* ================= BOOTSTRAP ================= */
/*
  نقطة البداية الوحيدة للتطبيق
  ممنوع تشغيل أي جزء خارجها
*/

function bootstrap() {
  // 1️⃣ تهيئة الأساس
  if (typeof APP !== "undefined" && typeof APP.init === "function") {
    APP.init();
  }

  // 2️⃣ ربط التنقل (مرة واحدة)
  if (typeof bindNavigation === "function") {
    bindNavigation();
  }

  // 3️⃣ تهيئة Mining Tabs (حتى لو القسم غير ظاهر)
  if (typeof renderMining === "function") {
    renderMining();
  }

  // 4️⃣ تحميل المحفظة إن أمكن
  if (typeof loadWallet === "function") {
    loadWallet();
  }

  // 5️⃣ الانتقال إلى القسم الافتراضي
  if (typeof navigate === "function") {
    navigate(APP.view);
  }
}

/* ================= START ================= */
/*
  لا تنفيذ قبل DOM جاهز
*/

document.addEventListener("DOMContentLoaded", bootstrap);
