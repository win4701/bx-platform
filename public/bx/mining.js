/* =========================================================
   BLOXIO — MINING.JS REBIND FINAL
   HTML + CSS + Wallet + Airdrop + History Sync
========================================================= */

(function () {
  "use strict";

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const now = () => Date.now();

  const fmt = (n, d = 4) => {
    const num = Number(n || 0);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: d
    });
  };

  const money = (n, d = 2) => {
    const num = Number(n || 0);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  };

  function safePlay(id) {
    try {
      const el = $(id);
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch (_) {}
  }

  function notify(msg) {
    alert(msg);
  }

  function getWalletBalance(symbol) {
    if (window.WALLET && typeof window.WALLET === "object") {
      return Number(window.WALLET[symbol] || 0);
    }

    const map = {
      BX: "bal-bx",
      BNB: "bal-bnb",
      SOL: "bal-sol"
    };

    const el = $(map[symbol]);
    if (!el) return 0;
    return Number(String(el.textContent || "0").replace(/,/g, "")) || 0;
  }

  function setWalletBalance(symbol, value) {
    if (!window.WALLET || typeof window.WALLET !== "object") {
      window.WALLET = {};
    }

    window.WALLET[symbol] = Number(value || 0);

    if (typeof window.renderWallet === "function") {
      try { window.renderWallet(); } catch (_) {}
    }

    if (typeof window.loadWallet === "function") {
      try { window.loadWallet(); } catch (_) {}
    }
  }

  function isAuthSafe() {
    if (typeof window.isAuthenticated === "function") {
      try { return !!window.isAuthenticated(); } catch (_) {}
    }
    return true;
  }

  async function postSafe(url, body) {
    if (typeof window.safeFetch === "function") {
      try {
        return await window.safeFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {})
        });
      } catch (_) {
        return null;
      }
    }
    return { ok: true, mock: true };
  }

  /* =========================================================
     STATE
  ========================================================= */
  const STORAGE_KEY = "bloxio_mining_rebind_v3";

  const MINING = {
    coin: "BX",
    selectedPlan: null,
    subscription: null,
    history: [],
    refreshTimer: null
  };

  const MINING_PLANS_BY_COIN = {
    BX: [
      { id: "p10", name: "Starter",  days: 10, roi: 2.5, min: 5,    max: 60 },
      { id: "p21", name: "Basic",    days: 21, roi: 5,   min: 50,   max: 250 },
      { id: "p30", name: "Golden",   days: 30, roi: 8,   min: 200,  max: 800 },
      { id: "p45", name: "Pro",      days: 45, roi: 12,  min: 400,  max: 2500 },
      { id: "p60", name: "Platine",  days: 60, roi: 17,  min: 750,  max: 9000 },
      { id: "p90", name: "Infinity", days: 90, roi: 25,  min: 1000, max: 20000, sub: true }
    ],

    SOL: [
      { id: "p10", name: "Starter",  days: 10, roi: 1,   min: 1,    max: 5 },
      { id: "p21", name: "Basic",    days: 21, roi: 2.8, min: 10,   max: 50 },
      { id: "p30", name: "Golden",   days: 30, roi: 4,   min: 40,   max: 160 },
      { id: "p45", name: "Pro",      days: 45, roi: 7,   min: 120,  max: 500 },
      { id: "p60", name: "Platine",  days: 60, roi: 9,   min: 200,  max: 1000 },
      { id: "p90", name: "Infinity", days: 90, roi: 14,  min: 500,  max: 2500, sub: true }
    ],

    BNB: [
      { id: "p10", name: "Starter",  days: 10, roi: 0.8, min: 0.05, max: 1 },
      { id: "p21", name: "Basic",    days: 21, roi: 1.8, min: 1,    max: 4 },
      { id: "p30", name: "Golden",   days: 30, roi: 3,   min: 5,    max: 50 },
      { id: "p45", name: "Pro",      days: 45, roi: 5,   min: 10,   max: 100 },
      { id: "p60", name: "Platine",  days: 60, roi: 7,   min: 15,   max: 150 },
      { id: "p90", name: "Infinity", days: 90, roi: 11,  min: 25,   max: 200, sub: true }
    ]
  };

  /* =========================================================
     STORAGE
  ========================================================= */
  function saveMiningState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        coin: MINING.coin,
        selectedPlan: MINING.selectedPlan,
        subscription: MINING.subscription,
        history: MINING.history
      }));
    } catch (_) {}
  }

  function loadMiningState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      if (data?.coin && MINING_PLANS_BY_COIN[data.coin]) MINING.coin = data.coin;
      if (data?.selectedPlan) MINING.selectedPlan = data.selectedPlan;
      if (data?.subscription) MINING.subscription = data.subscription;
      if (Array.isArray(data?.history)) MINING.history = data.history;
    } catch (_) {}
  }

  /* =========================================================
     CORE
  ========================================================= */
  function getPlans() {
    return MINING_PLANS_BY_COIN[MINING.coin] || [];
  }

  function getPlanById(coin, planId) {
    return (MINING_PLANS_BY_COIN[coin] || []).find(p => p.id === planId) || null;
  }

  function getBestPlanMeta() {
    const plans = getPlans();
    if (!plans.length) return { roi: 0, days: 0 };
    const best = [...plans].sort((a, b) => b.roi - a.roi)[0];
    return { roi: best.roi, days: best.days };
  }

  function calcMining(plan, amount, start) {
    if (!plan || !amount || !start) {
      return { earning: 0, progress: 0, left: 0, totalProfit: 0, totalReturn: 0, done: false };
    }

    const duration = plan.days * 86400000;
    const elapsed = Math.max(0, now() - start);
    const progress = Math.min(1, elapsed / duration);
    const totalProfit = amount * (plan.roi / 100);
    const earning = totalProfit * progress;
    const totalReturn = amount + totalProfit;
    const left = Math.max(0, duration - elapsed);
    const done = progress >= 1;

    return { earning, progress, left, totalProfit, totalReturn, done };
  }

  function formatTime(ms) {
    if (ms <= 0) return "Completed";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h ${m % 60}m`;
  }

  function validatePlan(plan, amount) {
    if (!plan) return "Plan not selected";
    if (!Number.isFinite(amount) || amount <= 0) return "Enter valid amount";
    if (amount < plan.min) return `Minimum is ${plan.min} ${MINING.coin}`;
    if (amount > plan.max) return `Maximum is ${plan.max} ${MINING.coin}`;

    const balance = getWalletBalance(MINING.coin);
    if (amount > balance) return `Insufficient ${MINING.coin} balance`;

    return null;
  }

  /* =========================================================
     PANEL
  ========================================================= */
  function openMiningPanel() {
    const panel = $("miningSubscribePanel");
    if (!panel) return;
    panel.classList.remove("mining-hidden");
    updateMiningPanel();
  }

  function closeMiningPanel() {
    const panel = $("miningSubscribePanel");
    if (!panel) return;
    panel.classList.add("mining-hidden");
  }

  function updateMiningPanel() {
    const titleEl = $("miningSelectedPlanTitle");
    const metaEl = $("miningSelectedPlanMeta");
    const availableEl = $("miningAvailableBalance");
    const inputEl = $("miningAmountInput");
    const summaryEl = $("miningSubSummary");

    const balance = getWalletBalance(MINING.coin);
    const plan = MINING.selectedPlan;

    if (availableEl) availableEl.textContent = `${money(balance, 4)} ${MINING.coin}`;

    if (!plan) {
      if (titleEl) titleEl.textContent = "Mining Subscription";
      if (metaEl) metaEl.textContent = "Select a plan to continue";
      if (summaryEl) summaryEl.innerHTML = `Choose plan first.`;
      return;
    }

    if (titleEl) titleEl.textContent = `${plan.name} Plan • ${MINING.coin}`;
    if (metaEl) metaEl.textContent = `${plan.days} days • ROI ${plan.roi}% • Min ${fmt(plan.min)} • Max ${fmt(plan.max)}`;

    const amount = Number(inputEl?.value || 0);
    const estimatedProfit = amount > 0 ? amount * (plan.roi / 100) : 0;
    const estimatedReturn = amount > 0 ? amount + estimatedProfit : 0;
    const error = amount > 0 ? validatePlan(plan, amount) : null;

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div><strong>Coin:</strong> ${MINING.coin}</div>
        <div><strong>Plan:</strong> ${plan.name}</div>
        <div><strong>Cycle:</strong> ${plan.days} days</div>
        <div><strong>ROI:</strong> ${plan.roi}%</div>
        <div><strong>Estimated Profit:</strong> +${fmt(estimatedProfit)} ${MINING.coin}</div>
        <div><strong>Total Return:</strong> ${fmt(estimatedReturn)} ${MINING.coin}</div>
        ${error ? `<div style="margin-top:8px;color:#fca5a5;"><strong>Error:</strong> ${error}</div>` : ""}
      `;
    }
  }

  /* =========================================================
     TOP
  ========================================================= */
  function renderMiningTop() {
    const activeCoinEl = $("miningActiveCoin");
    const availableTopEl = $("miningAvailableBalanceTop");
    const dailyYieldEl = $("miningDailyYieldTop");
    const cycleEl = $("miningCycleTop");

    const best = getBestPlanMeta();
    const balance = getWalletBalance(MINING.coin);

    if (activeCoinEl) activeCoinEl.textContent = MINING.coin;
    if (availableTopEl) availableTopEl.textContent = `${money(balance, 4)} ${MINING.coin}`;
    if (dailyYieldEl) dailyYieldEl.textContent = `+${best.roi}%`;
    if (cycleEl) cycleEl.textContent = `${best.days} Days`;
  }

  /* =========================================================
     ACTIVE CARD
  ========================================================= */
  function renderActiveSubscription() {
    const badge = $("miningActiveStatusBadge");
    const planName = $("miningActivePlanName");
    const amountEl = $("miningActiveAmount");
    const profitEl = $("miningActiveProfit");
    const timeLeftEl = $("miningActiveTimeLeft");
    const fill = $("miningProgressFill");
    const progressText = $("miningProgressText");
    const cycleHint = $("miningCycleHint");
    const claimBtn = $("miningClaimBtn");
    const cancelBtn = $("miningCancelBtn");

    if (!MINING.subscription) {
      if (badge) {
        badge.textContent = "No Active Plan";
        badge.className = "mining-badge idle";
      }
      if (planName) planName.textContent = "—";
      if (amountEl) amountEl.textContent = `0.00 ${MINING.coin}`;
      if (profitEl) profitEl.textContent = `+0.0000 ${MINING.coin}`;
      if (timeLeftEl) timeLeftEl.textContent = "—";
      if (fill) fill.style.width = "0%";
      if (progressText) progressText.textContent = "0%";
      if (cycleHint) cycleHint.textContent = "No active cycle";
      if (claimBtn) claimBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      return;
    }

    const plan = getPlanById(MINING.subscription.coin, MINING.subscription.planId);
    if (!plan) return;

    const data = calcMining(plan, MINING.subscription.amount, MINING.subscription.start);

    if (badge) {
      badge.textContent = data.done ? "Cycle Completed" : "Mining Active";
      badge.className = `mining-badge ${data.done ? "done" : "active"}`;
    }

    if (planName) planName.textContent = `${plan.name} • ${MINING.subscription.coin}`;
    if (amountEl) amountEl.textContent = `${fmt(MINING.subscription.amount)} ${MINING.subscription.coin}`;
    if (profitEl) profitEl.textContent = `+${fmt(data.earning)} ${MINING.subscription.coin}`;
    if (timeLeftEl) timeLeftEl.textContent = formatTime(data.left);
    if (fill) fill.style.width = `${(data.progress * 100).toFixed(2)}%`;
    if (progressText) progressText.textContent = `${(data.progress * 100).toFixed(1)}%`;
    if (cycleHint) cycleHint.textContent = data.done ? "Ready to claim" : `${plan.days} days cycle running`;

    if (claimBtn) claimBtn.disabled = data.earning <= 0;
    if (cancelBtn) cancelBtn.disabled = false;
  }

  /* =========================================================
     HISTORY
  ========================================================= */
  function pushMiningHistory(type, payload = {}) {
    MINING.history.unshift({
      id: `mh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      ts: now(),
      ...payload
    });

    MINING.history = MINING.history.slice(0, 25);
    saveMiningState();
  }

  function renderMiningHistory() {
    const list = $("miningHistoryList");
    const count = $("miningHistoryCount");
    if (!list) return;

    if (count) {
      count.textContent = `${MINING.history.length} ${MINING.history.length === 1 ? "Record" : "Records"}`;
    }

    if (!MINING.history.length) {
      list.innerHTML = `<div class="mining-history-empty">No mining activity yet.</div>`;
      return;
    }

    list.innerHTML = MINING.history.map(item => {
      const date = new Date(item.ts).toLocaleString();

      let title = "Mining";
      let sub = "";
      let profit = "";
      let badge = `<span class="mining-badge idle">Info</span>`;

      if (item.type === "subscribe") {
        title = `${item.planName} • ${item.coin}`;
        sub = `Subscribed ${fmt(item.amount)} ${item.coin}`;
        profit = `ROI ${item.roi}%`;
        badge = `<span class="mining-badge active">Subscribed</span>`;
      }

      if (item.type === "claim") {
        title = `${item.planName} • ${item.coin}`;
        sub = `Claimed profit`;
        profit = `+${fmt(item.profit)} ${item.coin}`;
        badge = `<span class="mining-badge active">Claimed</span>`;
      }

      if (item.type === "close") {
        title = `${item.planName} • ${item.coin}`;
        sub = `Closed position`;
        profit = `${fmt(item.returned)} ${item.coin}`;
        badge = `<span class="mining-badge done">Closed</span>`;
      }

      return `
        <div class="mining-history-item">
          <div class="mining-history-main">
            <strong>${title}</strong>
            <span>${sub}</span>
            <span>${date}</span>
          </div>
          <div class="mining-history-profit">${profit}</div>
          <div class="mining-history-state">${badge}</div>
        </div>
      `;
    }).join("");
  }

  /* =========================================================
     PLANS
  ========================================================= */
  function bindMiningTabs() {
    const buttons = $$(".mining-tabs button");

    buttons.forEach((btn) => {
      const coin = btn.dataset.coin;
      btn.classList.toggle("active", coin === MINING.coin);

      btn.onclick = () => {
        if (!coin || MINING.coin === coin) return;
        MINING.coin = coin;
        MINING.selectedPlan = null;
        saveMiningState();
        renderMining();
      };
    });
  }

  function buildPlanCard(plan, isActive) {
    let content = "";

    if (isActive && MINING.subscription) {
      const data = calcMining(plan, MINING.subscription.amount, MINING.subscription.start);

      content = `
        <div class="mining-sub-summary" style="margin:10px 0 12px;">
          <div><strong>Subscribed:</strong> ${fmt(MINING.subscription.amount)} ${MINING.coin}</div>
          <div><strong>Profit Now:</strong> +${fmt(data.earning)} ${MINING.coin}</div>
          <div><strong>Time Left:</strong> ${formatTime(data.left)}</div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;">
            <div style="height:100%;width:${(data.progress * 100).toFixed(1)}%;background:linear-gradient(90deg,#22c55e,#4ade80);"></div>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-direction:column;">
          <button class="claim-btn" type="button">Claim Profit</button>
          <button type="button" disabled>Active</button>
        </div>
      `;
    } else {
      content = `<button class="sub-btn" type="button">Subscribe</button>`;
    }

    return `
      <h3>
        ${plan.name}
        ${plan.sub ? `<span class="sub-tag" style="font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(250,204,21,.14);color:#facc15;border:1px solid rgba(250,204,21,.22);margin-left:8px;">SUB</span>` : ""}
      </h3>

      <div class="mining-profit">${plan.roi}%</div>

      <ul>
        <li>${plan.days} days cycle</li>
        <li>Min: ${fmt(plan.min)} ${MINING.coin}</li>
        <li>Max: ${fmt(plan.max)} ${MINING.coin}</li>
      </ul>

      ${content}
    `;
  }

  function renderMiningPlans() {
    const grid = $("miningGrid");
    if (!grid) return;

    const plans = getPlans();
    grid.innerHTML = "";

    plans.forEach((plan) => {
      const isActive =
        !!MINING.subscription &&
        MINING.subscription.coin === MINING.coin &&
        MINING.subscription.planId === plan.id;

      const card = document.createElement("div");
      card.className = "mining-plan";
      card.innerHTML = buildPlanCard(plan, isActive);

      if (isActive) {
        const claimBtn = card.querySelector(".claim-btn");
        if (claimBtn) claimBtn.onclick = () => claimMining(plan);
      } else {
        const subBtn = card.querySelector(".sub-btn");
        if (subBtn) {
          subBtn.onclick = () => {
            MINING.selectedPlan = {
              id: plan.id,
              name: plan.name,
              roi: plan.roi,
              days: plan.days,
              min: plan.min,
              max: plan.max
            };
            saveMiningState();
            openMiningPanel();
          };
        }
      }

      grid.appendChild(card);
    });
  }

  /* =========================================================
     ACTIONS
  ========================================================= */
  async function confirmMiningSubscription() {
    if (!isAuthSafe()) {
      notify("Please login first");
      return;
    }

    if (MINING.subscription) {
      notify("You already have an active mining plan");
      return;
    }

    const inputEl = $("miningAmountInput");
    const plan = MINING.selectedPlan;

    if (!plan) {
      notify("Select a plan first");
      return;
    }

    const amount = Number(inputEl?.value || 0);
    const error = validatePlan(plan, amount);

    if (error) {
      notify(error);
      return;
    }

    const btn = $("confirmMiningSubscribeBtn");
    const oldText = btn ? btn.textContent : "Confirm Subscription";

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Processing...";
    }

    const res = await postSafe("/mining/subscribe", {
      coin: MINING.coin,
      plan_id: plan.id,
      amount
    });

    if (!res) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
      notify("Mining subscription failed");
      return;
    }

    const currentBalance = getWalletBalance(MINING.coin);
    setWalletBalance(MINING.coin, Math.max(0, currentBalance - amount));

    MINING.subscription = {
      coin: MINING.coin,
      planId: plan.id,
      amount,
      start: now()
    };

    pushMiningHistory("subscribe", {
      coin: MINING.coin,
      planName: plan.name,
      amount,
      roi: plan.roi
    });

    saveMiningState();
    safePlay("snd-click");

    if (inputEl) inputEl.value = "";
    closeMiningPanel();
    renderMining();
    syncMiningToAirdrop();

    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText;
    }

    notify(`Mining started: ${plan.name} • ${fmt(amount)} ${MINING.coin}`);
  }

  async function claimMining(plan) {
    const sub = MINING.subscription;
    if (!sub) return;

    const data = calcMining(plan, sub.amount, sub.start);

    if (data.earning <= 0) {
      notify("No profit yet");
      return;
    }

    const res = await postSafe("/mining/claim", {
      coin: sub.coin,
      plan_id: sub.planId
    });

    if (!res) {
      notify("Claim failed");
      return;
    }

    const currentBalance = getWalletBalance(sub.coin);
    setWalletBalance(sub.coin, currentBalance + data.earning);

    pushMiningHistory("claim", {
      coin: sub.coin,
      planName: plan.name,
      profit: data.earning
    });

    MINING.subscription.start = now();
    saveMiningState();
    safePlay("snd-win");
    renderMining();
    syncMiningToAirdrop();

    notify(`Claimed +${fmt(data.earning)} ${sub.coin}`);
  }

  async function closeMiningPlan() {
    const sub = MINING.subscription;
    if (!sub) return;

    const plan = getPlanById(sub.coin, sub.planId);
    if (!plan) return;

    const data = calcMining(plan, sub.amount, sub.start);
    const totalReturn = sub.amount + data.earning;

    const res = await postSafe("/mining/close", {
      coin: sub.coin,
      plan_id: sub.planId
    });

    if (!res) {
      notify("Close plan failed");
      return;
    }

    const currentBalance = getWalletBalance(sub.coin);
    setWalletBalance(sub.coin, currentBalance + totalReturn);

    pushMiningHistory("close", {
      coin: sub.coin,
      planName: plan.name,
      returned: totalReturn
    });

    MINING.subscription = null;
    saveMiningState();
    safePlay("snd-lose");
    renderMining();
    syncMiningToAirdrop();

    notify(`Plan closed • Returned ${fmt(totalReturn)} ${sub.coin}`);
  }

  /* =========================================================
     AIRDROP SYNC
  ========================================================= */
  function syncMiningToAirdrop() {
    // ربط بسيط فقط، بدون كسر airdrop.js الحالي
    try {
      const airdropReward = $("airdropReward");
      if (!airdropReward) return;

      if (!MINING.subscription) {
        airdropReward.textContent = "+0.00 BX";
        return;
      }

      const plan = getPlanById(MINING.subscription.coin, MINING.subscription.planId);
      if (!plan) return;

      const data = calcMining(plan, MINING.subscription.amount, MINING.subscription.start);

      // bonus visual فقط
      const bonus = data.earning * 0.05;
      airdropReward.textContent = `+${fmt(bonus)} BX`;
    } catch (_) {}
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindMiningPanelEvents() {
    $$("[data-mining-open]").forEach((btn) => {
      btn.onclick = () => {
        if (!MINING.selectedPlan) {
          const firstPlan = getPlans()[0];
          if (firstPlan) {
            MINING.selectedPlan = {
              id: firstPlan.id,
              name: firstPlan.name,
              roi: firstPlan.roi,
              days: firstPlan.days,
              min: firstPlan.min,
              max: firstPlan.max
            };
          }
        }
        saveMiningState();
        openMiningPanel();
      };
    });

    $$("[data-mining-close]").forEach((btn) => {
      btn.onclick = () => closeMiningPanel();
    });

    $$("[data-mining-percent]").forEach((btn) => {
      btn.onclick = () => {
        const percent = Number(btn.dataset.miningPercent || 0);
        const input = $("miningAmountInput");
        const balance = getWalletBalance(MINING.coin);
        if (!input || !percent) return;
        input.value = (balance * (percent / 100)).toFixed(4);
        updateMiningPanel();
      };
    });

    const amountInput = $("miningAmountInput");
    if (amountInput) amountInput.addEventListener("input", updateMiningPanel);

    const confirmBtn = $("confirmMiningSubscribeBtn");
    if (confirmBtn) confirmBtn.onclick = confirmMiningSubscription;

    const claimBtn = $("miningClaimBtn");
    if (claimBtn) {
      claimBtn.onclick = () => {
        if (!MINING.subscription) return;
        const plan = getPlanById(MINING.subscription.coin, MINING.subscription.planId);
        if (plan) claimMining(plan);
      };
    }

    const cancelBtn = $("miningCancelBtn");
    if (cancelBtn) cancelBtn.onclick = closeMiningPlan;
  }

  /* =========================================================
     RENDER
  ========================================================= */
  function renderMining() {
    bindMiningTabs();
    renderMiningTop();
    renderActiveSubscription();
    renderMiningPlans();
    renderMiningHistory();
    updateMiningPanel();
  }

  /* =========================================================
     AUTO REFRESH
  ========================================================= */
  function startMiningRefresh() {
    if (MINING.refreshTimer) clearInterval(MINING.refreshTimer);

    MINING.refreshTimer = setInterval(() => {
      if (window.APP?.view === "mining" || MINING.subscription) {
        renderMining();
        syncMiningToAirdrop();
      }
    }, 2000);
  }

  /* =========================================================
     INIT
  ========================================================= */
  function initMining() {
    loadMiningState();
    bindMiningPanelEvents();
    renderMining();
    syncMiningToAirdrop();
    startMiningRefresh();
  }

  /* =========================================================
     EXPORT
  ========================================================= */
  window.MINING = MINING;
  window.renderMining = renderMining;
  window.initMining = initMining;

  document.addEventListener("DOMContentLoaded", initMining);
})();
