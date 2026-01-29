"use strict";

/* =====================================================
   STON UI ADAPTER
   JS = Render فقط
===================================================== */

const API_BASE = "https://bx-backend.fly.dev";

/* ================= HELPERS ================= */

const $ = (id) => document.getElementById(id);

function safe(fn) {
  try { fn(); } catch (e) { console.error(e); }
}

/* ================= STATE ================= */

let STON_STATE = {
  pair: "BX/USDT",
  price: 0
};

/* ================= RENDER ================= */

function renderPair() {
  const el = $("pairDisplay");
  if (el) el.textContent = STON_STATE.pair;
}

function renderPrice() {
  const el = $("lastPrice");
  if (el) el.textContent = Number(STON_STATE.price).toFixed(6);
}

function renderTx(txid, amount) {
  const box = $("transactionHistory");
  if (!box) return;

  const row = document.createElement("div");
  row.className = "transaction-row";
  row.textContent = `TX ${txid} | ${amount} BX`;
  box.prepend(row);
}

/* ================= API ================= */

async function fetchPrice() {
  try {
    const r = await fetch(
      `${API_BASE}/market/price?pair=${encodeURIComponent(STON_STATE.pair)}`
    );
    if (!r.ok) return;

    const data = await r.json();
    STON_STATE.price = data.price;
    renderPrice();
  } catch (e) {
    console.error("Price fetch error", e);
  }
}

async function sendOrder(side, amount) {
  const r = await fetch(`${API_BASE}/market/${side}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pair: STON_STATE.pair,
      amount
    })
  });

  if (!r.ok) {
    alert("Order failed");
    return;
  }

  const data = await r.json();
  renderTx(data.txid || "PENDING", amount);
  fetchPrice();
}

/* ================= ACTIONS ================= */

function buyBX() {
  const amount = Number($("tradeAmount")?.value);
  if (!amount || amount <= 0) {
    alert("Invalid amount");
    return;
  }
  sendOrder("buy", amount);
}

function sellBX() {
  const amount = Number($("tradeAmount")?.value);
  if (!amount || amount <= 0) {
    alert("Invalid amount");
    return;
  }
  sendOrder("sell", amount);
}

/* ================= PAIR SWITCH ================= */

function bindPairs() {
  $("pairScroll")?.addEventListener("click", (e) => {
    const btn = e.target;
    if (btn.tagName !== "BUTTON") return;

    STON_STATE.pair = btn.dataset.pair;
    renderPair();
    fetchPrice();
  });
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  safe(renderPair);
  safe(fetchPrice);

  $("buyBtn")?.addEventListener("click", buyBX);
  $("sellBtn")?.addEventListener("click", sellBX);

  bindPairs();
});
