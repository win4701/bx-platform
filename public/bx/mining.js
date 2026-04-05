/* =========================================================
   BLOXIO — MINING.JS REAL UNIFIED MULTI-COIN FINAL
   Compatible with current index.html / wallet.js / balance.js
========================================================= */

(() => {
  'use strict';

  if (window.BX_MINING_BOOTED) {
    console.warn('[Mining] Already booted — skipping duplicate init');
    return;
  }
  window.BX_MINING_BOOTED = true;

  if (!window.BX_BALANCE) {
    console.error('[Mining] BX_BALANCE not found. Load bx/balance.js first.');
    return;
  }

  const APP = window.BX_APP || (window.BX_APP = {});
  const MINING = APP.mining || (APP.mining = {});

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = 'bx:mining:multi:v3';
  const ALLOWED_COINS = ['BX', 'BNB', 'SOL'];

  const now = () => Date.now();
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const ASSET_META = {
    BX:  { decimals: 2, usd: 1.00,  name: 'Bloxio' },
    BNB: { decimals: 6, usd: 620,   name: 'BNB' },
    SOL: { decimals: 6, usd: 180,   name: 'Solana' }
  };

  const fmt = (value, asset = 'BX') => {
    const decimals = ASSET_META[asset]?.decimals ?? 4;
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals > 4 ? 6 : decimals
    });
  };

  const fmtPct = (value) => `${Number(value || 0).toFixed(2)}%`;

  function playClick() {
    try {
      const snd = document.getElementById('snd-click');
      if (!snd || document.body.dataset.sound === 'off') return;
      snd.currentTime = 0;
      snd.play().catch(() => {});
    } catch (_) {}
  }

  function showToast(msg, type = 'info') {
    const el = document.getElementById('miningToast');
    if (!el) return;

    el.textContent = msg;
    el.classList.remove('hidden', 'success', 'error', 'info');
    el.classList.add(type);

    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 2400);
  }

  function setStatus(text, type = 'info', autoHide = true) {
    const el = document.getElementById('miningStatus');
    if (!el) return;

    el.textContent = text;
    el.classList.remove('hidden', 'success', 'error', 'info');
    el.classList.add(type);

    clearTimeout(el._hideTimer);
    if (autoHide) {
      el._hideTimer = setTimeout(() => {
        el.classList.add('hidden');
      }, 2600);
    } else {
      el.classList.remove('hidden');
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* =========================================================
     MINING PLANS
     السعر هنا = نسبة من العملة المختارة
  ========================================================= */
  const PLAN_LIBRARY = [
    {
      id: 'starter',
      name: 'Starter Node',
      hashRate: '18 GH/s',
      minAmount: { BX: 100, BNB: 0.05, SOL: 0.15 },
      dailyRate: 1.20,
      durationDays: 10,
      boost: 1.00
    },
    {
      id: 'pro',
      name: 'Pro Node',
      hashRate: '90 GH/s',
      minAmount: { BX: 500, BNB: 0.25, SOL: 0.75 },
      dailyRate: 1.75,
      durationDays: 20,
      boost: 1.12
    },
    {
      id: 'elite',
      name: 'Elite Node',
      hashRate: '240 GH/s',
      minAmount: { BX: 1200, BNB: 0.75, SOL: 2.25 },
      dailyRate: 2.15,
      durationDays: 30,
      boost: 1.28
    },
    {
      id: 'ultra',
      name: 'Ultra Node',
      hashRate: '540 GH/s',
      minAmount: { BX: 3000, BNB: 1.80, SOL: 5.40 },
      dailyRate: 2.80,
      durationDays: 45,
      boost: 1.45
    }
  ];

  /* =========================================================
     STATE
  ========================================================= */
  const defaultState = {
    selectedCoin: 'BX',
    selectedPlanId: null,

    activePlanId: null,
    activeCoin: 'BX',
    subscriptionAmount: 0,

    activeSince: null,
    expiresAt: null,
    lastClaimAt: null,

    pendingReward: 0,
    totalClaimed: 0,
    autoCompound: false
  };

  const state = {
    ...defaultState,
    ...loadState()
  };

  /* =========================================================
     DOM
  ========================================================= */
  const dom = {
    root: null,
    grid: null,

    topActiveCoin: null,
    topAvailableBalance: null,
    topDailyYield: null,
    topCycle: null,

    tabs: [],
    subscribePanel: null,

    selectedPlanTitle: null,
    selectedPlanMeta: null,
    availableBalance: null,
    amountInput: null,
    summary: null,
    confirmBtn: null,

    activePanel: null,
    activeName: null,
    activeHash: null,
    activeDaily: null,
    progressFill: null,
    progressText: null,
    pendingReward: null,
    totalClaimed: null,
    claimBtn: null,
    compoundBtn: null
  };

  function mapDom() {
    dom.root = document.getElementById('mining');
    if (!dom.root) return false;

    dom.grid = document.getElementById('miningGrid');

    dom.topActiveCoin = document.getElementById('miningActiveCoin');
    dom.topAvailableBalance = document.getElementById('miningAvailableBalanceTop');
    dom.topDailyYield = document.getElementById('miningDailyYieldTop');
    dom.topCycle = document.getElementById('miningCycleTop');

    dom.tabs = $$('[data-coin]', dom.root);
    dom.subscribePanel = document.getElementById('miningSubscribePanel');

    dom.selectedPlanTitle = document.getElementById('miningSelectedPlanTitle');
    dom.selectedPlanMeta = document.getElementById('miningSelectedPlanMeta');
    dom.availableBalance = document.getElementById('miningAvailableBalance');
    dom.amountInput = document.getElementById('miningAmountInput');
    dom.summary = document.getElementById('miningSubSummary');
    dom.confirmBtn = document.getElementById('confirmMiningSubscribeBtn');

    dom.activePanel = document.getElementById('miningActivePanel');
    dom.activeName = document.getElementById('miningActiveName');
    dom.activeHash = document.getElementById('miningActiveHash');
    dom.activeDaily = document.getElementById('miningActiveDaily');
    dom.progressFill = document.getElementById('miningProgressFill');
    dom.progressText = document.getElementById('miningProgressText');
    dom.pendingReward = document.getElementById('miningPendingReward');
    dom.totalClaimed = document.getElementById('miningTotalClaimed');
    dom.claimBtn = document.getElementById('claimMiningRewardBtn');
    dom.compoundBtn = document.getElementById('toggleAutoCompoundBtn');

    return true;
  }

  /* =========================================================
     CORE
  ========================================================= */
  function getSelectedPlan() {
    return PLAN_LIBRARY.find(p => p.id === state.selectedPlanId) || null;
  }

  function getActivePlan() {
    return PLAN_LIBRARY.find(p => p.id === state.activePlanId) || null;
  }

  function hasActivePlan() {
    return !!state.activePlanId && !!state.expiresAt && now() < state.expiresAt;
  }

  function getDurationMs(plan) {
    return (plan?.durationDays || 0) * 24 * 60 * 60 * 1000;
  }

  function getProgress(plan) {
    if (!plan || !state.activeSince || !state.expiresAt) return 0;
    const total = getDurationMs(plan);
    const elapsed = Math.max(0, now() - state.activeSince);
    return clamp((elapsed / total) * 100, 0, 100);
  }

  function computePendingReward() {
    const plan = getActivePlan();
    if (!plan || !hasActivePlan()) return 0;

    const last = state.lastClaimAt || state.activeSince || now();
    const elapsedHours = Math.max(0, (now() - last) / (1000 * 60 * 60));

    const principal = Number(state.subscriptionAmount || 0);
    const dailyPct = plan.dailyRate / 100;
    const dailyReward = principal * dailyPct * plan.boost;
    const hourlyReward = dailyReward / 24;

    return hourlyReward * elapsedHours;
  }

  function syncPendingReward() {
    state.pendingReward = computePendingReward();
    saveState();
  }

  function getAvailable(asset = state.selectedCoin) {
    return Number(BX_BALANCE.get(asset) || 0);
  }

  function getMinAmountForPlan(plan, coin) {
    return Number(plan?.minAmount?.[coin] || 0);
  }

  /* =========================================================
     RENDER TOP
  ========================================================= */
  function renderTopOverview() {
    const coin = state.selectedCoin;
    const selectedPlan = getSelectedPlan();

    if (dom.topActiveCoin) {
      dom.topActiveCoin.textContent = coin;
    }

    if (dom.topAvailableBalance) {
      dom.topAvailableBalance.textContent = `${fmt(getAvailable(coin), coin)} ${coin}`;
    }

    if (dom.topDailyYield) {
      dom.topDailyYield.textContent = selectedPlan
        ? `+${fmtPct(selectedPlan.dailyRate)}`
        : '+0.00%';
    }

    if (dom.topCycle) {
      dom.topCycle.textContent = selectedPlan
        ? `${selectedPlan.durationDays} Days`
        : '—';
    }
  }

  /* =========================================================
     RENDER TABS
  ========================================================= */
  function renderCoinTabs() {
    dom.tabs.forEach(btn => {
      const active = btn.dataset.coin === state.selectedCoin;
      btn.classList.toggle('active', active);
    });
  }

  /* =========================================================
     RENDER PLANS
  ========================================================= */
  function renderMiningPlans() {
    if (!dom.grid) return;

    const coin = state.selectedCoin;

    dom.grid.innerHTML = PLAN_LIBRARY.map(plan => {
      const minAmount = getMinAmountForPlan(plan, coin);
      const active = hasActivePlan() && state.activePlanId === plan.id && state.activeCoin === coin;

      return `
        <div class="mining-card ${active ? 'is-active' : ''}">
          <div class="mining-card-head">
            <div>
              <h3>${plan.name}</h3>
              <p>${plan.hashRate}</p>
            </div>
            <span class="mining-badge">${coin}</span>
          </div>

          <div class="mining-price">${fmt(minAmount, coin)} ${coin}</div>

          <div class="mining-meta-grid">
            <div><span>Daily</span><strong>${fmtPct(plan.dailyRate)}</strong></div>
            <div><span>Boost</span><strong>${plan.boost.toFixed(2)}x</strong></div>
            <div><span>Cycle</span><strong>${plan.durationDays}D</strong></div>
          </div>

          <button class="btn primary mining-select-btn"
                  type="button"
                  data-plan="${plan.id}">
            ${active ? 'Active' : 'Select Plan'}
          </button>
        </div>
      `;
    }).join('');

    bindPlanButtons();
  }

  /* =========================================================
     PANEL
  ========================================================= */
  function openSubscribePanel() {
    if (dom.subscribePanel) {
      dom.subscribePanel.classList.remove('mining-hidden');
    }
  }

  function closeSubscribePanel() {
    if (dom.subscribePanel) {
      dom.subscribePanel.classList.add('mining-hidden');
    }
  }

  function renderSubscribePanel() {
    const plan = getSelectedPlan();
    const coin = state.selectedCoin;
    const available = getAvailable(coin);

    if (dom.availableBalance) {
      dom.availableBalance.textContent = `${fmt(available, coin)} ${coin}`;
    }

    if (!plan) {
      if (dom.selectedPlanTitle) dom.selectedPlanTitle.textContent = 'Mining Subscription';
      if (dom.selectedPlanMeta) dom.selectedPlanMeta.textContent = 'Select a plan to continue';
      if (dom.summary) dom.summary.textContent = 'Choose amount to profit.';
      return;
    }

    const minAmount = getMinAmountForPlan(plan, coin);

    if (dom.selectedPlanTitle) {
      dom.selectedPlanTitle.textContent = `${plan.name} — ${coin}`;
    }

    if (dom.selectedPlanMeta) {
      dom.selectedPlanMeta.textContent =
        `${plan.hashRate} • ${fmtPct(plan.dailyRate)} daily • ${plan.durationDays} days • Min ${fmt(minAmount, coin)} ${coin}`;
    }

    updateSubscribeSummary();
  }

  function updateSubscribeSummary() {
    const plan = getSelectedPlan();
    const coin = state.selectedCoin;
    const amount = Number(dom.amountInput?.value || 0);

    if (!plan) {
      if (dom.summary) dom.summary.textContent = 'Choose amount to profit.';
      return;
    }

    if (!amount || amount <= 0) {
      if (dom.summary) {
        dom.summary.textContent =
          `Min required: ${fmt(getMinAmountForPlan(plan, coin), coin)} ${coin}`;
      }
      return;
    }

    const estimatedDaily = amount * (plan.dailyRate / 100) * plan.boost;
    const estimatedCycle = estimatedDaily * plan.durationDays;

    if (dom.summary) {
      dom.summary.innerHTML = `
        <strong>Estimated Daily:</strong> ${fmt(estimatedDaily, coin)} ${coin}
        <br>
        <strong>Estimated Cycle Reward:</strong> ${fmt(estimatedCycle, coin)} ${coin}
      `;
    }
  }

  /* =========================================================
     ACTIVE PANEL
  ========================================================= */
  function renderActivePanel() {
    const plan = getActivePlan();
    const active = hasActivePlan();

    if (!dom.activePanel) return;

    if (!active || !plan) {
      dom.activePanel.classList.add('mining-hidden');
      return;
    }

    dom.activePanel.classList.remove('mining-hidden');

    const coin = state.activeCoin;
    const progress = getProgress(plan);

    if (dom.activeName) {
      dom.activeName.textContent = `${plan.name} (${coin})`;
    }

    if (dom.activeHash) {
      dom.activeHash.textContent = `${plan.hashRate} • ${fmt(state.subscriptionAmount, coin)} ${coin}`;
    }

    if (dom.activeDaily) {
      dom.activeDaily.textContent = `${fmtPct(plan.dailyRate)} / day`;
    }

    if (dom.progressFill) {
      dom.progressFill.style.width = `${progress}%`;
    }

    if (dom.progressText) {
      dom.progressText.textContent = `${progress.toFixed(1)}%`;
    }

    if (dom.pendingReward) {
      dom.pendingReward.textContent = `${fmt(state.pendingReward, coin)} ${coin}`;
    }

    if (dom.totalClaimed) {
      dom.totalClaimed.textContent = `${fmt(state.totalClaimed, coin)} ${coin}`;
    }

    if (dom.claimBtn) {
      dom.claimBtn.textContent = `Claim ${coin}`;
      dom.claimBtn.disabled = state.pendingReward <= 0.0000001;
    }

    if (dom.compoundBtn) {
      dom.compoundBtn.textContent = state.autoCompound ? 'Auto Compound: ON' : 'Auto Compound: OFF';
      dom.compoundBtn.classList.toggle('is-active', state.autoCompound);
    }
  }

  /* =========================================================
     ACTIONS
  ========================================================= */
  function selectCoin(coin) {
    if (!ALLOWED_COINS.includes(coin)) return;
    state.selectedCoin = coin;
    saveState();

    renderCoinTabs();
    renderTopOverview();
    renderMiningPlans();
    renderSubscribePanel();
  }

  function selectPlan(planId) {
    state.selectedPlanId = planId;
    saveState();

    renderTopOverview();
    renderSubscribePanel();
    openSubscribePanel();
  }

  function subscribeToPlan() {
    const plan = getSelectedPlan();
    const coin = state.selectedCoin;

    if (!plan) {
      setStatus('Select a mining plan first', 'error');
      return;
    }

    if (hasActivePlan()) {
      setStatus(`You already have an active ${state.activeCoin} plan`, 'error');
      return;
    }

    const amount = Number(dom.amountInput?.value || 0);
    const minRequired = getMinAmountForPlan(plan, coin);

    if (!amount || amount <= 0) {
      setStatus('Enter a valid subscription amount', 'error');
      return;
    }

    if (amount < minRequired) {
      setStatus(`Minimum for this plan is ${fmt(minRequired, coin)} ${coin}`, 'error');
      return;
    }

    if (!BX_BALANCE.canAfford(coin, amount)) {
      setStatus(`Insufficient ${coin} balance`, 'error');
      return;
    }

    BX_BALANCE.sub(coin, amount);

    const start = now();
    state.activePlanId = plan.id;
    state.activeCoin = coin;
    state.subscriptionAmount = amount;
    state.activeSince = start;
    state.expiresAt = start + getDurationMs(plan);
    state.lastClaimAt = start;
    state.pendingReward = 0;
    state.totalClaimed = 0;

    saveState();

    if (dom.amountInput) dom.amountInput.value = '';

    renderTopOverview();
    renderMiningPlans();
    renderSubscribePanel();
    renderActivePanel();
    closeSubscribePanel();

    setStatus(`${plan.name} activated with ${fmt(amount, coin)} ${coin}`, 'success');
    showToast(`Mining started in ${coin}`, 'success');
  }

  function claimReward() {
    const plan = getActivePlan();

    if (!plan || !hasActivePlan()) {
      setStatus('No active mining plan', 'error');
      return;
    }

    syncPendingReward();

    const reward = Number(state.pendingReward || 0);
    const coin = state.activeCoin;

    if (reward <= 0.0000001) {
      setStatus('No reward available yet', 'info');
      return;
    }

    BX_BALANCE.add(coin, reward);

    state.totalClaimed += reward;
    state.pendingReward = 0;
    state.lastClaimAt = now();

    saveState();
    renderActivePanel();
    renderTopOverview();
    renderSubscribePanel();

    setStatus(`Claimed ${fmt(reward, coin)} ${coin}`, 'success');
    showToast(`Reward added to wallet`, 'success');
  }

  function toggleAutoCompound() {
    state.autoCompound = !state.autoCompound;
    saveState();
    renderActivePanel();

    showToast(
      state.autoCompound ? 'Auto Compound enabled' : 'Auto Compound disabled',
      'info'
    );
  }

  function applyQuickPercent(percent) {
    const coin = state.selectedCoin;
    const available = getAvailable(coin);
    const amount = available * (percent / 100);

    if (dom.amountInput) {
      dom.amountInput.value = amount.toFixed(coin === 'BX' ? 2 : 6);
    }

    updateSubscribeSummary();
  }

  function expirePlanIfNeeded() {
    if (!state.activePlanId || !state.expiresAt) return;
    if (now() < state.expiresAt) return;

    syncPendingReward();

    const coin = state.activeCoin;
    const finalReward = Number(state.pendingReward || 0);

    if (finalReward > 0) {
      BX_BALANCE.add(coin, finalReward);
      state.totalClaimed += finalReward;
    }

    const finishedPlan = state.activePlanId;

    state.activePlanId = null;
    state.subscriptionAmount = 0;
    state.activeSince = null;
    state.expiresAt = null;
    state.lastClaimAt = null;
    state.pendingReward = 0;

    saveState();

    renderMiningPlans();
    renderActivePanel();
    renderTopOverview();
    renderSubscribePanel();

    setStatus(`Plan ${finishedPlan} completed`, 'success');
    showToast(`Mining cycle finished`, 'success');
  }

  function autoCompoundTick() {
    if (!state.autoCompound || !hasActivePlan()) return;

    syncPendingReward();

    const reward = Number(state.pendingReward || 0);
    if (reward <= 0.0000001) return;

    state.subscriptionAmount += reward;
    state.totalClaimed += reward;
    state.pendingReward = 0;
    state.lastClaimAt = now();

    saveState();
    renderActivePanel();
    renderSubscribePanel();
  }

  /* =========================================================
     BINDINGS
  ========================================================= */
  function bindPlanButtons() {
    $$('[data-plan]', dom.grid).forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        selectPlan(btn.dataset.plan);
      });
    });
  }

  function bindCoinTabs() {
    dom.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        selectCoin(btn.dataset.coin);
      });
    });
  }

  function bindOpenClose() {
    $$('[data-mining-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        openSubscribePanel();
      });
    });

    $$('[data-mining-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        closeSubscribePanel();
      });
    });
  }

  function bindQuickPercent() {
    $$('[data-mining-percent]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        applyQuickPercent(Number(btn.dataset.miningPercent || 0));
      });
    });
  }

  function bindControls() {
    dom.amountInput?.addEventListener('input', updateSubscribeSummary);

    dom.confirmBtn?.addEventListener('click', () => {
      playClick();
      subscribeToPlan();
    });

    dom.claimBtn?.addEventListener('click', () => {
      playClick();
      claimReward();
    });

    dom.compoundBtn?.addEventListener('click', () => {
      playClick();
      toggleAutoCompound();
    });
  }

  function bindBalanceSync() {
    BX_BALANCE.subscribe(() => {
      renderTopOverview();
      renderSubscribePanel();
      renderActivePanel();
    });
  }

  function bindViewHooks() {
    document.addEventListener('bloxio:viewchange', (e) => {
      if (e.detail?.view === 'mining') {
        renderTopOverview();
        renderCoinTabs();
        renderMiningPlans();
        renderSubscribePanel();
        renderActivePanel();
      }
    });
  }

  /* =========================================================
     LOOP
  ========================================================= */
  let loop = null;

  function startLoop() {
    clearInterval(loop);

    loop = setInterval(() => {
      expirePlanIfNeeded();
      syncPendingReward();
      autoCompoundTick();
      renderActivePanel();
      renderTopOverview();
    }, 4000);
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */
  MINING.renderMiningPlans = renderMiningPlans;
  MINING.renderMiningUI = () => {
    renderTopOverview();
    renderCoinTabs();
    renderMiningPlans();
    renderSubscribePanel();
    renderActivePanel();
  };

  window.renderMiningPlans = renderMiningPlans;
  window.renderMiningUI = MINING.renderMiningUI;

  // demo helpers
  window.miningDemoBNB = () => BX_BALANCE.add('BNB', 1);
  window.miningDemoSOL = () => BX_BALANCE.add('SOL', 5);
  window.miningDemoBX = () => BX_BALANCE.add('BX', 1000);

  /* =========================================================
     BOOT
  ========================================================= */
  function boot() {
    if (!mapDom()) return;

    bindCoinTabs();
    bindOpenClose();
    bindQuickPercent();
    bindControls();
    bindBalanceSync();
    bindViewHooks();

    MINING.renderMiningUI();
    startLoop();

    console.log('[Bloxio] mining.js REAL multi-coin loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
