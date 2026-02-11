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
  function buildBook() {
    S.bids = [];
    S.asks = [];
    S.maxVol = 0;

    const mid = S.bxPriceQuote;
    const half = Math.floor(CFG.ROWS / 2);

    for (let i = 0; i < CFG.ROWS; i++) {
      const level = i - half;
      const price = mid * (1 + level * CFG.SPREAD_STEP);
      const vol = Math.random() * CFG.DEPTH_MAX + 1;

      if (vol > S.maxVol) S.maxVol = vol;

      if (level < 0) {
        S.bids.push({ price, vol });
      } else if (level > 0) {
        S.asks.push({ price, vol });
      }
    }

    // best bid / ask
    const bestBid = S.bids[S.bids.length - 1]?.price || mid;
    const bestAsk = S.asks[0]?.price || mid;
    S.mid = (bestBid + bestAsk) / 2;
  }

  /* =========================
     ORDER BOOK (RENDER – DOM REUSE)
     ========================= */
  
        const rows = { bids: [], asks: [], ladder: [] };

  function initBookRows() {
    if (rows.bids.length) return;
    for (let i = 0; i < CFG.ROWS; i++) {
      const b = document.createElement('div');
      const l = document.createElement('div');
      const a = document.createElement('div');
      b.className = 'ob-row bid';
      l.className = 'price-row';
      a.className = 'ob-row ask';
      D.bids.appendChild(b);
      D.ladder.appendChild(l);
      D.asks.appendChild(a);
      rows.bids.push(b); rows.ladder.push(l); rows.asks.push(a);
    }
  }

  function buildBook() {
    S.bids = []; S.asks = []; S.maxVol = 1;
    const mid = S.bxQuote;
    const half = Math.floor(CFG.ROWS / 2);

    for (let i = 0; i < CFG.ROWS; i++) {
      const level = i - half;
      const price = mid * (1 + level * CFG.SPREAD_STEP);
      const vol = Math.random() * CFG.DEPTH_MAX + 1;
      S.maxVol = Math.max(S.maxVol, vol);
      if (level < 0) S.bids.push({ price, vol });
      if (level > 0) S.asks.push({ price, vol });
    }

    const bestBid = S.bids.at(-1)?.price || mid;
    const bestAsk = S.asks[0]?.price || mid;
    S.mid = (bestBid + bestAsk) / 2;
  }

  function renderBook() {
    const half = Math.floor(CFG.ROWS / 2);
    for (let i = 0; i < CFG.ROWS; i++) {
      const level = i - half;
      rows.ladder[i].textContent = level === 0 ? S.mid.toFixed(6) : S.bxQuote.toFixed(6);
      rows.ladder[i].classList.toggle('mid', level === 0);

      if (level < 0) {
        const b = S.bids.pop();
        const pct = b.vol / S.maxVol;
        rows.bids[i].textContent = b.price.toFixed(6);
        rows.bids[i].style.background =
          `linear-gradient(to left, rgba(0,200,120,${pct}), transparent)`;
      } else rows.bids[i].textContent = '';

      if (level > 0) {
        const a = S.asks.shift();
        const pct = a.vol / S.maxVol;
        rows.asks[i].textContent = a.price.toFixed(6);
        rows.asks[i].style.background =
          `linear-gradient(to right, rgba(255,80,80,${pct}), transparent)`;
      } else rows.asks[i].textContent = '';
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
    computeQuotePrice();
    buildBook();
    renderHeader();
    renderBook();
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
