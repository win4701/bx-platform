/* =========================
   STATE
========================= */
const state = {
  activePage: 'wallet',
  traded: false,
  balanceBX: 0,
  pair: 'BX/USDT'
};

/* =========================
   NAVIGATION
========================= */
document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.nav;

    if (target === 'casino' && !state.traded) {
      showTooltip(
        btn,
        '🔒 Casino locked. Get BX from Market first'
      );
      highlightMarket();
      haptic('light');
      return;
    }

    switchPage(target);
  });
});

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  document.getElementById(page).classList.add('active');
  state.activePage = page;
}

/* =========================
   MARKET
========================= */
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const amountInput = document.getElementById('amount');

buyBtn?.addEventListener('click', () => {
  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) {
    showTooltip(buyBtn, 'Enter amount');
    return;
  }

  state.balanceBX += amount;
  state.traded = true;

  updateWallet();
  unlockCasinoVisual();
  haptic('success');
});

sellBtn?.addEventListener('click', () => {
  showTooltip(sellBtn, 'Sell disabled (UI only)');
});

/* =========================
   WALLET
========================= */
function updateWallet() {
  const bxEl = document.getElementById('bxBalance');
  if (bxEl) bxEl.textContent = state.balanceBX.toFixed(2);
}

/* =========================
   CASINO LOCK VISUAL
========================= */
function unlockCasinoVisual() {
  const lock = document.querySelector('.casino-lock');
  if (lock) lock.classList.add('hidden');
}

/* =========================
   TOOLTIP
========================= */
let tooltip;
function showTooltip(target, text) {
  if (tooltip) tooltip.remove();

  tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = text;

  document.body.appendChild(tooltip);

  const rect = target.getBoundingClientRect();
  tooltip.style.left = rect.left + rect.width / 2 + 'px';
  tooltip.style.top = rect.top - 10 + 'px';

  setTimeout(() => tooltip.remove(), 2000);
}

/* =========================
   MARKET HIGHLIGHT
========================= */
function highlightMarket() {
  const marketBtn = document.querySelector('[data-nav="market"]');
  if (!marketBtn) return;

  marketBtn.classList.add('pulse');
  setTimeout(() => marketBtn.classList.remove('pulse'), 1500);
}

/* =========================
   HAPTIC
========================= */
function haptic(type) {
  if (!navigator.vibrate) return;

  if (type === 'success') navigator.vibrate([20, 30, 20]);
  else navigator.vibrate(10);
}

/* =========================
   INIT
========================= */
switchPage('wallet');
updateWallet();
