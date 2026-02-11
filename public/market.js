/* =========================================================
   BLOXIO MARKET ENGINE — v2.0 FINAL STABLE
   Scoped / Safe / Binance Integrated
   ========================================================= */

(() => {
  'use strict';

  if (window.BX_MARKET) return;

  const root = document.querySelector('#market');
  if (!root) return;

  /* ================= CONFIG ================= */

  const CFG = {
    ROWS: 15,
    BX_USDT_ANCHOR: 38,
    SPREAD_STEP: 0.0008,
    DEPTH_MAX: 8,
    CHART_LIMIT: 120,
  };

  /* ================= STATE ================= */

  const S = {
    quote: 'USDT',
    bxUSDT: CFG.BX_USDT_ANCHOR,
    bxQuote: CFG.BX_USDT_ANCHOR,
    mid: CFG.BX_USDT_ANCHOR,
    bids: [],
    asks: [],
    maxVol: 1,
    ws: null,
    chart: null,
    series: null,
    emaSeries: null,
    vwapSeries: null,
    data: [],
    trades: [],
  };

  /* ================= DOM ================= */

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
    execPrice: $('execPrice'),
    slippage: $('slippage'),
    spread: $('spread'),
    amount: $('orderAmount'),
    buyTab: $('buyTab'),
    sellTab: $('sellTab'),
    actionBtn: $('actionBtn'),
    pairs: $$('.pair-btn'),
  };

  /* ================= INIT ================= */

  init();

  function init() {
    initPairs();
    initBookRows();
    initChart();
    connectBinance();
  }

  /* ================= PAIR SWITCH ================= */

  function initPairs() {
    D.pairs.forEach(btn => {
      btn.addEventListener('click', () => {
        D.pairs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        S.quote = btn.dataset.quote;
        D.quote.textContent = S.quote;
        rebuild();
      });
    });
  }

  /* ================= BINANCE STREAM ================= */

  function connectBinance() {
    if (S.ws) S.ws.close();

    S.ws = new WebSocket(
      'wss://stream.binance.com:9443/ws/btcusdt@trade'
    );

    S.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const price = parseFloat(msg.p);

      if (!price) return;

      S.bxUSDT = CFG.BX_USDT_ANCHOR * (price / 68000);
      rebuild();
    };
  }

  /* ================= PRICE ================= */

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

  function computeQuote() {
    if (S.quote === 'USDT' || S.quote === 'USDC') {
      S.bxQuote = S.bxUSDT;
    } else {
      S.bxQuote = S.bxUSDT / REF[S.quote];
    }
  }

  /* ================= ORDER BOOK ================= */

  const rows = { bids: [], asks: [], ladder: [] };

  function initBookRows() {
    if (!D.bids) return;

    for (let i = 0; i < CFG.ROWS; i++) {
      const b = document.createElement('div');
      const l = document.createElement('div');
      const a = document.createElement('div');

      b.className = 'row buy';
      l.className = 'ladder-row';
      a.className = 'row sell';

      b.onclick = () => clickFill(b.textContent);
      a.onclick = () => clickFill(a.textContent);

      D.bids.appendChild(b);
      D.ladder.appendChild(l);
      D.asks.appendChild(a);

      rows.bids.push(b);
      rows.ladder.push(l);
      rows.asks.push(a);
    }
  }

  function buildBook() {
    S.bids = [];
    S.asks = [];
    S.maxVol = 1;

    const mid = S.bxQuote;
    const half = Math.floor(CFG.ROWS / 2);

    for (let i = 1; i <= half; i++) {
      const bid = mid * (1 - i * CFG.SPREAD_STEP);
      const ask = mid * (1 + i * CFG.SPREAD_STEP);

      const bVol = 1 + Math.random() * CFG.DEPTH_MAX;
      const aVol = 1 + Math.random() * CFG.DEPTH_MAX;

      S.bids.push({ price: bid, vol: bVol });
      S.asks.push({ price: ask, vol: aVol });

      S.maxVol = Math.max(S.maxVol, bVol, aVol);
    }

    S.mid = mid;
  }

  function renderBook() {
    const half = Math.floor(CFG.ROWS / 2);

    for (let i = 0; i < CFG.ROWS; i++) {
      const level = i - half;

      rows.ladder[i].classList.remove('mid');

      if (level === 0) {
        rows.ladder[i].textContent = S.mid.toFixed(6);
        rows.ladder[i].classList.add('mid');
        rows.bids[i].textContent = '';
        rows.asks[i].textContent = '';
        continue;
      }

      if (level < 0) {
        const b = S.bids[Math.abs(level) - 1];
        const pct = b.vol / S.maxVol;
        rows.bids[i].textContent = b.price.toFixed(6);
        rows.bids[i].style.background =
          `linear-gradient(to left, rgba(14,203,129,${pct}), transparent)`;
      } else {
        const a = S.asks[level - 1];
        const pct = a.vol / S.maxVol;
        rows.asks[i].textContent = a.price.toFixed(6);
        rows.asks[i].style.background =
          `linear-gradient(to right, rgba(246,70,93,${pct}), transparent)`;
      }
    }

    const bestBid = S.bids[0]?.price || 0;
    const bestAsk = S.asks[0]?.price || 0;
    const spread = bestAsk - bestBid;

    if (D.spread) D.spread.textContent = spread.toFixed(6);
  }

  /* ================= CHART ================= */

  function initChart() {
    if (!window.LightweightCharts || !D.chart) return;

    S.chart = LightweightCharts.createChart(D.chart, {
      layout: { background: { color: 'transparent' }, textColor: '#aaa' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: { visible: false },
    });

    S.series = S.chart.addLineSeries({ color: '#0ecb81', lineWidth: 2 });
    S.emaSeries = S.chart.addLineSeries({ color: '#f0b90b', lineWidth: 1 });
    S.vwapSeries = S.chart.addLineSeries({ color: '#a855f7', lineWidth: 1 });
  }

  function updateChart() {
    const now = Math.floor(Date.now() / 1000);

    S.data.push({ time: now, value: S.bxQuote });
    if (S.data.length > CFG.CHART_LIMIT) S.data.shift();

    S.series.setData(S.data);

    const ema = calculateEMA(S.data, 14);
    const vwap = calculateVWAP(S.data);

    S.emaSeries.setData(ema);
    S.vwapSeries.setData(vwap);
  }

  function calculateEMA(data, period) {
    let k = 2 / (period + 1);
    let ema = [];
    let prev = data[0]?.value || 0;

    data.forEach(d => {
      prev = d.value * k + prev * (1 - k);
      ema.push({ time: d.time, value: prev });
    });

    return ema;
  }

  function calculateVWAP(data) {
    let sumPV = 0;
    let sumVol = 0;
    return data.map(d => {
      const vol = 1;
      sumPV += d.value * vol;
      sumVol += vol;
      return { time: d.time, value: sumPV / sumVol };
    });
  }

  /* ================= BUY / SELL ================= */

  function clickFill(price) {
    if (!price) return;
    D.execPrice.textContent = price;
  }

  D.actionBtn?.addEventListener('click', () => {
    const amount = parseFloat(D.amount.value || 0);
    if (!amount) return;

    const price = S.mid;
    const slippage = Math.random() * 0.2;

    D.execPrice.textContent = price.toFixed(6);
    D.slippage.textContent = slippage.toFixed(2);

    alert('Execution Stub Complete');
  });

  /* ================= REBUILD ================= */

  function rebuild() {
    computeQuote();
    buildBook();
    renderHeader();
    renderBook();
    updateChart();
  }

  function renderHeader() {
    if (D.price) D.price.textContent = S.bxQuote.toFixed(6);
    if (D.approx)
      D.approx.textContent = `≈ ${S.bxUSDT.toFixed(2)} USDT`;
  }

  window.BX_MARKET = true;

})();
