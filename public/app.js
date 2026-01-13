/* =========================
   CONFIG
========================= */
const API = "https://api.bloxio.online";
let UID = null;

/* =========================
   TELEGRAM MINI APP
========================= */
(function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    UID = tg.initDataUnsafe.user.id;
    tg.ready();
    tg.expand();
  }
})();

/* =========================
   STATE
========================= */
const state = {
  wallet: null,
  prices: {},
  deposit: {
    sol: "",
    btc: ""
  },
  deposit_status: "pending"
};

/* =========================
   API HELPER
========================= */
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* =========================
   LOAD USER / WALLET
========================= */
async function loadMe() {
  const me = await api(`/finance/me?uid=${UID}`);
  state.wallet = me.wallet;
  state.deposit_status = me.deposit_status;

  renderWallet();
  toggleCasino();
}

function renderWallet() {
  for (const [k, v] of Object.entries(state.wallet)) {
    const el = document.getElementById(`bal-${k}`);
    if (el) el.innerText = Number(v).toFixed(6);
  }
}

/* =========================
   DEPOSIT ADDRESSES
========================= */
async function loadDepositAddresses() {
  const d = await api("/finance/deposit_addresses");
  state.deposit.sol = d.sol;
  state.deposit.btc = d.btc;

  renderSolDeposit();
  renderBtcDeposit();
}

/* =========================
   SOL DEPOSIT (MEMO)
========================= */
function renderSolDeposit() {
  if (!state.deposit.sol || !UID) return;

  const memo = `UID:${UID}`;
  document.getElementById("sol-address").innerText = state.deposit.sol;
  document.getElementById("sol-memo").innerText = memo;

  window.copySolMemo = () =>
    navigator.clipboard.writeText(memo);

  if (window.QRious) {
    new QRious({
      element: document.getElementById("sol-qr"),
      value: `solana:${state.deposit.sol}?memo=${memo}`,
      size: 200
    });
  }
}

/* =========================
   BTC DEPOSIT (BIP21)
========================= */
function renderBtcDeposit() {
  if (!state.deposit.btc) return;

  document.getElementById("btc-address").innerText = state.deposit.btc;

  if (window.QRious) {
    new QRious({
      element: document.getElementById("btc-qr"),
      value: `bitcoin:${state.deposit.btc}`,
      size: 200
    });
  }
}

/* =========================
   MARKET
========================= */
async function marketQuote(asset, side, amount) {
  return api("/market/quote", {
    method: "POST",
    body: JSON.stringify({ asset, side, amount })
  });
}

async function marketExecute(quote) {
  await api("/market/execute", {
    method: "POST",
    body: JSON.stringify({ ...quote, uid: UID })
  });
  await loadMe();
}

/* =========================
   CASINO (GUARD)
========================= */
function toggleCasino() {
  const blocked = state.deposit_status !== "confirmed";
  document.querySelectorAll(".casino-btn").forEach(b => {
    b.disabled = blocked;
  });

  const warn = document.getElementById("casino-warning");
  if (warn) warn.style.display = blocked ? "block" : "none";
}

async function playGame(game, bet, multiplier = null) {
  if (state.deposit_status !== "confirmed") {
    alert("Deposit not confirmed yet");
    return;
  }

  await api("/casino/play", {
    method: "POST",
    body: JSON.stringify({
      uid: UID,
      game,
      bet,
      multiplier
    })
  });

  await loadMe();
}

/* =========================
   PRICES / RTP
========================= */
async function loadPrices() {
  state.prices = await api("/public/prices");
  for (const [k, v] of Object.entries(state.prices)) {
    const el = document.getElementById(`price-${k}`);
    if (el) el.innerText = v === null ? "—" : v;
  }
}

async function loadRTP() {
  const rtp = await api("/public/rtp");
  const el = document.getElementById("rtp-public");
  if (el) el.innerText = `${(rtp.rtp * 100).toFixed(2)}%`;
}

/* =========================
   BOOT
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!UID) throw new Error("UID missing");
    await loadMe();
    await loadDepositAddresses();
    await loadPrices();
    await loadRTP();
  } catch (e) {
    console.error(e);
    alert("Initialization error");
  }
});
