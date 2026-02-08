/* =========================================================
   MARKET.JS — FULL ENGINE (SAFE / PRODUCTION READY)
   Compatible with provided Market HTML
========================================================= */

/* ================== CONFIG ================== */
const CFG = {
  BASE_PRICE: 12,
  TICK_MS: 900,
  SPREAD: 0.015,
  LEVELS: 15,
  FEE: 0.001,
  USE_REAL_WS: false, // true لاحقًا
};

/* ================== STATE ================== */
const S = {
  pair: "BX/USDT",
  last: CFG.BASE_PRICE,
  prev: CFG.BASE_PRICE,
  t: Math.floor(Date.now() / 1000),
  bids: [],
  asks: [],
  trades: [],
  position: { qty: 0, entry: 0 },
};

/* ================== DOM ================== */
const canvas = document.getElementById("marketCanvas");
const ctx = canvas.getContext("2d");

const priceEl = document.getElementById("marketPrice");
const approxEl = document.getElementById("marketApprox");
const spreadEl = document.getElementById("spread");
const execPriceEl = document.getElementById("execPrice");
const slippageEl = document.getElementById("slippage");

const bidsEl = document.getElementById("bids");
const asksEl = document.getElementById("asks");
const ladderEl = document.getElementById("priceLadder");
const tradesEl = document.getElementById("tradesList");

const buyTab = document.getElementById("buyTab");
const sellTab = document.getElementById("sellTab");
const actionBtn = document.getElementById("actionBtn");
const orderAmount = document.getElementById("orderAmount");

/* ================== UI STATE ================== */
let SIDE = "buy";

/* ================== CANVAS CHART ================== */
function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const h = canvas.height;
  const w = canvas.width;
  const midY = h / 2;
  const scale = 8;

  const y = p => midY - (p - S.last) * scale;

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  // depth heat
  const maxQty = Math.max(
    ...S.bids.map(b => b.qty),
    ...S.asks.map(a => a.qty),
    1
  );

  S.bids.forEach(b => {
    ctx.fillStyle = `rgba(14,203,129,${(b.qty / maxQty) * 0.4})`;
    ctx.fillRect(0, y(b.price), w / 2, 5);
  });

  S.asks.forEach(a => {
    ctx.fillStyle = `rgba(246,70,93,${(a.qty / maxQty) * 0.4})`;
    ctx.fillRect(w / 2, y(a.price), w / 2, 5);
  });

  // mid price
  ctx.strokeStyle = "#ffffff";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, y(S.last));
  ctx.lineTo(w, y(S.last));
  ctx.stroke();
  ctx.setLineDash([]);
}

/* ================== FAKE ENGINE ================== */
function genBook(mid) {
  S.bids = [];
  S.asks = [];
  for (let i = 1; i <= CFG.LEVELS; i++) {
    S.bids.push({
      price: +(mid - i * 0.01).toFixed(4),
      qty: +(Math.random() * 4 + 0.5).toFixed(3),
    });
    S.asks.push({
      price: +(mid + i * 0.01).toFixed(4),
      qty: +(Math.random() * 4 + 0.5).toFixed(3),
    });
  }
}

function fakeTick() {
  S.prev = S.last;
  const move = (Math.random() - 0.5) * 0.06;
  S.last = +(Math.max(0.1, S.last + move)).toFixed(4);

  genBook(S.last);

  S.trades.unshift({
    price: S.last,
    qty: +(Math.random() * 1.5 + 0.1).toFixed(3),
    side: S.last >= S.prev ? "buy" : "sell",
    time: Date.now(),
  });
  S.trades = S.trades.slice(0, 30);

  renderAll();
}

/* ================== RENDER ================== */
function renderAll() {
  priceEl.textContent = S.last.toFixed(4);
  approxEl.textContent = `≈ ${S.last.toFixed(2)} USDT`;

  const spread = (S.asks[0].price - S.bids[0].price).toFixed(4);
  spreadEl.textContent = spread;

  renderBook();
  renderLadder();
  renderTrades();
  drawChart();
  previewOrder();
}

function renderBook() {
  bidsEl.innerHTML = S.bids.map(
    b => `<div class="ob-row buy"><span>${b.price}</span><span>${b.qty}</span></div>`
  ).join("");
  asksEl.innerHTML = S.asks.map(
    a => `<div class="ob-row sell"><span>${a.price}</span><span>${a.qty}</span></div>`
  ).join("");
}

function renderLadder() {
  ladderEl.innerHTML = `
    ${S.asks.slice(0,6).reverse().map(a=>`<div class="ladder sell">${a.price}</div>`).join("")}
    <div class="ladder mid">${S.last}</div>
    ${S.bids.slice(0,6).map(b=>`<div class="ladder buy">${b.price}</div>`).join("")}
  `;
}

function renderTrades() {
  tradesEl.innerHTML = S.trades.map(
    t => `<div class="trade ${t.side}">
      <span>${t.price}</span>
      <span>${t.qty}</span>
      <span>${new Date(t.time).toLocaleTimeString()}</span>
    </div>`
  ).join("");
}

/* ================== ORDER PREVIEW ================== */
function previewOrder() {
  const qty = +orderAmount.value || 0;
  if (!qty) {
    execPriceEl.textContent = "—";
    slippageEl.textContent = "—";
    return;
  }

  const best = SIDE === "buy" ? S.asks[0].price : S.bids[0].price;
  const exec = best * (1 + (SIDE === "buy" ? CFG.SPREAD : -CFG.SPREAD));

  execPriceEl.textContent = exec.toFixed(4);
  slippageEl.textContent = ((Math.abs(exec - best) / best) * 100).toFixed(2);
}

/* ================== BUY / SELL ================== */
async function sendOrder() {
  const qty = +orderAmount.value;
  if (!qty || qty <= 0) return alert("Invalid amount");

  await fetch("/api/order/market", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.token}`,
    },
    body: JSON.stringify({ side: SIDE, qty }),
  });

  orderAmount.value = "";
}

actionBtn.onclick = sendOrder;

/* ================== TABS ================== */
buyTab.onclick = () => {
  SIDE = "buy";
  buyTab.classList.add("active");
  sellTab.classList.remove("active");
  actionBtn.textContent = "Buy BX";
  actionBtn.className = "action-btn buy";
};
sellTab.onclick = () => {
  SIDE = "sell";
  sellTab.classList.add("active");
  buyTab.classList.remove("active");
  actionBtn.textContent = "Sell BX";
  actionBtn.className = "action-btn sell";
};

/* ================== PAIRS ================== */
document.querySelectorAll(".pair-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".pair-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    S.pair = btn.dataset.pair;
    document.getElementById("quoteAsset").textContent = S.pair.split("/")[1];
    S.last = CFG.BASE_PRICE;
  };
});

/* ================== INIT ================== */
setInterval(fakeTick, CFG.TICK_MS);
