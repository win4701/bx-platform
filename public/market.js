"use strict";

/* =========================================================
   PART 1 — CORE / CONFIG / SECURITY / DEBUG (FINAL)
========================================================= */

/* ========= DOM HELPERS ========= */
const $  = (id) => document.getElementById(id);
const $$ = (q)  => document.querySelectorAll(q);

/* ========= ENV / CONFIG ========= */
const CONFIG = {
  API_BASE: "https://bx-backend.fly.dev",
  APP_NAME: "BX App",
  VERSION: "1.0.0"
};

/* ========= DEBUG MODE ========= */
const DEBUG = (() => {
  try {
    if (location.search.includes("debug=1")) return true;
    if (localStorage.getItem("DEBUG") === "1") return true;
  } catch (_) {}
  return false;
})();

/* ========= LOGGER ========= */
const log = Object.freeze({
  info: (...a) => DEBUG && console.log("[INFO]", ...a),
  warn: (...a) => DEBUG && console.warn("[WARN]", ...a),
  error: (...a) => console.error("[ERROR]", ...a)
});

/* ========= USER / AUTH STATE ========= */
const USER = {
  jwt: null,
  authenticated: false,

  load() {
    try {
      const token = localStorage.getItem("jwt");
      if (typeof token === "string" && token.length > 20) {
        this.jwt = token;
        this.authenticated = true;
        log.info("JWT loaded");
      }
    } catch (e) {
      log.warn("JWT load failed");
    }
  },

  set(token) {
    if (!token || typeof token !== "string") return;
    this.jwt = token;
    this.authenticated = true;
    try {
      localStorage.setItem("jwt", token);
    } catch (_) {}
    log.info("JWT stored");
  },

  clear() {
    this.jwt = null;
    this.authenticated = false;
    try {
      localStorage.removeItem("jwt");
    } catch (_) {}
    log.info("JWT cleared");
  }
};

/* ========= AUTH HELPERS ========= */
function isAuthenticated() {
  return USER.authenticated === true;
}

function authHeaders() {
  return USER.jwt
    ? { Authorization: "Bearer " + USER.jwt }
    : {};
}

/* ========= GLOBAL APP STATE ========= */
const APP = {
  ready: false,
  view: "wallet",

  init() {
    USER.load();
    this.ready = true;
    log.info("APP initialized", CONFIG.VERSION);
  }
};

/* ========= SAFE FETCH (SSOT NETWORK LAYER) ========= */
async function safeFetch(path, options = {}) {
  try {
    const res = await fetch(CONFIG.API_BASE + path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      log.error("API ERROR", path, res.status);
      return null;
    }

    return await res.json();

  } catch (err) {
    log.error("NETWORK ERROR", path, err);
    return null;
  }
}

/* ========= HARD SAFETY RULES ========= */
/*
 - ❌ لا fetch مباشر خارج safeFetch
 - ❌ لا localStorage مباشر خارج USER
 - ❌ لا console.log خارج log
 - ✔ هذا الجزء لا يعرف market / casino / mining
*/
/* =========================================================
   PART 2 — NAVIGATION / ROUTER / VIEW CONTROL (FINAL)
========================================================= */

/* ========= VIEW REGISTRY ========= */
/*
  كل الأقسام المعرفة هنا فقط
  أي view غير موجود هنا لن يُفتح
*/
const VIEWS = Object.freeze([
  "wallet",
  "market",
  "casino",
  "mining",
  "airdrop",
  "settings"
]);

/* ========= ROUTER ========= */
function navigate(view) {
  if (!VIEWS.includes(view)) {
    log.warn("Unknown view:", view);
    return;
  }

  // إخفاء جميع الأقسام
  $$("section").forEach(sec => {
    sec.classList.remove("active");
    sec.setAttribute("aria-hidden", "true");
  });

  // إظهار القسم المطلوب
  const target = $(view);
  if (!target) {
    log.error("View element not found:", view);
    return;
  }

  target.classList.add("active");
  target.setAttribute("aria-hidden", "false");

  // تحديث حالة التطبيق
  APP.view = view;

  // تحديث أزرار التنقل
  $$(".bottom-nav button").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.view === view
    );
  });

  // Hook عام لباقي الأجزاء
  document.dispatchEvent(
    new CustomEvent("view:change", {
      detail: view
    })
  );

  log.info("Navigate →", view);
}

