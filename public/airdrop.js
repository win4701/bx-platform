/*=========================================================
   AIRDROP / TOPUP v6 — SOVEREIGN ENGINE
   Fully Isolated / No Break
========================================================= */

const SOVEREIGN = {
  fiat: 0,
  usdt: 0,
  effectiveRate: 0,
  lockedUntil: 0,
  country: "",
  exposure: 0,
  liquidity: 0,
  hedgeCost: 0
};

let GLOBAL_EXPOSURE = 0;
let CAPITAL_RESERVE = 100000; // internal simulated reserve
let HEDGE_MODE = false;


/* ================= INIT ================= */

function initTopupV6() {
  const calc = document.getElementById("topup-calc");
  const confirm = document.getElementById("topup-confirm");
  if (!calc || !confirm) return;

  calc.onclick = calculateTopupV6;
  confirm.onclick = confirmTopupV6;
}


/* ================= REAL P2P ANCHOR ================= */

async function fetchBinanceP2P(country) {
  try {
    const res = await fetch(
      `https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: "USDT",
          fiat: country,
          tradeType: "SELL",
          page: 1,
          rows: 5
        })
      }
    );

    const data = await res.json();
    const prices = data.data.map(d => parseFloat(d.adv.price));
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return avg;
  } catch {
    return 1;
  }
}


/* ================= FX GAP ================= */

async function fetchBankFX(country) {
  try {
    const res = await safeFetch(`/pricing/bank-fx?country=${country}`);
    return parseFloat(res.rate || 1);
  } catch {
    return 1;
  }
}


/* ================= VOLATILITY BUFFER ================= */

function volatilityBuffer() {
  return 0.005 + Math.random() * 0.01;
}


/* ================= COUNTRY RISK ================= */

const COUNTRY_RISK = {
  DZ: 0.08,
  MA: 0.05,
  TN: 0.04,
  FR: 0.02
};


/* ================= LIQUIDITY STRESS ================= */

function liquidityStress(usdtAmount) {
  if (usdtAmount > 5000) return 0.02;
  if (usdtAmount > 2000) return 0.01;
  return 0.003;
}


/* ================= HEDGE ENGINE ================= */

function hedgeEngine(usdtAmount) {
  if (usdtAmount > 10000) {
    HEDGE_MODE = true;
    return usdtAmount * 0.002; // hedge cost 0.2%
  }
  return 0;
}


/* ================= CALCULATE V6 ================= */

async function calculateTopupV6() {

  const amount = parseFloat(document.getElementById("topup-amount")?.value);
  const country = document.getElementById("topup-country")?.value;

  if (!amount || amount <= 0) return;

  const p2p = await fetchBinanceP2P(country);
  const bankFx = await fetchBankFX(country);

  const fxGap = p2p - bankFx;
  const risk = COUNTRY_RISK[country] || 0.05;

  const baseRate =
    p2p +
    fxGap * 0.5 +
    volatilityBuffer() +
    risk;

  const usdtAmount = amount / baseRate;

  const stress = liquidityStress(usdtAmount);
  const hedgeCost = hedgeEngine(usdtAmount);

  const finalRate = baseRate * (1 + stress) + hedgeCost;

  SOVEREIGN.fiat = amount;
  SOVEREIGN.usdt = amount / finalRate;
  SOVEREIGN.effectiveRate = finalRate;
  SOVEREIGN.lockedUntil = Date.now() + 20000;
  SOVEREIGN.country = country;
  SOVEREIGN.hedgeCost = hedgeCost;

  renderSovereignSummary();
}


/* ================= RENDER ================= */

function renderSovereignSummary() {

  const box = document.getElementById("topup-result");
  if (!box) return;

  box.innerHTML = `
    <div class="topup-summary">
      <div>Rate: ${SOVEREIGN.effectiveRate.toFixed(4)}</div>
      <div>You Pay: <b>${SOVEREIGN.usdt.toFixed(2)} USDT</b></div>
      <div>Hedge: ${SOVEREIGN.hedgeCost.toFixed(2)}</div>
      <div>Reserve: ${CAPITAL_RESERVE.toFixed(0)}</div>
      <div class="lock"></div>
    </div>
  `;

  lockCountdown();
}


/* ================= LOCK TIMER ================= */

function lockCountdown() {
  const el = document.querySelector(".lock");
  if (!el) return;

  const interval = setInterval(() => {
    const remain =
      Math.floor((SOVEREIGN.lockedUntil - Date.now()) / 1000);

    if (remain <= 0) {
      el.innerText = "Rate expired";
      clearInterval(interval);
      return;
    }

    el.innerText = `Lock: ${remain}s`;
  }, 1000);
}


/* ================= CONFIRM ================= */

async function confirmTopupV6() {

  if (Date.now() > SOVEREIGN.lockedUntil) {
    showToast("Rate expired", "warning");
    return;
  }

  if (SOVEREIGN.usdt > CAPITAL_RESERVE) {
    showToast("Reserve insufficient", "error");
    return;
  }

  CAPITAL_RESERVE -= SOVEREIGN.usdt;
  GLOBAL_EXPOSURE += SOVEREIGN.usdt;

  await safeFetch("/topup/sovereign", {
    method: "POST",
    body: JSON.stringify(SOVEREIGN)
  });

  showToast("Executed (Institutional)", "success");
}


/* ================= ROUTER ================= */

document
  .querySelector('[data-view="airdrop"]')
  ?.addEventListener("click", () => {
    navigate("airdrop");
    loadAirdrop();
    setTimeout(initTopupV6, 200);
  });


/* ================= TOAST ================= */

function showToast(msg, type = "info") {
  console.log(`[${type}] ${msg}`);
     }
