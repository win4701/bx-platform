/* =========================
   GLOBAL STATE
========================= */
const state = {
  activeSection: "wallet",
  hasTraded: false,
  balances: {
    BX: 0,
    USDT: 0,
    TON: 0,
    SOL: 0,
    BTC: 0,
  },
  pair: "BX/USDT",
};

/* =========================
   HELPERS
========================= */
const $ = (id) => document.getElementById(id);
const $$ = (q) => document.querySelectorAll(q);

function haptic(type = "light") {
  if (navigator.vibrate) {
    navigator.vibrate(type === "heavy" ? 40 : 15);
  }
}

/* =========================
   NAVIGATION
========================= */
function showSection(name) {
  state.activeSection = name;

  $$(".section").forEach((s) => (s.style.display = "none"));
  $(`section-${name}`).style.display = "block";

  $$(".nav-item").forEach((n) => n.classList.remove("active"));
  $(`nav-${name}`).classList.add("active");

  haptic();
}

/* =========================
   INIT
========================= */
function init() {
  // Hide all sections except wallet
  $$(".section").forEach((s) => (s.style.display = "none"));
  $("section-wallet").style.display = "block";

  // Casino lock
  updateCasinoLock();

  // Nav buttons
  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      showSection(item.dataset.section);
    });
  });

  // Market
  $("pairSelect").addEventListener("change", (e) => {
    state.pair = e.target.value;
    updateTooltip();
  });

  $("btnBuy").addEventListener("click", () => trade("buy"));
  $("btnSell").addEventListener("click", () => trade("sell"));

  // Casino games (UI only)
  $$(".game-card").forEach((game) => {
    game.addEventListener("click", () => {
      if (!state.hasTraded) {
        showTooltip("Get BX in Market to play 🎯");
        highlightMarket();
        return;
      }
      haptic("heavy");
      showTooltip("Game opened (UI demo)");
    });
  });
}

/* =========================
   MARKET LOGIC
========================= */
function trade(type) {
  const amount = parseFloat($("amountInput").value);
  if (!amount || amount <= 0) {
    showTooltip("Enter amount");
    return;
  }

  state.hasTraded = true;
  state.balances.BX += type === "buy" ? amount : -amount;
  updateBalances();
  updateCasinoLock();

  haptic("heavy");
  showTooltip("Trade successful ✅");
}

/* =========================
   WALLET
========================= */
function updateBalances() {
  Object.keys(state.balances).forEach((k) => {
    const el = $(`bal-${k}`);
    if (el) el.textContent = state.balances[k].toFixed(2);
  });
}

/* =========================
   CASINO LOCK
========================= */
function updateCasinoLock() {
  const casino = $("section-casino");
  if (!state.hasTraded) {
    casino.classList.add("casino-locked");
  } else {
    casino.classList.remove("casino-locked");
  }
}

/* =========================
   TOOLTIP SYSTEM
========================= */
let tooltipTimeout = null;

function showTooltip(text) {
  let tip = $("tooltip");
  if (!tip) return;

  tip.textContent = text;
  tip.classList.add("show");

  clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => {
    tip.classList.remove("show");
  }, 2200);
}

function updateTooltip() {
  showTooltip(`Trading ${state.pair}`);
}

/* =========================
   HIGHLIGHT MARKET
========================= */
function highlightMarket() {
  showSection("market");
  $("btnBuy").classList.add("pulse");
  setTimeout(() => $("btnBuy").classList.remove("pulse"), 1600);
}

/* =========================
   DOM READY
========================= */
document.addEventListener("DOMContentLoaded", init);
