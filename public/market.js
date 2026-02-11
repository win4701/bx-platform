(function () {
  'use strict';

  if (window.BX_MARKET_V21) return;
  window.BX_MARKET_V21 = true;

  const root = document.querySelector('#market');
  if (!root) return;

  /* ================= CONFIG ================= */

  const CFG = {
    ROWS: 15,
    BX_USDT_ANCHOR: 38,
    SPREAD_STEP: 0.001,
    DEPTH_MAX: 10,
    CHART_LIMIT: 120,
    REF_PRICE: 68000
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
    data: []
  };

  /* ================= DOM ================= */

  const $ = id => document.getElementById(id);
  const $$ = sel => root.querySelectorAll(sel);

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
    pairs: $$('.pair-btn')
  };

  /* ================= INIT ================= */

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initPairs();
    initBookRows();
    initChart();
    connectBinance();
    rebuild(); // مهم جداً
    setInterval(updateChart, 1000);
  }

  /* ================= PAIRS ================= */

  function initPairs() {
    D.pairs.forEach(btn => {
      btn.addEventListener('click', () => {
        D.pairs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        S.quote = btn.dataset.quote;
        if (D.quote) D.quote.textContent = S.quote;
        connectBinance();
      });
    });
  }

  /* ================= BINANCE ================= */

  function connectBinance() {
  if (S.ws) S.ws.close();

  // نربط فقط العملة المرجعية
  if (S.quote === 'USDT' || S.quote === 'USDC') {
    S.bxUSDT = CFG.BX_USDT_ANCHOR;
    rebuild();
    return;
  }

  const symbol = S.quote.toLowerCase() + "usdt";

  S.ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@trade`
  );

  S.ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    const refPrice = parseFloat(msg.p);
    if (!refPrice) return;

    // BX/QUOTE = BX_USDT / QUOTE_USDT
    S.bxQuote = CFG.BX_USDT_ANCHOR / refPrice;
    S.mid = S.bxQuote;

    rebuild();
  };

  S.ws.onerror = () => console.warn("WS Error");
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
    LTC: 70
  };

  function computeQuote() {
    if (S.quote === 'USDT' || S.quote === 'USDC') {
      S.bxQuote = S.bxUSDT;
    } else {
      S.bxQuote = S.bxUSDT / (REF[S.quote] || 1);
    }
    S.mid = S.bxQuote;
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

  const mid = S.mid;

  for (let i = 1; i <= CFG.ROWS; i++) {
    const bid = mid * (1 - i * CFG.SPREAD_STEP);
    const ask = mid * (1 + i * CFG.SPREAD_STEP);

    const bVol = 1 + Math.random() * CFG.DEPTH_MAX;
    const aVol = 1 + Math.random() * CFG.DEPTH_MAX;

    S.bids.push({ price: bid, vol: bVol });
    S.asks.push({ price: ask, vol: aVol });

    S.maxVol = Math.max(S.maxVol, bVol, aVol);
  }
  }
  
  function renderBook() {

  for (let i = 0; i < CFG.ROWS; i++) {

    const bid = S.bids[i];
    const ask = S.asks[i];

    rows.bids[i].textContent = bid.price.toFixed(6);
    rows.asks[i].textContent = ask.price.toFixed(6);

    const bPct = bid.vol / S.maxVol;
    const aPct = ask.vol / S.maxVol;

    rows.bids[i].style.background =
      `linear-gradient(to left, rgba(14,203,129,${bPct}), transparent)`;

    rows.asks[i].style.background =
      `linear-gradient(to right, rgba(246,70,93,${aPct}), transparent)`;
  }

  const bestBid = S.bids[0].price;
  const bestAsk = S.asks[0].price;

  if (D.spread)
    D.spread.textContent = (bestAsk - bestBid).toFixed(6);
  }
  
  /* ================= CHART ================= */

  function initChart() {
    if (!window.LightweightCharts || !D.chart) return;

    S.chart = LightweightCharts.createChart(D.chart, {
      layout: { background: { color: 'transparent' }, textColor: '#aaa' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: { visible: false }
    });

    S.series = S.chart.addLineSeries({ color: '#0ecb81', lineWidth: 2 });
    S.emaSeries = S.chart.addLineSeries({ color: '#f0b90b', lineWidth: 1 });
    S.vwapSeries = S.chart.addLineSeries({ color: '#a855f7', lineWidth: 1 });
  }

  function updateChart() {
    if (!S.series) return;

    const now = Math.floor(Date.now() / 1000);

    S.data.push({ time: now, value: S.mid });
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
    let sum = 0;
    return data.map((d, i) => {
      sum += d.value;
      return { time: d.time, value: sum / (i + 1) };
    });
  }

  /* ================= EXECUTION ================= */

  function clickFill(price) {
    if (!price) return;
    if (D.execPrice) D.execPrice.textContent = price;
  }

  D.actionBtn?.addEventListener('click', () => {
    const amount = parseFloat(D.amount?.value || 0);
    if (!amount) return;

    const bestBid = S.bids[0]?.price || 0;
    const bestAsk = S.asks[0]?.price || 0;

    let slippage = 0;

    if (D.buyTab?.classList.contains('active')) {
      slippage = ((bestAsk - S.mid) / S.mid) * 100;
    } else {
      slippage = ((S.mid - bestBid) / S.mid) * 100;
    }

    if (D.slippage)
      D.slippage.textContent = slippage.toFixed(3);

    if (D.execPrice)
      D.execPrice.textContent = S.mid.toFixed(6);
  });

  /* ================= REBUILD ================= */

  function rebuild() {
    computeQuote();
    buildBook();
    renderHeader();
    renderBook();
  }

  function renderHeader() {
    if (D.price)
      D.price.textContent = S.mid.toFixed(6);

    if (D.approx)
      D.approx.textContent =
        `≈ ${S.bxUSDT.toFixed(2)} USDT`;
  }

})();
