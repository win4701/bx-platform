/* =========================================================
   BX MARKET ENGINE – FINAL GLOBAL VERSION
   Fake-ready → Real-ready
   ========================================================= */

(() => {

  /* =========================
     CONFIG
  ========================= */
  const CONFIG = {
    BASE_PRICE_USDT: 24,            // BX reference price
    MAX_BOOK_ROWS: 15,
    MAX_TRADES: 30,
    CHART_POINTS: 120,
    FAKE_INTERVAL: 1200,
  };

  /* =========================
     STATE
  ========================= */
  let currentQuote = 'USDT';
  let lastPrice = CONFIG.BASE_PRICE_USDT;
  let bids = [];
  let asks = [];
  let trades = [];
  let chartData = [];

  /* =========================
     DOM
  ========================= */
  const priceEl = document.querySelector('.price-main');
  const pairEl  = document.querySelector('.pair-title');
  const bidsEl  = document.querySelector('.orderbook-bids');
  const asksEl  = document.querySelector('.orderbook-asks');
  const tradesEl = document.querySelector('.trades-list');

  /* =========================
     UTIL
  ========================= */
  const fmt = (n, d = 6) => Number(n).toFixed(d);

  function flash(up) {
    if (!priceEl) return;
    priceEl.classList.remove('flash-up','flash-down');
    void priceEl.offsetWidth;
    priceEl.classList.add(up ? 'flash-up' : 'flash-down');
  }

  /* =========================
     PRICE ENGINE
  ========================= */
  function getQuoteMultiplier(symbol) {
    const map = {
      USDT: 1,
      USDC: 1,
      BTC: 1 / 68000,
      ETH: 1 / 3500,
      BNB: 1 / 580,
      SOL: 1 / 150,
      TON: 1 / 7,
      AVAX: 1 / 35,
      LTC: 1 / 85,
      ZEC: 1 / 30
    };
     
    const BINANCE_SYMBOLS = {
  USDT: "btcusdt",
  USDC: "btcusdt",
  BTC:  "btcusdt",
  ETH:  "ethusdt",
  BNB:  "bnbusdt",
  SOL:  "solusdt",
  TON:  "tonusdt",
  AVAX: "avaxusdt",
  LTC:  "ltcusdt",
  ZEC:  "zecusdt"
};
    return map[symbol] || 1;
  }

  function updatePrice() {
    const drift = (Math.random() - 0.5) * 0.002;
    const prev = lastPrice;
    lastPrice = Math.max(0.1, lastPrice * (1 + drift));

    const quotePrice = lastPrice * getQuoteMultiplier(currentQuote);
    if (priceEl) priceEl.textContent = fmt(quotePrice, 6);

    flash(quotePrice >= prev);
    updateChart(quotePrice);
  }
   
/*============= WebSocket ========================= */
   
   let priceWS = null;
let lastRef = null;

function connectPriceWS(quote) {
  if (priceWS) priceWS.close();

  const symbol = BINANCE_SYMBOLS[quote];
  priceWS = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@trade`
  );

  priceWS.onmessage = e => {
    const data = JSON.parse(e.data);
    const ref = +data.p;
    if (!ref) return;

    if (!lastRef) lastRef = ref;

    // BX reference mapping
    const delta = (ref - lastRef) / lastRef;
    const bxPrice = 24 * (1 + delta);

    lastRef = ref;
    onMarketPrice(bxPrice);
  };
}
   /*=========== handler ========================= */
   
   function onMarketPrice(price) {
  updatePriceUI(price);
  updateChart(price);
  buildFakeOrderBook(price);
  pushTradeFromPrice(price);
   }
   
/* ================= ORDER BOOK ================ */
   
  function buildFakeOrderBook(mid) {
  const bids = [];
  const asks = [];

  for (let i = 1; i <= 15; i++) {
    bids.push({
      price: mid * (1 - i * 0.0008),
      qty: Math.random() * 2
    });
    asks.push({
      price: mid * (1 + i * 0.0008),
      qty: Math.random() * 2
    });
  }

  renderBook(bids, asks);
  }
   
   function renderBook(bids, asks) {
  bidsEl.innerHTML = bids.map(b => `
    <div class="row bid">
      <span>${b.price.toFixed(6)}</span>
      <span>${b.qty.toFixed(3)}</span>
    </div>
  `).join('');

  asksEl.innerHTML = asks.map(a => `
    <div class="row ask">
      <span>${a.price.toFixed(6)}</span>
      <span>${a.qty.toFixed(3)}</span>
    </div>
  `).join('');
   }
   
/* =============TRADES (RECENT) ================= */
   
  const MAX_TRADES = 30;
const trades = [];

function pushTradeFromPrice(price) {
  trades.unshift({
    price: price.toFixed(6),
    qty: (Math.random() * 1.5).toFixed(3),
    time: new Date().toLocaleTimeString(),
    side: Math.random() > 0.5 ? "buy" : "sell"
  });

  if (trades.length > MAX_TRADES) trades.length = MAX_TRADES;
  renderTrades();
   }
   function renderTrades() {
  tradesEl.innerHTML = trades.map(t => `
    <div class="trade ${t.side}">
      <span>${t.price}</span>
      <span>${t.qty}</span>
      <span>${t.time}</span>
    </div>
  `).join('');
   }
   
/* ============== CHART (DISPLAY ONLY) ================ */
   
  let chart, lineSeries;

  function initChart() {
    if (!window.LightweightCharts) return;
    const el = document.getElementById('chart');
    if (!el) return;

    chart = LightweightCharts.createChart(el, {
      layout: { background: { color: '#0b0f14' }, textColor: '#aaa' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: { visible: false },
      rightPriceScale: { visible: false }
    });

    lineSeries = chart.addLineSeries({ color: '#0ecb81', lineWidth: 2 });
  }

  function updateChart(price) {
    if (!lineSeries) return;
    chartData.push({ time: Date.now()/1000, value: price });
    if (chartData.length > CONFIG.CHART_POINTS) chartData.shift();
    lineSeries.setData(chartData);
  }

  /* ============== PAIR SWITCH ================ */
   
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-quote]');
    if (!btn) return;

    currentQuote = btn.dataset.quote;
    document.querySelectorAll('[data-quote]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (pairEl) pairEl.textContent = `BX / ${currentQuote}`;
    chartData = [];
    generateOrderBook();
  });

   /*===================
     WALLET SWITCH
  ========================= */
   function emitMarketSnapshot(side) {
  const payload = {
    pair: `BX/${currentQuote}`,
    price: lastDisplayedPrice,
    side,
    ts: Date.now()
  };
  document.dispatchEvent(
    new CustomEvent("market:price", { detail: payload })
  );
   }
   document.addEventListener("market:price", e => {
  const { pair, price, side } = e.detail;
  console.log("Wallet received:", pair, price, side);
 });
  /* =========================
     FAKE LOOP
  ========================= */
  function loop() {
    updatePrice();
    generateOrderBook();
    pushTrade(Math.random() > 0.5 ? 'buy' : 'sell');
  }

  /* =========================
     INIT
  ========================= */
   
  document.addEventListener('DOMContentLoaded', () => {
    initChart();
    generateOrderBook();
    setInterval(loop, CONFIG.FAKE_INTERVAL);
  });

})();
