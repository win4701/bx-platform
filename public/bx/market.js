/* =========================================================
   BLOXIO MARKET — MASTER FINAL
   HTML-safe • CSS-safe • Router-safe • Wallet-safe
   Works with current index.html / styles.css
========================================================= */

(function () {
  "use strict";

  // =========================================================
  // HELPERS
  // =========================================================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rnd = (min, max) => Math.random() * (max - min) + min;
  const round = (n, d = 6) => Number(n || 0).toFixed(d);
  const roundSmart = (n) => {
    n = Number(n || 0);
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    if (n >= 0.01) return n.toFixed(6);
    return n.toFixed(8);
  };
  const fmtUSD = (n) =>
    "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 6 });
  const fmtNum = (n, d = 2) =>
    Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d });

  const nowTs = () => Date.now();
  const pad2 = (n) => String(n).padStart(2, "0");
  const timeLabel = (ts) => {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  // =========================================================
  // STORAGE KEYS
  // =========================================================
  const STORE_KEYS = {
    wallet: "bloxio.wallet",
    market: "bloxio.market.state"
  };

  // =========================================================
  // WALLET BRIDGE
  // =========================================================
  function getDefaultWallet() {
    return {
      BX: 0,
      USDT: 0,
      USDC: 0,
      BTC: 0,
      BNB: 0,
      ETH: 0,
      AVAX: 0,
      ZEC: 0,
      TON: 0,
      SOL: 0,
      LTC: 0
    };
  }

  function readWallet() {
    try {
      const raw = localStorage.getItem(STORE_KEYS.wallet);
      if (!raw) return getDefaultWallet();
      const parsed = JSON.parse(raw);
      return { ...getDefaultWallet(), ...(parsed || {}) };
    } catch {
      return getDefaultWallet();
    }
  }

  function writeWallet(wallet) {
    try {
      localStorage.setItem(STORE_KEYS.wallet, JSON.stringify(wallet));
      window.dispatchEvent(new CustomEvent("wallet:updated", { detail: wallet }));
    } catch {}
  }

  function getBalance(asset) {
    const wallet = readWallet();
    return Number(wallet?.[asset] || 0);
  }

  function setBalance(asset, value) {
    const wallet = readWallet();
    wallet[asset] = Math.max(0, Number(value || 0));
    writeWallet(wallet);
  }

  function addBalance(asset, delta) {
    const wallet = readWallet();
    wallet[asset] = Math.max(0, Number(wallet[asset] || 0) + Number(delta || 0));
    writeWallet(wallet);
  }

  // =========================================================
  // MARKET STATE
  // =========================================================
  const PAIRS = {
    USDT: { baseRef: 0.000120, vol: 0.0000025, spread: 0.45, fee: 0.0010 },
    USDC: { baseRef: 0.000120, vol: 0.0000022, spread: 0.42, fee: 0.0010 },
    BTC:  { baseRef: 0.0000000019, vol: 0.00000000006, spread: 0.55, fee: 0.0012 },
    BNB:  { baseRef: 0.00000031, vol: 0.000000012, spread: 0.60, fee: 0.0012 },
    ETH:  { baseRef: 0.000000041, vol: 0.0000000012, spread: 0.58, fee: 0.0012 },
    AVAX: { baseRef: 0.0000039, vol: 0.00000016, spread: 0.62, fee: 0.0014 },
    ZEC:  { baseRef: 0.0000018, vol: 0.00000008, spread: 0.64, fee: 0.0014 },
    TON:  { baseRef: 0.000020, vol: 0.0000009, spread: 0.56, fee: 0.0012 },
    SOL:  { baseRef: 0.00000082, vol: 0.00000003, spread: 0.60, fee: 0.0012 },
    LTC:  { baseRef: 0.0000011, vol: 0.00000005, spread: 0.60, fee: 0.0012 }
  };

  const RANGES = {
    "1H": 60,
    "24H": 144,
    "7D": 168,
    "30D": 180,
    "90D": 180
  };

  const state = {
    quote: "USDT",
    range: "1H",
    chartMode: "area",
    tradeMode: "buy",
    currentPrice: PAIRS.USDT.baseRef,
    prevPrice: PAIRS.USDT.baseRef,
    changePct: 0,
    candleData: [],
    chartPoints: [],
    orderBook: [],
    trades: [],
    initialized: false,
    raf: null,
    priceTimer: null,
    orderBookTimer: null,
    chartPulseTimer: null
  };

  // =========================================================
  // DOM CACHE
  // =========================================================
  const dom = {};

  function bindDOM() {
    dom.market = $("#market");
    if (!dom.market) return false;

    // top
    dom.quoteAsset = $("#quoteAsset");
    dom.marketPrice = $("#marketPrice");
    dom.marketApprox = $("#marketApprox");

    // wallet strip
    dom.walletBX = $("#walletBX");
    dom.walletUSDT = $("#walletUSDT");
    dom.walletQuoteLabel = $("#walletQuoteLabel");

    // pair buttons
    dom.pairBtns = $$("#market .pair-btn");

    // hero
    dom.assetName = $("#assetName");
    dom.assetSymbol = $("#assetSymbol");
    dom.assetPrice = $("#assetPrice");
    dom.assetChangeBadge = $("#assetChangeBadge");

    // toolbar
    dom.rangeBtns = $$("#market .market-timeframes button");
    dom.chartModeBtns = $$("#market .market-chart-modes button");

    // chart
    dom.chartQuoteLabel = $("#chartQuoteLabel");
    dom.chartLivePrice = $("#chartLivePrice");
    dom.chartLiveChange = $("#chartLiveChange");
    dom.marketChart = $("#marketChart");
    dom.marketTooltip = $("#marketTooltip");
    dom.crosshairPrice = $("#crosshairPrice");
    dom.crosshairTime = $("#crosshairTime");

    // metrics
    dom.metricOpen = $("#metricOpen");
    dom.metricHigh = $("#metricHigh");
    dom.metricLow = $("#metricLow");
    dom.metricClose = $("#metricClose");

    dom.metricOpenPanel = $("#metricOpenPanel");
    dom.metricHighPanel = $("#metricHighPanel");
    dom.metricLowPanel = $("#metricLowPanel");
    dom.metricClosePanel = $("#metricClosePanel");
    dom.metricVol = $("#metricVol");

    dom.statHigh = $("#statHigh");
    dom.statLow = $("#statLow");
    dom.statVolume = $("#statVolume");
    dom.statMarketCap = $("#statMarketCap");

    // trade
    dom.tradeBox = $("#tradeBox");
    dom.buyTab = $("#buyTab");
    dom.sellTab = $("#sellTab");
    dom.orderAmount = $("#orderAmount");
    dom.execPrice = $("#execPrice");
    dom.slippage = $("#slippage");
    dom.spread = $("#spread");
    dom.actionBtn = $("#actionBtn");
    dom.percentBtns = $$("#market .percent-row button");

    // order book
    dom.orderbookQuote = $("#orderbookQuote");
    dom.orderBookRows = $("#orderBookRows");

    return !!dom.market;
  }

  // =========================================================
  // PERSISTENCE
  // =========================================================
  function loadSavedState() {
    try {
      const raw = localStorage.getItem(STORE_KEYS.market);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;

      if (saved.quote && PAIRS[saved.quote]) state.quote = saved.quote;
      if (saved.range && RANGES[saved.range]) state.range = saved.range;
      if (saved.chartMode) state.chartMode = saved.chartMode;
      if (saved.tradeMode) state.tradeMode = saved.tradeMode;
      if (saved.currentPrice) state.currentPrice = Number(saved.currentPrice);
    } catch {}
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORE_KEYS.market,
        JSON.stringify({
          quote: state.quote,
          range: state.range,
          chartMode: state.chartMode,
          tradeMode: state.tradeMode,
          currentPrice: state.currentPrice
        })
      );
    } catch {}
  }

  // =========================================================
  // PRICE ENGINE
  // =========================================================
  function generateHistory(range = state.range, quote = state.quote) {
    const cfg = PAIRS[quote];
    const points = [];
    const candles = [];

    const len = RANGES[range] || 60;
    const now = nowTs();
    const step = range === "1H" ? 60_000 : range === "24H" ? 10 * 60_000 : 60 * 60_000;

    let p = state.currentPrice || cfg.baseRef;

    for (let i = len - 1; i >= 0; i--) {
      const ts = now - i * step;

      const drift = (Math.random() - 0.5) * cfg.vol * 2.2;
      const open = p;
      const close = Math.max(cfg.baseRef * 0.55, open + drift);
      const high = Math.max(open, close) + Math.random() * cfg.vol * 1.2;
      const low = Math.min(open, close) - Math.random() * cfg.vol * 1.2;
      const vol = Math.floor(rnd(2000, 32000));

      candles.push({ ts, open, high, low, close, vol });
      points.push({ ts, value: close });
      p = close;
    }

    state.candleData = candles;
    state.chartPoints = points;
    state.currentPrice = points[points.length - 1]?.value || cfg.baseRef;
    state.prevPrice = points[points.length - 2]?.value || state.currentPrice;

    recalcChange();
  }

  function recalcChange() {
    const first = state.chartPoints[0]?.value || state.currentPrice;
    const last = state.chartPoints[state.chartPoints.length - 1]?.value || state.currentPrice;
    state.changePct = first ? ((last - first) / first) * 100 : 0;
  }

  function tickPrice() {
    const cfg = PAIRS[state.quote];
    state.prevPrice = state.currentPrice;

    const drift = (Math.random() - 0.5) * cfg.vol;
    const momentum = (state.currentPrice - cfg.baseRef) * -0.01;
    let next = state.currentPrice + drift + momentum;

    next = Math.max(cfg.baseRef * 0.45, next);
    state.currentPrice = next;

    // update last candle
    if (state.candleData.length) {
      const last = state.candleData[state.candleData.length - 1];
      last.close = next;
      last.high = Math.max(last.high, next);
      last.low = Math.min(last.low, next);
      last.vol += Math.floor(rnd(10, 200));

      const lastPoint = state.chartPoints[state.chartPoints.length - 1];
      if (lastPoint) lastPoint.value = next;
    }

    // every few ticks shift chart
    if (Math.random() > 0.72 && state.chartPoints.length > 20) {
      const step =
        state.range === "1H" ? 60_000 :
        state.range === "24H" ? 10 * 60_000 :
        60 * 60_000;

      const ts = (state.chartPoints[state.chartPoints.length - 1]?.ts || nowTs()) + step;
      const open = state.currentPrice;
      const close = Math.max(cfg.baseRef * 0.45, open + (Math.random() - 0.5) * cfg.vol * 1.4);
      const high = Math.max(open, close) + Math.random() * cfg.vol;
      const low = Math.min(open, close) - Math.random() * cfg.vol;
      const vol = Math.floor(rnd(1500, 26000));

      state.chartPoints.push({ ts, value: close });
      state.candleData.push({ ts, open, high, low, close, vol });

      const maxLen = RANGES[state.range] || 60;
      if (state.chartPoints.length > maxLen) state.chartPoints.shift();
      if (state.candleData.length > maxLen) state.candleData.shift();

      state.currentPrice = close;
    }

    recalcChange();
    renderTop();
    renderMetrics();
    renderTradeBox();
    drawChart();
  }

  // =========================================================
  // ORDER BOOK ENGINE
  // =========================================================
  function buildOrderBook() {
    const rows = [];
    const price = state.currentPrice;
    const cfg = PAIRS[state.quote];
    const spreadPct = cfg.spread / 100;

    for (let i = 12; i >= 1; i--) {
      const bidPrice = price * (1 - spreadPct * i * 0.12);
      const askPrice = price * (1 + spreadPct * i * 0.12);
      const bidAmt = rnd(200, 6000);
      const askAmt = rnd(200, 6000);

      rows.push({
        bidPrice,
        bidAmt,
        midPrice: price,
        askPrice,
        askAmt
      });
    }

    state.orderBook = rows;
    renderOrderBook();
  }

  function renderOrderBook() {
    if (!dom.orderBookRows) return;
    const html = state.orderBook.map((r) => {
      return `
        <div class="ob-row">
          <div class="ob-cell bid">${roundSmart(r.bidPrice)} <small>${fmtNum(r.bidAmt, 2)}</small></div>
          <div class="ob-cell mid">${roundSmart(r.midPrice)}</div>
          <div class="ob-cell ask">${roundSmart(r.askPrice)} <small>${fmtNum(r.askAmt, 2)}</small></div>
        </div>
      `;
    }).join("");

    dom.orderBookRows.innerHTML = html;
  }

  // =========================================================
  // CHART ENGINE (Canvas)
  // =========================================================
  let ctx = null;
  let chartHoverIndex = -1;

  function setupCanvas() {
    if (!dom.marketChart) return;
    ctx = dom.marketChart.getContext("2d");

    const resize = () => {
      const parent = dom.marketChart.parentElement;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      dom.marketChart.width = Math.floor(rect.width * dpr);
      dom.marketChart.height = Math.floor(rect.height * dpr);
      dom.marketChart.style.width = rect.width + "px";
      dom.marketChart.style.height = rect.height + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawChart();
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    dom.marketChart.addEventListener("mousemove", onChartMove);
    dom.marketChart.addEventListener("mouseleave", onChartLeave);
    dom.marketChart.addEventListener("touchmove", onChartTouch, { passive: true });
    dom.marketChart.addEventListener("touchend", onChartLeave, { passive: true });
  }

  function getChartRect() {
    const rect = dom.marketChart.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function getChartBounds() {
    const { width, height } = getChartRect();
    return {
      x: 14,
      y: 10,
      w: width - 28,
      h: height - 24
    };
  }

  function getSeries() {
    return state.chartMode === "candles" ? state.candleData : state.chartPoints;
  }

  function drawChart() {
    if (!ctx || !dom.marketChart) return;

    const { width, height } = getChartRect();
    const b = getChartBounds();

    ctx.clearRect(0, 0, width, height);

    // bg grid
    drawGrid(ctx, b);

    if (state.chartMode === "candles") {
      drawCandles(ctx, b, state.candleData);
    } else {
      drawLineArea(ctx, b, state.chartPoints, state.chartMode === "area");
    }

    if (chartHoverIndex >= 0) {
      drawCrosshair(ctx, b, chartHoverIndex);
    }
  }

  function drawGrid(ctx, b) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = b.y + (b.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x + b.w, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 5; i++) {
      const x = b.x + (b.w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, b.y);
      ctx.lineTo(x, b.y + b.h);
      ctx.stroke();
    }

    ctx.restore();
  }

  function getMinMaxFromPoints(points) {
    const vals = points.map((p) => Number(p.value));
    return {
      min: Math.min(...vals),
      max: Math.max(...vals)
    };
  }

  function getMinMaxFromCandles(candles) {
    return {
      min: Math.min(...candles.map((c) => Number(c.low))),
      max: Math.max(...candles.map((c) => Number(c.high)))
    };
  }

  function drawLineArea(ctx, b, points, fill = true) {
    if (!points || points.length < 2) return;

    const { min, max } = getMinMaxFromPoints(points);
    const range = Math.max(0.0000000001, max - min);

    const up = state.changePct >= 0;
    const lineColor = up ? "#0ecb81" : "#f6465d";
    const glow = up ? "rgba(14,203,129,.22)" : "rgba(246,70,93,.22)";

    const coords = points.map((p, i) => {
      const x = b.x + (i / (points.length - 1)) * b.w;
      const y = b.y + b.h - ((p.value - min) / range) * b.h;
      return { x, y, ts: p.ts, value: p.value };
    });

    // glow
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = glow;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    coords.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();

    // main line
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    coords.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();

    if (fill) {
      const grad = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      grad.addColorStop(0, up ? "rgba(14,203,129,.26)" : "rgba(246,70,93,.24)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      coords.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.lineTo(coords[coords.length - 1].x, b.y + b.h);
      ctx.lineTo(coords[0].x, b.y + b.h);
      ctx.closePath();
      ctx.fill();
    }

    // end dot
    const last = coords[coords.length - 1];
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawCandles(ctx, b, candles) {
    if (!candles || candles.length < 2) return;

    const { min, max } = getMinMaxFromCandles(candles);
    const range = Math.max(0.0000000001, max - min);
    const barW = Math.max(3, (b.w / candles.length) * 0.62);

    candles.forEach((c, i) => {
      const x = b.x + (i / candles.length) * b.w + 2;
      const openY = b.y + b.h - ((c.open - min) / range) * b.h;
      const closeY = b.y + b.h - ((c.close - min) / range) * b.h;
      const highY = b.y + b.h - ((c.high - min) / range) * b.h;
      const lowY = b.y + b.h - ((c.low - min) / range) * b.h;
      const up = c.close >= c.open;

      ctx.save();
      ctx.strokeStyle = up ? "#0ecb81" : "#f6465d";
      ctx.fillStyle = up ? "rgba(14,203,129,.9)" : "rgba(246,70,93,.9)";
      ctx.lineWidth = 1;

      // wick
      ctx.beginPath();
      ctx.moveTo(x + barW / 2, highY);
      ctx.lineTo(x + barW / 2, lowY);
      ctx.stroke();

      // body
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x, bodyY, barW, bodyH);
      ctx.restore();
    });
  }

  function drawCrosshair(ctx, b, index) {
    const series = getSeries();
    if (!series.length || index < 0 || index >= series.length) return;

    let point;
    if (state.chartMode === "candles") {
      const c = series[index];
      const { min, max } = getMinMaxFromCandles(state.candleData);
      const range = Math.max(0.0000000001, max - min);
      const x = b.x + (index / Math.max(1, series.length - 1)) * b.w;
      const y = b.y + b.h - ((c.close - min) / range) * b.h;
      point = { x, y, ts: c.ts, value: c.close };
    } else {
      const p = series[index];
      const { min, max } = getMinMaxFromPoints(state.chartPoints);
      const range = Math.max(0.0000000001, max - min);
      const x = b.x + (index / Math.max(1, series.length - 1)) * b.w;
      const y = b.y + b.h - ((p.value - min) / range) * b.h;
      point = { x, y, ts: p.ts, value: p.value };
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(point.x, b.y);
    ctx.lineTo(point.x, b.y + b.h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(b.x, point.y);
    ctx.lineTo(b.x + b.w, point.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  function chartIndexFromClientX(clientX) {
    const rect = dom.marketChart.getBoundingClientRect();
    const x = clientX - rect.left;
    const b = getChartBounds();
    const series = getSeries();
    if (!series.length) return -1;

    const ratio = clamp((x - b.x) / b.w, 0, 1);
    return Math.round(ratio * (series.length - 1));
  }

  function onChartMove(e) {
    chartHoverIndex = chartIndexFromClientX(e.clientX);
    updateHoverUI(chartHoverIndex);
    drawChart();
  }

  function onChartTouch(e) {
    const t = e.touches?.[0];
    if (!t) return;
    chartHoverIndex = chartIndexFromClientX(t.clientX);
    updateHoverUI(chartHoverIndex);
    drawChart();
  }

  function onChartLeave() {
    chartHoverIndex = -1;
    if (dom.marketTooltip) dom.marketTooltip.style.display = "none";
    if (dom.crosshairPrice) dom.crosshairPrice.textContent = "--";
    if (dom.crosshairTime) dom.crosshairTime.textContent = "--";
    drawChart();
  }

  function updateHoverUI(index) {
    const series = getSeries();
    if (!series.length || index < 0 || index >= series.length) return;

    let ts, value, text;
    if (state.chartMode === "candles") {
      const c = series[index];
      ts = c.ts;
      value = c.close;
      text = `O ${roundSmart(c.open)} • H ${roundSmart(c.high)} • L ${roundSmart(c.low)} • C ${roundSmart(c.close)}`;
    } else {
      const p = series[index];
      ts = p.ts;
      value = p.value;
      text = `${roundSmart(value)} ${state.quote}`;
    }

    if (dom.marketTooltip) {
      dom.marketTooltip.style.display = "block";
      dom.marketTooltip.textContent = text;
    }

    if (dom.crosshairPrice) dom.crosshairPrice.textContent = roundSmart(value);
    if (dom.crosshairTime) dom.crosshairTime.textContent = timeLabel(ts);
  }

  // =========================================================
  // RENDERERS
  // =========================================================
  function renderPairButtons() {
    dom.pairBtns?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.quote === state.quote);
    });
  }

  function renderRangeButtons() {
    dom.rangeBtns?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.range === state.range);
    });
  }

  function renderChartModeButtons() {
    dom.chartModeBtns?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.chartMode === state.chartMode);
    });
  }

  function renderTop() {
    const up = state.changePct >= 0;
    const sign = up ? "▲" : "▼";
    const priceText = roundSmart(state.currentPrice);
    const changeText = `${sign} ${Math.abs(state.changePct).toFixed(2)}%`;

    if (dom.quoteAsset) dom.quoteAsset.textContent = state.quote;
    if (dom.marketPrice) dom.marketPrice.textContent = priceText;
    if (dom.marketApprox) dom.marketApprox.textContent = `≈ ${priceText} ${state.quote}`;

    if (dom.assetName) dom.assetName.textContent = "Bloxio";
    if (dom.assetSymbol) dom.assetSymbol.textContent = "BX";
    if (dom.assetPrice) dom.assetPrice.textContent = fmtUSD(state.currentPrice);
    if (dom.chartLivePrice) dom.chartLivePrice.textContent = fmtUSD(state.currentPrice);

    if (dom.chartQuoteLabel) dom.chartQuoteLabel.textContent = state.quote;
    if (dom.walletQuoteLabel) dom.walletQuoteLabel.textContent = state.quote;
    if (dom.orderbookQuote) dom.orderbookQuote.textContent = state.quote;

    if (dom.assetChangeBadge) {
      dom.assetChangeBadge.textContent = changeText;
      dom.assetChangeBadge.classList.toggle("is-up", up);
      dom.assetChangeBadge.classList.toggle("is-down", !up);
    }

    if (dom.chartLiveChange) {
      dom.chartLiveChange.textContent = changeText;
      dom.chartLiveChange.classList.toggle("is-up", up);
      dom.chartLiveChange.classList.toggle("is-down", !up);
    }

    renderWalletStrip();
  }

  function renderWalletStrip() {
    if (dom.walletBX) dom.walletBX.textContent = fmtNum(getBalance("BX"), 4);
    if (dom.walletUSDT) dom.walletUSDT.textContent = fmtNum(getBalance(state.quote), 4);
  }

  function renderMetrics() {
    const candles = state.candleData;
    if (!candles.length) return;

    const open = candles[0].open;
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    const close = candles[candles.length - 1].close;
    const vol = candles.reduce((a, c) => a + (c.vol || 0), 0);
    const marketCap = close * 1_000_000_000;

    const o = roundSmart(open);
    const h = roundSmart(high);
    const l = roundSmart(low);
    const c = roundSmart(close);

    if (dom.metricOpen) dom.metricOpen.textContent = o;
    if (dom.metricHigh) dom.metricHigh.textContent = h;
    if (dom.metricLow) dom.metricLow.textContent = l;
    if (dom.metricClose) dom.metricClose.textContent = c;

    if (dom.metricOpenPanel) dom.metricOpenPanel.textContent = o;
    if (dom.metricHighPanel) dom.metricHighPanel.textContent = h;
    if (dom.metricLowPanel) dom.metricLowPanel.textContent = l;
    if (dom.metricClosePanel) dom.metricClosePanel.textContent = c;
    if (dom.metricVol) dom.metricVol.textContent = fmtNum(vol, 0);

    if (dom.statHigh) dom.statHigh.textContent = fmtUSD(high);
    if (dom.statLow) dom.statLow.textContent = fmtUSD(low);
    if (dom.statVolume) dom.statVolume.textContent = `${fmtNum(vol, 0)} BX`;
    if (dom.statMarketCap) dom.statMarketCap.textContent = fmtUSD(marketCap);
  }

  function renderTradeBox() {
    const cfg = PAIRS[state.quote];
    const spreadPct = cfg.spread;
    const slip = clamp((Math.abs(state.changePct) * 0.12) + rnd(0.02, 0.12), 0.02, 2.5);

    if (dom.execPrice) dom.execPrice.textContent = `${roundSmart(state.currentPrice)} ${state.quote}`;
    if (dom.slippage) dom.slippage.textContent = `${slip.toFixed(2)}%`;
    if (dom.spread) dom.spread.textContent = `${spreadPct.toFixed(2)}%`;

    if (dom.tradeBox) dom.tradeBox.classList.toggle("sell", state.tradeMode === "sell");
    if (dom.buyTab) dom.buyTab.classList.toggle("active", state.tradeMode === "buy");
    if (dom.sellTab) dom.sellTab.classList.toggle("active", state.tradeMode === "sell");

    if (dom.actionBtn) {
      dom.actionBtn.textContent = state.tradeMode === "buy" ? "Buy BX" : "Sell BX";
      dom.actionBtn.className = `action-btn ${state.tradeMode === "buy" ? "buy" : "sell"}`;
    }
  }

  // =========================================================
  // TRADE ENGINE
  // =========================================================
  function usePercent(percent) {
    const p = clamp(Number(percent || 0), 0, 100) / 100;
    const quoteBal = getBalance(state.quote);
    const bxBal = getBalance("BX");
    let amount = 0;

    if (state.tradeMode === "buy") {
      const budget = quoteBal * p;
      amount = budget / state.currentPrice;
    } else {
      amount = bxBal * p;
    }

    if (dom.orderAmount) dom.orderAmount.value = amount > 0 ? amount.toFixed(4) : "";
  }

  function executeTrade() {
    const amount = Number(dom.orderAmount?.value || 0);
    if (!amount || amount <= 0) {
      toast("Enter valid amount");
      return;
    }

    const cfg = PAIRS[state.quote];
    const feeRate = cfg.fee;
    const slipRate = clamp((Math.abs(state.changePct) * 0.0015) + rnd(0.0002, 0.0012), 0.0002, 0.015);
    const exec = state.tradeMode === "buy"
      ? state.currentPrice * (1 + slipRate)
      : state.currentPrice * (1 - slipRate);

    if (state.tradeMode === "buy") {
      const grossCost = amount * exec;
      const fee = grossCost * feeRate;
      const total = grossCost + fee;

      if (getBalance(state.quote) < total) {
        toast(`Insufficient ${state.quote}`);
        return;
      }

      addBalance(state.quote, -total);
      addBalance("BX", amount);
      toast(`Bought ${fmtNum(amount, 4)} BX`);
    } else {
      if (getBalance("BX") < amount) {
        toast("Insufficient BX");
        return;
      }

      const gross = amount * exec;
      const fee = gross * feeRate;
      const net = gross - fee;

      addBalance("BX", -amount);
      addBalance(state.quote, net);
      toast(`Sold ${fmtNum(amount, 4)} BX`);
    }

    if (dom.orderAmount) dom.orderAmount.value = "";
    renderWalletStrip();
    renderTradeBox();
  }

  // =========================================================
  // EVENTS
  // =========================================================
  function bindEvents() {
    dom.pairBtns?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.quote;
        if (!q || !PAIRS[q]) return;

        state.quote = q;
        state.currentPrice = PAIRS[q].baseRef;
        generateHistory(state.range, state.quote);
        buildOrderBook();

        renderPairButtons();
        renderTop();
        renderMetrics();
        renderTradeBox();
        drawChart();
        saveState();
      });
    });

    dom.rangeBtns?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = btn.dataset.range;
        if (!r || !RANGES[r]) return;
        state.range = r;

        generateHistory(state.range, state.quote);
        renderRangeButtons();
        renderMetrics();
        drawChart();
        saveState();
      });
    });

    dom.chartModeBtns?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.chartMode;
        if (!mode) return;
        state.chartMode = mode;
        renderChartModeButtons();
        drawChart();
        saveState();
      });
    });

    dom.buyTab?.addEventListener("click", () => {
      state.tradeMode = "buy";
      renderTradeBox();
      saveState();
    });

    dom.sellTab?.addEventListener("click", () => {
      state.tradeMode = "sell";
      renderTradeBox();
      saveState();
    });

    dom.percentBtns?.forEach((btn) => {
      btn.addEventListener("click", () => usePercent(btn.dataset.percent));
    });

    dom.actionBtn?.addEventListener("click", executeTrade);

    window.addEventListener("wallet:updated", () => {
      renderWalletStrip();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopLoops();
      else startLoops();
    });

    // router safe
    window.addEventListener("hashchange", () => {
      if (isMarketVisible()) {
        drawChart();
        renderTop();
        renderMetrics();
        renderTradeBox();
        renderOrderBook();
      }
    });
  }

  // =========================================================
  // TOAST
  // =========================================================
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById("marketToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "marketToast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "92px";
      el.style.transform = "translateX(-50%)";
      el.style.zIndex = "9999";
      el.style.padding = "12px 14px";
      el.style.borderRadius = "14px";
      el.style.background = "rgba(9,14,22,.96)";
      el.style.border = "1px solid rgba(255,255,255,.08)";
      el.style.color = "#fff";
      el.style.fontSize = "13px";
      el.style.fontWeight = "900";
      el.style.boxShadow = "0 14px 26px rgba(0,0,0,.28)";
      document.body.appendChild(el);
    }

    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.display = "none";
    }, 1800);
  }

  // =========================================================
  // LOOPS
  // =========================================================
  function startLoops() {
    stopLoops();

    state.priceTimer = setInterval(() => {
      if (!isMarketVisible()) return;
      tickPrice();
    }, 1200);

    state.orderBookTimer = setInterval(() => {
      if (!isMarketVisible()) return;
      buildOrderBook();
    }, 1700);

    state.chartPulseTimer = setInterval(() => {
      if (!isMarketVisible()) return;
      drawChart();
    }, 2500);
  }

  function stopLoops() {
    clearInterval(state.priceTimer);
    clearInterval(state.orderBookTimer);
    clearInterval(state.chartPulseTimer);
    state.priceTimer = null;
    state.orderBookTimer = null;
    state.chartPulseTimer = null;
  }

  function isMarketVisible() {
    const market = document.getElementById("market");
    if (!market) return false;
    return market.classList.contains("active") || getComputedStyle(market).display !== "none";
  }

  // =========================================================
  // INIT
  // =========================================================
  function init() {
    if (!bindDOM()) return;

    loadSavedState();
    generateHistory(state.range, state.quote);
    buildOrderBook();

    renderPairButtons();
    renderRangeButtons();
    renderChartModeButtons();
    renderTop();
    renderMetrics();
    renderTradeBox();

    setupCanvas();
    drawChart();
    bindEvents();
    startLoops();

    state.initialized = true;
    saveState();
  }

  // =========================================================
  // BOOT
  // =========================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
