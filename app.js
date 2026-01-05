/* =====================================================
   BX MINI APP — FINAL VANILLA SCRIPT v1.0
===================================================== */

/* =========================
   TELEGRAM INIT
========================= */
const tg = window.Telegram?.WebApp;
if (tg) tg.ready();

const uid =
  tg?.initDataUnsafe?.user?.id ||
  parseInt(localStorage.getItem("uid") || "1", 10);

localStorage.setItem("uid", uid);

/* =========================
   DOM REFERENCES
========================= */
const el = {
  bx: document.getElementById("bx"),
  usdt: document.getElementById("usdt"),
  ton: document.getElementById("ton"),
  rate: document.getElementById("rate"),

  leaderboard: document.getElementById("leaderboard"),
  airdrop: document.getElementById("airdrop"),

  tradeAmount: document.getElementById("tradeAmount"),
  tradePreview: document.getElementById("tradePreview"),
  buyBtn: document.getElementById("buyBtn"),
  sellBtn: document.getElementById("sellBtn"),

  bet: document.getElementById("bet"),
  play: document.getElementById("play"),
  casinoResult: document.getElementById("casinoResult"),
  casinoHistory: document.getElementById("casinoHistory"),

  wdMethod: document.getElementById("wd_method"),
  wdTarget: document.getElementById("wd_target"),
  wdAmount: document.getElementById("wd_amount"),
  wdBtn: document.getElementById("wd_btn"),
  wdStatus: document.getElementById("wd_status"),
  wdHistory: document.getElementById("wd_history"),

  loader: document.getElementById("loader"),
  onboard: document.getElementById("onboard"),
  start: document.getElementById("start"),

  chart: document.getElementById("chart"),
  mineFill: document.getElementById("mineFill"),
};

/* =========================
   LOADER
========================= */
function showLoader() {
  if (el.loader) el.loader.style.display = "flex";
}
function hideLoader() {
  if (el.loader) el.loader.style.display = "none";
}

/* =========================
   ONBOARDING (ONCE)
========================= */
if (el.onboard && !localStorage.getItem("seen")) {
  el.onboard.hidden = false;
}
if (el.start) {
  el.start.onclick = () => {
    el.onboard.hidden = true;
    localStorage.setItem("seen", "1");
  };
}

/* =========================
   FETCH STATE
========================= */
async function fetchState() {
  const r = await fetch(`/state?uid=${uid}`);
  if (!r.ok) throw new Error("state");
  return r.json();
}

/* =========================
   RENDER FUNCTIONS
========================= */
function renderWallet(s) {
  el.bx.textContent = s.wallet.bx;
  el.usdt.textContent = s.wallet.usdt;
  el.ton.textContent = s.wallet.ton;
}

function renderMining(s) {
  el.rate.textContent = `${s.mining.rate} BX/sec`;
  el.mineFill.style.width = Math.min(100, s.airdrop.progress_pct) + "%";
}

function renderLeaderboard(s) {
  el.leaderboard.innerHTML = s.leaderboard
    .map(
      (x) =>
        `${x.rank}. ${
          x.uid === uid ? "You" : "User#" + x.uid
        } — ${x.bx} BX`
    )
    .join("<br>");
}

function renderAirdrop(s) {
  el.airdrop.innerHTML = `
    Progress: ${s.airdrop.progress_pct}%<br>
    ${s.airdrop.message}
  `;
}

/* =========================
   SIMPLE CHART (CANVAS)
========================= */
const ctx = el.chart?.getContext("2d");
let series = [];

function drawChart() {
  if (!ctx || series.length < 2) return;

  ctx.clearRect(0, 0, el.chart.width, el.chart.height);

  const max = Math.max(...series);
  const min = Math.min(...series);
  const pad = 10;
  const w = el.chart.width - pad * 2;
  const h = el.chart.height - pad * 2;

  ctx.beginPath();
  ctx.strokeStyle = "#5b7cff";
  ctx.lineWidth = 2;

  series.forEach((v, i) => {
    const x = pad + (i / (series.length - 1)) * w;
    const y = pad + h - ((v - min) / (max - min || 1)) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

/* =========================
   TRADE UX
========================= */
if (el.tradeAmount) {
  el.tradeAmount.oninput = () => {
    const v = parseFloat(el.tradeAmount.value || 0);
    el.tradePreview.textContent =
      v > 0 ? `≈ ${v} at market price` : "≈ --";
  };
}

async function buyBX(amount) {
  await fetch("/buy/bx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, usdt: amount }),
  });
}

async function sellBX(amount) {
  await fetch("/sell/bx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, bx: amount }),
  });
}

if (el.buyBtn) {
  el.buyBtn.onclick = async () => {
    const v = parseFloat(el.tradeAmount.value || 0);
    if (v <= 0) return;
    if (!confirm(`Confirm buy BX with ${v}?`)) return;
    await buyBX(v);
    el.tradeAmount.value = "";
    load();
  };
}

if (el.sellBtn) {
  el.sellBtn.onclick = async () => {
    const v = parseFloat(el.tradeAmount.value || 0);
    if (v <= 0) return;
    if (!confirm(`Confirm sell ${v} BX?`)) return;
    await sellBX(v);
    el.tradeAmount.value = "";
    load();
  };
}

/* =========================
   CASINO UX (DICE)
========================= */
let lastGames = [];

if (el.play) {
  el.play.onclick = async () => {
    const b = parseFloat(el.bet.value || 0);
    if (b <= 0) return;

    el.casinoResult.textContent = "Rolling…";

    // Placeholder UX (real endpoint already exists)
    const win = Math.random() > 0.5;
    const payout = win ? (b * 1.92).toFixed(2) : "0.00";

    const msg = win
      ? `🎉 You won ${payout} USDT`
      : `❌ You lost`;

    el.casinoResult.textContent = msg;
    lastGames.unshift(msg);
    lastGames = lastGames.slice(0, 3);
    el.casinoHistory.innerHTML = lastGames.join("<br>");
  };
}

/* =========================
   WITHDRAW UX
========================= */
if (el.wdBtn) {
  el.wdBtn.onclick = async () => {
    const method = el.wdMethod.value;
    const target = el.wdTarget.value.trim();
    const amount = parseFloat(el.wdAmount.value || 0);

    if (!target || amount <= 0) return;

    el.wdStatus.textContent = "⏳ Request sent…";

    const r = await fetch("/withdraw/usdt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, amount, method, target }),
    });

    const j = await r.json();

    if (j.ok) {
      el.wdStatus.textContent = "⏳ Pending approval";
      el.wdHistory.innerHTML = `• ${amount} USDT → ${method} (${new Date().toLocaleString()})`;
      el.wdAmount.value = "";
    } else {
      el.wdStatus.textContent = "❌ Error, try again";
    }
  };
}

/* =========================
   TABS NAVIGATION
========================= */
const tabs = document.querySelectorAll(".tabs button");
const pages = document.querySelectorAll("[data-page]");

tabs.forEach((b) => {
  b.onclick = () => {
    tabs.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    pages.forEach(
      (p) => (p.hidden = p.dataset.page !== b.dataset.tab)
    );
  };
});

/* =========================
   MAIN LOAD LOOP
========================= */
async function load() {
  try {
    showLoader();
    const s = await fetchState();

    renderWallet(s);
    renderMining(s);
    renderLeaderboard(s);
    renderAirdrop(s);

    series.push(s.wallet.bx);
    if (series.length > 30) series.shift();
    drawChart();
  } catch (e) {
    console.error("Load error", e);
  } finally {
    hideLoader();
  }
}

load();
setInterval(load, 5000);
