/* =========================================================
   BLOXIO — MARKET.JS MASTER FINAL
   Global Trading Surface / Fast Binance Stream / Pro Chart
   HTML-safe with current index.html
========================================================= */

(() => {
  'use strict';

  /* =========================================================
     CONFIG
  ========================================================= */
  const BX_USDT_REFERENCE = 45; // BX base anchor in USDT
  const ORDERBOOK_ROWS = 14;
  const STREAM_THROTTLE_MS = 45;
  const RENDER_FPS = 60;
  const MAX_TRADE_HISTORY = 120;
  const MAX_CANDLES_BUFFER = 420;

  const QUOTES = {
    USDT: { symbol: null, label: 'USDT' },
    USDC: { symbol: null, label: 'USDC' },
    BTC:  { symbol: 'btcusdt', label: 'BTC'  },
    BNB:  { symbol: 'bnbusdt', label: 'BNB'  },
    ETH:  { symbol: 'ethusdt', label: 'ETH'  },
    AVAX: { symbol: 'avaxusdt', label: 'AVAX' },
    ZEC:  { symbol: 'zecusdt', label: 'ZEC'  },
    TON:  { symbol: 'tonusdt', label: 'TON'  },
    SOL:  { symbol: 'solusdt', label: 'SOL'  },
    LTC:  { symbol: 'ltcusdt', label: 'LTC'  }
  };

  const RANGE_CONFIG = {
    '1H':  { candles: 60,  candleMs: 60 * 1000,         volatility: 0.0035 },
    '24H': { candles: 96,  candleMs: 15 * 60 * 1000,    volatility: 0.0085 },
    '7D':  { candles: 84,  candleMs: 2 * 60 * 60 * 1000, volatility: 0.0130 },
    '30D': { candles: 90,  candleMs: 8 * 60 * 60 * 1000, volatility: 0.0180 },
    '90D': { candles: 90,  candleMs: 24 * 60 * 60 * 1000, volatility: 0.0280 }
  };

  const PRICE_DECIMALS = {
    USDT: 6, USDC: 6, BTC: 8, BNB: 8, ETH: 8,
    AVAX: 8, ZEC: 8, TON: 8, SOL: 8, LTC: 8
  };

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    currentQuote: 'USDT',

    quotePriceUSDT: 1,
    marketPrice: BX_USDT_REFERENCE,
    visualPrice: BX_USDT_REFERENCE,
    prevVisualPrice: BX_USDT_REFERENCE,

    tradeSide: 'buy',
    activeRange: '1H',
    chartMode: 'area',

    bids: [],
    asks: [],
    trades: [],

    stream: {
      ws: null,
      reconnectTimer: null,
      heartbeatTimer: null,
      fallbackTimer: null,
      lastStreamTs: 0,
      lastUpdateTs: 0,
      reconnectAttempts: 0,
      streamSymbol: null
    },

    chart: {
      hoveredIndex: null,
      hoveredCandle: null,
      mouse: { x: 0, y: 0, inside: false },
      raf: null,
      lastFrame: 0
    }
  };

  /* =========================================================
     DOM
  ========================================================= */
  const els = {};

  function cacheDOM() {
    Object.assign(els, {
      // Header / Pair
      marketPrice: document.getElementById('marketPrice'),
      marketApprox: document.getElementById('marketApprox'),
      quoteAsset: document.getElementById('quoteAsset'),

      walletBX: document.getElementById('walletBX'),
      walletUSDT: document.getElementById('walletUSDT'),
      walletQuoteLabel: document.getElementById('walletQuoteLabel'),

      pairBtns: document.querySelectorAll('#market .pair-btn'),

      assetName: document.getElementById('assetName'),
      assetSymbol: document.getElementById('assetSymbol'),
      assetPrice: document.getElementById('assetPrice'),
      assetChangeBadge: document.getElementById('assetChangeBadge'),

      chartQuoteLabel: document.getElementById('chartQuoteLabel'),
      chartLivePrice: document.getElementById('chartLivePrice'),
      chartLiveChange: document.getElementById('chartLiveChange'),

      rangeBtns: document.querySelectorAll('#market [data-range]'),
      chartModeBtns: document.querySelectorAll('#market [data-chart-mode]'),

      // Chart
      chartCanvas: document.getElementById('marketChart'),
      chartTooltip: document.getElementById('marketTooltip'),
      crosshairPrice: document.getElementById('crosshairPrice'),
      crosshairTime: document.getElementById('crosshairTime'),

      // Metrics
      metricOpen: document.getElementById('metricOpen'),
      metricHigh: document.getElementById('metricHigh'),
      metricLow: document.getElementById('metricLow'),
      metricClose: document.getElementById('metricClose'),

      metricOpenPanel: document.getElementById('metricOpenPanel'),
      metricHighPanel: document.getElementById('metricHighPanel'),
      metricLowPanel: document.getElementById('metricLowPanel'),
      metricClosePanel: document.getElementById('metricClosePanel'),
      metricVol: document.getElementById('metricVol'),

      statHigh: document.getElementById('statHigh'),
      statLow: document.getElementById('statLow'),
      statVolume: document.getElementById('statVolume'),
      statMarketCap: document.getElementById('statMarketCap'),

      // Trade
      buyTab: document.getElementById('buyTab'),
      sellTab: document.getElementById('sellTab'),
      tradeBox: document.getElementById('tradeBox'),
      orderAmount: document.getElementById('orderAmount'),
      actionBtn: document.getElementById('actionBtn'),

      percentBtns: document.querySelectorAll('#market [data-percent]'),

      execPrice: document.getElementById('execPrice'),
      slippage: document.getElementById('slippage'),
      spread: document.getElementById('spread'),

      // Orderbook
      orderBookRows: document.getElementById('orderBookRows'),
      orderbookQuote: document.getElementById('orderbookQuote')
    });
  }

  /* =========================================================
     HELPERS
  ========================================================= */
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rnd = (min, max) => Math.random() * (max - min) + min;

  function safeNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function decimalsForQuote() {
    return PRICE_DECIMALS[state.currentQuote] || 6;
  }

  function fmt(n, digits = decimalsForQuote()) {
    return safeNum(n).toLocaleString(undefined, {
      minimumFractionDigits: Math.min(digits, 2),
      maximumFractionDigits: digits
    });
  }

  function compact(n) {
    const value = safeNum(n);
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(2);
  }

  function pctChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  function getWalletBalance(asset) {
    try {
      if (window.BX_BALANCE?.get) return safeNum(window.BX_BALANCE.get(asset));
      if (window.BX_STATE?.balances?.[asset] != null) return safeNum(window.BX_STATE.balances[asset]);
      if (window.bxState?.balances?.[asset] != null) return safeNum(window.bxState.balances[asset]);
      return 0;
    } catch {
      return 0;
    }
  }

  function addWalletBalance(asset, amount) {
    try {
      if (window.BX_BALANCE?.add) return window.BX_BALANCE.add(asset, amount);
      if (window.BX_STATE?.balances) {
        window.BX_STATE.balances[asset] = safeNum(window.BX_STATE.balances[asset]) + safeNum(amount);
      }
    } catch {}
  }

  function subWalletBalance(asset, amount) {
    try {
      if (window.BX_BALANCE?.subtract) return window.BX_BALANCE.subtract(asset, amount);
      if (window.BX_STATE?.balances) {
        window.BX_STATE.balances[asset] = Math.max(0, safeNum(window.BX_STATE.balances[asset]) - safeNum(amount));
      }
    } catch {}
  }

  function emitBalancesUpdated() {
    window.dispatchEvent(new CustomEvent('bx:balances:updated'));
  }

  /* =========================================================
     PRICE ENGINE
  ========================================================= */
  function computeMarketPrice() {
    const prev = state.visualPrice || BX_USDT_REFERENCE;
    state.prevVisualPrice = prev;

    if (state.currentQuote === 'USDT' || state.currentQuote === 'USDC') {
      state.marketPrice = BX_USDT_REFERENCE;
    } else {
      state.marketPrice = BX_USDT_REFERENCE / Math.max(0.00000001, state.quotePriceUSDT || 1);
    }

    const microNoise = (Math.random() - 0.5) * state.marketPrice * 0.0012;
    state.visualPrice = Math.max(0.00000001, state.marketPrice + microNoise);

    updatePriceUI();
    updateTradeStats();
    generateOrderBook();
    renderOrderBook();

    if (CHART.initialized) {
      CHART.update(state.visualPrice);
    }
  }

  /* =========================================================
     UI RENDER
  ========================================================= */
  function updatePriceUI() {
    const d = decimalsForQuote();
    const price = state.visualPrice;
    const change = pctChange(price, state.prevVisualPrice);

    if (els.marketPrice) els.marketPrice.textContent = fmt(price, d);
    if (els.marketApprox) els.marketApprox.textContent = `≈ ${fmt(price, d)} ${state.currentQuote}`;
    if (els.quoteAsset) els.quoteAsset.textContent = state.currentQuote;

    if (els.assetName) els.assetName.textContent = 'Bloxio';
    if (els.assetSymbol) els.assetSymbol.textContent = `BX / ${state.currentQuote}`;
    if (els.assetPrice) els.assetPrice.textContent = `${state.currentQuote === 'USDT' || state.currentQuote === 'USDC' ? '$' : ''}${fmt(price, d)}`;

    if (els.chartQuoteLabel) els.chartQuoteLabel.textContent = state.currentQuote;
    if (els.chartLivePrice) els.chartLivePrice.textContent = `${state.currentQuote === 'USDT' || state.currentQuote === 'USDC' ? '$' : ''}${fmt(price, d)}`;

    if (els.walletQuoteLabel) els.walletQuoteLabel.textContent = state.currentQuote;
    if (els.walletBX) els.walletBX.textContent = fmt(getWalletBalance('BX'), 4);
    if (els.walletUSDT) els.walletUSDT.textContent = fmt(getWalletBalance(state.currentQuote), 4);
    if (els.orderbookQuote) els.orderbookQuote.textContent = state.currentQuote;

    const badge = els.assetChangeBadge;
    const liveBadge = els.chartLiveChange;
    const label = `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%`;

    if (badge) {
      badge.textContent = label;
      badge.classList.toggle('is-up', change >= 0);
      badge.classList.toggle('is-down', change < 0);
    }

    if (liveBadge) {
      liveBadge.textContent = label;
      liveBadge.classList.toggle('is-up', change >= 0);
      liveBadge.classList.toggle('is-down', change < 0);
    }
  }

  function updateTradeSideUI() {
    const isBuy = state.tradeSide === 'buy';

    els.buyTab?.classList.toggle('active', isBuy);
    els.sellTab?.classList.toggle('active', !isBuy);

    els.tradeBox?.classList.toggle('buy', isBuy);
    els.tradeBox?.classList.toggle('sell', !isBuy);

    if (els.actionBtn) {
      els.actionBtn.textContent = `${isBuy ? 'Buy' : 'Sell'} BX`;
      els.actionBtn.classList.toggle('buy', isBuy);
      els.actionBtn.classList.toggle('sell', !isBuy);
    }
  }

  function updateTradeStats() {
    const amount = safeNum(els.orderAmount?.value);
    const exec = state.visualPrice;
    const spreadVal = state.marketPrice * 0.0009;
    const slip = amount > 0 ? clamp((amount / 1000) * 0.22, 0.02, 1.2) : 0.05;

    if (els.execPrice) els.execPrice.textContent = `${fmt(exec)} ${state.currentQuote}`;
    if (els.slippage) els.slippage.textContent = `${slip.toFixed(2)}%`;
    if (els.spread) els.spread.textContent = fmt(spreadVal);
  }

  /* =========================================================
     ORDERBOOK
  ========================================================= */
  function generateOrderBook() {
    state.bids = [];
    state.asks = [];

    const center = state.visualPrice;
    const spread = center * 0.00085;
    let bidBase = center - spread;
    let askBase = center + spread;

    for (let i = 0; i < ORDERBOOK_ROWS; i++) {
      const bidPrice = bidBase - (i * spread * rnd(0.8, 1.25));
      const askPrice = askBase + (i * spread * rnd(0.8, 1.25));

      state.bids.push({
        price: bidPrice,
        amount: rnd(8, 140),
        total: rnd(100, 900)
      });

      state.asks.push({
        price: askPrice,
        amount: rnd(8, 140),
        total: rnd(100, 900)
      });
    }

    state.bids.sort((a, b) => b.price - a.price);
    state.asks.sort((a, b) => a.price - b.price);
  }

  function renderOrderBook() {
    if (!els.orderBookRows) return;

    const maxAmount = Math.max(
      ...state.bids.map(x => x.amount),
      ...state.asks.map(x => x.amount),
      1
    );

    els.orderBookRows.innerHTML = '';

    for (let i = 0; i < ORDERBOOK_ROWS; i++) {
      const bid = state.bids[i];
      const ask = state.asks[i];
      if (!bid || !ask) continue;

      const row = document.createElement('div');
      row.className = 'ob-row';

      const bidDepth = (bid.amount / maxAmount) * 100;
      const askDepth = (ask.amount / maxAmount) * 100;

      row.innerHTML = `
        <div class="ob-side bid" style="--depth:${bidDepth}%">${bid.amount.toFixed(3)}</div>
        <div class="ob-mid">${fmt((bid.price + ask.price) / 2)}</div>
        <div class="ob-side ask" style="--depth:${askDepth}%">${ask.amount.toFixed(3)}</div>
      `;

      els.orderBookRows.appendChild(row);
    }
  }

  /* =========================================================
     TRADE ENGINE
  ========================================================= */
  function executeTrade() {
    const bxAmount = safeNum(els.orderAmount?.value);
    if (!bxAmount || bxAmount <= 0) {
      flashAction('Enter valid BX amount');
      return;
    }

    const quoteNeeded = bxAmount * state.visualPrice;
    const quoteAsset = state.currentQuote;
    const isBuy = state.tradeSide === 'buy';

    if (isBuy) {
      const quoteBal = getWalletBalance(quoteAsset);
      if (quoteBal < quoteNeeded) {
        flashAction(`Insufficient ${quoteAsset}`);
        return;
      }

      subWalletBalance(quoteAsset, quoteNeeded);
      addWalletBalance('BX', bxAmount);
      flashAction(`Bought ${bxAmount.toFixed(4)} BX`);
    } else {
      const bxBal = getWalletBalance('BX');
      if (bxBal < bxAmount) {
        flashAction('Insufficient BX');
        return;
      }

      subWalletBalance('BX', bxAmount);
      addWalletBalance(quoteAsset, quoteNeeded);
      flashAction(`Sold ${bxAmount.toFixed(4)} BX`);
    }

    state.trades.unshift({
      side: state.tradeSide,
      bxAmount,
      quoteAmount: quoteNeeded,
      price: state.visualPrice,
      time: Date.now()
    });

    if (state.trades.length > MAX_TRADE_HISTORY) state.trades.pop();

    emitBalancesUpdated();
    updatePriceUI();
    updateTradeStats();
  }

  function flashAction(text) {
    if (!els.actionBtn) return;
    const original = els.actionBtn.textContent;
    els.actionBtn.textContent = text;
    els.actionBtn.disabled = true;

    setTimeout(() => {
      els.actionBtn.disabled = false;
      updateTradeSideUI();
      els.actionBtn.textContent = original.includes('Buy') || original.includes('Sell')
        ? `${state.tradeSide === 'buy' ? 'Buy' : 'Sell'} BX`
        : original;
    }, 1100);
  }

  function applyPercent(percent) {
    const p = safeNum(percent);
    const isBuy = state.tradeSide === 'buy';

    if (isBuy) {
      const quoteBal = getWalletBalance(state.currentQuote);
      const quoteToUse = quoteBal * (p / 100);
      const bx = quoteToUse / Math.max(0.00000001, state.visualPrice);
      if (els.orderAmount) els.orderAmount.value = bx.toFixed(4);
    } else {
      const bxBal = getWalletBalance('BX');
      const bx = bxBal * (p / 100);
      if (els.orderAmount) els.orderAmount.value = bx.toFixed(4);
    }

    updateTradeStats();
  }

  /* =========================================================
     FAST BINANCE STREAM
  ========================================================= */
  function cleanupSocket() {
    try {
      if (state.stream.ws) {
        state.stream.ws.onopen = null;
        state.stream.ws.onmessage = null;
        state.stream.ws.onerror = null;
        state.stream.ws.onclose = null;
        state.stream.ws.close();
      }
    } catch {}
    state.stream.ws = null;
  }

  function clearStreamTimers() {
    clearTimeout(state.stream.reconnectTimer);
    clearInterval(state.stream.heartbeatTimer);
    clearInterval(state.stream.fallbackTimer);
    state.stream.reconnectTimer = null;
    state.stream.heartbeatTimer = null;
    state.stream.fallbackTimer = null;
  }

  function connectQuoteStream() {
    cleanupSocket();
    clearStreamTimers();

    const streamSymbol = QUOTES[state.currentQuote]?.symbol || null;
    state.stream.streamSymbol = streamSymbol;
    state.stream.lastStreamTs = Date.now();

    if (!streamSymbol) {
      state.quotePriceUSDT = 1;
      computeMarketPrice();
      startFallbackPulse();
      return;
    }

    const url = `wss://stream.binance.com:9443/ws/${streamSymbol}@trade`;
    const ws = new WebSocket(url);
    state.stream.ws = ws;

    ws.onopen = () => {
      state.stream.reconnectAttempts = 0;
      state.stream.lastStreamTs = Date.now();
      startHeartbeatWatch();
      startFallbackPulse();
    };

    ws.onmessage = (event) => {
      const now = performance.now();
      if (now - state.stream.lastUpdateTs < STREAM_THROTTLE_MS) return;
      state.stream.lastUpdateTs = now;
      state.stream.lastStreamTs = Date.now();

      try {
        const data = JSON.parse(event.data);
        const p = safeNum(data.p || data.c || data.price);
        if (p > 0) {
          state.quotePriceUSDT = p;
          computeMarketPrice();
        }
      } catch {}
    };

    ws.onerror = () => {
      scheduleReconnect();
    };

    ws.onclose = () => {
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    cleanupSocket();
    clearTimeout(state.stream.reconnectTimer);

    state.stream.reconnectAttempts += 1;
    const delay = clamp(700 * state.stream.reconnectAttempts, 700, 6000);

    state.stream.reconnectTimer = setTimeout(() => {
      connectQuoteStream();
    }, delay);
  }

  function startHeartbeatWatch() {
    clearInterval(state.stream.heartbeatTimer);

    state.stream.heartbeatTimer = setInterval(() => {
      const stale = Date.now() - state.stream.lastStreamTs > 8000;
      if (stale) {
        scheduleReconnect();
      }
    }, 2500);
  }

  function startFallbackPulse() {
    clearInterval(state.stream.fallbackTimer);

    state.stream.fallbackTimer = setInterval(() => {
      const stale = Date.now() - state.stream.lastStreamTs > 2000;

      if (state.currentQuote === 'USDT' || state.currentQuote === 'USDC') {
        const drift = (Math.random() - 0.5) * BX_USDT_REFERENCE * 0.0008;
        state.quotePriceUSDT = 1;
        state.marketPrice = BX_USDT_REFERENCE;
        state.prevVisualPrice = state.visualPrice;
        state.visualPrice = Math.max(0.00000001, BX_USDT_REFERENCE + drift);
        updatePriceUI();
        updateTradeStats();
        generateOrderBook();
        renderOrderBook();
        if (CHART.initialized) CHART.update(state.visualPrice);
        return;
      }

      if (stale) {
        const fallbackMove = (Math.random() - 0.5) * state.quotePriceUSDT * 0.0025;
        state.quotePriceUSDT = Math.max(0.00000001, state.quotePriceUSDT + fallbackMove);
        computeMarketPrice();
      }
    }, 260);
  }

  /* =========================================================
     CHART ENGINE
  ========================================================= */
  const CHART = {
    initialized: false,
    canvas: null,
    ctx: null,
    candles: [],
    current: null,
    dpr: window.devicePixelRatio || 1,

    init() {
      this.canvas = els.chartCanvas;
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.bind();
      this.resize();
      this.seed(state.visualPrice || BX_USDT_REFERENCE);
      this.initialized = true;
      this.startLoop();
    },

    bind() {
      window.addEventListener('resize', () => {
        requestAnimationFrame(() => this.resize());
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        state.chart.mouse.x = e.clientX - rect.left;
        state.chart.mouse.y = e.clientY - rect.top;
        state.chart.mouse.inside = true;
        this.resolveHover();
      });

      this.canvas.addEventListener('mouseleave', () => {
        state.chart.mouse.inside = false;
        state.chart.hoveredIndex = null;
        state.chart.hoveredCandle = null;
        this.hideTooltip();
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const conf = RANGE_CONFIG[state.activeRange];
        const delta = e.deltaY > 0 ? 6 : -6;
        conf.candles = clamp(conf.candles + delta, 20, 180);
        this.render();
      }, { passive: false });
    },

    resize() {
      if (!this.canvas || !this.canvas.parentElement) return;

      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.dpr = dpr;

      const width = Math.max(320, rect.width);
      const height = Math.max(320, rect.height);

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    },

    seed(price) {
      const conf = RANGE_CONFIG[state.activeRange];
      this.candles = [];

      let last = price;
      const now = Date.now();

      for (let i = conf.candles; i > 0; i--) {
        const open = last;
        const drift = (Math.random() - 0.5) * price * conf.volatility;
        const close = Math.max(0.00000001, open + drift);
        const high = Math.max(open, close) + rnd(0, price * conf.volatility * 0.45);
        const low = Math.min(open, close) - rnd(0, price * conf.volatility * 0.45);
        const volume = rnd(90, 1200);

        this.candles.push({
          open,
          high,
          low,
          close,
          volume,
          time: now - (i * conf.candleMs)
        });

        last = close;
      }

      this.current = this.candles[this.candles.length - 1];
      this.syncMetrics(this.current);
    },

    reset(price) {
      this.seed(price);
      this.render();
    },

    update(price) {
      if (!price || price <= 0) return;

      const conf = RANGE_CONFIG[state.activeRange];
      const now = Date.now();

      if (!this.current) {
        this.seed(price);
        return;
      }

      if (now - this.current.time >= conf.candleMs) {
        this.current = {
          open: this.current.close,
          high: price,
          low: price,
          close: price,
          volume: rnd(90, 360),
          time: now
        };

        this.candles.push(this.current);

        if (this.candles.length > MAX_CANDLES_BUFFER) {
          this.candles.shift();
        }
      } else {
        this.current.high = Math.max(this.current.high, price);
        this.current.low = Math.min(this.current.low, price);
        this.current.close = price;
        this.current.volume += rnd(2, 18);
      }

      this.syncMetrics(this.current);
    },

    getVisibleCandles() {
      const conf = RANGE_CONFIG[state.activeRange];
      return this.candles.slice(-conf.candles);
    },

    getBounds(visible) {
      const highs = visible.map(c => c.high);
      const lows = visible.map(c => c.low);
      const vols = visible.map(c => c.volume);

      let max = Math.max(...highs);
      let min = Math.min(...lows);
      let maxVol = Math.max(...vols, 1);

      if (Math.abs(max - min) < 0.00000001) {
        max += 0.0001;
        min -= 0.0001;
      }

      return { max, min, range: max - min, maxVol };
    },

    priceToY(price, min, range, chartTop, chartHeight) {
      return chartTop + (1 - ((price - min) / range)) * chartHeight;
    },

    resolveHover() {
      if (!state.chart.mouse.inside) return;

      const visible = this.getVisibleCandles();
      if (!visible.length) return;

      const w = this.canvas.clientWidth;
      const step = w / visible.length;
      const idx = clamp(Math.floor(state.chart.mouse.x / step), 0, visible.length - 1);

      state.chart.hoveredIndex = idx;
      state.chart.hoveredCandle = visible[idx];
      this.showTooltip(visible[idx], idx, visible.length, step);
    },

    showTooltip(candle, idx, count, step) {
      if (!els.chartTooltip || !candle) return;

      const x = idx * step + step * 0.5;
      const date = new Date(candle.time);

      els.chartTooltip.innerHTML = `
        <div><strong>O</strong> ${fmt(candle.open)}</div>
        <div><strong>H</strong> ${fmt(candle.high)}</div>
        <div><strong>L</strong> ${fmt(candle.low)}</div>
        <div><strong>C</strong> ${fmt(candle.close)}</div>
        <div><strong>V</strong> ${compact(candle.volume)}</div>
        <div>${date.toLocaleString()}</div>
      `;

      els.chartTooltip.style.opacity = '1';
      els.chartTooltip.style.transform = 'translateY(0)';
      els.chartTooltip.style.left = `${Math.min(this.canvas.clientWidth - 160, Math.max(10, x - 65))}px`;
      els.chartTooltip.style.top = '14px';

      if (els.crosshairPrice) els.crosshairPrice.textContent = fmt(candle.close);
      if (els.crosshairTime) els.crosshairTime.textContent = date.toLocaleTimeString();
    },

    hideTooltip() {
      if (els.chartTooltip) {
        els.chartTooltip.style.opacity = '0';
        els.chartTooltip.style.transform = 'translateY(6px)';
      }

      if (els.crosshairPrice) els.crosshairPrice.textContent = '--';
      if (els.crosshairTime) els.crosshairTime.textContent = '--';
    },

    syncMetrics(c) {
      if (!c) return;

      const set = (el, val) => { if (el) el.textContent = val; };

      set(els.metricOpen, fmt(c.open));
      set(els.metricHigh, fmt(c.high));
      set(els.metricLow, fmt(c.low));
      set(els.metricClose, fmt(c.close));

      set(els.metricOpenPanel, fmt(c.open));
      set(els.metricHighPanel, fmt(c.high));
      set(els.metricLowPanel, fmt(c.low));
      set(els.metricClosePanel, fmt(c.close));
      set(els.metricVol, compact(c.volume));

      const visible = this.getVisibleCandles();
      if (visible.length) {
        const highs = visible.map(x => x.high);
        const lows = visible.map(x => x.low);
        const vol = visible.reduce((a, b) => a + b.volume, 0);

        set(els.statHigh, `${state.currentQuote === 'USDT' || state.currentQuote === 'USDC' ? '$' : ''}${fmt(Math.max(...highs))}`);
        set(els.statLow, `${state.currentQuote === 'USDT' || state.currentQuote === 'USDC' ? '$' : ''}${fmt(Math.min(...lows))}`);
        set(els.statVolume, `${compact(vol)} BX`);
        set(els.statMarketCap, `$${compact((state.visualPrice || BX_USDT_REFERENCE) * 1_000_000)}`);
      }
    },

    renderGrid(ctx, w, chartTop, chartHeight) {
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.lineWidth = 1;

      for (let i = 0; i < 5; i++) {
        const y = chartTop + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i++) {
        const x = (w / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, chartTop);
        ctx.lineTo(x, chartTop + chartHeight);
        ctx.stroke();
      }
    },

    render() {
      if (!this.canvas || !this.ctx) return;

      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const visible = this.getVisibleCandles();
      if (visible.length < 2) return;

      const topPad = 16;
      const bottomPad = 76;
      const chartHeight = h - bottomPad - topPad;
      const volumeHeight = 48;

      const { max, min, range, maxVol } = this.getBounds(visible);
      const step = w / visible.length;
      const candleW = Math.max(4, step * 0.62);

      this.renderGrid(ctx, w, topPad, chartHeight);

      // Volume bars
      visible.forEach((c, i) => {
        const x = i * step + (step - candleW) / 2;
        const vh = (c.volume / maxVol) * volumeHeight;
        const y = h - vh - 12;

        ctx.fillStyle = c.close >= c.open ? 'rgba(14,203,129,.24)' : 'rgba(246,70,93,.22)';
        ctx.fillRect(x, y, candleW, vh);
      });

      // Area / Line / Candles
      if (state.chartMode === 'candles') {
        visible.forEach((c, i) => {
          const x = i * step + step / 2;
          const openY = this.priceToY(c.open, min, range, topPad, chartHeight);
          const closeY = this.priceToY(c.close, min, range, topPad, chartHeight);
          const highY = this.priceToY(c.high, min, range, topPad, chartHeight);
          const lowY = this.priceToY(c.low, min, range, topPad, chartHeight);

          const up = c.close >= c.open;
          ctx.strokeStyle = up ? '#0ecb81' : '#f6465d';
          ctx.fillStyle = up ? '#0ecb81' : '#f6465d';

          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();

          const bodyY = Math.min(openY, closeY);
          const bodyH = Math.max(2, Math.abs(closeY - openY));
          ctx.fillRect(x - candleW / 2, bodyY, candleW, bodyH);
        });
      } else {
        const points = visible.map((c, i) => ({
          x: i * step + step / 2,
          y: this.priceToY(c.close, min, range, topPad, chartHeight),
          price: c.close
        }));

        if (state.chartMode === 'area') {
          ctx.beginPath();
          ctx.moveTo(points[0].x, chartHeight + topPad);
          points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.lineTo(points[points.length - 1].x, chartHeight + topPad);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, topPad, 0, chartHeight + topPad);
          grad.addColorStop(0, 'rgba(14,203,129,.26)');
          grad.addColorStop(1, 'rgba(14,203,129,0)');
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = '#0ecb81';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const lp = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0ecb81';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14,203,129,.15)';
        ctx.fill();
      }

      // Crosshair
      if (state.chart.mouse.inside && state.chart.hoveredIndex !== null && visible[state.chart.hoveredIndex]) {
        const c = visible[state.chart.hoveredIndex];
        const x = state.chart.hoveredIndex * step + step / 2;
        const y = this.priceToY(c.close, min, range, topPad, chartHeight);

        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(x, topPad);
        ctx.lineTo(x, chartHeight + topPad);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    },

    startLoop() {
      const frame = (ts) => {
        const interval = 1000 / RENDER_FPS;
        if (ts - state.chart.lastFrame >= interval) {
          state.chart.lastFrame = ts;
          this.render();
        }
        state.chart.raf = requestAnimationFrame(frame);
      };

      cancelAnimationFrame(state.chart.raf);
      state.chart.raf = requestAnimationFrame(frame);
    }
  };

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindPairButtons() {
    els.pairBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.pairBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.currentQuote = btn.dataset.quote || 'USDT';
        state.quotePriceUSDT = 1;
        updatePriceUI();
        connectQuoteStream();
        CHART.reset(state.visualPrice || BX_USDT_REFERENCE);
      });
    });
  }

  function bindRangeButtons() {
    els.rangeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.rangeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.activeRange = btn.dataset.range || '1H';
        CHART.reset(state.visualPrice || BX_USDT_REFERENCE);
      });
    });
  }

  function bindChartModes() {
    els.chartModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.chartModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.chartMode = btn.dataset.chartMode || 'area';
        CHART.render();
      });
    });
  }

  function bindTrade() {
    els.buyTab?.addEventListener('click', () => {
      state.tradeSide = 'buy';
      updateTradeSideUI();
    });

    els.sellTab?.addEventListener('click', () => {
      state.tradeSide = 'sell';
      updateTradeSideUI();
    });

    els.orderAmount?.addEventListener('input', updateTradeStats);
    els.actionBtn?.addEventListener('click', executeTrade);

    els.percentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        applyPercent(btn.dataset.percent);
      });
    });
  }

  function bindWalletSync() {
    window.addEventListener('bx:balances:updated', () => {
      updatePriceUI();
      updateTradeStats();
    });
  }

  /* =========================================================
     INIT
  ========================================================= */
  function initMarket() {
    cacheDOM();

    if (!els.chartCanvas) return;

    updateTradeSideUI();
    updatePriceUI();
    updateTradeStats();

    bindPairButtons();
    bindRangeButtons();
    bindChartModes();
    bindTrade();
    bindWalletSync();

    generateOrderBook();
    renderOrderBook();

    CHART.init();
    connectQuoteStream();

    // expose
    window.BX_MARKET = {
      state,
      refresh: computeMarketPrice,
      reconnect: connectQuoteStream,
      resetChart: () => CHART.reset(state.visualPrice || BX_USDT_REFERENCE)
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarket);
  } else {
    initMarket();
  }
})();
