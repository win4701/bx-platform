/* =========================================================
   Market Engine — FINAL STABLE
   Real Prices from Binance + Synthetic BX Market
   ========================================================= */

(() => {
  'use strict';
  if (window.__MARKET_FINAL__) return;
  window.__MARKET_FINAL__ = true;

  /* ================= CONFIG ================= */
  const CFG = {
    BASE: 'BX',
    BX_USDT: 38,
    ROWS: 15,
    SPREAD_STEP: 0.0009,
    DEPTH_MAX: 12,
    EMA_PERIOD: 21,
    CHART_POINTS: 300
  };

  /* ================= REAL PRICES (BINANCE) ================= */
  const REAL = { USDT: 1, USDC: 1 };
  const STREAMS = [
    'btcusdt@ticker', 'ethusdt@ticker', 'bnbusdt@ticker',
    'solusdt@ticker', 'avaxusdt@ticker', 'ltcusdt@ticker',
    'zecusdt@ticker', 'tonusdt@ticker'
  ];
  let priceWS = null;

  /* ================= STATE ================= */
  const S = {
    quote: 'USDT',
    bxUSDT: CFG.BX_USDT,
    bxQuote: CFG.BX_USDT,
    bids: [], asks: [], maxVol: 1, mid: CFG.BX_USDT,
    chart: null, series: null,
    midSeries: null, emaSeries: null, vwapSeries: null,
    depthBidSeries: null, depthAskSeries: null,
    chartData: [], emaVal: null, vwapPV: 0, vwapVol: 0
  };

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const root = document.querySelector('#market') || document.querySelector('.market-view');
  if (!root) return;

  const D = {
    price: $('marketPrice'),
    approx: $('marketApprox'),
    quote: $('quoteAsset'),
    bids: $('bids'),
    asks: $('asks'),
    ladder: $('priceLadder'),
    chart: $('bxChart'),
    pairs: root.querySelectorAll('[data-quote]')
  };

  /* ================= INIT ================= */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (!D.bids || !D.asks || !D.ladder) return requestAnimationFrame(init);
    bindPairs();
    initBookRows();
    initChart();
    connectBinance();
    rebuild();
  }

  /* ================= BINANCE FEED ================= */
  function connectBinance() {
    if (priceWS) return;
    const url = `wss://stream.binance.com:9443/stream?streams=${STREAMS.join('/')}`;
    priceWS = new WebSocket(url);

    priceWS.onmessage = (e) => {
      const d = JSON.parse(e.data)?.data;
      if (!d || !d.s || !d.c) return;
      const asset = d.s.replace('USDT', '');
      REAL[asset] = parseFloat(d.c);
      if (S.quote === asset) rebuild();
    };
  }

  /* ================= PAIRS ================= */
  function bindPairs() {
    D.pairs.forEach(btn => {
      btn.onclick = () => {
        D.pairs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        S.quote = btn.dataset.quote;
        rebuild(true);
      };
    });
  }

  /* ================= PRICE ================= */
  function computeQuote() {
    if (S.quote === 'USDT' || S.quote === 'USDC') {
      S.bxQuote = S.bxUSDT;
    } else if (REAL[S.quote]) {
      S.bxQuote = S.bxUSDT / REAL[S.quote];
    }
  }

  /* ================= ORDER BOOK ================= */
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
     for (let i = 0; i < CFG.ROWS; i++) {
      const level = i - half;

      rows.bids[i].textContent = '';
      rows.asks[i].textContent = '';
      rows.ladder[i].classList.remove('mid');

      if (level < 0) {
        const b = S.bids[Math.abs(level) - 1];
        if (b) {
          const pct = b.vol / S.maxVol;
          rows.bids[i].textContent = b.price.toFixed(6);
          rows.bids[i].style.background =
            `linear-gradient(to left, rgba(0,200,120,${pct}), transparent)`;
          rows.ladder[i].textContent = b.price.toFixed(6);
        }
      }
        else if (level > 0) {
        const a = S.asks[level - 1];
        if (a) {
          const pct = a.vol / S.maxVol;
          rows.asks[i].textContent = a.price.toFixed(6);
          rows.asks[i].style.background =
            `linear-gradient(to right, rgba(255,80,80,${pct}), transparent)`;
          rows.ladder[i].textContent = a.price.toFixed(6);
        }
      }

      else {
        rows.ladder[i].textContent = S.mid.toFixed(6);
        rows.ladder[i].classList.add('mid');
      }
    }
      }
  /* ================= HEADER ================= */
  function renderHeader() {
    if (D.price) D.price.textContent = S.bxQuote.toFixed(6);
    if (D.quote) D.quote.textContent = S.quote;
    if (D.approx) D.approx.textContent = `≈ ${S.bxUSDT.toFixed(2)} USDT`;
  }
