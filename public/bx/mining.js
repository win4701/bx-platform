/* =========================================================
   BLOXIO — MINING.JS CLEAN REBIND FINAL
   6 Plans per coin • BX / BNB / SOL
   Fully aligned with Mining CSS MASTER
========================================================= */

(() => {
  'use strict';

  if (window.BX_MINING_BOOTED) {
    console.warn('[Mining] Already initialized');
    return;
  }
  window.BX_MINING_BOOTED = true;

  if (!window.BX_BALANCE) {
    console.error('[Mining] BX_BALANCE missing. Load balance.js first.');
    return;
  }

  /* =========================================================
     APP
  ========================================================= */
  const APP = window.BX_APP || (window.BX_APP = {});
  const MINING = APP.mining || (APP.mining = {});

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const now = () => Date.now();
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const STORAGE_KEY = 'bx:mining:clean:final:v6';
  const ALLOWED_COINS = ['BX', 'BNB', 'SOL'];

  const ASSET_META = {
    BX:  { decimals: 2,  usd: 45,  name: 'Bloxio' },
    BNB: { decimals: 6,  usd: 620,   name: 'BNB' },
    SOL: { decimals: 6,  usd: 180,   name: 'Solana' }
  };

  const COIN_ICONS = {
    BX: 'assets/images/bx.png',
    BNB: 'assets/images/bnb.png',
    SOL: 'assets/images/sol.png'
  };

  const fmt = (value, asset = 'BX') => {
    const decimals = ASSET_META[asset]?.decimals ?? 4;
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals > 4 ? 6 : decimals
    });
  };

  const fmtPct = (n) => `${Number(n || 0).toFixed(2)}%`;

  const fmtDate = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '—';
    }
  };

  function playClick() {
    try {
      const snd = $('snd-click');
      if (!snd || document.body.dataset.sound === 'off') return;
      snd.currentTime = 0;
      snd.play().catch(() => {});
    } catch (_) {}
  }

  function showToast(message, type = 'info') {
    const el = $('miningToast');
    if (!el) return;
    el.textContent = message;
    el.className = `mining-toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  function setStatus(message, type = 'info', sticky = false) {
    const el = $('miningStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `mining-status ${type}`;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    if (!sticky) {
      el._t = setTimeout(() => el.classList.add('hidden'), 2600);
    }
  }

  function clearStatus() {
    const el = $('miningStatus');
    if (!el) return;
    el.classList.add('hidden');
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* =========================================================
     6 PLANS PER COIN
  ========================================================= */
  const PLANS = [
    {
      id: 'starter',
      name: 'Starter ',
      hash: '18 GH/s',
      daily: 1.20,
      days: 10,
      boost: 1.00,
      min: { BX: 75,  BNB: 0.1, SOL: 0.3 }
    },
    {
      id: 'basic',
      name: 'Basic ',
      hash: '42 GH/s',
      daily: 1.18,
      days: 21,
      boost: 1.00,
      min: { BX: 200,  BNB: 0.3, SOL: 0.7 }
    },
    {
      id: 'pro',
      name: 'Pro ',
      hash: '90 GH/s',
      daily: 1.55,
      days: 30,
      boost: 1.02,
      min: { BX: 500,  BNB: 1, SOL: 3 }
    },
    {
      id: 'elite',
      name: 'Elite ',
      hash: '240 GH/s',
      daily: 2.00,
      days: 45,
      boost: 1.08,
      min: { BX: 1200, BNB: 5, SOL: 12 }
    },
    {
      id: 'ultra',
      name: 'Ultra ',
      hash: '540 GH/s',
      daily: 2.15,
      days: 60,
      boost: 1.09,
      min: { BX: 2500, BNB: 15, SOL: 30 }
    },
    {
      id: 'legend',
      name: 'Legend ',
      hash: '1200 GH/s',
      daily: 2.45,
      days: 90,
      boost: 1.12,
      min: { BX: 4500, BNB: 50, SOL: 100 }
    }
  ];

  function getPlanVisual(plan) {
    const map = {
      starter: {
        badge: 'ENTRY',
        badgeClass: 'is-entry',
        subtitle: 'Perfect for first-time miners',
        highlight: 'Easy start'
      },
      basic: {
        badge: 'POPULAR',
        badgeClass: 'is-popular',
        subtitle: 'Balanced plan for steady growth',
        highlight: 'Best starter ROI'
      },
      pro: {
        badge: 'BOOST',
        badgeClass: 'is-boost',
        subtitle: 'More hash power, stronger returns',
        highlight: 'Mid-tier performance'
      },
      elite: {
        badge: 'PRO',
        badgeClass: 'is-pro',
        subtitle: 'Built for serious passive mining',
        highlight: 'Strong daily rewards'
      },
      ultra: {
        badge: 'HIGH ROI',
        badgeClass: 'is-ultra',
        subtitle: 'Premium mining with larger exposure',
        highlight: 'Advanced yield'
      },
      legend: {
        badge: 'WHALE',
        badgeClass: 'is-whale',
        subtitle: 'Maximum mining capacity',
        highlight: 'Top-tier mining'
      }
    };

    return map[plan.id] || {
      badge: 'PLAN',
      badgeClass: '',
      subtitle: 'Mining subscription',
      highlight: 'Flexible rewards'
    };
  }

  /* =========================================================
     STATE
  ========================================================= */
  const defaultState = {
    selectedCoin: 'BX',
    selectedPlanId: null,

    activePlanId: null,
    activeCoin: null,
    subscriptionAmount: 0,

    activeSince: null,
    expiresAt: null,
    lastClaimAt: null,

    pendingReward: 0,
    totalClaimed: 0,

    history: []
  };

  const state = {
    ...defaultState,
    ...loadState()
  };

  /* =========================================================
     CORE
  ========================================================= */
  function getSelectedPlan() {
    return PLANS.find(p => p.id === state.selectedPlanId) || null;
  }

  function getActivePlan() {
    return PLANS.find(p => p.id === state.activePlanId) || null;
  }

  function hasActivePlan() {
    return !!state.activePlanId && !!state.expiresAt && now() < state.expiresAt;
  }

  function getMinAmount(plan, coin = state.selectedCoin) {
    return Number(plan?.min?.[coin] || 0);
  }

  function getAvailable(asset = state.selectedCoin) {
    return Number(window.BX_BALANCE.get(asset) || 0);
  }

  function getDurationMs(plan) {
    return (plan?.days || 0) * 24 * 60 * 60 * 1000;
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
    const dailyPct = plan.daily / 100;
    const dailyReward = principal * dailyPct * plan.boost;
    const hourlyReward = dailyReward / 24;

    return hourlyReward * elapsedHours;
  }

  function syncPendingReward() {
    state.pendingReward = computePendingReward();
    saveState();
  }

  function expireIfNeeded() {
    if (!hasActivePlan() && state.activePlanId) {
      const plan = getActivePlan();
      const coin = state.activeCoin || 'BX';

      if (state.pendingReward > 0) {
        try {
          window.BX_BALANCE.add(coin, Number(state.pendingReward || 0));
          state.totalClaimed += Number(state.pendingReward || 0);
          state.pendingReward = 0;
        } catch (_) {}
      }

      state.history.unshift({
        id: cryptoRandom(),
        type: 'cycle_complete',
        plan: plan?.name || 'Mining Plan',
        coin,
        amount: Number(state.subscriptionAmount || 0),
        reward: Number(state.totalClaimed || 0),
        time: now()
      });

      state.activePlanId = null;
      state.activeCoin = null;
      state.subscriptionAmount = 0;
      state.activeSince = null;
      state.expiresAt = null;
      state.lastClaimAt = null;
      state.pendingReward = 0;
      state.totalClaimed = 0;

      saveState();
      showToast('Mining cycle completed', 'success');
    }
  }

  function cryptoRandom() {
    return Math.random().toString(36).slice(2, 10);
  }

  /* =========================================================
     DOM SAFE ENSURE
  ========================================================= */
  function ensureMiningDom() {
    const root = $('mining');
    if (!root) return false;

    /* ---------- TOP ---------- */
    let top = root.querySelector('.mining-top');
    if (!top) {
      top = document.createElement('div');
      top.className = 'mining-top';
      top.innerHTML = `
        <div class="mining-top-head">
          <div>
            <h2>Cloud Mining</h2>
            <p>Choose your asset, subscribe to a mining node, and earn passive rewards daily.</p>
          </div>
          <button id="miningRefreshBtn" class="btn" type="button">Refresh</button>
        </div>

        <div class="mining-overview-grid">
          <div class="mining-stat">
            <span>Active Coin</span>
            <strong id="miningActiveCoin">BX</strong>
          </div>
          <div class="mining-stat">
            <span>Available</span>
            <strong id="miningAvailableBalanceTop">0 BX</strong>
          </div>
          <div class="mining-stat">
            <span>Daily Yield</span>
            <strong id="miningDailyYieldTop">+0.00%</strong>
          </div>
          <div class="mining-stat">
            <span>Cycle</span>
            <strong id="miningCycleTop">—</strong>
          </div>
        </div>
      `;
      root.prepend(top);
    }

    /* ---------- TABS ---------- */
    let tabs = root.querySelector('.mining-tabs');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.className = 'mining-tabs';
      tabs.innerHTML = `
        <button type="button" data-coin="BX"><img src="${COIN_ICONS.BX}" alt="BX"><span>BX</span></button>
        <button type="button" data-coin="BNB"><img src="${COIN_ICONS.BNB}" alt="BNB"><span>BNB</span></button>
        <button type="button" data-coin="SOL"><img src="${COIN_ICONS.SOL}" alt="SOL"><span>SOL</span></button>
      `;
      top.insertAdjacentElement('afterend', tabs);
    }

    /* ---------- SHELL ---------- */
    let shell = root.querySelector('.mining-shell');
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'mining-shell';
      shell.innerHTML = `
        <div class="mining-main-col"></div>
        <div class="mining-side-col"></div>
      `;
      tabs.insertAdjacentElement('afterend', shell);
    }

    const mainCol = shell.querySelector('.mining-main-col');
    const sideCol = shell.querySelector('.mining-side-col');

    /* ---------- PLANS ---------- */
    if (!$('miningGrid')) {
      const plansWrap = document.createElement('div');
      plansWrap.className = 'mining-plans-wrap';
      plansWrap.innerHTML = `
        <div class="mining-plans-head">
          <div>
            <span class="mining-section-kicker">Mining Plans</span>
            <h3>Choose your node</h3>
          </div>
          <p>6 plans available per asset</p>
        </div>
        <div id="miningGrid" class="mining-plans--classic"></div>
      `;
      mainCol.appendChild(plansWrap);
    }

    /* ---------- SUB PANEL ---------- */
    if (!$('miningSubscribePanel')) {
      const sub = document.createElement('div');
      sub.id = 'miningSubscribePanel';
      sub.className = 'mining-sub-panel mining-hidden';
      sub.innerHTML = `
        <div class="mining-sub-head">
          <div>
            <span class="mining-section-kicker">Subscription</span>
            <h3 id="miningSelectedPlanTitle">Mining Subscription</h3>
            <p id="miningSelectedPlanMeta">Select a plan to continue</p>
          </div>
          <button type="button" id="closeMiningSubscribePanel" class="mining-panel-close">✕</button>
        </div>

        <div class="mining-sub-body">
          <div class="mining-balance-info">
            Available Balance:
            <strong id="miningAvailableBalance">0 BX</strong>
          </div>

          <label for="miningAmountInput">Subscription Amount</label>
          <input id="miningAmountInput" type="number" min="0" step="0.0001" placeholder="0.00">

          <div class="mining-quick-row">
            <button type="button" data-mining-quick="25">25%</button>
            <button type="button" data-mining-quick="50">50%</button>
            <button type="button" data-mining-quick="100">MAX</button>
          </div>

          <div id="miningSubSummary" class="mining-sub-summary">
            Choose amount to profit.
          </div>

          <button id="confirmMiningSubscribeBtn" type="button">Start Mining</button>
        </div>
      `;
      mainCol.appendChild(sub);
    }

    /* ---------- ACTIVE PANEL ---------- */
    if (!$('miningActivePanel')) {
      const active = document.createElement('div');
      active.id = 'miningActivePanel';
      active.className = 'mining-active-card mining-hidden';
      active.innerHTML = `
        <div class="mining-active-head">
          <div>
            <span class="mining-section-kicker">Live Contract</span>
            <h3>Active Mining</h3>
          </div>
          <span id="miningActiveBadge" class="mining-badge idle">Idle</span>
        </div>

        <div class="mining-active-main">
          <div class="mining-active-row"><span>Plan</span><strong id="miningActiveName">—</strong></div>
          <div class="mining-active-row"><span>Hash / Amount</span><strong id="miningActiveHash">—</strong></div>
          <div class="mining-active-row"><span>Daily Yield</span><strong id="miningActiveDaily">—</strong></div>
          <div class="mining-active-row"><span>Pending Reward</span><strong id="miningPendingReward">0 BX</strong></div>
          <div class="mining-active-row"><span>Total Claimed</span><strong id="miningTotalClaimed">0 BX</strong></div>
        </div>

        <div class="mining-progress-wrap">
          <div class="mining-progress-top">
            <span>Cycle Progress</span>
            <strong id="miningProgressText">0%</strong>
          </div>
          <div class="mining-progress-bar">
            <div id="miningProgressFill"></div>
          </div>
          <div class="mining-progress-hint" id="miningProgressHint">Mining not started</div>
        </div>

        <div class="mining-active-actions">
          <button id="claimMiningRewardBtn" class="btn primary" type="button">Claim Reward</button>
          <button id="cancelMiningPlanBtn" class="btn" type="button">Close Plan</button>
        </div>
      `;
      sideCol.appendChild(active);
    }

    /* ---------- HISTORY ---------- */
    if (!$('miningHistoryList')) {
      const history = document.createElement('div');
      history.className = 'mining-history-card';
      history.innerHTML = `
        <div class="mining-history-head">
          <div>
            <span class="mining-section-kicker">Activity</span>
            <h3>Mining History</h3>
          </div>
          <span id="miningHistoryCount" class="mining-history-count">0</span>
        </div>
        <div id="miningHistoryList" class="mining-history-list"></div>
      `;
      sideCol.appendChild(history);
    }

    /* ---------- STATUS / TOAST ---------- */
    if (!$('miningStatus')) {
      const s = document.createElement('div');
      s.id = 'miningStatus';
      s.className = 'mining-status hidden';
      root.appendChild(s);
    }

    if (!$('miningToast')) {
      const t = document.createElement('div');
      t.id = 'miningToast';
      t.className = 'mining-toast hidden';
      root.appendChild(t);
    }

    return true;
  }

  /* =========================================================
     RENDER TOP
  ========================================================= */
  function renderTopOverview() {
    const coin = state.selectedCoin;
    const selectedPlan = getSelectedPlan();

    if ($('miningActiveCoin')) $('miningActiveCoin').textContent = coin;
    if ($('miningAvailableBalanceTop')) {
      $('miningAvailableBalanceTop').textContent = `${fmt(getAvailable(coin), coin)} ${coin}`;
    }
    if ($('miningDailyYieldTop')) {
      $('miningDailyYieldTop').textContent = selectedPlan ? `+${fmtPct(selectedPlan.daily)}` : '+0.00%';
    }
    if ($('miningCycleTop')) {
      $('miningCycleTop').textContent = selectedPlan ? `${selectedPlan.days} Days` : '—';
    }
  }

  function renderCoinTabs() {
    $$('[data-coin]', $('mining')).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.coin === state.selectedCoin);
    });
  }

  /* =========================================================
     RENDER PLANS
  ========================================================= */
  function getPlanButtonText(planId) {
    if (state.activePlanId === planId && hasActivePlan()) return 'Current Active Plan';
    if (state.selectedPlanId === planId) return 'Selected';
    return 'Select Plan';
  }

  function renderPlans() {
    const coin = state.selectedCoin;
    const grid = $('miningGrid');
    if (!grid) return;

    grid.innerHTML = PLANS.map((plan, index) => {
      const min = getMinAmount(plan, coin);
      const visual = getPlanVisual(plan);

      const isSelected = state.selectedPlanId === plan.id;
      const isActivePlan = state.activePlanId === plan.id && hasActivePlan();

      const cardClasses = [
        'mining-card',
        isSelected ? 'is-selected' : '',
        isActivePlan ? 'is-active' : ''
      ].filter(Boolean).join(' ');

      const buttonDisabled = isActivePlan ? 'disabled' : '';
      const buttonText = getPlanButtonText(plan.id);

      return `
        <div class="${cardClasses}" data-plan-card="${plan.id}">
          <div class="mining-card-top">
            <div class="mining-card-badge ${visual.badgeClass}">${visual.badge}</div>
            <div class="mining-card-rank">#${index + 1}</div>
          </div>

          <div class="mining-card-head">
            <div>
              <h3>${plan.name}</h3>
              <p>${visual.subtitle}</p>
            </div>
          </div>

          <div class="mining-price">${fmt(min, coin)} ${coin}</div>

          <div class="mining-card-highlight">${visual.highlight}</div>

          <div class="mining-meta-grid">
            <div>
              <span>Daily</span>
              <strong>${fmtPct(plan.daily)}</strong>
            </div>
            <div>
              <span>Cycle</span>
              <strong>${plan.days}D</strong>
            </div>
            <div>
              <span>Hash</span>
              <strong>${plan.hash}</strong>
            </div>
          </div>

          <div class="mining-plan-note">
            Minimum subscription required for this mining tier.
          </div>

          <button class="mining-select-btn" data-plan="${plan.id}" ${buttonDisabled}>${buttonText}</button>
        </div>
      `;
    }).join('');

    $$('[data-plan]', grid).forEach(btn => {
      btn.onclick = () => {
        if (btn.disabled) return;
        playClick();
        selectPlan(btn.dataset.plan);
      };
    });
  }

  /* =========================================================
     SUBSCRIBE PANEL
  ========================================================= */
  function openSubscribePanel() {
    $('miningSubscribePanel')?.classList.remove('mining-hidden');
  }

  function closeSubscribePanel() {
    $('miningSubscribePanel')?.classList.add('mining-hidden');
  }

  function selectPlan(id) {
    state.selectedPlanId = id;
    saveState();

    const plan = getSelectedPlan();
    const coin = state.selectedCoin;
    const min = getMinAmount(plan, coin);

    if ($('miningSelectedPlanTitle')) $('miningSelectedPlanTitle').textContent = `${plan.name} Subscription`;
    if ($('miningSelectedPlanMeta')) {
      $('miningSelectedPlanMeta').textContent =
        `${fmtPct(plan.daily)} daily • ${plan.days} days • ${plan.hash}`;
    }

    if ($('miningAvailableBalance')) {
      $('miningAvailableBalance').textContent = `${fmt(getAvailable(coin), coin)} ${coin}`;
    }

    if ($('miningAmountInput')) {
      $('miningAmountInput').value = min;
      $('miningAmountInput').min = min;
    }

    updateSubscribeSummary();
    openSubscribePanel();
    renderTopOverview();
    renderPlans();
  }

  function updateSubscribeSummary() {
    const plan = getSelectedPlan();
    const coin = state.selectedCoin;
    const amount = Number($('miningAmountInput')?.value || 0);
    const summary = $('miningSubSummary');

    if (!summary) return;

    if (!plan) {
      summary.innerHTML = 'Choose amount to profit.';
      return;
    }

    const min = getMinAmount(plan, coin);

    if (!amount || amount <= 0) {
      summary.innerHTML = `
        <strong>${plan.name}</strong><br>
        Minimum Required: <strong>${fmt(min, coin)} ${coin}</strong>
      `;
      return;
    }

    const estimatedDaily = amount * (plan.daily / 100) * plan.boost;
    const estimatedCycle = estimatedDaily * plan.days;
    const finalReturn = amount + estimatedCycle;

    summary.innerHTML = `
      <strong>${plan.name}</strong><br>
      Daily Return: <strong>${fmt(estimatedDaily, coin)} ${coin}</strong><br>
      Cycle Reward: <strong>${fmt(estimatedCycle, coin)} ${coin}</strong><br>
      Final Return: <strong>${fmt(finalReturn, coin)} ${coin}</strong><br>
      Duration: <strong>${plan.days} Days</strong>
    `;
  }

  function confirmSubscription() {
    const plan = getSelectedPlan();
    const coin = state.selectedCoin;

    if (!plan) {
      showToast('Select a mining plan first', 'error');
      return;
    }

    if (hasActivePlan()) {
      showToast('You already have an active mining plan', 'error');
      return;
    }

    const amount = Number($('miningAmountInput')?.value || 0);
    const min = getMinAmount(plan, coin);
    const available = getAvailable(coin);

    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }

    if (amount < min) {
      showToast(`Minimum is ${fmt(min, coin)} ${coin}`, 'error');
      return;
    }

    if (amount > available) {
      showToast(`Insufficient ${coin} balance`, 'error');
      return;
    }

    try {
      window.BX_BALANCE.sub(coin, amount);
    } catch {
      showToast(`Failed to deduct ${coin}`, 'error');
      return;
    }

    state.activePlanId = plan.id;
    state.activeCoin = coin;
    state.subscriptionAmount = amount;

    state.activeSince = now();
    state.expiresAt = now() + getDurationMs(plan);
    state.lastClaimAt = now();

    state.pendingReward = 0;
    state.totalClaimed = 0;

    state.history.unshift({
      id: cryptoRandom(),
      type: 'subscribe',
      plan: plan.name,
      coin,
      amount,
      reward: 0,
      time: now()
    });

    saveState();

    closeSubscribePanel();
    renderAll();
    showToast(`${plan.name} started successfully`, 'success');
  }

  /* =========================================================
     ACTIVE PANEL
  ========================================================= */
  function renderActivePanel() {
    const panel = $('miningActivePanel');
    const badge = $('miningActiveBadge');
    const plan = getActivePlan();
    const active = hasActivePlan();

    if (!panel) return;

    if (!active || !plan) {
      panel.classList.add('mining-hidden');
      if (badge) {
        badge.textContent = 'Idle';
        badge.className = 'mining-badge idle';
      }
      return;
    }

    panel.classList.remove('mining-hidden');

    const coin = state.activeCoin;
    const progress = getProgress(plan);
    const pending = Number(state.pendingReward || 0);

    if (badge) {
      badge.textContent = 'Active';
      badge.className = 'mining-badge active';
    }

    if ($('miningActiveName')) $('miningActiveName').textContent = `${plan.name} (${coin})`;
    if ($('miningActiveHash')) {
      $('miningActiveHash').textContent = `${plan.hash} • ${fmt(state.subscriptionAmount, coin)} ${coin}`;
    }
    if ($('miningActiveDaily')) {
      const dailyReward = state.subscriptionAmount * (plan.daily / 100) * plan.boost;
      $('miningActiveDaily').textContent = `${fmtPct(plan.daily)} • ~${fmt(dailyReward, coin)} ${coin}/day`;
    }
    if ($('miningPendingReward')) $('miningPendingReward').textContent = `${fmt(pending, coin)} ${coin}`;
    if ($('miningTotalClaimed')) $('miningTotalClaimed').textContent = `${fmt(state.totalClaimed, coin)} ${coin}`;

    if ($('miningProgressFill')) $('miningProgressFill').style.width = `${progress.toFixed(1)}%`;
    if ($('miningProgressText')) $('miningProgressText').textContent = `${progress.toFixed(1)}%`;
    if ($('miningProgressHint')) {
      $('miningProgressHint').textContent = `Ends: ${fmtDate(state.expiresAt)}`;
    }
  }

  function claimReward() {
    if (!hasActivePlan()) {
      showToast('No active mining plan', 'error');
      return;
    }

    syncPendingReward();

    const reward = Number(state.pendingReward || 0);
    const coin = state.activeCoin;

    if (reward <= 0) {
      showToast('No reward available yet', 'error');
      return;
    }

    try {
      window.BX_BALANCE.add(coin, reward);
    } catch {
      showToast('Failed to claim reward', 'error');
      return;
    }

    state.totalClaimed += reward;
    state.pendingReward = 0;
    state.lastClaimAt = now();

    const plan = getActivePlan();
    state.history.unshift({
      id: cryptoRandom(),
      type: 'claim',
      plan: plan?.name || 'Mining Reward',
      coin,
      amount: 0,
      reward,
      time: now()
    });

    saveState();
    renderAll();
    showToast(`Claimed ${fmt(reward, coin)} ${coin}`, 'success');
  }

  function cancelPlan() {
    if (!hasActivePlan()) {
      showToast('No active plan to close', 'error');
      return;
    }

    syncPendingReward();

    const plan = getActivePlan();
    const coin = state.activeCoin;
    const principal = Number(state.subscriptionAmount || 0);
    const reward = Number(state.pendingReward || 0);

    try {
      window.BX_BALANCE.add(coin, principal + reward);
    } catch {
      showToast('Failed to close plan', 'error');
      return;
    }

    state.history.unshift({
      id: cryptoRandom(),
      type: 'closed',
      plan: plan?.name || 'Mining Plan',
      coin,
      amount: principal,
      reward,
      time: now()
    });

    state.activePlanId = null;
    state.activeCoin = null;
    state.subscriptionAmount = 0;
    state.activeSince = null;
    state.expiresAt = null;
    state.lastClaimAt = null;
    state.pendingReward = 0;
    state.totalClaimed = 0;

    saveState();
    renderAll();
    showToast('Mining plan closed successfully', 'success');
  }

  /* =========================================================
     HISTORY
  ========================================================= */
  function renderHistory() {
    const list = $('miningHistoryList');
    const count = $('miningHistoryCount');
    if (!list) return;

    const items = Array.isArray(state.history) ? state.history.slice(0, 12) : [];

    if (count) count.textContent = `${items.length}`;

    if (!items.length) {
      list.innerHTML = `<div class="mining-history-empty">No mining activity yet</div>`;
      return;
    }

    list.innerHTML = items.map(item => {
      const labelMap = {
        subscribe: 'Subscribed',
        claim: 'Claimed Reward',
        closed: 'Plan Closed',
        cycle_complete: 'Cycle Completed'
      };

      const profitText = item.reward > 0
        ? `+${fmt(item.reward, item.coin)} ${item.coin}`
        : `${fmt(item.amount, item.coin)} ${item.coin}`;

      return `
        <div class="mining-history-item">
          <div class="mining-history-main">
            <strong>${labelMap[item.type] || 'Mining Activity'} — ${item.plan}</strong>
            <span>${item.coin} • ${fmtDate(item.time)}</span>
          </div>
          <div class="mining-history-profit">${profitText}</div>
        </div>
      `;
    }).join('');
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindEvents() {
    $$('[data-coin]', $('mining')).forEach(btn => {
      btn.onclick = () => {
        playClick();
        const coin = btn.dataset.coin;
        if (!ALLOWED_COINS.includes(coin)) return;

        state.selectedCoin = coin;
        saveState();

        renderAll();
      };
    });

    $('miningRefreshBtn')?.addEventListener('click', () => {
      playClick();
      syncPendingReward();
      expireIfNeeded();
      renderAll();
      showToast('Mining data refreshed', 'info');
    });

    $('closeMiningSubscribePanel')?.addEventListener('click', () => {
      playClick();
      closeSubscribePanel();
    });

    $('miningAmountInput')?.addEventListener('input', () => {
      updateSubscribeSummary();
    });

    $$('[data-mining-quick]').forEach(btn => {
      btn.onclick = () => {
        playClick();
        const percent = Number(btn.dataset.miningQuick || 0);
        const available = getAvailable(state.selectedCoin);
        const amount = percent === 100
          ? available
          : (available * percent) / 100;

        const input = $('miningAmountInput');
        if (!input) return;
        input.value = amount > 0 ? amount.toFixed(ASSET_META[state.selectedCoin]?.decimals > 4 ? 4 : 2) : '';
        updateSubscribeSummary();
      };
    });

    $('confirmMiningSubscribeBtn')?.addEventListener('click', () => {
      playClick();
      confirmSubscription();
    });

    $('claimMiningRewardBtn')?.addEventListener('click', () => {
      playClick();
      claimReward();
    });

    $('cancelMiningPlanBtn')?.addEventListener('click', () => {
      playClick();
      cancelPlan();
    });

    window.addEventListener('bx:balances:updated', () => {
      renderTopOverview();
      if ($('miningAvailableBalance')) {
        $('miningAvailableBalance').textContent =
          `${fmt(getAvailable(state.selectedCoin), state.selectedCoin)} ${state.selectedCoin}`;
      }
    });
  }

  /* =========================================================
     RENDER ALL
  ========================================================= */
  function renderAll() {
    syncPendingReward();
    expireIfNeeded();

    renderTopOverview();
    renderCoinTabs();
    renderPlans();
    renderActivePanel();
    renderHistory();
    updateSubscribeSummary();
  }

  /* =========================================================
     LOOP
  ========================================================= */
  function startLoop() {
    setInterval(() => {
      syncPendingReward();
      expireIfNeeded();
      renderActivePanel();
    }, 5000);
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */
  MINING.state = state;
  MINING.render = renderAll;
  MINING.selectCoin = (coin) => {
    if (!ALLOWED_COINS.includes(coin)) return;
    state.selectedCoin = coin;
    saveState();
    renderAll();
  };
  MINING.selectPlan = (id) => {
    if (!PLANS.find(p => p.id === id)) return;
    selectPlan(id);
  };
  MINING.claim = claimReward;
  MINING.cancel = cancelPlan;

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    const root = $('mining');
    if (!root) {
      console.warn('[Mining] #mining not found');
      return;
    }

    ensureMiningDom();
    bindEvents();
    renderAll();
    startLoop();

    console.log('[Mining] CLEAN REBIND FINAL loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
