/* =====================================================
   GLOBAL CONFIG
===================================================== */
const API_BASE = "https://api.bloxio.online";
const API_KEY = ""; // ضع API_KEY إن استُخدم

const headers = () => ({
  "Content-Type": "application/json",
  ...(API_KEY ? { "X-API-KEY": API_KEY } : {})
});

/* =====================================================
   GLOBAL STATE
===================================================== */
const state = {
  uid: 1,
  wallet: {},
  prices: {},
  chart: [],
  casinoHistory: [],
  airdrop: {
    score: 0,
    threshold: 100,
    estimateBX: 0,
    eligible: false
  }
};

/* =====================================================
   GENERIC FETCH
===================================================== */
async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: headers(),
    ...options
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t);
  }
  return res.json();
}

/* =====================================================
   WALLET
===================================================== */
async function loadWallet() {
  state.wallet = await api(`/wallet/state?uid=${state.uid}`);
  renderWallet();
}

function renderWallet() {
  for (const k in state.wallet) {
    const el = document.getElementById(`bal-${k}`);
    if (el) el.innerText = Number(state.wallet[k]).toFixed(6);
  }
}

/* =====================================================
   PRICES
===================================================== */
async function loadPrices() {
  state.prices = await api("/public/prices");
  renderPrices();
}

function renderPrices() {
  for (const k in state.prices) {
    const el = document.getElementById(`price-${k}`);
    if (el) {
      el.innerText =
        state.prices[k] === null ? "—" : Number(state.prices[k]).toFixed(4);
    }
  }
}

/* =====================================================
   PRICE CHART (BX)
===================================================== */
async function loadChart() {
  state.chart = await api("/chart/prices?asset=bx");
  renderChart();
}

function renderChart() {
  if (!window.Chart) return;
  const ctx = document.getElementById("bxChart");
  if (!ctx) return;

  const labels = state.chart.map(p =>
    new Date(p.ts * 1000).toLocaleTimeString()
  );
  const data = state.chart.map(p => p.price);

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "BX Price",
          data,
          borderWidth: 2
        }
      ]
    },
    options: { responsive: true }
  });
}

/* =====================================================
   MARKET (QUOTE → EXECUTE)
===================================================== */
async function marketQuote(asset, side, amount) {
  return api("/market/quote", {
    method: "POST",
    body: JSON.stringify({ asset, side, amount })
  });
}

async function marketExecute(q) {
  return api("/market/execute", {
    method: "POST",
    body: JSON.stringify(q)
  });
}

/* =====================================================
   CASINO
===================================================== */
async function playGame(game, bet, multiplier = null, choice = null) {
  const client_seed = Math.random().toString(36).slice(2);
  const payload = {
    uid: state.uid,
    game,
    bet,
    multiplier,
    choice,
    client_seed
  };

  const res = await api("/casino/play", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  alert(
    res.win
      ? `🎉 You won ${res.payout} BX`
      : "❌ You lost. Welcome to the forest."
  );

  loadWallet();
  loadCasinoHistory();
}

async function loadCasinoHistory() {
  state.casinoHistory = await api(
    `/casino/history?uid=${state.uid}&limit=20`
  );
  renderCasinoHistory();
}

function renderCasinoHistory() {
  const box = document.getElementById("casino-history");
  if (!box) return;
  box.innerHTML = "";
  state.casinoHistory.forEach(h => {
    const d = document.createElement("div");
    d.innerText = `${h.game} | bet ${h.bet} | ${
      h.win ? "WIN" : "LOSE"
    }`;
    box.appendChild(d);
  });
}

/* =====================================================
   AIRDROP
===================================================== */
async function loadAirdrop() {
  state.airdrop = await api(`/airdrop/status?uid=${state.uid}`);
  renderAirdrop();
}

function renderAirdrop() {
  const bar = document.getElementById("airdrop-bar");
  const info = document.getElementById("airdrop-info");
  const btn = document.getElementById("airdrop-claim");

  if (!bar || !info) return;

  const p = Math.min(
    (state.airdrop.score / state.airdrop.threshold) * 100,
    100
  );
  bar.style.width = `${p}%`;

  info.innerText = `Score ${state.airdrop.score}/${state.airdrop.threshold} • Est ${state.airdrop.estimateBX} BX`;

  if (btn) btn.disabled = !state.airdrop.eligible;
}

async function claimAirdrop() {
  await api("/airdrop/claim", { method: "POST" });
  loadWallet();
  loadAirdrop();
}

/* =====================================================
   TRANSPARENCY
===================================================== */
async function loadTransparency() {
  const data = await api("/public/airdrop/summary");
  const el = document.getElementById("airdrop-public");
  if (!el) return;

  el.innerText = `Epoch ${data.epoch} • Users ${data.users} • Avg ${data.avg_bx} BX`;
}

/* =====================================================
   BOOT
===================================================== */
async function boot() {
  try {
    await Promise.all([
      loadWallet(),
      loadPrices(),
      loadChart(),
      loadCasinoHistory(),
      loadAirdrop(),
      loadTransparency()
    ]);
  } catch (e) {
    console.error(e);
    alert("API error");
  }
}

document.addEventListener("DOMContentLoaded", boot);
