/* ======================================================
   CONFIG
====================================================== */
const API = "https://api.bloxio.online";
const UID = 1; // سيتم ربطه لاحقًا بالجلسة / Telegram

const headers = {
  "Content-Type": "application/json"
};

/* ======================================================
   STATE
====================================================== */
const state = {
  wallet: {},
  prices: {},
  casinoHistory: [],
  rtp: {},
  marketQuote: null
};

/* ======================================================
   CORE FETCH
====================================================== */
async function api(path, options = {}) {
  const r = await fetch(API + path, {
    headers,
    ...options
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t);
  }
  return r.json();
}

/* ======================================================
   WALLET
====================================================== */
async function loadWallet() {
  state.wallet = await api(`/wallet/state?uid=${UID}`);
  renderWallet();
}

function renderWallet() {
  Object.entries(state.wallet).forEach(([k, v]) => {
    const el = document.getElementById(`bal-${k}`);
    if (el) el.innerText = Number(v).toFixed(6);
  });
}

/* ======================================================
   PRICES
====================================================== */
async function loadPrices() {
  state.prices = await api("/public/prices");
  Object.entries(state.prices).forEach(([k, v]) => {
    const el = document.getElementById(`price-${k}`);
    if (el) el.innerText = v === null ? "—" : Number(v).toFixed(4);
  });
}

/* ======================================================
   MARKET
====================================================== */
async function marketPreview() {
  const asset = document.getElementById("marketAsset").value;
  const side = document.getElementById("marketSide").value;
  const amount = Number(document.getElementById("marketAmount").value);

  state.marketQuote = await api("/market/quote", {
    method: "POST",
    body: JSON.stringify({ asset, side, amount })
  });

  document.getElementById("marketResult").innerText =
    `Result: ${state.marketQuote.result} BX`;
}

async function marketConfirm() {
  if (!state.marketQuote) return;

  await api("/market/execute", {
    method: "POST",
    body: JSON.stringify(state.marketQuote)
  });

  state.marketQuote = null;
  document.getElementById("marketResult").innerText = "";
  await loadWallet();
}

/* ======================================================
   CASINO
====================================================== */
async function playGame(game, bet, multiplier = null) {
  const payload = {
    uid: UID,
    game,
    bet,
    multiplier,
    client_seed: Math.random().toString(36).slice(2)
  };

  const res = await api("/casino/play", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  alert(
    res.win
      ? `🎉 WIN ${res.payout} BX`
      : game === "chicken"
        ? "💀 Chicken died"
        : "❌ Lost"
  );

  await loadWallet();
  await loadCasinoHistory();
}

async function loadCasinoHistory() {
  state.casinoHistory = await api(`/casino/history?uid=${UID}&limit=20`);
  const box = document.getElementById("casino-history");
  if (!box) return;

  box.innerHTML = "";
  state.casinoHistory.forEach(h => {
    const d = document.createElement("div");
    d.innerText =
      `${h.game} | bet ${h.bet} | ` +
      (h.win ? `WIN ${h.payout}` : "LOSE");
    box.appendChild(d);
  });
}

/* ======================================================
   RTP (TRANSPARENCY)
====================================================== */
async function loadRTP() {
  state.rtp = await api("/public/rtp");
  const el = document.getElementById("rtp-public");
  if (!el) return;

  el.innerHTML = "";
  Object.entries(state.rtp).forEach(([g, r]) => {
    const d = document.createElement("div");
    d.innerText = `${g}: ${(r.rtp_real * 100).toFixed(2)}%`;
    el.appendChild(d);
  });
}

/* ======================================================
   PAYEER
====================================================== */
async function depositPayeer(amount) {
  const res = await api("/finance/deposit/payeer", {
    method: "POST",
    body: JSON.stringify({ uid: UID, amount })
  });

  const form = document.createElement("form");
  form.method = "POST";
  form.action = res.redirect_url;

  Object.entries(res.params).forEach(([k, v]) => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  });

  document.body.appendChild(form);
  form.submit();
}

/* ======================================================
   BINANCE ID (INFO ONLY)
====================================================== */
function showBinanceInfo() {
  alert(
    "Send USDT via Binance ID.\n" +
    "Min: 10 USDT\n" +
    "Funds credited automatically."
  );
}

/* ======================================================
   INIT
====================================================== */
async function boot() {
  try {
    await loadWallet();
    await loadPrices();
    await loadCasinoHistory();
    await loadRTP();
  } catch (e) {
    console.error(e);
    alert("API error");
  }
}

document.addEventListener("DOMContentLoaded", boot);
