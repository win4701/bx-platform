const MINING_PLANS = [
  { id: "starter",  name: "Starter",       days: 15 },
  { id: "silver",   name: "Silver",        days: 30 },
  { id: "gold",     name: "Gold",          days: 45 },
  { id: "vip",      name: "VIP",           days: 60 },
  { id: "platinum", name: "Platinum VIP",  days: 90, horizontal: true }
];

/* ================================================================================================
   LOAD MINING DASHBOARD
================================================================================================ */

async function loadMining() {
  if (!FEATURES.MINING || !isAuthenticated()) return;

  try {
    const r = await fetch(API_BASE + "/mining/dashboard", {
      headers: authHeaders()
    });
    if (!r.ok) return;

    const data = await r.json();
    MINING_STATE.activeBX = data.bx || null;
    MINING_STATE.activeBNB = data.bnb || null;
    MINING_STATE.history = data.history || [];

    renderMining();
  } catch (e) {
    console.error("Mining load error", e);
  }
}

/* ================================================================================================
   RENDER MINING UI
================================================================================================ */

function renderMining() {
  renderMiningPlans();
  renderActiveMining();
  renderMiningHistory();
}

/**
 * Render available mining plans
 */
function renderMiningPlans() {
  const grid = $("miningGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="mining-card">
      <h3>Starter</h3>
      <div class="subtitle">BX Mining</div>

      <div class="mining-stat"><span>Daily Profit</span><strong>1.2%</strong></div>
      <div class="mining-stat"><span>Duration</span><strong>30 days</strong></div>
      <div class="mining-stat"><span>Min</span><strong>10 BX</strong></div>
      <div class="mining-stat"><span>Max</span><strong>500 BX</strong></div>

      <button class="mining-btn" onclick="subscribeBXMining('starter')">
        Subscribe
      </button>
    </div>

    <div class="mining-card">
      <h3>Silver</h3>
      <div class="subtitle">BX Mining</div>

      <div class="mining-stat"><span>Daily Profit</span><strong>4%</strong></div>
      <div class="mining-stat"><span>Duration</span><strong>45 days</strong></div>
      <div class="mining-stat"><span>Min</span><strong>100 BX</strong></div>
      <div class="mining-stat"><span>Max</span><strong>2000 BX</strong></div>

      <button class="mining-btn" onclick="subscribeBXMining('silver')">
        Subscribe
      </button>
    </div>

    <div class="mining-card">
      <h3>Gold</h3>
      <div class="subtitle">BX Mining</div>

      <div class="mining-stat"><span>Daily Profit</span><strong>9%</strong></div>
      <div class="mining-stat"><span>Duration</span><strong>60 days</strong></div>
      <div class="mining-stat"><span>Min</span><strong>500 BX</strong></div>
      <div class="mining-stat"><span>Max</span><strong>10000 BX</strong></div>

      <button class="mining-btn" onclick="subscribeBXMining('gold')">
        Subscribe
      </button>
    </div>

    <div class="mining-card vip horizontal">
      <div>
        <h3>VIP</h3>
        <div class="subtitle">BX Mining</div>

        <div class="mining-stat"><span>Daily Profit</span><strong>15%</strong></div>
        <div class="mining-stat"><span>Duration</span><strong>90 days</strong></div>
        <div class="mining-stat"><span>Min</span><strong>2000 BX</strong></div>
        <div class="mining-stat"><span>Max</span><strong>50000 BX</strong></div>
      </div>

      <button class="mining-btn" onclick="subscribeBXMining('vip')">
        Subscribe
      </button>
    </div>
  `;
}

/**
 * Render active mining status
 */
function renderActiveMining() {
  if (MINING_STATE.activeBX && $("activeBXMining")) {
    $("activeBXMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeBX);
  }

  if (MINING_STATE.activeBNB && $("activeBNBMining")) {
    $("activeBNBMining").innerHTML =
      renderMiningProgress(MINING_STATE.activeBNB);
  }
}

/**
 * Render mining progress bar
 */
function renderMiningProgress(mining) {
  const progress =
    (mining.days_completed / mining.total_days) * 100;

  return `
    <div class="mining-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
      <p>${mining.days_completed} / ${mining.total_days} days</p>
      <p>Daily Profit: ${mining.daily_profit}</p>
      <p>Total Earned: ${mining.total_earned}</p>
    </div>
  `;
}

/* ================================================================================================
   SUBSCRIBE TO MINING
================================================================================================ */

/**
 * Subscribe BX mining
 */
async function subscribeBXMining(planId) {
  if (!planId) return;

  await fetch(API_BASE + "/mining/bx/subscribe", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId })
  });

  toast("BX Mining activated");
  loadMining();
}

/**
 * Subscribe BNB mining
 */
async function subscribeBNBMining(planId, amount) {
  if (!planId || amount <= 0) return;

  await fetch(API_BASE + "/mining/bnb/subscribe", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId, amount })
  });

  toast("BNB Mining activated");
  loadMining();
}
async function subscribeSOLMining(planId, amount) {
  if (!planId || amount <= 0) return;

  await fetch(API_BASE + "/mining/sol/subscribe", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan: planId, amount })
  });

  toast("SOL Mining activated");
  loadMining();
}

/* ================================================================================================
   MINING HISTORY
================================================================================================ */

function renderMiningHistory() {
  if (!$("miningHistory")) return;

  $("miningHistory").innerHTML = MINING_STATE.history
    .map(entry => `
      <div class="history-item">
        <span>${entry.date}</span>
        <span>${entry.coin}</span>
        <span>${entry.amount}</span>
      </div>
    `)
    .join("");
}

/* ================================================================================================
   DAILY UPDATE HOOK (DISPLAY ONLY)
================================================================================================ */

/**
 * Called after backend daily job
 */
function onMiningDayUpdate() {
  loadMining();
  loadWallet();
}

/* ================================================================================================
   MINING INIT
================================================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!FEATURES.MINING) return;
  loadMining();
});

/* ================================================================================================
   MINING COIN SWITCH (BX / BNB / SOL)  ✅ أضِف هنا
================================================================================================ */

const MINING_COINS = {
  BX: { symbol: "BX", img: "/assets/images/bx.png" },
  BNB:{ symbol: "BNB",img: "/assets/images/bnb.png"},
  SOL:{ symbol: "SOL",img: "/assets/images/sol.png"}
};

let ACTIVE_MINING_COIN = "BX";

document.querySelectorAll(".mining-tabs button").forEach(btn => {
  btn.addEventListener("click", () => {

    document.querySelectorAll(".mining-tabs button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    ACTIVE_MINING_COIN = btn.textContent.trim();
    updateMiningByCoin();
  });
});

function updateMiningByCoin() {
  const coin = MINING_COINS[ACTIVE_MINING_COIN];

  document.querySelectorAll(".mining-plan").forEach(plan => {

    // 🔹 صورة العملة (inline – بدون CSS)
    plan.style.backgroundImage =
      `linear-gradient(180deg,#0e2730,#08161b), url(${coin.img})`;
    plan.style.backgroundRepeat = "no-repeat";
    plan.style.backgroundPosition = "top 14px right 14px";
    plan.style.backgroundSize = "32px";

    // 🔹 تحديث النصوص Min / Max
    plan.querySelectorAll("li strong").forEach(el => {
      el.textContent = el.textContent.replace(/BX|BNB|SOL/g, coin.symbol);
    });

    // 🔹 زر الاشتراك
    const btn = plan.querySelector("button");
    if (btn) {
      btn.textContent = `Subscribe ${coin.symbol}`;
    }
  });
}

// تشغيل افتراضي
document.addEventLi
