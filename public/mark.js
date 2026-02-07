/* =================================================
   MARKET ENGINE — CANVAS FIRST (BINANCE-LIKE)
================================================= */

/* ============== CONFIG ================= */

const BX_USDT_PRICE = 12;
const UPDATE_INTERVAL = 1000;

/* ============== STATE ================= */

const MarketState = {
  pair: "BX/USDT",
  lastPrice: BX_USDT_PRICE,
  prevPrice: BX_USDT_PRICE,

  bids: [],
  asks: [],
  trades: [],

  ema: null,
  vwap: null,

  prices: [],
  volumes: [],

  listeners: []
};

/* ============== HELPERS ================= */

MarketState.onUpdate = fn => MarketState.listeners.push(fn);
const emit = () => MarketState.listeners.forEach(fn => fn(MarketState));

/* ============== FAKE WS (DROP-IN) ================= */

function startFakeWS() {
  setInterval(() => {
    const delta = (Math.random() - 0.5) * 0.02;
    MarketState.prevPrice = MarketState.lastPrice;
    MarketState.lastPrice = +(MarketState.lastPrice + delta).toFixed(4);

    MarketState.bids = Array.from({ length: 12 }, (_, i) => ({
      price: +(MarketState.lastPrice - i * 0.01).toFixed(4),
      qty: +(Math.random() * 5 + 1).toFixed(3)
    }));

    MarketState.asks = Array.from({ length: 12 }, (_, i) => ({
      price: +(MarketState.lastPrice + i * 0.01).toFixed(4),
      qty: +(Math.random() * 5 + 1).toFixed(3)
    }));

    MarketState.trades.unshift({
      price: MarketState.lastPrice,
      qty: +(Math.random() * 2).toFixed(3),
      side: Math.random() > 0.5 ? "buy" : "sell",
      time: new Date().toLocaleTimeString()
    });

    MarketState.trades = MarketState.trades.slice(0, 30);

    updateIndicators();
    emit();
  }, UPDATE_INTERVAL);
}

/* ============== REAL WS (READY) ================= */
// function startRealWS() {
//   const ws = new WebSocket("wss://api.yourdomain/ws/market");
//   ws.onmessage = e => {
//     const d = JSON.parse(e.data);
//     Object.assign(MarketState, d);
//     updateIndicators();
//     emit();
//   };
// }

/* ============== INDICATORS ================= */

function updateIndicators() {
  const price = MarketState.lastPrice;
  const vol = Math.random() * 5 + 1;

  MarketState.prices.push(price * vol);
  MarketState.volumes.push(vol);

  const sumPV = MarketState.prices.reduce((a, b) => a + b, 0);
  const sumV = MarketState.volumes.reduce((a, b) => a + b, 0);
  MarketState.vwap = sumPV / sumV;

  const k = 2 / (14 + 1);
  MarketState.ema =
    MarketState.ema === null
      ? price
      : price * k + MarketState.ema * (1 - k);
}

/* ============== CANVAS RENDER ================= */

const canvas = document.getElementById("marketCanvas");
const ctx = canvas.getContext("2d");

function renderCanvas(m) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const midY = h / 2;
  const scale = 6;

  const y = p => midY - (p - m.lastPrice) * scale;

  /* === GRID === */
  ctx.strokeStyle = "#020617";
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  /* === HEATMAP === */
  const maxQty = Math.max(
    ...m.bids.map(b => b.qty),
    ...m.asks.map(a => a.qty),
    1
  );

  m.bids.forEach((b, i) => {
    ctx.fillStyle = `rgba(34,197,94,${b.qty / maxQty * 0.4})`;
    ctx.fillRect(0, y(b.price), w / 2, 6);
  });

  m.asks.forEach((a, i) => {
    ctx.fillStyle = `rgba(239,68,68,${a.qty / maxQty * 0.4})`;
    ctx.fillRect(w / 2, y(a.price), w / 2, 6);
  });

  /* === PRICE === */
  ctx.strokeStyle = "#22c55e";
  ctx.beginPath();
  ctx.moveTo(0, y(m.lastPrice));
  ctx.lineTo(w, y(m.lastPrice));
  ctx.stroke();

  /* === EMA === */
  ctx.strokeStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(0, y(m.ema));
  ctx.lineTo(w, y(m.ema));
  ctx.stroke();

  /* === VWAP === */
  ctx.strokeStyle = "#a855f7";
  ctx.beginPath();
  ctx.moveTo(0, y(m.vwap));
  ctx.lineTo(w, y(m.vwap));
  ctx.stroke();
}

/* ============== ORDER BOOK UI ================= */

function renderOrderBook(m) {
  const bidsEl = document.getElementById("bids");
  const asksEl = document.getElementById("asks");

  if (!bidsEl || !asksEl) return;

  bidsEl.innerHTML = m.bids
    .map(b => `<div class="row buy">${b.price} • ${b.qty}</div>`)
    .join("");

  asksEl.innerHTML = m.asks
    .map(a => `<div class="row sell">${a.price} • ${a.qty}</div>`)
    .join("");
}

/* ============== TRADES ================= */

function renderTrades(m) {
  const el = document.getElementById("tradesList");
  if (!el) return;

  el.innerHTML = m.trades
    .map(
      t => `
      <div class="trade ${t.side}">
        <span>${t.price}</span>
        <span>${t.qty}</span>
        <span>${t.time}</span>
      </div>
    `
    )
    .join("");
}

/* ============== PRICE FLASH ================= */

function renderPriceFlash(m) {
  const el = document.getElementById("marketPrice");
  if (!el) return;

  el.textContent = m.lastPrice.toFixed(4);

  el.classList.remove("up", "down");
  if (m.lastPrice > m.prevPrice) el.classList.add("up");
  if (m.lastPrice < m.prevPrice) el.classList.add("down");
}

/* ============== SPREAD / SLIPPAGE ================= */

function calcSpread(m) {
  if (!m.bids.length || !m.asks.length) return 0;
  return (m.asks[0].price - m.bids[0].price).toFixed(4);
}

/* ============== SUBSCRIBE ================= */

MarketState.onUpdate(m => {
  renderCanvas(m);
  renderOrderBook(m);
  renderTrades(m);
  renderPriceFlash(m);
});

/* ============== INIT ================= */

function initMarket() {
  if (!canvas) return;
  startFakeWS(); // ← بدّلها إلى startRealWS() لاحقًا
}

document.addEventListener("DOMContentLoaded", initMarket);
