/* =================================================
   MARKET.JS — FULL EXCHANGE ENGINE (SAFE UPDATE)
   Compatible with existing HTML / CSS
================================================= */

/* ================= CONFIG ================= */

const MARKET_CONFIG = {
  BASE_PRICE: 18,
  UPDATE_INTERVAL: 1000,
  EMA_PERIOD: 14,
  FEE: 0.001
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

  // Position (Spot)
  position: {
    qty: 0,
    avg: 0
  },

  priceHistory: [],

  listeners: []
};

MarketState.onUpdate = fn => MarketState.listeners.push(fn);
const emit = () => MarketState.listeners.forEach(fn => fn(MarketState));

/* ================= ADAPTIVE MM ================= */

const MM = {
  enabled: true,
  baseSpread: 0.002,
  maxSpread: 0.01,
  baseQty: 6
};

function calcVolatility(prices) {
  if (prices.length < 10) return 0.001;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean;
}

function generateMMOrders(mid) {
  if (!MM.enabled) return { bids: [], asks: [] };

  const vol = calcVolatility(MarketState.priceHistory);
  const spread = Math.min(
    Math.max(MM.baseSpread * (1 + vol * 20), MM.baseSpread),
    MM.maxSpread
  );

  const qtyBase = Math.max(1, MM.baseQty / (1 + vol * 10));

  const bids = [];
  const asks = [];

  for (let i = 1; i <= 10; i++) {
    bids.push({
      price: +(mid * (1 - spread * i)).toFixed(4),
      qty: +(qtyBase * Math.random()).toFixed(3),
      mm: true
    });

    asks.push({
      price: +(mid * (1 + spread * i)).toFixed(4),
      qty: +(qtyBase * Math.random()).toFixed(3),
      mm: true
    });
  }

  return { bids, asks };
}

/* ================= FAKE WS (ENGINE) ================= */

function startFakeWS() {
  setInterval(() => {
    MarketState.prevPrice = MarketState.lastPrice;

    const delta = (Math.random() - 0.5) * 0.05;
    MarketState.lastPrice = +(
      MarketState.lastPrice + delta
    ).toFixed(4);

    MarketState.priceHistory.push(MarketState.lastPrice);
    if (MarketState.priceHistory.length > 50)
      MarketState.priceHistory.shift();

    const realBids = Array.from({ length: 4 }, (_, i) => ({
      price: +(MarketState.lastPrice - (i + 1) * 0.01).toFixed(4),
      qty: +(Math.random() * 3 + 1).toFixed(3)
    }));

    const realAsks = Array.from({ length: 4 }, (_, i) => ({
      price: +(MarketState.lastPrice + (i + 1) * 0.01).toFixed(4),
      qty: +(Math.random() * 3 + 1).toFixed(3)
    }));

    const mm = generateMMOrders(MarketState.lastPrice);

    MarketState.bids = [...realBids, ...mm.bids]
      .sort((a, b) => b.price - a.price)
      .slice(0, 12);

    MarketState.asks = [...realAsks, ...mm.asks]
      .sort((a, b) => a.price - b.price)
      .slice(0, 12);

    pushTrade();
    updateIndicators();
    emit();
  }, MARKET_CONFIG.UPDATE_INTERVAL);
}

/* ================= TRADES ================= */

function pushTrade() {
  MarketState.trades.unshift({
    price: MarketState.lastPrice,
    qty: +(Math.random() * 2).toFixed(3),
    side: Math.random() > 0.5 ? "buy" : "sell",
    time: new Date().toLocaleTimeString()
  });

  MarketState.trades = MarketState.trades.slice(0, 30);
}

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

  ctx.strokeStyle = "#020617";
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }

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

  drawLine(m.lastPrice, "#22c55e");
  drawLine(m.ema, "#facc15");
  drawLine(m.vwap, "#a855f7");

  function drawLine(val, color) {
    if (!val) return;
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
    .map(
      b =>
        `<div class="row buy ${b.mm ? "mm" : ""}">${b.price}<span>${b.qty}</span></div>`
    )
    .join("");

  asksEl.innerHTML = m.asks
    .map(
      a =>
        `<div class="row sell ${a.mm ? "mm" : ""}">${a.price}<span>${a.qty}</span></div>`
    )
    .join("");
}

/* ================= PRICE LADDER ================= */

function renderPriceLadder(m) {
  const el = document.getElementById("priceLadder");
  if (!el) return;

  el.innerHTML = [
    ...m.asks.slice(0, 6).reverse().map(
      a => `<div class="ladder-row sell">${a.price}</div>`
    ),
    `<div class="ladder-row mid">${m.lastPrice}</div>`,
    ...m.bids.slice(0, 6).map(
      b => `<div class="ladder-row buy">${b.price}</div>`
    )
  ].join("");
}

/* ================= TRADES UI ================= */

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

/* ================= MID / SPREAD ================= */

function renderMidSpread(m) {
  const midEl = document.getElementById("midPrice");
  const spreadEl = document.getElementById("spread");
  if (!midEl || !spreadEl || !m.bids[0] || !m.asks[0]) return;

  const mid = (m.bids[0].price + m.asks[0].price) / 2;
  const spread = m.asks[0].price - m.bids[0].price;

  midEl.textContent = mid.toFixed(4);
  spreadEl.textContent = `Spread ${spread.toFixed(4)}`;
}

/* ================= SUBSCRIBE ================= */

MarketState.onUpdate(m => {
  renderCanvas(m);
  renderOrderBook(m);
  renderPriceLadder(m);
  renderTrades(m);
  renderPriceFlash(m);
  renderMidSpread(m);
});

/* ================= INIT ================= */

function initMarket() {
  if (!canvas) return;
  startFakeWS(); // 🔁 لاحقًا: startRealWS()
}

document.addEventListener("DOMContentLoaded", initMarket);
