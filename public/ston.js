"use strict";

/* =====================================================
   STON.FI FINAL INTEGRATION
   BX ↔ TON / BX ↔ USDT (TON)
   Client-side ONLY (Correct & Safe)
===================================================== */

/* ================= CONFIG ================= */

// BX Jetton Master
const BX_CONTRACT = "EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a";

const USDT_TON_CONTRACT = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

// ston.fi app
const STON_SWAP_URL = "https://app.ston.fi/swap";

// Backend (اختياري – تسجيل فقط)
const BACKEND_API = "https://api.bloxio.online/market/record";

/* ================= STATE ================= */

const STON_STATE = {
  walletConnected: false,
  wallet: null
};

/* ================= HELPERS ================= */

const $ = (id) => document.getElementById(id);

function notify(msg) {
  console.log("[STON]", msg);
  alert(msg);
}

/* ================= WALLET ================= */
/*
  Stub آمن.
  (لاحقًا يمكن استبداله بـ TonConnect SDK)
*/
async function connectTonWallet() {
  STON_STATE.walletConnected = true;
  STON_STATE.wallet = "TON_WALLET_CONNECTED";
  notify("TON Wallet connected");
}

/* ================= STON URL BUILDER ================= */
/*
  pair:
    - BX_TON
    - BX_USDT

  side:
    - buy  (base <- quote)
    - sell (base -> quote)
*/
function buildSwapUrl({ pair, side, amount }) {
  let fromToken, toToken;

  switch (pair) {
    case "BX_TON":
      fromToken = side === "buy" ? "TON" : BX_CONTRACT;
      toToken   = side === "buy" ? BX_CONTRACT : "TON";
      break;

    case "BX_USDT":
      fromToken = side === "buy" ? USDT_TON_CONTRACT : BX_CONTRACT;
      toToken   = side === "buy" ? BX_CONTRACT : USDT_TON_CONTRACT;
      break;

    default:
      throw new Error("Unsupported pair");
  }

  const params = new URLSearchParams({
    chartVisible: "false",
    ft: fromToken,
    tt: toToken,
    amount: amount
  });

  return `${STON_SWAP_URL}?${params.toString()}`;
}

/* ================= ACTION ================= */

async function swapBX({ pair, side, amount }) {
  if (!STON_STATE.walletConnected) {
    notify("Please connect TON wallet first");
    return;
  }

  if (!amount || amount <= 0) {
    notify("Invalid amount");
    return;
  }

  let url;
  try {
    url = buildSwapUrl({ pair, side, amount });
  } catch (e) {
    notify(e.message);
    return;
  }

  // فتح ston.fi للمستخدم
  window.open(url, "_blank");

  // ⬇️ تسجيل اختياري في Backend (لا يعتمد عليه التنفيذ)
  try {
    await fetch(BACKEND_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ston.fi",
        pair,
        side,
        amount,
        base: "BX",
        quote: pair === "BX_TON" ? "TON" : "USDT",
        contract: BX_CONTRACT
      })
    });
  } catch {
    // تجاهل أي فشل – لا يؤثر على المستخدم
  }
}

/* ================= UI BINDINGS ================= */

document.addEventListener("DOMContentLoaded", () => {

  document.body.addEventListener("click", (e) => {
    const id = e.target.id;

    // Wallet
    if (id === "connectTon") {
      connectTonWallet();
    }

    // BX ↔ TON
    if (id === "buyBX_TON") {
      swapBX({ pair: "BX_TON", side: "buy", amount: 1 });
    }

    if (id === "sellBX_TON") {
      swapBX({ pair: "BX_TON", side: "sell", amount: 1 });
    }

    // BX ↔ USDT
    if (id === "buyBX_USDT") {
      swapBX({ pair: "BX_USDT", side: "buy", amount: 1 });
    }

    if (id === "sellBX_USDT") {
      swapBX({ pair: "BX_USDT", side: "sell", amount: 1 });
    }
  });

});
