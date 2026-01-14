/* ===============================
   GLOBAL STATE (UI ONLY)
================================ */
const state = {
  activePage: 'wallet',
  hasTraded: false,
  wallet: {
    BX: 0,
    USDT: 0,
    TON: 0,
    SOL: 0,
    BTC: 0
  },
  currentPair: 'BX/USDT'
};

/* ===============================
   SAFE DOM HELPERS
================================ */
const $ = (id) => document.getElementById(id);
const $$ = (q) => document.querySelectorAll(q);

/* ===============================
   PAGE NAVIGATION
================================ */
function switchPage(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $(page);
  if (target) {
    target.classList.add('active');
    state.activePage = page;
  }
}

/* bind bottom nav */
$$('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.nav;
    switchPage(page);
    highlightNav(btn);
  });
});

function highlightNav(activeBtn) {
  $$('[data-nav]').forEach(b => b.classList.remove('nav-active'));
  activeBtn.classList.add('nav-active');
}

/* ===============================
   MARKET (TRADE)
================================ */
function initMarket() {
  const pairSelect = $('pairSelect');
  if (!pairSelect) return;

  pairSelect.addEventListener('change', () => {
    state.currentPair = pairSelect.value;
    updateTooltip();
  });

  $('buyBtn')?.addEventListener('click', () => executeTrade('buy'));
  $('sellBtn')?.addEventListener('click', () => executeTrade('sell'));
}

function executeTrade(type) {
  // UI simulation only
  state.hasTraded = true;

  // unlock casino
  unlockCasino();

  // haptic feedback (mobile)
  if (navigator.vibrate) navigator.vibrate(type === 'buy' ? 30 : 15);

  showToast(`Trade successful (${type.toUpperCase()})`);
}

/* ===============================
   CASINO (LOCKED UNTIL TRADE)
================================ */
function unlockCasino() {
  const casino = $('casino');
  if (!casino) return;

  casino.classList.remove('locked');
}

function initCasino() {
  $$('.bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.hasTraded) {
        showTooltip(btn, 'Get BX in Market');
        highlightMarket();
        return;
      }

      if (state.wallet.BX <= 0) {
        showTooltip(btn, 'No BX balance');
        return;
      }

      // play allowed (UI only)
      showToast('Game started');
    });
  });
}

/* ===============================
   WALLET (UI ONLY)
================================ */
function initWallet() {
  Object.keys(state.wallet).forEach(sym => {
    const el = $(`bal-${sym}`);
    if (el) el.textContent = state.wallet[sym];
  });
}

/* ===============================
   TOOLTIP / TOAST
================================ */
function showTooltip(el, text) {
  let tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.innerHTML = `<span>${text}</span><div class="caret"></div>`;
  el.appendChild(tip);

  setTimeout(() => tip.remove(), 2000);
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 1800);
}

/* ===============================
   MARKET HIGHLIGHT (GUIDANCE)
================================ */
function highlightMarket() {
  const btn = document.querySelector('[data-nav="market"]');
  if (!btn) return;

  btn.classList.add('pulse');
  if (navigator.vibrate) navigator.vibrate([10, 40, 10]);

  setTimeout(() => btn.classList.remove('pulse'), 1500);
}

function updateTooltip() {
  // can be extended per pair (BX/USDT, BX/BTC…)
}

/* ===============================
   INIT (SAFE BOOT)
================================ */
document.addEventListener('DOMContentLoaded', () => {
  try { initWallet(); } catch (e) {}
  try { initMarket(); } catch (e) {}
  try { initCasino(); } catch (e) {}

  switchPage('wallet'); // default
});