for (let i = 0; i < CFG.ROWS; i++) {
      const level = i - half;
      if (level === 0) continue;

      const price = mid * (1 + level * CFG.SPREAD_STEP);
      const vol = 1 + Math.random() * CFG.DEPTH_MAX;
      S.maxVol = Math.max(S.maxVol, vol);

      if (level < 0) S.bids.unshift({ price, vol });
      if (level > 0) S.asks.push({ price, vol });
    }

    S.mid = mid;
  }

  function renderBook() {
    const half = Math.floor(CFG.ROWS / 2);
  /* ================= CHART ================= */
  function initChart() {
    if (!D.chart || !window.LightweightCharts) return;
    D.chart.innerHTML = '';
    S.chartData = []; S.emaVal = null; S.vwapPV = 0; S.vwapVol = 0;

    S.chart = LightweightCharts.createChart(D.chart, {
      height: 260,
      layout: { background: { color: '#0b0f14' }, textColor: '#9aa4ad' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' },
              horzLines: { color: 'rgba(255,255,255,0.03)' } },
      timeScale: { timeVisible: true }
    });

    S.series = S.chart.addLineSeries({ color: '#00e676', lineWidth: 2 });
    S.midSeries = S.chart.addLineSeries({
      color: 'rgba(255,213,79,.9)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed
    });
    S.emaSeries = S.chart.addLineSeries({ color: '#42a5f5', lineWidth: 1 });
    S.vwapSeries = S.chart.addLineSeries({ color: '#ab47bc', lineWidth: 1 });

    S.depthBidSeries = S.chart.addAreaSeries({
      topColor: 'rgba(0,200,120,.25)', bottomColor: 'rgba(0,200,120,.05)',
      lineColor: 'rgba(0,200,120,.6)'
    });
    S.depthAskSeries = S.chart.addAreaSeries({
      topColor: 'rgba(255,82,82,.25)', bottomColor: 'rgba(255,82,82,.05)',
      lineColor: 'rgba(255,82,82,.6)'
    });
  }

  function updateChart() {
    if (!S.series) return;
    const t = Math.floor(Date.now() / 1000);
    S.chartData.push({ time: t, value: S.bxQuote });
    if (S.chartData.length > CFG.CHART_POINTS) S.chartData.shift();
    S.series.setData(S.chartData);
    S.midSeries.update({ time: t, value: S.mid });

    const k = 2 / (CFG.EMA_PERIOD + 1);
    S.emaVal = S.emaVal == null ? S.bxQuote : S.bxQuote * k + S.emaVal * (1 - k);
    S.emaSeries.update({ time: t, value: S.emaVal });

    const vol = (S.bids[0]?.vol || 1) + (S.asks[0]?.vol || 1);
    S.vwapPV += S.mid * vol; S.vwapVol += vol;
    S.vwapSeries.update({ time: t, value: S.vwapPV / S.vwapVol });

    const bd = S.bids.slice(0, 5).reduce((s, b) => s + b.vol, 0);
    const ad = S.asks.slice(0, 5).reduce((s, a) => s + a.vol, 0);
    S.depthBidSeries.update({ time: t, value: bd });
    S.depthAskSeries.update({ time: t, value: ad });
  }

  /* ================= PIPELINE ================= */
  function rebuild(resetChart = false) {
    computeQuote();
    buildBook();
    renderHeader();
    renderBook();
    if (resetChart) initChart();
    updateChart();
  }

  /* ================= DEBUG ================= */
  window.MarketEngine = { rebuild };

})();
