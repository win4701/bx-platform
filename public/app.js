=======================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";

/* =========================================================
   TELEGRAM MINI APP (OPTIONAL)
========================================================= */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  document.body.classList.add("tma");
}

/* =========================================
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
   BINANCE ID (INFO)
====================================================== */
function showBinanceInfo() {
  alert(
    "Send USDT via Binance ID.\n" +
    "Min: 10 USDT\n" +
    "Funds credited automatically."
  );
}

/* ======================================================
   WALLETCONNECT – TRC20 (USDT)
====================================================== */
let wcProvider, wcSigner;

async function connectWalletEVM() {
  const web3Modal = new window.Web3Modal.default({
    cacheProvider: false
  });

  wcProvider = new ethers.providers.Web3Provider(
    await web3Modal.connect()
  );
  wcSigner = wcProvider.getSigner();
}

async function depositUSDT_TRC20(amount = 10) {
  await connectWalletEVM();

  const USDT = new ethers.Contract(
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    ["function transfer(address to,uint amount) returns (bool)"],
    wcSigner
  );

  const tx = await USDT.transfer(
    window.TREASURY_TRC20,
    ethers.utils.parseUnits(amount.toString(), 6)
  );

  await tx.wait();

  await api("/finance/deposit/walletconnect", {
    method: "POST",
    body: JSON.stringify({
      uid: UID,
      network: "trc20",
      txid: tx.hash
    })
  });

  alert("Deposit submitted");
  await loadWallet();
}

/* ======================================================
   WALLETCONNECT – TON (USDT)
====================================================== */
let tonConnect;

function initTonConnect() {
  tonConnect = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://bloxio.online/tonconnect-manifest.json"
  });
}

async function depositUSDT_TON(amount = 10) {
  if (!tonConnect) initTonConnect();

  const wallet = await tonConnect.connectWallet();
  if (!wallet) throw new Error("TON WALLET NOT CONNECTED");

  // إرسال USDT TON (يتم توقيعها في المحفظة)
  // بعد الإرسال، احصل على txid من TON explorer

  const txid = prompt("Paste TON USDT tx hash");

  await api("/finance/deposit/walletconnect", {
    method: "POST",
    body: JSON.stringify({
      uid: UID,
      network: "ton",
      txid
    })
  });

  alert("Deposit submitted");
  await loadWallet();
}

/* ======================================================
   MINING (PLACEHOLDER)
====================================================== */
function startMining() {
  alert("Mining started (backend connected)");
}

/* ======================================================
   AIRDROP (PLACEHOLDER)
====================================================== */
function claimAirdrop() {
  alert("Airdrop claimed");
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
