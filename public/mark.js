/* =========================
   MARKET.JS — FINAL STABLE
   ========================= */

const MARKET = {
  BASE_BX_USDT: 38,
  ROWS: 15,
  PRICE_TICK: 1200,
  BOOK_TICK: 2200,
  CHART_POINTS: 120
};

const BINANCE_MAP = {
  USDT: 'btcusdt',
  ETH: 'ethusdt',
  BNB: 'bnbusdt',
  BTC: 'btcusdt',
  SOL: 'solusdt'
};

const STATE = {
  quote: 'USDT',
  ws: null,
  lastRef: null,
  lastPrice: MARKET.BASE_BX_USDT,
  chartData: [],
  frozen: false
};

/* -------- Chart -------- */

let chart, series;

function initChart() {
  if (chart || !window.LightweightCharts) return;
  const el = document.getElementById('bxChart');
  if (!el) return;

  chart = LightweightCharts.createChart(el, {
    layout: { background: { color: '#0b0f14' }, textColor: '#9ca3af' },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    rightPriceScale: { visible: true },
    timeScale: { timeVisible: false }
  });

  series = chart.addLineSeries({ color: '#0ecb81', lineWidth: 2 });
}

function pushChart(price) {
  const point = { time: Math.floor(Date.now() / 1000), value: price };
  STATE.chartData.push(point);
  if (STATE.chartData.length > MARKET.CHART_POINTS) STATE.chartData.shift();
  series.update(point);
}

/* -------- Order Book DOM (reuse) -------- */

const bidRows = [], askRows = [], priceRows = [];

function initOrderBook() {
  const bids = document.getElementById('bids');
  const asks = document.getElementById('asks');
  const ladder = document.getElementById('priceLadder');
  if (!bids || !asks || !ladder) return;

  for (let i = 0; i < MARKET.ROWS; i++) {
    const b = document.createElement('div');
    const p = document.createElement('div');
    const a = document.createElement('div');

    b.className = 'row buy';
    p.className = 'ladder-row';
    a.className = 'row sell';

    bids.appendChild(b);
    ladder.appendChild(p);
    asks.appendChild(a);

    bidRows.push(b);
    priceRows.push(p);
    askRows.push(a);
  }
}

function renderOrderBook(mid) {
  if (STATE.frozen) return;
  for (let i = 0; i < MARKET.ROWS; i++) {
    const step = (i + 1) * 0.0008;
    const bid = mid * (1 - step);
    const ask = mid * (1 + step);

    bidRows[i].textContent = bid.toFixed(4);
    askRows[i].textContent = ask.toFixed(4);
    priceRows[i].textContent = ((bid + ask) / 2).toFixed(4);
  }
}

/* -------- Price + WS -------- */

function connectWS() {
  if (STATE.ws) STATE.ws.close();
  const symbol = BINANCE_MAP[STATE.quote] || 'btcusdt';

  STATE.lastRef = null;
  STATE.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);

  STATE.ws.onmessage = e => {
    const d = JSON.parse(e.data);
    const ref = Number(d.p);
    if (!ref) return;

    if (!STATE.lastRef) {
      STATE.lastRef = ref;
      return;
    }

    const delta = (ref - STATE.lastRef) / STATE.lastRef;
    STATE.lastPrice = MARKET.BASE_BX_USDT * (1 + delta);
    STATE.lastRef = ref;

    updatePriceUI(STATE.lastPrice);
    pushChart(STATE.lastPrice);
  };

  STATE.ws.onerror = () => {
    STATE.ws && STATE.ws.close();
  };
}

/* -------- Timers -------- */

let priceTimer, bookTimer;

function startTimers() {
  clearInterval(priceTimer);
  clearInterval(bookTimer);

  priceTimer = setInterval(() => {
    updatePriceUI(STATE.lastPrice);
  }, MARKET.PRICE_TICK);

  bookTimer = setInterval(() => {
    renderOrderBook(STATE.lastPrice);
  }, MARKET.BOOK_TICK);
}

/* -------- Interaction -------- */

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-quote]');
  if (!btn) return;

  document.querySelectorAll('[data-quote]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  STATE.quote = btn.dataset.quote;
  STATE.chartData = [];
  series.setData([]);
  connectWS();
});

const ob = document.querySelector('.orderbook');
if (ob) {
  ob.addEventListener('mouseenter', () => STATE.frozen = true);
  ob.addEventListener('mouseleave', () => STATE.frozen = false);
}

/* -------- Init -------- */

function initMarket() {
  initChart();
  initOrderBook();
  connectWS();
  startTimers();
}

initMarket();
