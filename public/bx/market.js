/* =========================================================
   BLOXIO MARKET — FINAL PRO FULL REBUILD
   Clean / Responsive / Full Width / HTML+CSS Synced
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */
  const BX_USDT_REFERENCE = 45;
  const DEFAULT_QUOTE = "USDT";
  const MAX_ORDERBOOK_ROWS = 12;

  const QUOTE_STREAMS = {
    USDT: null,
    USDC: "usdcusdt",
    BTC: "btcusdt",
    ETH: "ethusdt",
    BNB: "bnbusdt",
    AVAX: "avaxusdt",
    ZEC: "zecusdt",
    TON: "tonusdt",
    SOL: "solusdt",
    LTC: "ltcusdt"
  };

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const fmt = (n, d = 2) => {
    if (!isFinite(n)) return Number(0).toFixed(d);
    return Number(n).toFixed(d);
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rnd = (min, max) => Math.random() * (max - min) + min;

  function compact(n) {
    if (!isFinite(n)) return "0";
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return fmt(n, 2);
  }

  function formatBalance(symbol, value) {
    if (["BTC", "ETH", "BNB"].includes(symbol)) return fmt(value, 6);
    return fmt(value, 4);
  }

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { ok: false, error: text || "Invalid server response" };
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    initialized: false,

    currentQuote: DEFAULT_QUOTE,
    marketPrice: BX_USDT_REFERENCE,
    quotePriceUSDT: 1,

    visualPrice: BX_USDT_REFERENCE,
    lastPrice: BX_USDT_REFERENCE,
    lastDirection: "flat",

    tradeSide: "buy",
    chartMode: "area",
    activeRange: "1H",

    bids: [],
    asks: [],

    wallet: {
      BX: 0,
      USDT: 0,
      USDC: 0,
      BTC: 0,
      ETH: 0,
      BNB: 0,
      AVAX: 0,
      ZEC: 0,
      TON: 0,
      SOL: 0,
      LTC: 0
    },

    ws: null,
    wsReconnectTimer: null
  };

  /* =========================================================
     DOM CACHE
  ========================================================= */
  const els = {};

  function cacheDOM() {
    els.market = $("market");
    if (!els.market) return false;

    Object.assign(els, {
      // Header
      marketPrice: $("marketPrice"),
      marketApprox: $("marketApprox"),
      quoteAsset: $("quoteAsset"),

      // Wallet mini
      walletBX: $("walletBX"),
      walletUSDT: $("walletUSDT"),
      walletQuoteLabel: $("walletQuoteLabel"),

      // Pair buttons
      pairButtons: $$(".pair-btn", els.market),

      // Hero
      assetName: $("assetName"),
      assetSymbol: $("assetSymbol"),
      assetRank: $("assetRank"),
      assetPrice: $("assetPrice"),
      assetChangeBadge: $("assetChangeBadge"),

      // Chart topbar
      chartQuoteLabel: $("chartQuoteLabel"),
      chartLivePrice: $("chartLivePrice"),
      chartLiveChange: $("chartLiveChange"),

      // Toolbar
      rangeButtons: $$("[data-range]", els.market),
      chartModeButtons: $$("[data-chart-mode]", els.market),

      // Chart
      marketChart: $("marketChart"),
      marketTooltip: $("marketTooltip"),
      crosshairPrice: $("crosshairPrice"),
      crosshairTime: $("crosshairTime"),

      // Stats
      statHigh: $("statHigh"),
      statLow: $("statLow"),
      statVolume: $("statVolume"),
      statMarketCap: $("statMarketCap"),

      // Footer live stats
      metricOpen: $("metricOpen"),
      metricHigh: $("metricHigh"),
      metricLow: $("metricLow"),
      metricClose: $("metricClose"),

      // OHLC panel
      metricOpenPanel: $("metricOpenPanel"),
      metricHighPanel: $("metricHighPanel"),
      metricLowPanel: $("metricLowPanel"),
      metricClosePanel: $("metricClosePanel"),
      metricVol: $("metricVol"),

      // Trade
      tradeBox: $("tradeBox"),
      buyTab: $("buyTab"),
      sellTab: $("sellTab"),
      actionBtn: $("actionBtn"),
      orderAmount: $("orderAmount"),
      percentButtons: $$(".percent-row button", els.market),
      execPrice: $("execPrice"),
      slippage: $("slippage"),
      spread: $("spread"),

      // Orderbook
      orderBookRows: $("orderBookRows"),
      orderbookQuote: $("orderbookQuote")
    });

    return true;
  }

  /* =========================================================
     WALLET
  ========================================================= */
  async function loadWallet() {
    try {
      const data = await api("/api/wallet");
      if (data.wallet) {
        state.wallet = { ...state.wallet, ...data.wallet };
      }
    } catch (err) {
      console.warn("[MARKET] wallet load failed:", err.message);
    }

    updateWalletUI();
  }

  function updateWalletUI() {
    if (els.walletBX) {
      els.walletBX.textContent = formatBalance("BX", state.wallet.BX || 0);
    }

    const q = state.currentQuote;
    const balance = state.wallet[q] || 0;

    if (els.walletUSDT) {
      els.walletUSDT.textContent = formatBalance(q, balance);
    }

    if (els.walletQuoteLabel) {
      els.walletQuoteLabel.textContent = q;
    }
  }

  /* =========================================================
     PRICE ENGINE
  ========================================================= */
  function computeBXPrice() {
    const old = state.marketPrice;

    if (state.currentQuote === "USDT") {
      state.marketPrice = BX_USDT_REFERENCE;
    } else {
      state.marketPrice = BX_USDT_REFERENCE / (state.quotePriceUSDT || 1);
    }

    state.lastDirection =
      state.marketPrice > old ? "up" :
      state.marketPrice < old ? "down" : "flat";

    state.lastPrice = old;

    // visual micro movement for chart only
    const visualNoise = (Math.random() - 0.5) * (state.marketPrice * 0.004);
    state.visualPrice = Math.max(0.000001, state.marketPrice + visualNoise);

    updatePriceUI();
    generateOrderBook();
    renderOrderBook();

    if (CHART.initialized) {
      CHART.update(state.visualPrice);
    }

    syncStatsUI();
    updateTradePreview();
  }

  function updatePriceUI() {
    const price = state.marketPrice;
    const old = state.lastPrice || price;
    const changePct = old > 0 ? ((price - old) / old) * 100 : 0;
    const up = changePct >= 0;

    // Header
    if (els.marketPrice) {
      els.marketPrice.textContent = fmt(price, 6);
      els.marketPrice.classList.remove("up", "down");
      if (state.lastDirection === "up") els.marketPrice.classList.add("up");
      if (state.lastDirection === "down") els.marketPrice.classList.add("down");
    }

    if (els.marketApprox) {
      els.marketApprox.textContent = `≈ ${fmt(price, 6)} ${state.currentQuote}`;
    }

    if (els.quoteAsset) {
      els.quoteAsset.textContent = state.currentQuote;
    }

    // Hero
    if (els.assetName) els.assetName.textContent = "Bloxio";
    if (els.assetSymbol) els.assetSymbol.textContent = "BX";
    if (els.assetRank) els.assetRank.textContent = "#276";
    if (els.assetPrice) els.assetPrice.textContent = `$${fmt(price, 5)}`;

    if (els.assetChangeBadge) {
      els.assetChangeBadge.textContent = `${up ? "▲" : "▼"} ${Math.abs(changePct).toFixed(2)}%`;
      els.assetChangeBadge.classList.remove("is-up", "is-down");
      els.assetChangeBadge.classList.add(up ? "is-up" : "is-down");
    }

    // Chart topbar
    if (els.chartQuoteLabel) {
      els.chartQuoteLabel.textContent = state.currentQuote;
    }

    if (els.chartLivePrice) {
      els.chartLivePrice.textContent = `$${fmt(price, 5)}`;
    }

    if (els.chartLiveChange) {
      els.chartLiveChange.textContent = `${up ? "▲" : "▼"} ${Math.abs(changePct).toFixed(2)}%`;
      els.chartLiveChange.classList.remove("is-up", "is-down");
      els.chartLiveChange.classList.add(up ? "is-up" : "is-down");
    }

    updateWalletUI();
  }

  /* =========================================================
     ORDER BOOK
  ========================================================= */
  function generateOrderBook() {
    state.bids = [];
    state.asks = [];

    const spreadUnit = state.marketPrice * 0.0008;

    for (let i = 1; i <= MAX_ORDERBOOK_ROWS; i++) {
      state.bids.unshift({
        price: state.marketPrice - i * spreadUnit,
        amount: +(rnd(0.25, 5.25)).toFixed(3)
      });

      state.asks.push({
        price: state.marketPrice + i * spreadUnit,
        amount: +(rnd(0.25, 5.25)).toFixed(3)
      });
    }
  }

  function renderOrderBook() {
    if (!els.orderBookRows) return;
    els.orderBookRows.innerHTML = "";

    if (!state.bids.length || !state.asks.length) {
      els.orderBookRows.innerHTML = `<div class="ob-empty">No orderbook data</div>`;
      return;
    }

    const maxBid = Math.max(...state.bids.map(x => x.amount), 1);
    const maxAsk = Math.max(...state.asks.map(x => x.amount), 1);

    state.bids.forEach((b, i) => {
      const a = state.asks[i];
      const mid = (b.price + a.price) / 2;

      const row = document.createElement("div");
      row.className = "ob-row";

      const bidDepth = Math.min(100, (b.amount / maxBid) * 100);
      const askDepth = Math.min(100, (a.amount / maxAsk) * 100);

      row.innerHTML = `
        <div class="depth-bid" style="width:${bidDepth}%"></div>
        <div class="depth-ask" style="width:${askDepth}%"></div>

        <div class="ob-bid">${fmt(b.amount, 3)}</div>
        <div class="ob-mid">${fmt(mid, 6)}</div>
        <div class="ob-ask">${fmt(a.amount, 3)}</div>
      `;

      els.orderBookRows.appendChild(row);
    });

    if (els.orderbookQuote) {
      els.orderbookQuote.textContent = state.currentQuote;
    }
  }

  /* =========================================================
     TRADE ENGINE
  ========================================================= */
  function setTradeSide(side) {
    state.tradeSide = side;

    if (els.tradeBox) {
      els.tradeBox.classList.toggle("buy", side === "buy");
      els.tradeBox.classList.toggle("sell", side === "sell");
    }

    if (els.buyTab) els.buyTab.classList.toggle("active", side === "buy");
    if (els.sellTab) els.sellTab.classList.toggle("active", side === "sell");

    if (els.actionBtn) {
      els.actionBtn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
      els.actionBtn.classList.toggle("buy", side === "buy");
      els.actionBtn.classList.toggle("sell", side === "sell");
    }

    updateTradePreview();
  }

  function updateTradePreview() {
    const bestBid = state.bids[state.bids.length - 1]?.price || state.marketPrice;
    const bestAsk = state.asks[0]?.price || state.marketPrice;
    const exec = state.tradeSide === "buy" ? bestAsk : bestBid;

    if (els.execPrice) els.execPrice.textContent = fmt(exec, 6);
    if (els.spread) els.spread.textContent = fmt(bestAsk - bestBid, 6);
    if (els.slippage) els.slippage.textContent = "0.10%";
  }

  function setPercent(percent) {
    if (!els.orderAmount) return;

    const q = state.currentQuote;
    const quoteBal = state.wallet[q] || 0;
    const bxBal = state.wallet.BX || 0;
    const bestAsk = state.asks[0]?.price || state.marketPrice;

    if (state.tradeSide === "buy") {
      const maxBX = bestAsk > 0 ? quoteBal / bestAsk : 0;
      els.orderAmount.value = ((maxBX * percent) / 100).toFixed(4);
    } else {
      els.orderAmount.value = ((bxBal * percent) / 100).toFixed(4);
    }

    els.percentButtons?.forEach(btn => btn.classList.remove("active"));
    const active = els.percentButtons?.find(btn => Number(btn.dataset.percent) === percent);
    if (active) active.classList.add("active");
  }

  async function executeTrade() {
    if (!els.orderAmount) return;

    const amount = Number(els.orderAmount.value || 0);

    if (!amount || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    try {
      const payload = {
        side: state.tradeSide,
        amount,
        quote: state.currentQuote,
        price: state.tradeSide === "buy"
          ? (state.asks[0]?.price || state.marketPrice)
          : (state.bids[state.bids.length - 1]?.price || state.marketPrice)
      };

      const data = await api("/api/market/trade", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (data.wallet) {
        state.wallet = { ...state.wallet, ...data.wallet };
      }

      updateWalletUI();
      if (els.orderAmount) els.orderAmount.value = "";
      els.percentButtons?.forEach(btn => btn.classList.remove("active"));

      alert(`${state.tradeSide === "buy" ? "Bought" : "Sold"} ${amount} BX successfully.`);
    } catch (err) {
      console.error("[MARKET] trade failed:", err);
      alert(err.message || "Trade failed.");
    }
  }

  /* =========================================================
     WEBSOCKET QUOTE STREAM
  ========================================================= */
  function disconnectWS() {
    if (state.ws) {
      try { state.ws.close(); } catch {}
      state.ws = null;
    }

    if (state.wsReconnectTimer) {
      clearTimeout(state.wsReconnectTimer);
      state.wsReconnectTimer = null;
    }
  }

  function scheduleReconnect(symbol) {
    if (!symbol) return;

    if (state.wsReconnectTimer) clearTimeout(state.wsReconnectTimer);

    state.wsReconnectTimer = setTimeout(() => {
      connectQuoteStream(symbol);
    }, 3000);
  }

  function connectQuoteStream(symbol) {
    disconnectWS();

    if (!symbol) {
      state.quotePriceUSDT = 1;
      computeBXPrice();
      return;
    }

    const url = `wss://stream.binance.com:9443/ws/${symbol}@trade`;

    try {
      state.ws = new WebSocket(url);

      state.ws.onopen = () => {
        computeBXPrice();
      };

      state.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const p = Number(data.p);

          if (isFinite(p) && p > 0) {
            state.quotePriceUSDT = p;
            computeBXPrice();
          }
        } catch {}
      };

      state.ws.onerror = () => {
        disconnectWS();
        scheduleReconnect(symbol);
      };

      state.ws.onclose = () => {
        scheduleReconnect(symbol);
      };
    } catch {
      scheduleReconnect(symbol);
    }
  }

  /* =========================================================
     CHART ENGINE
  ========================================================= */
  const CHART = {
    initialized: false,
    canvas: null,
    ctx: null,
    tooltip: null,

    candles: [],
    current: null,

    visibleCount: 36,
    minVisible: 18,
    maxVisible: 180,

    timeframeMs: 1800,

    hoverIndex: null,
    mouse: { x: 0, y: 0 },

    init() {
      this.canvas = els.marketChart;
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext("2d");
      this.tooltip = els.marketTooltip || null;

      this.bind();
      this.resize();
      this.reset(state.visualPrice || state.marketPrice);

      this.initialized = true;
      this.render();
    },

    bind() {
      window.addEventListener("resize", () => this.resize());

      this.canvas.addEventListener("mousemove", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;

        const visible = this.candles.slice(-this.visibleCount);
        if (!visible.length) return;

        const candleWidth = this.canvas.clientWidth / visible.length;
        const idx = clamp(Math.floor(this.mouse.x / candleWidth), 0, visible.length - 1);

        this.hoverIndex = idx;

        const c = visible[idx];
        this.updateTooltip(c, this.mouse.x, this.mouse.y);
        this.render();
      });

      this.canvas.addEventListener("mouseleave", () => {
        this.hoverIndex = null;
        if (this.tooltip) this.tooltip.classList.remove("show");

        if (els.crosshairPrice) els.crosshairPrice.textContent = "--";
        if (els.crosshairTime) els.crosshairTime.textContent = "--";

        this.render();
      });
    },

    resize() {
      if (!this.canvas) return;

      const wrap = this.canvas.parentElement;
      if (!wrap) return;

      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const rect = wrap.getBoundingClientRect();

      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(280, Math.floor(rect.height));

      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    },

    createCandle(price) {
      return {
        time: Date.now(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: rnd(1200, 5000)
      };
    },

    reset(price) {
      this.candles = [];
      let p = price || state.marketPrice;

      for (let i = 0; i < 160; i++) {
        const drift = (Math.random() - 0.5) * (p * 0.006);
        const open = p;
        const close = Math.max(0.000001, p + drift);
        const high = Math.max(open, close) + rnd(0, p * 0.0024);
        const low = Math.min(open, close) - rnd(0, p * 0.0022);

        this.candles.push({
          time: Date.now() - (160 - i) * this.timeframeMs,
          open,
          high,
          low: Math.max(0.000001, low),
          close,
          volume: rnd(1000, 7800)
        });

        p = close;
      }

      this.current = this.candles[this.candles.length - 1];
      syncStatsUI();
      this.render();
    },

    update(price) {
      if (!this.canvas) return;

      const now = Date.now();

      if (!this.current) {
        this.current = this.createCandle(price);
        this.candles.push(this.current);
      }

      if (now - this.current.time >= this.timeframeMs) {
        this.current = this.createCandle(price);
        this.candles.push(this.current);

        if (this.candles.length > 400) {
          this.candles.shift();
        }
      }

      this.current.high = Math.max(this.current.high, price);
      this.current.low = Math.min(this.current.low, price);
      this.current.close = price;
      this.current.volume += rnd(80, 260);

      syncStatsUI();
      this.render();
    },

    updateTooltip(c, x, y) {
      if (!this.tooltip || !c) return;

      const d = new Date(c.time);

      this.tooltip.innerHTML = `
        <div><strong>${d.toLocaleString()}</strong></div>
        <div>O: ${fmt(c.open, 5)}</div>
        <div>H: ${fmt(c.high, 5)}</div>
        <div>L: ${fmt(c.low, 5)}</div>
        <div>C: ${fmt(c.close, 5)}</div>
        <div>V: ${compact(c.volume)}</div>
      `;

      this.tooltip.style.left = `${Math.min(this.canvas.clientWidth - 160, x + 12)}px`;
      this.tooltip.style.top = `${Math.max(16, y - 18)}px`;
      this.tooltip.classList.add("show");

      if (els.crosshairPrice) els.crosshairPrice.textContent = fmt(c.close, 5);
      if (els.crosshairTime) els.crosshairTime.textContent = d.toLocaleDateString();

      updateMetricUI(c);
    },

    render() {
      if (!this.canvas || !this.ctx) return;

      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#111820");
      bg.addColorStop(1, "#0b1218");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const visible = this.candles.slice(-this.visibleCount);
      if (!visible.length) return;

      const prices = visible.flatMap(c => [c.high, c.low]);
      let min = Math.min(...prices);
      let max = Math.max(...prices);

      const pad = (max - min) * 0.14 || max * 0.05;
      min -= pad;
      max += pad;

      const chartH = h - 58;
      const scaleY = (p) => chartH - ((p - min) / (max - min)) * (chartH - 20);
      const candleWidth = w / visible.length;

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,.05)";
      ctx.lineWidth = 1;

      for (let i = 0; i <= 5; i++) {
        const gy = 12 + (chartH - 20) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Chart Modes
      if (state.chartMode === "line") {
        ctx.beginPath();
        ctx.strokeStyle = "#87FFD3";
        ctx.lineWidth = 3;

        visible.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(c.close);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.shadowColor = "rgba(135,255,211,.24)";
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (state.chartMode === "area") {
        ctx.beginPath();

        visible.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(c.close);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        const lastX = (visible.length - 1) * candleWidth + candleWidth / 2;
        const firstX = candleWidth / 2;

        ctx.lineTo(lastX, chartH);
        ctx.lineTo(firstX, chartH);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, 0, 0, chartH);
        areaGrad.addColorStop(0, "rgba(44,230,125,.28)");
        areaGrad.addColorStop(1, "rgba(44,230,125,0)");
        ctx.fillStyle = areaGrad;
        ctx.fill();

        ctx.beginPath();

        visible.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(c.close);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = "#87FFD3";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(135,255,211,.22)";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const lc = visible[visible.length - 1];
        const lx = (visible.length - 1) * candleWidth + candleWidth / 2;
        const ly = scaleY(lc.close);

        ctx.fillStyle = "#2ce67d";
        ctx.beginPath();
        ctx.arc(lx, ly, 5, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Candles
        visible.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const openY = scaleY(c.open);
          const closeY = scaleY(c.close);
          const highY = scaleY(c.high);
          const lowY = scaleY(c.low);
          const up = c.close >= c.open;

          ctx.strokeStyle = up ? "#2ce67d" : "#ff5c75";
          ctx.fillStyle = up ? "#2ce67d" : "#ff5c75";
          ctx.lineWidth = 1.2;

          // wick
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();

          // body
          ctx.fillRect(
            x - candleWidth * 0.28,
            Math.min(openY, closeY),
            candleWidth * 0.56,
            Math.max(2, Math.abs(openY - closeY))
          );
        });
      }

      // Volume
      const maxVol = Math.max(...visible.map(c => c.volume), 1);
      visible.forEach((c, i) => {
        const x = i * candleWidth + candleWidth * 0.18;
        const vh = (c.volume / maxVol) * 34;
        const up = c.close >= c.open;

        ctx.fillStyle = up
          ? "rgba(98,245,200,.22)"
          : "rgba(255,106,136,.20)";

        ctx.fillRect(x, h - vh - 10, candleWidth * 0.64, vh);
      });

      // Hover crosshair
      if (this.hoverIndex !== null && visible[this.hoverIndex]) {
        const c = visible[this.hoverIndex];
        const cx = this.hoverIndex * candleWidth + candleWidth / 2;
        const cy = scaleY(c.close);

        ctx.strokeStyle = "rgba(255,255,255,.14)";
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, chartH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Price labels right
      ctx.fillStyle = "rgba(255,255,255,.52)";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "right";

      for (let i = 0; i <= 4; i++) {
        const p = max - ((max - min) * i / 4);
        const py = 12 + (chartH - 20) * (i / 4);
        ctx.fillText(fmt(p, 5), w - 8, py + 4);
      }
    }
  };

  /* =========================================================
     METRICS / STATS
  ========================================================= */
  function updateMetricUI(candle) {
    if (!candle) return;

    // Footer chart live stats
    if (els.metricOpen) els.metricOpen.textContent = fmt(candle.open, 5);
    if (els.metricHigh) els.metricHigh.textContent = fmt(candle.high, 5);
    if (els.metricLow) els.metricLow.textContent = fmt(candle.low, 5);
    if (els.metricClose) els.metricClose.textContent = fmt(candle.close, 5);

    // OHLC panel
    if (els.metricOpenPanel) els.metricOpenPanel.textContent = fmt(candle.open, 5);
    if (els.metricHighPanel) els.metricHighPanel.textContent = fmt(candle.high, 5);
    if (els.metricLowPanel) els.metricLowPanel.textContent = fmt(candle.low, 5);
    if (els.metricClosePanel) els.metricClosePanel.textContent = fmt(candle.close, 5);
    if (els.metricVol) els.metricVol.textContent = compact(candle.volume || 0);
  }

  function syncStatsUI() {
    if (!CHART.candles.length) return;

    const visible = CHART.candles.slice(-CHART.visibleCount);
    if (!visible.length) return;

    const highs = visible.map(c => c.high);
    const lows = visible.map(c => c.low);
    const volumes = visible.map(c => c.volume || 0);

    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const volume = volumes.reduce((a, b) => a + b, 0);

    const first = visible[0]?.open || state.marketPrice;
    const last = visible[visible.length - 1];
    const changePct = first > 0 ? ((last.close - first) / first) * 100 : 0;
    const up = changePct >= 0;

    if (els.statHigh) els.statHigh.textContent = `$${fmt(high, 5)}`;
    if (els.statLow) els.statLow.textContent = `$${fmt(low, 5)}`;
    if (els.statVolume) els.statVolume.textContent = `${compact(volume)} BX`;

    if (els.statMarketCap) {
      const marketCap = state.marketPrice * 100_000_000;
      els.statMarketCap.textContent = `$${compact(marketCap)}`;
    }

    if (last) updateMetricUI(last);

    if (els.assetChangeBadge) {
      els.assetChangeBadge.textContent = `${up ? "▲" : "▼"} ${Math.abs(changePct).toFixed(2)}%`;
      els.assetChangeBadge.classList.remove("is-up", "is-down");
      els.assetChangeBadge.classList.add(up ? "is-up" : "is-down");
    }

    if (els.chartLiveChange) {
      els.chartLiveChange.textContent = `${up ? "▲" : "▼"} ${Math.abs(changePct).toFixed(2)}%`;
      els.chartLiveChange.classList.remove("is-up", "is-down");
      els.chartLiveChange.classList.add(up ? "is-up" : "is-down");
    }
  }

  /* =========================================================
     RANGE / MODE
  ========================================================= */
  function setRange(range) {
    state.activeRange = range;

    els.rangeButtons?.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.range === range);
    });

    const visibleMap = {
      "1H": 20,
      "24H": 36,
      "7D": 52,
      "30D": 78,
      "90D": 110
    };

    const speedMap = {
      "1H": 1500,
      "24H": 2200,
      "7D": 3200,
      "30D": 4300,
      "90D": 5600
    };

    CHART.visibleCount = clamp(visibleMap[range] || 36, CHART.minVisible, CHART.maxVisible);
    CHART.timeframeMs = speedMap[range] || 2200;

    CHART.render();
    syncStatsUI();
  }

  function setChartMode(mode) {
    state.chartMode = mode;

    els.chartModeButtons?.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.chartMode === mode);
    });

    CHART.render();
  }

  /* =========================================================
     PAIRS
  ========================================================= */
  function setQuote(q) {
    state.currentQuote = q;

    els.pairButtons?.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.quote === q);
    });

    updateWalletUI();
    computeBXPrice();
    connectQuoteStream(QUOTE_STREAMS[q]);
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindEvents() {
    // Pair buttons
    els.pairButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.quote;
        if (!q || q === state.currentQuote) return;
        setQuote(q);
      });
    });

    // Range buttons
    els.rangeButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        const range = btn.dataset.range;
        if (!range) return;
        setRange(range);
      });
    });

    // Chart mode
    els.chartModeButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.chartMode;
        if (!mode) return;
        setChartMode(mode);
      });
    });

    // Buy / Sell tabs
    if (els.buyTab) {
      els.buyTab.addEventListener("click", () => setTradeSide("buy"));
    }

    if (els.sellTab) {
      els.sellTab.addEventListener("click", () => setTradeSide("sell"));
    }

    // Percent buttons
    els.percentButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        const percent = Number(btn.dataset.percent || 0);
        setPercent(percent);
      });
    });

    // Trade action
    if (els.actionBtn) {
      els.actionBtn.addEventListener("click", executeTrade);
    }
  }

  /* =========================================================
     INIT / DESTROY
  ========================================================= */
  async function init() {
    if (state.initialized) return;
    if (!cacheDOM()) return;

    bindEvents();
    setTradeSide("buy");

    await loadWallet();

    generateOrderBook();
    renderOrderBook();
    updatePriceUI();

    CHART.init();

    setRange("1H");
    setChartMode("area");
    setQuote(DEFAULT_QUOTE);

    state.initialized = true;

    // fallback heartbeat if ws disconnected
    setInterval(() => {
      if (!state.ws || state.ws.readyState !== 1) {
        computeBXPrice();
      }
    }, 3000);
  }

  function destroy() {
    disconnectWS();
  }

  document.addEventListener("DOMContentLoaded", init);

  /* =========================================================
     PUBLIC API
  ========================================================= */
  window.MARKET = {
    init,
    destroy,
    setQuote,
    setRange,
    setChartMode,
    executeTrade,
    getState: () => ({ ...state })
  };
})();
