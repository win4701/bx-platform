/* =========================================================
   BLOXIO MARKET — RE-MEASURE FIX FINAL
   Stable BX=45 / Pro Chart / Clean Orderbook / Safe Hybrid
========================================================= */

(function () {
  'use strict';

  /* =========================================================
     CONFIG
  ========================================================= */
  const CONFIG = {
    symbol: 'BX',
    quote: 'USDT',
    rank: '#276',

    basePrice: 45.0,              // السعر الأساسي الثابت
    liveNoisePercent: 0.0011,     // تقليل العشوائية
    trendBiasPercent: 0.00022,    // ميل بسيط جدًا
    candleNoisePercent: 0.0015,   // تقليل عنف الشموع
    maxDriftClamp: 0.018,         // ±1.8% أقصى انحراف بصري
    orderbookLevels: 15,
    slippagePercent: 0.10,

    chart: {
      fps: 30,
      paddingTop: 20,
      paddingRight: 58,
      paddingBottom: 28,
      paddingLeft: 18,
      gridLines: 5,
      volumeHeight: 28,
      crosshairColor: 'rgba(255,255,255,0.18)',
      font: '12px Inter, system-ui, -apple-system, sans-serif',
      lineColor: '#7ef8cc',
      lineGlow: 'rgba(126,248,204,0.25)',
      areaTop: 'rgba(126,248,204,0.22)',
      areaBottom: 'rgba(126,248,204,0.00)',
      candleUp: '#49f2a6',
      candleDown: '#ff6b85',
      axisColor: 'rgba(255,255,255,0.40)',
      gridColor: 'rgba(255,255,255,0.05)',
      volumeUp: 'rgba(73,242,166,0.35)',
      volumeDown: 'rgba(255,107,133,0.35)'
    },

    timeframeMap: {
      '1H': 60,
      '24H': 96,
      '7D': 84,
      '30D': 90,
      '90D': 90,
      '1Y': 120,
      'ALL': 160
    }
  };

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    marketPrice: CONFIG.basePrice,
    marketChangePercent: 0.03,
    selectedPair: 'BX',
    selectedTimeframe: 'ALL',
    selectedChartMode: 'line', // line | area | candles
    tradeMode: 'buy',          // buy | sell
    amountBX: 0,
    lastClose: CONFIG.basePrice,

    chartData: {
      '1H': [],
      '24H': [],
      '7D': [],
      '30D': [],
      '90D': [],
      '1Y': [],
      'ALL': []
    },

    chartHoverIndex: null,
    chartHoverX: null,
    chartHoverY: null,

    orderbook: {
      bids: [],
      asks: []
    },

    stats: {
      high24h: 45.65,
      low24h: 44.72,
      volume24h: 799600,
      marketCap: 45000000000,
      open: 44.92812,
      high: 45.06913,
      low: 44.88316,
      close: 45.01182
    }
  };

  /* =========================================================
     DOM HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function safeText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function safeHTML(id, value) {
    const el = $(id);
    if (el) el.innerHTML = value;
  }

  function safeVal(id, value) {
    const el = $(id);
    if (el) el.value = value;
  }

  function fmtNum(n, digits = 4) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function fmtPrice(n, digits = 5) {
    return '$' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function fmtPairPrice(n, digits = 6) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function fmtCompact(n) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return Number(n).toFixed(2);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function nowTs() {
    return Date.now();
  }

  /* =========================================================
     DATA GENERATION — STABLE / PROFESSIONAL
  ========================================================= */

  function generateStableSeries(label, count) {
    const series = [];
    let p = CONFIG.basePrice;
    let ts = nowTs() - count * 3600 * 1000;

    // scale حسب الفريم
    let tfVol = 0.0008;
    if (label === '1H') tfVol = 0.00035;
    if (label === '24H') tfVol = 0.00055;
    if (label === '7D') tfVol = 0.00075;
    if (label === '30D') tfVol = 0.00095;
    if (label === '90D') tfVol = 0.0011;
    if (label === '1Y') tfVol = 0.0012;
    if (label === 'ALL') tfVol = 0.00135;

    for (let i = 0; i < count; i++) {
      const open = p;

      // حركة احترافية هادئة
      const drift = (Math.random() - 0.5) * (p * tfVol);
      const trend = Math.sin(i / 18) * (p * 0.00018);
      const closeRaw = open + drift + trend;

      // لا نسمح بخروج السعر عن نطاق منطقي
      const close = clamp(
        closeRaw,
        CONFIG.basePrice * (1 - CONFIG.maxDriftClamp),
        CONFIG.basePrice * (1 + CONFIG.maxDriftClamp)
      );

      const wickNoise = p * 0.00065;
      const highRaw = Math.max(open, close) + rand(0, wickNoise);
      const lowRaw = Math.min(open, close) - rand(0, wickNoise);

      const high = clamp(
        highRaw,
        CONFIG.basePrice * 0.985,
        CONFIG.basePrice * 1.03
      );

      const low = clamp(
        lowRaw,
        CONFIG.basePrice * 0.97,
        CONFIG.basePrice * 1.015
      );

      const volume = rand(120, 900) * (1 + Math.abs(close - open) * 10);

      series.push({
        t: ts,
        open,
        high,
        low,
        close,
        volume
      });

      p = close;
      ts += 3600 * 1000;
    }

    return series;
  }

  function buildAllSeries() {
    Object.keys(CONFIG.timeframeMap).forEach((tf) => {
      state.chartData[tf] = generateStableSeries(tf, CONFIG.timeframeMap[tf]);
    });

    const last = state.chartData.ALL[state.chartData.ALL.length - 1];
    if (last) {
      state.marketPrice = last.close;
      state.lastClose = last.close;
    }

    recalcStatsFromSeries();
  }

  function recalcStatsFromSeries() {
    const daySeries = state.chartData['24H'] || [];
    if (!daySeries.length) return;

    const highs = daySeries.map(x => x.high);
    const lows = daySeries.map(x => x.low);
    const volumes = daySeries.map(x => x.volume);

    const open = daySeries[0].open;
    const close = daySeries[daySeries.length - 1].close;
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const volume = volumes.reduce((a, b) => a + b, 0);

    state.stats.high24h = high;
    state.stats.low24h = low;
    state.stats.volume24h = volume * 18;
    state.stats.marketCap = state.marketPrice * 1000000000;

    state.stats.open = open;
    state.stats.high = high;
    state.stats.low = low;
    state.stats.close = close;

    state.marketChangePercent = ((close - open) / open) * 100;
  }

  /* =========================================================
     ORDERBOOK
  ========================================================= */
  function generateOrderBook() {
    const mid = state.marketPrice;
    const bids = [];
    const asks = [];

    for (let i = 0; i < CONFIG.orderbookLevels; i++) {
      const priceBid = mid - (i + 1) * 0.036;
      const priceAsk = mid + (i + 1) * 0.036;

      bids.push({
        size: rand(0.20, 4.90),
        price: priceBid
      });

      asks.push({
        size: rand(0.20, 4.90),
        price: priceAsk
      });
    }

    state.orderbook.bids = bids.sort((a, b) => b.price - a.price);
    state.orderbook.asks = asks.sort((a, b) => a.price - b.price);
  }

  function renderOrderBook() {
    const body = $('orderBookBody');
    if (!body) return;

    const maxBid = Math.max(...state.orderbook.bids.map(x => x.size), 1);
    const maxAsk = Math.max(...state.orderbook.asks.map(x => x.size), 1);

    const rows = [];

    for (let i = 0; i < CONFIG.orderbookLevels; i++) {
      const bid = state.orderbook.bids[i];
      const ask = state.orderbook.asks[i];

      if (!bid || !ask) continue;

      const bidDepth = (bid.size / maxBid) * 100;
      const askDepth = (ask.size / maxAsk) * 100;

      rows.push(`
        <div class="ob-row">
          <div class="depth-bid" style="width:${bidDepth}%"></div>
          <div class="depth-ask" style="width:${askDepth}%"></div>

          <div class="ob-bid">${fmtPairPrice(bid.size, 3)}</div>
          <div class="ob-mid">${fmtPairPrice((bid.price + ask.price) / 2, 6)}</div>
          <div class="ob-ask">${fmtPairPrice(ask.size, 3)}</div>
        </div>
      `);
    }

    body.innerHTML = rows.join('');
  }

  /* =========================================================
     UI RENDER
  ========================================================= */
  function renderHeader() {
    safeText('pairPrice', fmtPairPrice(state.marketPrice, 6));
    safeText('pairApprox', `≈ ${fmtPairPrice(state.marketPrice, 6)} ${CONFIG.quote}`);
    safeText('assetPrice', fmtPrice(state.marketPrice, 5));

    const isUp = state.marketChangePercent >= 0;
    const arrow = isUp ? '▲' : '▼';
    const pct = `${arrow} ${Math.abs(state.marketChangePercent).toFixed(2)}%`;

    const assetChange = $('assetChange');
    if (assetChange) {
      assetChange.textContent = pct;
      assetChange.classList.toggle('is-down', !isUp);
    }
  }

  function renderStats() {
    safeText('statsHigh', fmtPrice(state.stats.high24h, 5));
    safeText('statsLow', fmtPrice(state.stats.low24h, 5));
    safeText('statsVolume', `${fmtCompact(state.stats.volume24h)} BX`);
    safeText('statsCap', `$${fmtCompact(state.stats.marketCap)}`);

    safeText('ohlcOpen', fmtPairPrice(state.stats.open, 5));
    safeText('ohlcHigh', fmtPairPrice(state.stats.high, 5));
    safeText('ohlcLow', fmtPairPrice(state.stats.low, 5));
    safeText('ohlcClose', fmtPairPrice(state.stats.close, 5));
  }

  function renderTradeSummary() {
    const amount = Number(($('tradeAmount')?.value || '0').replace(',', '.')) || 0;
    state.amountBX = amount;

    const price = state.marketPrice;
    const slippage = CONFIG.slippagePercent;
    const spread = 0.072;

    safeText('tradePrice', fmtPairPrice(price, 6));
    safeText('tradeSlippage', `${slippage.toFixed(2)}%`);
    safeText('tradeSpread', fmtPairPrice(spread, 6));

    const btn = $('tradeActionBtn');
    if (btn) {
      btn.textContent = state.tradeMode === 'buy' ? 'Buy BX' : 'Sell BX';
      btn.classList.toggle('buy', state.tradeMode === 'buy');
      btn.classList.toggle('sell', state.tradeMode === 'sell');
    }

    const tradeBox = $('tradeBox');
    if (tradeBox) {
      tradeBox.classList.toggle('buy', state.tradeMode === 'buy');
      tradeBox.classList.toggle('sell', state.tradeMode === 'sell');
    }
  }

  function renderAll() {
    renderHeader();
    renderStats();
    renderTradeSummary();
    renderOrderBook();
    drawChart();
  }

  /* =========================================================
     CHART ENGINE — PRO MAX STABLE
  ========================================================= */
  const chartCanvas = $('marketChart') || $('bxChart');
  let ctx = chartCanvas ? chartCanvas.getContext('2d') : null;
  let dpr = Math.max(window.devicePixelRatio || 1, 1);

  function getCurrentSeries() {
    return state.chartData[state.selectedTimeframe] || state.chartData.ALL || [];
  }

  function resizeChart() {
    if (!chartCanvas || !ctx) return;

    const rect = chartCanvas.getBoundingClientRect();
    const w = Math.max(rect.width, 320);
    const h = Math.max(rect.height, 260);

    chartCanvas.width = Math.floor(w * dpr);
    chartCanvas.height = Math.floor(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawChart();
  }

  function getChartBounds(series) {
    const prices = [];
    series.forEach(c => {
      prices.push(c.high, c.low, c.open, c.close);
    });

    let min = Math.min(...prices);
    let max = Math.max(...prices);

    // إصلاح scale حتى لا يبالغ
    const spread = Math.max(max - min, state.marketPrice * 0.01);
    const pad = spread * 0.18;

    min -= pad;
    max += pad;

    // clamp آمن
    min = Math.max(min, CONFIG.basePrice * 0.95);
    max = Math.min(max, CONFIG.basePrice * 1.06);

    return { min, max };
  }

  function drawChart() {
    if (!chartCanvas || !ctx) return;
    const series = getCurrentSeries();
    if (!series.length) return;

    const w = chartCanvas.width / dpr;
    const h = chartCanvas.height / dpr;

    const P = CONFIG.chart;
    const plotX = P.paddingLeft;
    const plotY = P.paddingTop;
    const plotW = w - P.paddingLeft - P.paddingRight;
    const plotH = h - P.paddingTop - P.paddingBottom - P.volumeHeight;

    ctx.clearRect(0, 0, w, h);

    // background subtle
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(255,255,255,0.015)');
    bg.addColorStop(1, 'rgba(255,255,255,0.005)');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.fill();

    const { min, max } = getChartBounds(series);

    const xAt = (i) => plotX + (i / Math.max(series.length - 1, 1)) * plotW;
    const yAt = (price) => plotY + (1 - (price - min) / (max - min)) * plotH;

    drawGrid(ctx, plotX, plotY, plotW, plotH, min, max);

    if (state.selectedChartMode === 'candles') {
      drawCandles(ctx, series, xAt, yAt, plotH);
    } else {
      drawLineOrArea(ctx, series, xAt, yAt, state.selectedChartMode === 'area');
    }

    drawVolumes(ctx, series, xAt, w, h, plotX, plotY + plotH + 8, plotW, P.volumeHeight - 6);

    // crosshair
    if (state.chartHoverIndex !== null) {
      drawCrosshair(ctx, series, xAt, yAt, plotX, plotY, plotW, plotH);
    }

    drawYAxis(ctx, min, max, w, plotY, plotH);
  }

  function drawGrid(ctx, x, y, w, h, min, max) {
    ctx.save();
    ctx.strokeStyle = CONFIG.chart.gridColor;
    ctx.lineWidth = 1;

    for (let i = 0; i <= CONFIG.chart.gridLines; i++) {
      const yy = y + (i / CONFIG.chart.gridLines) * h;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawYAxis(ctx, min, max, canvasW, y, h) {
    ctx.save();
    ctx.fillStyle = CONFIG.chart.axisColor;
    ctx.font = CONFIG.chart.font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= CONFIG.chart.gridLines; i++) {
      const yy = y + (i / CONFIG.chart.gridLines) * h;
      const price = max - ((max - min) * i / CONFIG.chart.gridLines);
      ctx.fillText(fmtPairPrice(price, 5), canvasW - 10, yy);
    }

    ctx.restore();
  }

  function drawLineOrArea(ctx, series, xAt, yAt, fillArea = false) {
    ctx.save();

    // line glow
    ctx.shadowColor = CONFIG.chart.lineGlow;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.strokeStyle = CONFIG.chart.lineColor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    series.forEach((c, i) => {
      const x = xAt(i);
      const y = yAt(c.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (fillArea) {
      const lastX = xAt(series.length - 1);
      const firstX = xAt(0);
      const bottom = yAt(Math.min(...series.map(x => x.low)) - 0.2);

      const g = ctx.createLinearGradient(0, 0, 0, bottom);
      g.addColorStop(0, CONFIG.chart.areaTop);
      g.addColorStop(1, CONFIG.chart.areaBottom);

      ctx.beginPath();
      series.forEach((c, i) => {
        const x = xAt(i);
        const y = yAt(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(lastX, bottom);
      ctx.lineTo(firstX, bottom);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCandles(ctx, series, xAt, yAt) {
    ctx.save();

    const candleW = Math.max(4, (chartCanvas.width / dpr) / series.length * 0.45);

    series.forEach((c, i) => {
      const x = xAt(i);
      const openY = yAt(c.open);
      const closeY = yAt(c.close);
      const highY = yAt(c.high);
      const lowY = yAt(c.low);

      const up = c.close >= c.open;
      const color = up ? CONFIG.chart.candleUp : CONFIG.chart.candleDown;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.2;

      // wick
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // body
      const top = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(closeY - openY), 2.2);

      ctx.fillRect(x - candleW / 2, top, candleW, bodyH);
    });

    ctx.restore();
  }

  function drawVolumes(ctx, series, xAt, canvasW, canvasH, x, y, w, h) {
    ctx.save();

    const maxVol = Math.max(...series.map(s => s.volume), 1);
    const barW = Math.max(1.6, w / series.length * 0.65);

    series.forEach((c, i) => {
      const xx = xAt(i);
      const barH = (c.volume / maxVol) * h;
      const up = c.close >= c.open;

      ctx.fillStyle = up ? CONFIG.chart.volumeUp : CONFIG.chart.volumeDown;
      ctx.fillRect(xx - barW / 2, y + h - barH, barW, barH);
    });

    ctx.restore();
  }

  function drawCrosshair(ctx, series, xAt, yAt, plotX, plotY, plotW, plotH) {
    const idx = clamp(state.chartHoverIndex, 0, series.length - 1);
    const candle = series[idx];
    if (!candle) return;

    const x = xAt(idx);
    const y = yAt(candle.close);

    ctx.save();
    ctx.strokeStyle = CONFIG.chart.crosshairColor;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x, plotY);
    ctx.lineTo(x, plotY + plotH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();

    // point
    ctx.beginPath();
    ctx.fillStyle = '#49f2a6';
    ctx.shadowColor = 'rgba(73,242,166,0.35)';
    ctx.shadowBlur = 14;
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    safeText('chartCrossValue', fmtPairPrice(candle.close, 5));
    safeText('chartCrossTime', formatChartDate(candle.t));

    const tooltip = $('chartTooltip');
    if (tooltip) {
      tooltip.classList.add('show');
      tooltip.innerHTML = `
        <div><strong>${formatChartDate(candle.t)}</strong></div>
        <div>Open: ${fmtPairPrice(candle.open, 5)}</div>
        <div>High: ${fmtPairPrice(candle.high, 5)}</div>
        <div>Low: ${fmtPairPrice(candle.low, 5)}</div>
        <div>Close: ${fmtPairPrice(candle.close, 5)}</div>
      `;

      const rect = chartCanvas.getBoundingClientRect();
      const localX = x;
      const localY = y;

      tooltip.style.left = `${Math.min(localX + 14, rect.width - 160)}px`;
      tooltip.style.top = `${Math.max(localY - 84, 12)}px`;
    }
  }

  function formatChartDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* =========================================================
     INTERACTION
  ========================================================= */
  function bindChartEvents() {
    if (!chartCanvas) return;

    chartCanvas.addEventListener('mousemove', (e) => {
      const rect = chartCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const series = getCurrentSeries();
      if (!series.length) return;

      const P = CONFIG.chart;
      const plotW = rect.width - P.paddingLeft - P.paddingRight;
      const relative = clamp((x - P.paddingLeft) / plotW, 0, 1);
      const idx = Math.round(relative * (series.length - 1));

      state.chartHoverIndex = idx;
      drawChart();
    });

    chartCanvas.addEventListener('mouseleave', () => {
      state.chartHoverIndex = null;
      const tooltip = $('chartTooltip');
      if (tooltip) tooltip.classList.remove('show');
      safeText('chartCrossValue', '--');
      safeText('chartCrossTime', '--');
      drawChart();
    });

    window.addEventListener('resize', resizeChart);
  }

  function bindTimeframes() {
    $$('[data-timeframe]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tf = btn.dataset.timeframe;
        if (!tf) return;

        state.selectedTimeframe = tf;

        $$('[data-timeframe]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.chartHoverIndex = null;
        drawChart();
      });
    });
  }

  function bindChartModes() {
    $$('[data-chart-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.chartMode;
        if (!mode) return;

        state.selectedChartMode = mode;

        $$('[data-chart-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        drawChart();
      });
    });
  }

  function bindPairs() {
    $$('[data-pair]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedPair = btn.dataset.pair || 'BX';

        $$('[data-pair]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function bindTrade() {
    const buyTab = $('buyTab');
    const sellTab = $('sellTab');
    const tradeAmount = $('tradeAmount');
    const tradeActionBtn = $('tradeActionBtn');

    if (buyTab) {
      buyTab.addEventListener('click', () => {
        state.tradeMode = 'buy';
        buyTab.classList.add('active');
        if (sellTab) sellTab.classList.remove('active');
        renderTradeSummary();
      });
    }

    if (sellTab) {
      sellTab.addEventListener('click', () => {
        state.tradeMode = 'sell';
        sellTab.classList.add('active');
        if (buyTab) buyTab.classList.remove('active');
        renderTradeSummary();
      });
    }

    if (tradeAmount) {
      tradeAmount.addEventListener('input', () => {
        renderTradeSummary();
      });
    }

    $$('[data-percent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pct = Number(btn.dataset.percent || 0);
        const simulatedBalance = 1000; // balance mock
        const amount = (simulatedBalance * pct) / 100 / state.marketPrice;

        if (tradeAmount) tradeAmount.value = amount.toFixed(4);

        $$('[data-percent]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        renderTradeSummary();
      });
    });

    if (tradeActionBtn) {
      tradeActionBtn.addEventListener('click', () => {
        const amount = Number(($('tradeAmount')?.value || '0').replace(',', '.')) || 0;
        if (amount <= 0) {
          alert('Enter valid BX amount');
          return;
        }

        const total = amount * state.marketPrice;
        alert(
          `${state.tradeMode === 'buy' ? 'Buy' : 'Sell'} order placed\n\n` +
          `Amount: ${fmtPairPrice(amount, 4)} BX\n` +
          `Price: ${fmtPairPrice(state.marketPrice, 6)} ${CONFIG.quote}\n` +
          `Total: ${fmtPairPrice(total, 4)} ${CONFIG.quote}`
        );
      });
    }
  }

  /* =========================================================
     LIVE ENGINE — SAFE & SMOOTH
  ========================================================= */
  function tickLiveMarket() {
    const p = state.marketPrice;

    const microNoise = (Math.random() - 0.5) * (p * CONFIG.liveNoisePercent);
    const trend = Math.sin(Date.now() / 8000) * (p * CONFIG.trendBiasPercent);

    let next = p + microNoise + trend;

    // clamp محكم
    next = clamp(
      next,
      CONFIG.basePrice * (1 - CONFIG.maxDriftClamp),
      CONFIG.basePrice * (1 + CONFIG.maxDriftClamp)
    );

    state.marketPrice = next;
    state.lastClose = next;

    injectLiveCandle(next);
    recalcStatsFromSeries();
    generateOrderBook();
    renderAll();
  }

  function injectLiveCandle(price) {
    Object.keys(state.chartData).forEach((tf) => {
      const arr = state.chartData[tf];
      if (!arr || !arr.length) return;

      const last = arr[arr.length - 1];
      const open = last.close;
      const close = price;

      const wickNoise = price * 0.00055;

      const high = clamp(
        Math.max(open, close) + rand(0, wickNoise),
        CONFIG.basePrice * 0.985,
        CONFIG.basePrice * 1.03
      );

      const low = clamp(
        Math.min(open, close) - rand(0, wickNoise),
        CONFIG.basePrice * 0.97,
        CONFIG.basePrice * 1.015
      );

      const candle = {
        t: Date.now(),
        open,
        high,
        low,
        close,
        volume: rand(140, 900)
      };

      arr.push(candle);

      const maxLen = CONFIG.timeframeMap[tf];
      while (arr.length > maxLen) arr.shift();
    });
  }

  /* =========================================================
     INIT
  ========================================================= */
  function initDefaults() {
    const tfBtn = document.querySelector('[data-timeframe="ALL"]');
    if (tfBtn) tfBtn.classList.add('active');

    const modeBtn = document.querySelector('[data-chart-mode="line"]');
    if (modeBtn) modeBtn.classList.add('active');

    const buyTab = $('buyTab');
    if (buyTab) buyTab.classList.add('active');

    safeVal('tradeAmount', '0.0000');
  }

  function init() {
    buildAllSeries();
    generateOrderBook();

    initDefaults();
    bindChartEvents();
    bindTimeframes();
    bindChartModes();
    bindPairs();
    bindTrade();

    renderAll();
    resizeChart();

    // live market
    setInterval(tickLiveMarket, 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
