/* =========================================================
   MARKET ENGINE — BASELINE v1.0 (CLEAN & ISOLATED)
   Features:
   - Pair switching (real state)
   - Price (synthetic BX priced via USDT)
   - Order Book (15 rows, depth shading)
   - Mid-price line
   - Click-to-fill
   - Chart (Lightweight Charts)
   - Performance (DOM reuse)
   ========================================================= */

(() => {
  'use strict';

  /* =========================
     GUARD / ROOT
     ========================= */
  if (window.MarketEngine) return;
  const root = document.querySelector('#market') || document.querySelector('.market-view');
  if (!root) return;

  /* =========================
     CONFIG
     ========================= */
  const CFG = {
    ROWS: 15,
    BASE_ASSET: 'BX',
    BX_USDT_BASE: 38,
    SPREAD_STEP: 0.0008,
    DEPTH_MAX: 10,
    CHART_POINTS: 60,
  };

  /* =========================
     REFERENCE PRICES (can be API/WS later)
     ========================= */
  const REF = {
    USDT: 1,
    USDC: 1,
    BTC: 68000,
    ETH: 3600,
    BNB: 420,
    SOL: 140,
    AVAX: 38,
    ZEC: 28,
    TON: 2.3,
    LTC: 70,
  };

  /* =========================
     STATE (Single Source)
     ========================= */
  const S = {
    base: CFG.BASE_ASSET,
    quote: 'USDT',

    bxPriceUSDT: CFG.BX_USDT_BASE, // real anchor
    bxPriceQuote: CFG.BX_USDT_BASE,

    bids: [],
    asks: [],
    maxVol: 1,
    mid: CFG.BX_USDT_BASE,

    chart: null,
    series: null,
    chartData: [],
  };

  /* =========================
     DOM CACHE
     ========================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => root.querySelectorAll(sel);

  const D = {
    price: $('marketPrice'),
    approx: $('marketApprox'),
    quote: $('quoteAsset'),
    bids: $('bids'),
    asks: $('asks'),
    ladder: $('priceLadder'),
    chart: $('bxChart'),
    pairs: $$('.pair-btn'),
    amount: $('amountInput'),
    execPrice: $('execPrice'),
  };

  /* =========================
     UTIL
     ========================= */
  const fmt = (n, d = 4) => Number(n).toFixed(d);

  /* =========================
     INIT
     ========================= */
  init();

  function init() {
    initPairs();
    initBookRows();
    initChart();
    rebuild();
  }

  /* =========================
     PAIRS
     ========================= */
  function initPairs() {
    D.pairs.forEach(btn => {
      btn.addEventListener('click', () => {
        D.pairs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setQuote(btn.dataset.quote);
      });
    });
  }

  function setQuote(q) {
    if (!REF[q]) return;
    S.quote = q;
    rebuild();
  }

  /* =========================
     PRICE LOGIC
     ========================= */
  function computeQuotePrice() {
    if (S.quote === 'USDT' || S.quote === 'USDC') {
      S.bxPriceQuote = S.bxPriceUSDT;
    } else {
      S.bxPriceQuote = S.bxPriceUSDT / REF[S.quote];
    }
  }

  /* =========================
     ORDER BOOK (BUILD)
     ========================= */
   function buildOrderBook(mid) {
  const bids = [];
  const asks = [];
  let maxVol = 1;

  const half = Math.floor(CFG.ROWS / 2);

  for (let i = 1; i <= half; i++) {
    const bidPrice = mid * (1 - i * CFG.SPREAD_STEP);
    const askPrice = mid * (1 + i * CFG.SPREAD_STEP);

    const bidVol = 1 + Math.random() * CFG.DEPTH_MAX;
    const askVol = 1 + Math.random() * CFG.DEPTH_MAX;

    bids.push({ price: bidPrice, vol: bidVol });
    asks.push({ price: askPrice, vol: askVol });

    maxVol = Math.max(maxVol, bidVol, askVol);
  }

  S.book = { bids, asks, maxVol };
       }

   function renderOrderBook() {
  const half = Math.floor(CFG.ROWS / 2);

  for (let i = 0; i < CFG.ROWS; i++) {
    const level = i - half;

    const bidRow = rows.bids[i];
    const askRow = rows.asks[i];
    const ladderRow = rows.ladder[i];

    bidRow.textContent = '';
    askRow.textContent = '';
    bidRow.style.background = '';
    askRow.style.background = '';
    ladderRow.classList.remove('mid');

    // MID
    if (level === 0) {
      ladderRow.textContent = S.mid.toFixed(6);
      ladderRow.classList.add('mid');
      continue;
    }

    // BIDS (أسفل)
    if (level < 0) {
      const idx = Math.abs(level) - 1;
      const b = S.book.bids[idx];
      if (!b) continue;

      const pct = b.vol / S.book.maxVol;

      bidRow.textContent = b.price.toFixed(6);
      bidRow.style.background =
        `linear-gradient(to left, rgba(0,200,120,${pct}), transparent)`;

      ladderRow.textContent = b.price.toFixed(6);
    }

    // ASKS (أعلى)
    if (level > 0) {
      const idx = level - 1;
      const a = S.book.asks[idx];
      if (!a) continue;

      const pct = a.vol / S.book.maxVol;

      askRow.textContent = a.price.toFixed(6);
      askRow.style.background =
        `linear-gradient(to right, rgba(255,80,80,${pct}), transparent)`;

      ladderRow.textContent = a.price.toFixed(6);
    }
  }
   }

  /* =========================
     HEADER
     ========================= */
  function renderHeader() {
    if (D.price) D.price.textContent = fmt(S.bxPriceQuote, 6);
    if (D.quote) D.quote.textContent = S.quote;
    if (D.approx) D.approx.textContent = `≈ ${fmt(S.bxPriceUSDT, 2)} USDT`;
  }

  /* =========================
     CHART
     ========================= */
  function initChart() {
    if (!D.chart || !window.LightweightCharts) return;

    S.chart = LightweightCharts.createChart(D.chart, {
      layout: { background: { color: 'transparent' }, textColor: '#9aa4ad' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: { visible: false },
    });

    S.series = S.chart.addLineSeries({
      color: '#00e676',
      lineWidth: 2,
    });
  }

  function updateChart() {
    const now = Math.floor(Date.now() / 1000);
    S.chartData.push({ time: now, value: S.bxPriceQuote });
    if (S.chartData.length > CFG.CHART_POINTS) S.chartData.shift();
    S.series.setData(S.chartData);
  }

  /* =========================
     CLICK TO FILL
     ========================= */
  function clickFill(v) {
    const price = parseFloat(v);
    if (!price) return;
    if (D.amount) D.amount.value = '1';
    if (D.execPrice) D.execPrice.textContent = fmt(price);
  }

  /* =========================
     REBUILD PIPELINE
     ========================= */
  function rebuild() {
  computeQuote();
  S.mid = S.bxPriceQuote;
  buildOrderBook(S.mid);
  renderHeader();
  renderOrderBook();
  updateChart();
  }

  /* =========================
     EXPOSE (optional)
     ========================= */
  window.MarketEngine = {
    setQuote,
    rebuild,
  };
})();
