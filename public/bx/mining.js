/* =========================================================
   BLOXIO — MINING.JS FINAL PRO
   Compatible 1:1 with:
   - index.html (new mining structure)
   - styles.css (new mining scoped system)
========================================================= */

(function () {
  "use strict";

  /* =========================================================
     SAFE HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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

  const now = () => Date.now();

  function safePlay(id) {
    try {
      const el = $(id);
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch (_) {}
  }

  function appNotify(msg) {
    // استعمل alert مؤقتًا حتى لا نكسر مشروعك الحالي
    // إذا عندك toast system لاحقًا بدلو هنا فقط
    alert(msg);
  }

  function getWalletBalance(symbol) {
    if (window.WALLET && typeof window.WALLET === "object") {
      return Number(window.WALLET[symbol] || 0);
    }

    // fallback من الواجهة
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
    return true; // fallback dev mode
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

    // fallback local dev
    return { ok: true, mock: true };
  }

  /* =========================================================
     STATE
  ========================================================= */
  const MINING = {
    coin: "BX",
    selectedPlan: null,
    subscription: null,
    refreshTimer: null
  };

  /* =========================================================
     PLANS
  ========================================================= */
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
     PERSISTENCE
  ========================================================= */
  const STORAGE_KEY = "bloxio_mining_state_v2";

  function saveMiningState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        coin: MINING.coin,
        selectedPlan: MINING.selectedPlan,
        subscription: MINING.subscription
      }));
    } catch (_) {}
  }

  function loadMiningState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data?.coin && MINING_PLANS_BY_COIN[data.coin]) {
        MINING.coin = data.coin;
      }

      if (data?.selectedPlan) {
        MINING.selectedPlan = data.selectedPlan;
      }

      if (data?.subscription) {
        MINING.subscription = data.subscription;
      }
    } catch (_) {}
  }

  /* =========================================================
     CALCULATIONS
  ========================================================= */
  function getPlans() {
    return MINING_PLANS_BY_COIN[MINING.coin] || [];
  }

  function getBestPlanMeta() {
    const plans = getPlans();
    if (!plans.length) {
      return { roi: 0, days: 0 };
    }

    const best = [...plans].sort((a, b) => b.roi - a.roi)[0];
    return { roi: best.roi, days: best.days };
  }

  function getPlanById(coin, planId) {
    return (MINING_PLANS_BY_COIN[coin] || []).find(p => p.id === planId) || null;
  }

  function calcMining(plan, amount, start) {
    if (!plan || !amount || !start) {
      return { earning: 0, progress: 0, left: 0, totalProfit: 0, totalReturn: 0 };
    }

    const duration = plan.days * 86400000;
    const elapsed = Math.max(0, now() - start);
    const progress = Math.min(1, elapsed / duration);
    const totalProfit = amount * (plan.roi / 100);
    const earning = totalProfit * progress;
    const totalReturn = amount + totalProfit;
    const left = Math.max(0, duration - elapsed);

    return { earning, progress, left, totalProfit, totalReturn };
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
     PANEL CONTROL
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

  /* =========================================================
     TOP STATS
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
     TABS
  ========================================================= */
  function bindMiningTabs() {
    const buttons = $$(".mining-tabs button");

    buttons.forEach((btn) => {
      const coin = btn.dataset.coin;

      btn.classList.toggle("active", coin === MINING.coin);

      btn.onclick = () => {
        if (!coin || MINING.coin === coin) return;

        MINING.coin = coin;

        // لو الاشتراك الحالي لعملة أخرى، لا نحذف الاشتراك
        // فقط نبدل العرض
        MINING.selectedPlan = null;
        saveMiningState();

        renderMining();
      };
    });
  }

  /* =========================================================
     PLAN CARD HTML
  ========================================================= */
  function buildPlanCard(plan, isActive) {
    let activeHtml = "";

    if (isActive && MINING.subscription) {
      const data = calcMining(plan, MINING.subscription.amount, MINING.subscription.start);

      activeHtml = `
        <div class="mining-sub-summary" style="margin:10px 0 12px;">
          <div><strong>Subscribed:</strong> ${fmt(MINING.subscription.amount)} ${MINING.coin}</div>
          <div><strong>Profit Now:</strong> +${fmt(data.earning)} ${MINING.coin}</div>
          <div><strong>Time Left:</strong> ${formatTime(data.left)}</div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;">
            <div style="height:100%;width:${(data.progress * 100).toFixed(2)}%;background:linear-gradient(90deg,#22c55e,#4ade80);"></div>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-direction:column;">
          <button class="claim-btn" type="button">Claim Profit</button>
          <button type="button" disabled>Active</button>
        </div>
      `;
    } else {
      activeHtml = `<button class="sub-btn" type="button">Subscribe</button>`;
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

      ${activeHtml}
    `;
  }

  /* =========================================================
     RENDER PLANS
  ========================================================= */
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
        if (claimBtn) {
          claimBtn.onclick = () => claimMining(plan);
        }
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
     PANEL SUMMARY
  ========================================================= */
  function updateMiningPanel() {
    const titleEl = $("miningSelectedPlanTitle");
    const metaEl = $("miningSelectedPlanMeta");
    const availableEl = $("miningAvailableBalance");
    const inputEl = $("miningAmountInput");
    const summaryEl = $("miningSubSummary");

    const balance = getWalletBalance(MINING.coin);
    const plan = MINING.selectedPlan;

    if (availableEl) {
      availableEl.textContent = `${money(balance, 4)} ${MINING.coin}`;
    }

    if (!plan) {
      if (titleEl) titleEl.textContent = "Mining Subscription";
      if (metaEl) metaEl.textContent = "Select a plan to continue";
      if (summaryEl) {
        summaryEl.innerHTML = `Choose plan first.`;
      }
      return;
    }

    if (titleEl) titleEl.textContent = `${plan.name} Plan • ${MINING.coin}`;
    if (metaEl) metaEl.textContent = `${plan.days} days • ROI ${plan.roi}% • Min ${fmt(plan.min)} • Max ${fmt(plan.max)}`;

    const amount = Number(inputEl?.value || 0);
    const isValidAmount = Number.isFinite(amount) && amount > 0;

    const estimatedProfit = isValidAmount ? amount * (plan.roi / 100) : 0;
    const estimatedReturn = isValidAmount ? amount + estimatedProfit : 0;
    const error = isValidAmount ? validatePlan(plan, amount) : null;

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
     SUBSCRIBE
  ========================================================= */
  async function confirmMiningSubscription() {
    if (!isAuthSafe()) {
      appNotify("Please login first");
      return;
    }

    const inputEl = $("miningAmountInput");
    const plan = MINING.selectedPlan;

    if (!plan) {
      appNotify("Select a plan first");
      return;
    }

    const amount = Number(inputEl?.value || 0);
    const error = validatePlan(plan, amount);

    if (error) {
      appNotify(error);
      return;
    }

    const btn = $("confirmMiningSubscribeBtn");
    const oldText = btn ? btn.textContent : "";

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
        btn.textContent = oldText || "Confirm Subscription";
      }
      appNotify("Mining subscription failed");
      return;
    }

    // خصم من المحفظة
    const currentBalance = getWalletBalance(MINING.coin);
    setWalletBalance(MINING.coin, Math.max(0, currentBalance - amount));

    MINING.subscription = {
      coin: MINING.coin,
      planId: plan.id,
      amount,
      start: now()
    };

    saveMiningState();
    safePlay("snd-click");

    if (inputEl) inputEl.value = "";
    closeMiningPanel();
    renderMining();

    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || "Confirm Subscription";
    }

    appNotify(`Mining started: ${plan.name} • ${fmt(amount)} ${MINING.coin}`);
  }

  /* =========================================================
     CLAIM
  ========================================================= */
  async function claimMining(plan) {
    const sub = MINING.subscription;
    if (!sub) return;

    const data = calcMining(plan, sub.amount, sub.start);

    if (data.earning <= 0) {
      appNotify("No profit yet");
      return;
    }

    const res = await postSafe("/mining/claim", {
      coin: sub.coin,
      plan_id: sub.planId
    });

    if (!res) {
      appNotify("Claim failed");
      return;
    }

    const currentBalance = getWalletBalance(sub.coin);
    setWalletBalance(sub.coin, currentBalance + data.earning);

    // إعادة الدورة من جديد فقط للربح الدوري
    MINING.subscription.start = now();
    saveMiningState();

    safePlay("snd-win");
    renderMining();

    appNotify(`Claimed +${fmt(data.earning)} ${sub.coin}`);
  }

  /* =========================================================
     BIND PANEL EVENTS
  ========================================================= */
  function bindMiningPanelEvents() {
    // open buttons
    $$("[data-mining-open]").forEach((btn) => {
      btn.onclick = () => {
        const target = btn.dataset.miningOpen;
        if (!target) return;

        // لو المستخدم ضغط Subscribe من الأعلى بدون اختيار plan
        // نختار أول plan تلقائيا
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

    // close buttons
    $$("[data-mining-close]").forEach((btn) => {
      btn.onclick = () => closeMiningPanel();
    });

    // quick percent
    $$("[data-mining-percent]").forEach((btn) => {
      btn.onclick = () => {
        const percent = Number(btn.dataset.miningPercent || 0);
        const input = $("miningAmountInput");
        const balance = getWalletBalance(MINING.coin);

        if (!input || !percent) return;

        const value = balance * (percent / 100);
        input.value = value.toFixed(4);
        updateMiningPanel();
      };
    });

    // amount input
    const amountInput = $("miningAmountInput");
    if (amountInput) {
      amountInput.addEventListener("input", updateMiningPanel);
    }

    // confirm
    const confirmBtn = $("confirmMiningSubscribeBtn");
    if (confirmBtn) {
      confirmBtn.onclick = confirmMiningSubscription;
    }
  }

  /* =========================================================
     PUBLIC RENDER
  ========================================================= */
  function renderMining() {
    bindMiningTabs();
    renderMiningTop();
    renderMiningPlans();
    updateMiningPanel();
  }

  /* =========================================================
     AUTO REFRESH
  ========================================================= */
  function startMiningRefresh() {
    if (MINING.refreshTimer) {
      clearInterval(MINING.refreshTimer);
    }

    MINING.refreshTimer = setInterval(() => {
      // يحدث فقط لو الصفحة الحالية Mining أو لو عندك اشتراك active
      if (
        (window.APP?.view === "mining") ||
        (MINING.subscription && MINING.subscription.coin === MINING.coin)
      ) {
        renderMining();
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