/* ========= NAVIGATION BINDING ========= */
function bindNavigation() {
  const buttons = $$(".bottom-nav button");

  if (!buttons.length) {
    log.warn("No navigation buttons found");
    return;
  }

  buttons.forEach(btn => {
    const view = btn.dataset.view;
    if (!view) return;

    btn.addEventListener("click", () => {
      if (APP.view === view) return; // لا إعادة تحميل
      navigate(view);
    });
  });
}

/* ========= INITIAL VIEW ========= */
function initRouter() {
  // تأكيد أن view الافتراضي موجود
  const initial = VIEWS.includes(APP.view)
    ? APP.view
    : VIEWS[0];

  navigate(initial);
}

/* ========= SAFETY GUARD ========= */
/*
  منع أي تنقّل قبل جاهزية التطبيق
*/
document.addEventListener("DOMContentLoaded", () => {
  if (!APP.ready) {
    log.warn("Router initialized before APP ready");
  }
});
/* =========================================================
   PART 3 — WALLET / CONNECTIONS / BALANCE (FINAL)
========================================================= */

/* ========= WALLET STATE ========= */
const WALLET = Object.seal({
  connected: false,
  address: null,
  network: null,

  balances: {
    BX: 0,
    USDT: 0,
    TON: 0,
    BNB: 0,
    SOL: 0
  }
});

/* ========= WALLET DOM MAP ========= */
const WALLET_DOM = Object.freeze({
  BX: "bal-bx",
  USDT: "bal-usdt",
  TON: "bal-ton",
  BNB: "bal-bnb",
  SOL: "bal-sol",
  ADDRESS: "walletAddress",
  STATUS: "walletStatus"
});

/* ========= CONNECTION STATUS ========= */
function setWalletStatus(connected) {
  WALLET.connected = connected === true;

  const statusEl = $(WALLET_DOM.STATUS);
  if (statusEl) {
    statusEl.textContent = WALLET.connected
      ? "Connected"
      : "Not Connected";
    statusEl.classList.toggle("online", WALLET.connected);
    statusEl.classList.toggle("offline", !WALLET.connected);
  }
}

/* ========= RENDER WALLET ========= */
function renderWallet() {
  Object.entries(WALLET.balances).forEach(([sym, val]) => {
    const el = $(WALLET_DOM[sym]);
    if (!el) return;
    el.textContent = Number(val).toFixed(4);
  });

  const addrEl = $(WALLET_DOM.ADDRESS);
  if (addrEl) {
    addrEl.textContent = WALLET.address
      ? WALLET.address.slice(0, 6) + "..." + WALLET.address.slice(-4)
      : "--";
  }
}

/* ========= LOAD BALANCE (SAFE) ========= */
async function loadWalletBalance() {
  if (!USER.authenticated) {
    log.warn("Balance load skipped (not authenticated)");
    return;
  }

  const data = await safeFetch("/wallet/balance");
  if (!data) return;

  Object.keys(WALLET.balances).forEach(sym => {
    if (typeof data[sym] === "number") {
      WALLET.balances[sym] = data[sym];
    }
  });

  renderWallet();
  log.info("Wallet balance updated");
}

/* ========= CONNECT WALLET (ABSTRACT) ========= */
/*
  هذا مجرد Bridge
  التنفيذ الحقيقي (TON / Binance / etc)
  يتم حقنه لاحقًا بدون كسر هذا الجزء
*/
async function connectWallet(provider) {
  log.info("Connecting wallet:", provider);

  // Placeholder آمن
  WALLET.connected = true;
  WALLET.address = "0xFAKE...ADDR";
  WALLET.network = provider || "unknown";

  setWalletStatus(true);
  renderWallet();

  document.dispatchEvent(
    new CustomEvent("wallet:connected", {
      detail: {
        provider: WALLET.network,
        address: WALLET.address
      }
    })
  );
}

/* ========= DISCONNECT ========= */
function disconnectWallet() {
  WALLET.connected = false;
  WALLET.address = null;
  WALLET.network = null;

  setWalletStatus(false);
  renderWallet();

  document.dispatchEvent(
    new CustomEvent("wallet:disconnected")
  );
}

/* ========= WALLET GUARDS ========= */
function requireWallet() {
  if (!WALLET.connected) {
    alert("Please connect your wallet first");
    return false;
  }
  return true;
}

/* ========= AUTO LOAD ON VIEW ========= */
document.addEventListener("view:change", (e) => {
  if (e.detail === "wallet") {
    renderWallet();
    if (USER.authenticated) {
      loadWalletBalance();
    }
  }
});
