/* =====================================================
   MARKET.JS — FINAL / SAFE / VIEW-BASED
   Compatible with app.js (view:change)
===================================================== */

/* ================= CONFIG ================= */
const MARKET_CFG = {
  BASE_PRICE: 24,
  TICK_MS: 1000,
  LEVELS: 12,
  EMA_PERIOD: 14,
  FEE: 0.001,
};

/* ================= STATE ================= */
const Market = {
  running: false,
  timer: null,
  ws: null,

  pair: "BX/USDT",
  last: MARKET_CFG.BASE_PRICE,
  prev: MARKET_CFG.BASE_PRICE,

  bids: [],
  asks: [],
  trades: [],

  ema: null,
  vwap: null,
  pv: 0,
  vol: 0,

  side: "buy",
};

/* ================= DOM ================= */
const $m = id => document.getElementById(id);

const DOM = {
  canvas: $m("marketCanvas"),
  price: $m("marketPrice"),
  approx: $m("marketApprox"),
  bids: $m("bids"),
  asks: $m("asks"),
  ladder: $m("priceLadder"),
  trades: $m("tradesList"),
  amount: $m("orderAmount"),
  execPrice: $m("execPrice"),
  slippage: $m("slippage"),
};

const ctx = DOM.canvas?.getContext("2d");

/* ================= INIT / STOP ================= */
function initMarket() {
  if (Market.running) return;
  if (!DOM.canvas || !ctx) return;

  Market.running = true;
  Market.last = MARKET_CFG.BASE_PRICE;
  Market.prev = MARKET_CFG.BASE_PRICE;
  Market.trades = [];
  Market.ema = null;
  Market.vwap = null;
  Market.pv = 0;
  Market.vol = 0;

  bindPairs();
  bindOrderPreview();

  startFakeFeed();
  connectTradesWS(); // Fake الآن – Real لاحقًا

  console.info("[MARKET] init");
}

function stopMarket() {
  Market.running = false;

  if (Market.timer) {
    clearInterval(Market.timer);
    Market.timer = null;
  }

  if (Market.ws) {
    Market.ws.close();
    Market.ws = null;
  }

  console.info("[MARKET] stopped");
}

/* ================= PAIRS ================= */
function bindPairs() {
  document.querySelectorAll(".pair-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".pair-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      Market.pair = btn.dataset.pair;
      Market.last = MARKET_CFG.BASE_PRICE;
      Market.prev = MARKET_CFG.BASE_PRICE;
    };
  });
}

/* ================= FAKE MARKET FEED ================= */
function startFakeFeed() {
  Market.timer = setInterval(fakeTick, MARKET_CFG.TICK_MS);
}

function fakeTick() {
  if (!Market.running) return;

  Market.prev = Market.last;
  Market.last = +(
    Market.last + (Math.random() - 0.5) * 0.05
  ).toFixed(4);

  genOrderBook();
  pushTrade();
  updateIndicators();

  renderAll();
}

/* ================= ORDER BOOK ================= */
function genOrderBook() {
  Market.bids = [];
  Market.asks = [];

  for (let i = 1; i <= MARKET_CFG.LEVELS; i++) {
    Market.bids.push({
      price: +(Market.last - i * 0.01).toFixed(4),
      qty: +(Math.random() * 3 + 0.5).toFixed(3),
    });
    Market.asks.push({
      price: +(Market.last + i * 0.01).toFixed(4),
      qty: +(Math.random() * 3 + 0.5).toFixed(3),
    });
  }
}

/* ================= TRADES ================= */
function pushTrade() {
  Market.trades.unshift({
    price: Market.last,
    qty: +(Math.random() * 2).toFixed(3),
    side: Market.last >= Market.prev ? "buy" : "sell",
    time: new Date().toLocaleTimeString(),
  });

  Market.trades = Market.trades.slice(0, 30);
}

