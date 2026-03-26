/* =========================================================
   BLOXIO MARKET — FINAL REAL VERSION 5.0
   Stable • Mobile Safe • OrderBook • Chart • Trading
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */
  const BX_USDT_REFERENCE = 45; // BX ثابت مقابل USDT
  const DEFAULT_QUOTE = "USDT";
  const MAX_ORDERBOOK_ROWS = 15;

  const QUOTE_STREAMS = {
    USDT: null,
    USDC: null,
    BTC: "btcusdt",
    ETH: "ethusdt",
    BNB: "bnbusdt",
    SOL: "solusdt",
    AVAX: "avaxusdt",
    LTC: "ltcusdt",
    ZEC: "zecusdt",
    TON: "tonusdt"
  };

  const DEFAULT_WALLET = {
    BX: 0,
    USDT: 0,
    USDC: 0,
    BTC: 0,
    ETH: 0,
    BNB: 0,
    SOL: 0,
    AVAX: 0,
    LTC: 0,
    ZEC: 0,
    TON: 0
  };

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    initialized: false,
    mounted: false,

    currentQuote: DEFAULT_QUOTE,
    marketPrice: BX_USDT_REFERENCE,
    quotePriceUSDT: 1,

    tradeSide: "buy",
    bids: [],
    asks: [],

    ws: null,
    wsReconnectTimer: null,
    wsRetries: 0,

    wallet: { ...DEFAULT_WALLET },

    lastPrice: BX_USDT_REFERENCE,
    lastDirection: "flat"
  };

  /* =========================================================
     DOM HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {};

  function cacheDOM() {
    els.market = $("market");

    if (!els.market) return false;

    els.quoteAsset = $("quoteAsset");
    els.marketPrice = $("marketPrice");
    els.marketApprox = $("marketApprox");
    els.walletBX = $("walletBX");
    els.walletUSDT = $("walletUSDT");
    els.walletQuoteLabel = $("walletQuoteLabel");

    els.buyTab = $("buyTab");
    els.sellTab = $("sellTab");
    els.tradeBox = $("tradeBox");
    els.actionBtn = $("actionBtn");
    els.orderAmount = $("orderAmount");

    els.execPrice = $("execPrice");
    els.slippage = $("slippage");
    els.spread = $("spread");

    els.bids = $("bids");
    els.asks = $("asks");
    els.priceLadder = $("priceLadder");

    els.bxChart = $("bxChart");
    els.volumeChart = $("volumeChart");
    els.chartTooltip = $("chartTooltip");

    els.zoomIn = $("zoomIn");
    els.zoomOut = $("zoomOut");
    els.resetView = $("resetView");

    els.pairButtons = $$(".pair-btn", els.market);
    els.tfButtons = $$(".tf-btn", els.market);
    els.percentButtons = $$(".percent-row button", els.market);

    return true;
  }

  /* =========================================================
     SAFE API
  ========================================================= */
  async function api(url, options = {}) {
    try {
      if (typeof window.safeFetch === "function") {
        return await window.safeFetch(url, options);
      }

      const token = localStorage.getItem("jwt");
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
      };

      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, {
        ...options,
        headers
      });

      return await res.json();
    } catch (err) {
      console.warn("API error:", err);
      return { success: false, message: "Network error" };
    }
  }

  /* =========================================================
     WALLET
  ========================================================= */
  async function loadWallet() {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        updateWalletUI();
        return;
      }

      const res = await fetch("https://api.bloxio.online/finance/wallet", {
        headers: { Authorization: "Bearer " + token }
      });

      const data = await res.json();

      state.wallet.BX = Number(data.bx_balance || 0);
      state.wallet.USDT = Number(data.usdt_balance || 0);
      state.wallet.USDC = Number(data.usdc_balance || 0);
      state.wallet.BTC = Number(data.btc_balance || 0);
      state.wallet.ETH = Number(data.eth_balance || 0);
      state.wallet.BNB = Number(data.bnb_balance || 0);
      state.wallet.SOL = Number(data.sol_balance || 0);
      state.wallet.AVAX = Number(data.avax_balance || 0);
      state.wallet.LTC = Number(data.ltc_balance || 0);
      state.wallet.ZEC = Number(data.zec_balance || 0);
      state.wallet.TON = Number(data.ton_balance || 0);

      updateWalletUI();
    } catch (err) {
      console.warn("Wallet load failed:", err);
      updateWalletUI();
    }
  }

  function updateWalletUI() {
    if (els.walletBX) els.walletBX.textContent = fmt(state.wallet.BX, 2);

    const q = state.currentQuote;
    const qBal = Number(state.wallet[q] || 0);

    if (els.walletUSDT) els.walletUSDT.textContent = fmt(qBal, q === "USDT" || q === "USDC" ? 2 : 6);
    if (els.walletQuoteLabel) els.walletQuoteLabel.textContent = q;
  }

  /* =========================================================
     FORMAT
  ========================================================= */
  function fmt(num, decimals = 2) {
    if (!isFinite(num)) return "0.00";
    return Number(num).toFixed(decimals);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /* =========================================================
     PRICE ENGINE
  ========================================================= */
  function computeBXPrice() {
    const old = state.marketPrice;

    if (state.currentQuote === "USDT" || state.currentQuote === "USDC") {
      state.marketPrice = BX_USDT_REFERENCE;
    } else {
      if (!state.quotePriceUSDT || state.quotePriceUSDT <= 0) return;
      state.marketPrice = BX_USDT_REFERENCE / state.quotePriceUSDT;
    }

    if (state.marketPrice > old) state.lastDirection = "up";
    else if (state.marketPrice < old) state.lastDirection = "down";
    else state.lastDirection = "flat";

    state.lastPrice = old;

    updatePriceUI();
    generateOrderBook();
    renderOrderBook();

    CHART.update(state.marketPrice);
  }

  function updatePriceUI() {
    if (els.marketPrice) {
      els.marketPrice.textContent = fmt(state.marketPrice, 6);
      els.marketPrice.classList.remove("up", "down");

      if (state.lastDirection === "up") els.marketPrice.classList.add("up");
      if (state.lastDirection === "down") els.marketPrice.classList.add("down");
    }

    if (els.marketApprox) {
      els.marketApprox.textContent = `≈ ${fmt(state.marketPrice, 6)} ${state.currentQuote}`;
    }

    if (els.quoteAsset) els.quoteAsset.textContent = state.currentQuote;

    updateWalletUI();
    updateTradePreview();
  }

  /* =========================================================
     ORDER BOOK
  ========================================================= */
  function generateOrderBook() {
    state.bids = [];
    state.asks = [];

    const spreadBase = state.marketPrice * 0.0005;

    for (let i = MAX_ORDERBOOK_ROWS; i > 0; i--) {
      state.bids.push({
        price: state.marketPrice - i * spreadBase,
        amount: +(Math.random() * 5 + 0.2).toFixed(3)
      });
    }

    for (let i = 1; i <= MAX_ORDERBOOK_ROWS; i++) {
      state.asks.push({
        price: state.marketPrice + i * spreadBase,
        amount: +(Math.random() * 5 + 0.2).toFixed(3)
      });
    }
  }

  function renderOrderBook() {
    if (!els.bids || !els.asks || !els.priceLadder) return;

    els.bids.innerHTML = "";
    els.asks.innerHTML = "";
    els.priceLadder.innerHTML = "";

    state.bids.forEach((row) => {
      const div = document.createElement("div");
      div.className = "ob-row";
      div.innerHTML = `<span>${fmt(row.amount, 3)}</span><span>${fmt(row.price, 6)}</span>`;
      els.bids.appendChild(div);
    });

    const mid = document.createElement("div");
    mid.className = "ob-row";
    mid.textContent = fmt(state.marketPrice, 6);
    els.priceLadder.appendChild(mid);

    state.asks.forEach((row) => {
      const div = document.createElement("div");
      div.className = "ob-row";
      div.innerHTML = `<span>${fmt(row.price, 6)}</span><span>${fmt(row.amount, 3)}</span>`;
      els.asks.appendChild(div);
    });

    updateTradePreview();
  }

  /* =========================================================
     TRADE PREVIEW
  ========================================================= */
  function updateTradePreview() {
    const bestBid = state.bids[0]?.price || 0;
    const bestAsk = state.asks[0]?.price || 0;
    const exec = state.tradeSide === "buy" ? bestAsk : bestBid;
    const spread = bestAsk && bestBid ? (bestAsk - bestBid) : 0;

    if (els.execPrice) els.execPrice.textContent = exec ? fmt(exec, 6) : "—";
    if (els.spread) els.spread.textContent = spread ? fmt(spread, 6) : "—";
    if (els.slippage) els.slippage.textContent = "0.10";
  }

  /* =========================================================
     PAIR SWITCH
  ========================================================= */
  function setQuote(quote) {
    if (!QUOTE_STREAMS.hasOwnProperty(quote)) return;

    state.currentQuote = quote;
    state.quotePriceUSDT = 1;

    els.pairButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.quote === quote);
    });

    updatePriceUI();
    connectQuoteStream(QUOTE_STREAMS[quote]);

    CHART.reset(state.marketPrice);
    CHART.update(state.marketPrice);
  }

  /* =========================================================
     TRADE SIDE
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

  /* =========================================================
     PERCENT INPUT
  ========================================================= */
  function setPercent(percent) {
    const p = clamp(Number(percent || 0), 0, 100);

    if (!els.orderAmount) return;

    if (state.tradeSide === "buy") {
      const qBal = Number(state.wallet[state.currentQuote] || 0);
      const maxBX = state.marketPrice > 0 ? qBal / state.marketPrice : 0;
      els.orderAmount.value = fmt((maxBX * p) / 100, 4);
    } else {
      const maxBX = Number(state.wallet.BX || 0);
      els.orderAmount.value = fmt((maxBX * p) / 100, 4);
    }
  }

  /* =========================================================
     EXECUTE TRADE
  ========================================================= */
  async function executeTrade() {
    try {
      const amount = parseFloat(els.orderAmount?.value || 0);
      if (!amount || amount <= 0) {
        alert("Enter valid BX amount");
        return;
      }

      const price = state.tradeSide === "buy"
        ? state.asks[0]?.price
        : state.bids[0]?.price;

      if (!price) {
        alert("Market price unavailable");
        return;
      }

      const pair = `BX/${state.currentQuote}`;

      const payload = {
        pair,
        side: state.tradeSide,
        price,
        amount
      };

      const res = await api("/exchange/order", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res?.success || res?.status) {
        await loadWallet();
        generateOrderBook();
        renderOrderBook();
        CHART.update(price);

        if (els.orderAmount) els.orderAmount.value = "";
      } else {
        alert(res?.message || "Trade failed");
      }
    } catch (err) {
      console.error("Trade error:", err);
      alert("Trade execution failed");
    }
  }

  /* =========================================================
     WEBSOCKET
  ========================================================= */
  function connectQuoteStream(symbol = null) {
    disconnectWS();

    if (!symbol) {
      state.quotePriceUSDT = 1;
      computeBXPrice();
      return;
    }

    try {
      state.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@miniTicker`);

      state.ws.onopen = () => {
        state.wsRetries = 0;
      };

      state.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const price = parseFloat(data.c);

          if (!price || price <= 0) return;

          state.quotePriceUSDT = price;
          computeBXPrice();
        } catch (err) {
          console.warn("WS parse error:", err);
        }
      };

      state.ws.onerror = () => {
        scheduleReconnect(symbol);
      };

      state.ws.onclose = () => {
        scheduleReconnect(symbol);
      };
    } catch (err) {
      console.warn("WS init failed:", err);
      scheduleReconnect(symbol);
    }
  }

  function disconnectWS() {
    if (state.wsReconnectTimer) {
      clearTimeout(state.wsReconnectTimer);
      state.wsReconnectTimer = null;
    }

    if (state.ws) {
      state.ws.onopen = null;
      state.ws.onmessage = null;
      state.ws.onerror = null;
      state.ws.onclose = null;
      state.ws.close();
      state.ws = null;
    }
  }

  function scheduleReconnect(symbol) {
    if (!symbol) return;
    if (state.wsReconnectTimer) return;

    state.wsRetries += 1;
    const delay = Math.min(2000 * state.wsRetries, 12000);

    state.wsReconnectTimer = setTimeout(() => {
      state.wsReconnectTimer = null;
      connectQuoteStream(symbol);
    }, delay);
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindEvents() {
    els.pairButtons.forEach((btn) => {
      btn.addEventListener("click", () => setQuote(btn.dataset.quote));
    });

    els.buyTab?.addEventListener("click", () => setTradeSide("buy"));
    els.sellTab?.addEventListener("click", () => setTradeSide("sell"));
    els.actionBtn?.addEventListener("click", executeTrade);

    els.percentButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        els.percentButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setPercent(btn.dataset.percent);
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        CHART.pause();
      } else {
        CHART.resume();
      }
    });
  }

  /* =========================================================
     CHART ENGINE
  ========================================================= */
  const CHART = {
    canvas: null,
    ctx: null,
    volumeCanvas: null,
    volumeCtx: null,
    tooltip: null,

    candles: [],
    ema: [],
    vwap: [],

    current: null,
    timeframeMs: 5000,

    maxCandles: 180,
    visibleCount: 60,
    minVisible: 20,
    maxVisible: 160,

    viewMin: null,
    viewMax: null,

    running: false,
    raf: null,

    init() {
      this.canvas = els.bxChart;
      this.volumeCanvas = els.volumeChart;
      this.tooltip = els.chartTooltip;

      if (!this.canvas || !this.volumeCanvas) return;

      this.ctx = this.canvas.getContext("2d");
      this.volumeCtx = this.volumeCanvas.getContext("2d");

      this.resize();
      this.bind();
      this.reset(state.marketPrice);
      this.update(state.marketPrice);
      this.start();
    },

    bind() {
      window.addEventListener("resize", () => {
        requestAnimationFrame(() => this.resize());
      });

      els.tfButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          els.tfButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");

          const days = Number(btn.dataset.days || 1);
          this.visibleCount = clamp(days * 24, this.minVisible, this.maxVisible);
          this.viewMin = null;
          this.viewMax = null;
        });
      });

      els.zoomIn?.addEventListener("click", () => {
        this.visibleCount = clamp(this.visibleCount - 10, this.minVisible, this.maxVisible);
      });

      els.zoomOut?.addEventListener("click", () => {
        this.visibleCount = clamp(this.visibleCount + 10, this.minVisible, this.maxVisible);
      });

      els.resetView?.addEventListener("click", () => {
        this.visibleCount = 60;
        this.viewMin = null;
        this.viewMax = null;
      });

      this.canvas.addEventListener("mousemove", (e) => this.onMove(e));
      this.canvas.addEventListener("mouseleave", () => this.hideTooltip());
      this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: true });
      this.canvas.addEventListener("touchend", () => this.hideTooltip());
    },

    resize() {
      if (!this.canvas || !this.volumeCanvas) return;

      const chartWrap = this.canvas.parentElement;
      const volWrap = this.volumeCanvas.parentElement;

      if (!chartWrap || !volWrap) return;

      this.canvas.width = Math.max(300, chartWrap.clientWidth);
      this.canvas.height = Math.max(220, chartWrap.clientHeight);

      this.volumeCanvas.width = Math.max(300, volWrap.clientWidth);
      this.volumeCanvas.height = Math.max(70, volWrap.clientHeight);
    },

    start() {
      if (this.running) return;
      this.running = true;
      this.loop();
    },

    pause() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
    },

    resume() {
      if (this.running) return;
      this.running = true;
      this.loop();
    },

    loop() {
      if (!this.running) return;
      this.render();
      this.raf = requestAnimationFrame(() => this.loop());
    },

    reset(price) {
      this.candles = [];
      this.ema = [];
      this.vwap = [];
      this.current = null;
      this.viewMin = null;
      this.viewMax = null;

      this.bootstrap(price);
    },

    bootstrap(price) {
      this.current = {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1,
        time: Date.now()
      };

      this.candles.push(this.current);
    },

    update(price) {
      if (!price || price <= 0) return;

      if (!this.current) {
        this.bootstrap(price);
        return;
      }

      const now = Date.now();

      if ((now - this.current.time) > this.timeframeMs) {
        this.current = {
          open: this.current.close,
          high: price,
          low: price,
          close: price,
          volume: 1 + Math.random() * 3,
          time: now
        };

        this.candles.push(this.current);

        if (this.candles.length > this.maxCandles) {
          this.candles.shift();
        }
      } else {
        this.current.high = Math.max(this.current.high, price);
        this.current.low = Math.min(this.current.low, price);
        this.current.close = price;
        this.current.volume += Math.random() * 1.2;
      }

      this.calcEMA(14);
      this.calcVWAP();
    },

    calcEMA(period) {
      if (this.candles.length < 2) return;

      this.ema = [];
      const k = 2 / (period + 1);

      let emaPrev = this.candles[0].close;
      this.ema.push(emaPrev);

      for (let i = 1; i < this.candles.length; i++) {
        const val = this.candles[i].close * k + emaPrev * (1 - k);
        this.ema.push(val);
        emaPrev = val;
      }
    },

    calcVWAP() {
      this.vwap = [];

      let pv = 0;
      let vol = 0;

      for (const c of this.candles) {
        const typical = (c.high + c.low + c.close) / 3;
        pv += typical * c.volume;
        vol += c.volume;
        this.vwap.push(vol ? pv / vol : typical);
      }
    },

    render() {
      if (!this.ctx || !this.canvas) return;
      this.renderMain();
      this.renderVolume();
    },

    renderMain() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      const visible = this.candles.slice(-this.visibleCount);
      if (visible.length < 2) return;

      const highs = visible.map(c => c.high);
      const lows = visible.map(c => c.low);

      let max = Math.max(...highs);
      let min = Math.min(...lows);

      if (Math.abs(max - min) < 0.0000001) {
        max += 0.0001;
        min -= 0.0001;
      }

      const pad = (max - min) * 0.12;
      max += pad;
      min -= pad;

      if (this.viewMax === null || this.viewMin === null) {
        this.viewMax = max;
        this.viewMin = min;
      }

      this.viewMax += (max - this.viewMax) * 0.1;
      this.viewMin += (min - this.viewMin) * 0.1;

      const scaleY = (price) =>
        h - ((price - this.viewMin) / (this.viewMax - this.viewMin)) * (h - 28);

      const candleWidth = w / visible.length;

      /* background gradient */
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(10,18,32,.08)");
      grad.addColorStop(1, "rgba(2,8,18,.22)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      /* grid */
      ctx.strokeStyle = "rgba(255,255,255,.045)";
      ctx.lineWidth = 1;

      for (let i = 0; i < 5; i++) {
        const y = (h / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i++) {
        const x = (w / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      /* candles */
      visible.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const openY = scaleY(c.open);
        const closeY = scaleY(c.close);
        const highY = scaleY(c.high);
        const lowY = scaleY(c.low);
        const up = c.close >= c.open;

        ctx.strokeStyle = up ? "#0ecb81" : "#f6465d";
        ctx.fillStyle = up ? "#0ecb81" : "#f6465d";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        ctx.fillRect(
          x - candleWidth * 0.28,
          Math.min(openY, closeY),
          candleWidth * 0.56,
          Math.max(2, Math.abs(openY - closeY))
        );
      });

      /* EMA */
      if (this.ema.length >= visible.length) {
        const emaVisible = this.ema.slice(-visible.length);

        ctx.beginPath();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;

        emaVisible.forEach((v, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
      }

      /* VWAP */
      if (this.vwap.length >= visible.length) {
        const vwapVisible = this.vwap.slice(-visible.length);

        ctx.beginPath();
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;

        vwapVisible.forEach((v, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
      }
    },

    renderVolume() {
      if (!this.volumeCtx || !this.volumeCanvas) return;

      const ctx = this.volumeCtx;
      const w = this.volumeCanvas.width;
      const h = this.volumeCanvas.height;

      ctx.clearRect(0, 0, w, h);

      const visible = this.candles.slice(-this.visibleCount);
      if (!visible.length) return;

      const maxVol = Math.max(...visible.map(c => c.volume || 1), 1);
      const barW = w / visible.length;

      visible.forEach((c, i) => {
        const x = i * barW + 1;
        const barH = (c.volume / maxVol) * (h - 8);
        const y = h - barH;
        const up = c.close >= c.open;

        ctx.fillStyle = up ? "rgba(14,203,129,.45)" : "rgba(246,70,93,.45)";
        ctx.fillRect(x, y, Math.max(2, barW - 2), barH);
      });
    },

    onMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this.showTooltipByX(x, e.clientX, e.clientY);
    },

    onTouchMove(e) {
      const touch = e.touches?.[0];
      if (!touch) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      this.showTooltipByX(x, touch.clientX, touch.clientY);
    },

    showTooltipByX(x, clientX, clientY) {
      const visible = this.candles.slice(-this.visibleCount);
      if (!visible.length || !this.tooltip) return;

      const idx = clamp(Math.floor((x / this.canvas.width) * visible.length), 0, visible.length - 1);
      const c = visible[idx];
      if (!c) return;

      this.tooltip.innerHTML = `
        O: ${fmt(c.open, 6)}<br>
        H: ${fmt(c.high, 6)}<br>
        L: ${fmt(c.low, 6)}<br>
        C: ${fmt(c.close, 6)}<br>
        V: ${fmt(c.volume, 2)}
      `;

      const rect = this.canvas.getBoundingClientRect();
      const localX = clamp(clientX - rect.left + 12, 10, rect.width - 140);
      const localY = clamp(clientY - rect.top + 12, 10, rect.height - 110);

      this.tooltip.style.left = `${localX}px`;
      this.tooltip.style.top = `${localY}px`;
      this.tooltip.classList.add("show");
    },

    hideTooltip() {
      this.tooltip?.classList.remove("show");
    }
  };

  /* =========================================================
     INIT / DESTROY
  ========================================================= */
  async function init() {
    if (state.initialized) return;
    if (!cacheDOM()) return;

    state.initialized = true;
    state.mounted = true;

    bindEvents();
    setTradeSide("buy");
    updateWalletUI();
    updatePriceUI();

    generateOrderBook();
    renderOrderBook();

    await loadWallet();

    CHART.init();
    connectQuoteStream(QUOTE_STREAMS[state.currentQuote]);

    console.log("✅ MARKET FINAL REAL INIT");
  }

  function destroy() {
    state.mounted = false;
    state.initialized = false;

    disconnectWS();
    CHART.pause();
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */
  window.MARKET = {
    init,
    destroy,
    setQuote,
    executeTrade,
    reloadWallet: loadWallet,
    getState: () => ({ ...state })
  };

  /* =========================================================
     AUTO INIT
  ========================================================= */
  window.addEventListener("DOMContentLoaded", () => {
    if ($("market")) {
      init();
    }
  });
})();
