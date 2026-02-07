/* =================================================
   MARKET.JS — FULL ENGINE (CANVAS FIRST)
================================================= */

const MARKET_CONFIG = {
  BASE_PRICE: 12,
  UPDATE_INTERVAL: 1000,
  EMA_PERIOD: 14
};

/* ================= STATE ================= */

const MarketState = {
  pair: "BX/USDT",

  lastPrice: MARKET_CONFIG.BASE_PRICE,
  prevPrice: MARKET_CONFIG.BASE_PRICE,

  bids: [],
  asks: [],
  trades: [],

  ema: null,
  vwap: null,

  pv: 0,
  vol: 0,

  listeners: []
};

/* ================= EVENTS ================= */

MarketState.onUpdate = fn => MarketState.listeners.push(fn);
const emit = () => MarketState.listeners.forEach(fn => fn(MarketState));

/* ================= FAKE WEBSOCKET ================= */

function startFakeWS() {
  setInterval(() => {
    MarketState.prevPrice = MarketState.lastPrice;

    const delta = (Math.random() - 0.5) * 0.05;
    MarketState.lastPrice = +(MarketState.lastPrice + delta).toFixed(4);

    MarketState.bids = Array.from({ length: 12 }, (_, i) => ({
      price: +(MarketState.lastPrice - (i + 1) * 0.01).toFixed(4),
      qty: +(Math.random() * 6 + 1).toFixed(3)
    }));

    MarketState.asks = Array.from({ length: 12 }, (_, i) => ({
      price: +(MarketState.lastPrice + (i + 1) * 0.01).toFixed(4),
      qty: +(Math.random() * 6 + 1).toFixed(3)
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
  }, MARKET_CONFIG.UPDATE_INTERVAL);
}

/* ================= REAL WEBSOCKET (READY) ================= */
// function startRealWS() {
//   const ws = new WebSocket("wss://api.yourdomain/ws/market");
//   ws.onmessage = e => {
//     const d = JSON.parse(e.data);
//     Object.assign(MarketState, d);
//     updateIndicators();
//     emit();
//   };
// }

/* ================= INDICATORS ================= */

function updateIndicators() {
  const price = MarketState.lastPrice;
  const volume = Math.random() * 5 + 1;

  MarketState.pv += price * volume;
  MarketState.vol += volume;
  MarketState.vwap = MarketState.pv / MarketState.vol;

  const k = 2 / (MARKET_CONFIG.EMA_PERIOD + 1);
  MarketState.ema =
    MarketState.ema === null
      ? price
      : price * k + MarketState.ema * (1 - k);
}

/* ================= CANVAS ================= */

const canvas = document.getElementById("marketCanvas");
const ctx = canvas?.getContext("2d");

function renderCanvas(m) {
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const midY = h / 2;
  const scale = 6;
  const y = p => midY - (p - m.lastPrice) * scale;

  /* GRID */
  ctx.strokeStyle = "#020617";
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

  /* HEATMAP */
  const maxQty = Math.max(
    ...m.bids.map(b => b.qty),
    ...m.asks.map(a => a.qty),
    1
  );

  m.bids.forEach(b => {
    ctx.fillStyle = `rgba(34,197,94,${(b.qty / maxQty) * 0.4})`;
    ctx.fillRect(0, y(b.price), w / 2, 6);
  });

  m.asks.forEach(a => {
    ctx.fillStyle = `rgba(239,68,68,${(a.qty / maxQty) * 0.4})`;
    ctx.fillRect(w / 2, y(a.price), w / 2, 6);
  });

  /* PRICE */
  drawLine(m.lastPrice, "#22c55e");

  /* EMA */
  drawLine(m.ema, "#facc15");

  /* VWAP */
  drawLine(m.vwap, "#a855f7");

  function drawLine(val, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y(val));
    ctx.lineTo(w, y(val));
    ctx.stroke();
  }
}

/* ================= ORDER BOOK ================= */

function renderOrderBook(m) {
  const bidsEl = document.getElementById("bids");
  const asksEl = document.getElementById("asks");
  if (!bidsEl || !asksEl) return;

  bidsEl.innerHTML = m.bids
    .map(b => `<div class="row buy">${b.price} <span>${b.qty}</span></div>`)
    .join("");

  asksEl.innerHTML = m.asks
    .map(a => `<div class="row sell">${a.price} <span>${a.qty}</span></div>`)
    .join("");
}

/* ================= PRICE LADDER ================= */

function renderPriceLadder(m) {
  const el = document.getElementById("priceLadder");
  if (!el) return;

  const rows = [];

  m.asks.slice(0, 8).reverse().forEach(a => {
    rows.push(`<div class="ladder-row sell">${a.price} • ${a.qty}</div>`);
  });

  rows.push(`<div class="ladder-row mid">${m.lastPrice}</div>`);

  m.bids.slice(0, 8).forEach(b => {
    rows.push(`<div class="ladder-row buy">${b.price} • ${b.qty}</div>`);
  });

  el.innerHTML = rows.join("");
}

/* ================= TRADES ================= */

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
      </div>`
    )
    .join("");
}

/* ================= PRICE FLASH ================= */

function renderPriceFlash(m) {
  const el = document.getElementById("marketPrice");
  if (!el) return;

  el.textContent = m.lastPrice.toFixed(4);
  el.classList.remove("up", "down");

  if (m.lastPrice > m.prevPrice) el.classList.add("up");
  if (m.lastPrice < m.prevPrice) el.classList.add("down");
}

/* ================= SPREAD ================= */

function getSpread(m) {
  if (!m.bids.length || !m.asks.length) return 0;
  return +(m.asks[0].price - m.bids[0].price).toFixed(4);
}

/* ================= SUBSCRIBE ================= */

MarketState.onUpdate(m => {
  renderCanvas(m);
  renderOrderBook(m);
  renderPriceLadder(m);
  renderTrades(m);
  renderPriceFlash(m);
});

/* ================= INIT ================= */

function initMarket() {
  if (!canvas) return;
  startFakeWS(); // 🔁 بدّلها لاحقًا إلى startRealWS()
}

document.addEventListener("DOMContentLoaded", initMarket);