/* ================= INDICATORS ================= */
function updateIndicators() {
  const price = Market.last;
  const volume = Math.random() * 3 + 1;

  Market.pv += price * volume;
  Market.vol += volume;
  Market.vwap = Market.pv / Market.vol;

  const k = 2 / (MARKET_CFG.EMA_PERIOD + 1);
  Market.ema = Market.ema === null
    ? price
    : price * k + Market.ema * (1 - k);
}

/* ================= RENDER ================= */
function renderAll() {
  renderPrice();
  renderBook();
  renderLadder();
  renderTrades();
  renderCanvas();
  previewOrder();
}

function renderPrice() {
  if (!DOM.price) return;

  DOM.price.textContent = Market.last.toFixed(4);
  DOM.approx.textContent = `≈ ${Market.last.toFixed(2)} USDT`;

  DOM.price.classList.remove("up", "down");
  if (Market.last > Market.prev) DOM.price.classList.add("up");
  if (Market.last < Market.prev) DOM.price.classList.add("down");
}

function renderBook() {
  DOM.bids.innerHTML = Market.bids
    .map(b => `<div class="row buy"><span>${b.price}</span><span>${b.qty}</span></div>`)
    .join("");

  DOM.asks.innerHTML = Market.asks
    .map(a => `<div class="row sell"><span>${a.price}</span><span>${a.qty}</span></div>`)
    .join("");
}

function renderLadder() {
  DOM.ladder.innerHTML = `
    ${Market.asks.slice(0,6).reverse().map(a=>`<div class="ladder sell">${a.price}</div>`).join("")}
    <div class="ladder mid">${Market.last}</div>
    ${Market.bids.slice(0,6).map(b=>`<div class="ladder buy">${b.price}</div>`).join("")}
  `;
}

function renderTrades() {
  DOM.trades.innerHTML = Market.trades
    .map(t => `
      <div class="trade ${t.side}">
        <span>${t.price}</span>
        <span>${t.qty}</span>
        <span>${t.time}</span>
      </div>`)
    .join("");
}

/* ================= CANVAS ================= */
function renderCanvas() {
  const w = DOM.canvas.width;
  const h = DOM.canvas.height;
  ctx.clearRect(0, 0, w, h);

  const midY = h / 2;
  const scale = 6;
  const y = p => midY - (p - Market.last) * scale;

  Market.bids.forEach(b => {
    ctx.fillStyle = "rgba(34,197,94,0.25)";
    ctx.fillRect(0, y(b.price), w / 2, 6);
  });

  Market.asks.forEach(a => {
    ctx.fillStyle = "rgba(239,68,68,0.25)";
    ctx.fillRect(w / 2, y(a.price), w / 2, 6);
  });

  drawLine(Market.last, "#ffffff");
  drawLine(Market.ema, "#facc15");
  drawLine(Market.vwap, "#a855f7");

  function drawLine(val, color) {
    if (!val) return;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y(val));
    ctx.lineTo(w, y(val));
    ctx.stroke();
  }
}

/* ================= SLIPPAGE PREVIEW ================= */
function estimateExecution(qty) {
  let remain = qty;
  let cost = 0;

  for (const a of Market.asks) {
    const take = Math.min(remain, a.qty);
    cost += take * a.price;
    remain -= take;
    if (!remain) break;
  }

  if (remain > 0) return null;

  const exec = cost / qty;
  const best = Market.asks[0].price;
  const slip = Math.abs(exec - best) / best * 100;

  return { exec, slip };
}

function previewOrder() {
  const qty = +DOM.amount?.value;
  if (!qty) return;

  const r = estimateExecution(qty);
  if (!r) return;

  DOM.execPrice.textContent = r.exec.toFixed(4);
  DOM.slippage.textContent = r.slip.toFixed(2) + "%";
}

function bindOrderPreview() {
  if (DOM.amount) DOM.amount.oninput = previewOrder;
}

/* ================= TRADES WS (READY FOR REAL) ================= */
function connectTradesWS() {
  // Fake WS placeholder – replace URL later
  // Market.ws = new WebSocket("wss://api/ws/market/" + Market.pair);
}

/* ================= EXPORT ================= */
window.initMarket = initMarket;
window.stopMarket = stopMarket;
