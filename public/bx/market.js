/* =========================================================
   BX MARKET v4.2 STABLE PRO
   Fixed: chart + orderbook + trade + pair switch + mobile
========================================================= */

const MARKET = (() => {
  const ROWS = 15;
  const BX_USDT_REFERENCE = 45;

  let initialized = false;
  let currentQuote = "USDT";
  let marketPrice = BX_USDT_REFERENCE;
  let bids = [];
  let asks = [];
  let tradeSide = "buy";
  let quotePriceUSDT = 1;
  let ws = null;

  const wallet = window.WALLET || { BX: 0, USDT: 0, USDC: 0, BTC: 0, ETH: 0, BNB: 0, SOL: 0, AVAX: 0, LTC: 0, ZEC: 0, TON: 0 };

  const quoteMap = {
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

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (q) => document.querySelectorAll(q);

  const els = {};

  function cacheDOM() {
    els.quoteAssetEl = $("quoteAsset");
    els.marketPriceEl = $("marketPrice");
    els.marketApproxEl = $("marketApprox");

    els.walletBXEl = $("walletBX");
    els.walletUSDTEl = $("walletUSDT");

    els.buyTab = $("buyTab");
    els.sellTab = $("sellTab");
    els.tradeBox = $("tradeBox");
    els.actionBtn = $("actionBtn");

    els.orderAmount = $("orderAmount");
    els.execPriceEl = $("execPrice");
    els.slippageEl = $("slippage");
    els.spreadEl = $("spread");

    els.bidsEl = $("bids");
    els.asksEl = $("asks");
    els.priceLadderEl = $("priceLadder");

    els.pairButtons = $$("#market .pair-btn");
  }

  /* ================= SAFE FETCH ================= */
  async function request(url, options = {}) {
    if (typeof window.safeFetch === "function") {
      return await window.safeFetch(url, options);
    }

    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json"
    };

    const token = localStorage.getItem("jwt");
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });
    return await res.json();
  }

  /* ================= WALLET ================= */
  async function loadMarketWallet() {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) return updateWalletUI();

      const r = await fetch("https://api.bloxio.online/finance/wallet", {
        headers: { Authorization: "Bearer " + token }
      });

      const w = await r.json();

      wallet.BX = Number(w.bx_balance || 0);
      wallet.USDT = Number(w.usdt_balance || 0);
      wallet.USDC = Number(w.usdc_balance || 0);
      wallet.BTC = Number(w.btc_balance || 0);
      wallet.ETH = Number(w.eth_balance || 0);
      wallet.BNB = Number(w.bnb_balance || 0);
      wallet.SOL = Number(w.sol_balance || 0);
      wallet.AVAX = Number(w.avax_balance || 0);
      wallet.LTC = Number(w.ltc_balance || 0);
      wallet.ZEC = Number(w.zec_balance || 0);
      wallet.TON = Number(w.ton_balance || 0);

      updateWalletUI();
    } catch (err) {
      console.warn("Wallet load failed", err);
      updateWalletUI();
    }
  }

  function updateWalletUI() {
    if (els.walletBXEl) els.walletBXEl.textContent = wallet.BX.toFixed(2);

    const qBalance = Number(wallet[currentQuote] || 0);
    if (els.walletUSDTEl) els.walletUSDTEl.textContent = qBalance.toFixed(2);
  }

  /* ================= INIT ================= */
  function init() {
    if (initialized) return;
    initialized = true;

    cacheDOM();
    bindEvents();

    updateWalletUI();
    updatePriceUI();

    loadMarketWallet();
    connectBinance(quoteMap[currentQuote]);

    generateOrderBook();
    renderOrderBook();

    if (window.PRO_CHART && typeof window.PRO_CHART.init === "function") {
      window.PRO_CHART.init();
      window.PRO_CHART.reset(marketPrice);
      window.PRO_CHART.update(marketPrice);
      window.PRO_CHART.start();
    }

    console.log("✅ MARKET INIT OK");
  }

  function destroy() {
    if (ws) {
      ws.onmessage = null;
      ws.close();
      ws = null;
    }

    if (window.PRO_CHART?.stop) {
      window.PRO_CHART.stop();
    }

    initialized = false;
  }

  /* ================= BINANCE ================= */
  function connectBinance(symbol = null) {
    if (ws) {
      ws.onmessage = null;
      ws.close();
      ws = null;
    }

    if (!symbol) {
      quotePriceUSDT = 1;
      computeBXPrice();
      return;
    }

    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@miniTicker`);
    window.marketWS = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const price = parseFloat(msg.c);
        if (!price || price <= 0) return;

        quotePriceUSDT = price;
        computeBXPrice();
      } catch (err) {
        console.warn("WS parse error", err);
      }
    };

    ws.onerror = () => {
      console.warn("Binance WS error");
    };

    ws.onclose = () => {
      console.log("WS closed");
    };
  }

  function computeBXPrice() {
    if (currentQuote === "USDT" || currentQuote === "USDC") {
      marketPrice = BX_USDT_REFERENCE;
    } else {
      if (!quotePriceUSDT || quotePriceUSDT <= 0) return;
      marketPrice = BX_USDT_REFERENCE / quotePriceUSDT;
    }

    updatePriceUI();
    generateOrderBook();
    renderOrderBook();

    if (window.PRO_CHART) {
      window.PRO_CHART.update(marketPrice);
    }
  }

  /* ================= ORDERBOOK ================= */
  function generateOrderBook() {
    bids = [];
    asks = [];

    for (let i = ROWS; i > 0; i--) {
      bids.push({
        price: marketPrice - i * marketPrice * 0.0005,
        amount: +(Math.random() * 5 + 0.15).toFixed(3)
      });
    }

    for (let i = 1; i <= ROWS; i++) {
      asks.push({
        price: marketPrice + i * marketPrice * 0.0005,
        amount: +(Math.random() * 5 + 0.15).toFixed(3)
      });
    }
  }

  function renderOrderBook() {
    if (!els.bidsEl || !els.asksEl || !els.priceLadderEl) return;

    els.bidsEl.innerHTML = "";
    els.asksEl.innerHTML = "";
    els.priceLadderEl.innerHTML = "";

    bids.forEach((o) => {
      const div = document.createElement("div");
      div.className = "ob-row bid";
      div.innerHTML = `<span>${o.amount.toFixed(3)}</span><span>${o.price.toFixed(6)}</span>`;
      els.bidsEl.appendChild(div);
    });

    const mid = document.createElement("div");
    mid.className = "ob-row mid";
    mid.textContent = marketPrice.toFixed(6);
    els.priceLadderEl.appendChild(mid);

    asks.forEach((o) => {
      const div = document.createElement("div");
      div.className = "ob-row ask";
      div.innerHTML = `<span>${o.price.toFixed(6)}</span><span>${o.amount.toFixed(3)}</span>`;
      els.asksEl.appendChild(div);
    });

    updateSpread();
    updateExecInfo();
  }

  function updateSpread() {
    if (!asks.length || !bids.length || !els.spreadEl) return;
    const spread = asks[0].price - bids[0].price;
    els.spreadEl.textContent = spread.toFixed(6);
  }

  function updateExecInfo() {
    if (!els.execPriceEl || !els.slippageEl) return;
    const exec = tradeSide === "buy" ? asks[0]?.price : bids[0]?.price;
    els.execPriceEl.textContent = exec ? exec.toFixed(6) : "--";
    els.slippageEl.textContent = "0.10";
  }

  /* ================= PRICE UI ================= */
  function updatePriceUI() {
    if (els.marketPriceEl) els.marketPriceEl.textContent = marketPrice.toFixed(6);
    if (els.marketApproxEl) els.marketApproxEl.textContent = `≈ ${marketPrice.toFixed(2)} ${currentQuote}`;
    if (els.quoteAssetEl) els.quoteAssetEl.textContent = currentQuote;
    updateWalletUI();
    updateExecInfo();
  }

  /* ================= TRADE ================= */
  async function executeTrade() {
    try {
      const amount = parseFloat(els.orderAmount?.value || 0);
      if (!amount || amount <= 0) return alert("Enter valid amount");

      const price = tradeSide === "buy" ? asks[0]?.price : bids[0]?.price;
      if (!price) return alert("Price unavailable");

      const pair = `BX/${currentQuote}`;

      const payload = {
        uid: window.USER_ID || null,
        pair,
        side: tradeSide,
        price,
        amount
      };

      const data = await request("/exchange/order", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (data?.status || data?.success) {
        await loadMarketWallet();
        generateOrderBook();
        renderOrderBook();

        if (window.PRO_CHART) {
          window.PRO_CHART.update(price);
        }
      } else {
        alert(data?.message || "Trade failed");
      }
    } catch (e) {
      console.error("Trade error", e);
      alert("Trade execution failed");
    }
  }

  /* ================= SIDE ================= */
  function setTradeSide(side) {
    tradeSide = side;

    els.tradeBox?.classList.toggle("buy", side === "buy");
    els.tradeBox?.classList.toggle("sell", side === "sell");

    els.buyTab?.classList.toggle("active", side === "buy");
    els.sellTab?.classList.toggle("active", side === "sell");

    if (els.actionBtn) {
      els.actionBtn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
      els.actionBtn.classList.toggle("buy", side === "buy");
      els.actionBtn.classList.toggle("sell", side === "sell");
    }

    updateExecInfo();
  }

  /* ================= EVENTS ================= */
  function bindEvents() {
    els.pairButtons?.forEach((btn) => {
      btn.addEventListener("click", () => {
        els.pairButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        currentQuote = btn.dataset.quote;
        quotePriceUSDT = 1;

        updateWalletUI();
        updatePriceUI();

        connectBinance(quoteMap[currentQuote]);

        if (window.PRO_CHART) {
          window.PRO_CHART.reset(marketPrice);
          window.PRO_CHART.update(marketPrice);
        }
      });
    });

    els.buyTab && (els.buyTab.onclick = () => setTradeSide("buy"));
    els.sellTab && (els.sellTab.onclick = () => setTradeSide("sell"));
    els.actionBtn && (els.actionBtn.onclick = executeTrade);

    document.querySelectorAll(".percent-row button").forEach((btn) => {
      btn.onclick = () => {
        const percent = parseInt(btn.dataset.percent || "0", 10);
        const qBalance = Number(wallet[currentQuote] || 0);

        if (tradeSide === "buy") {
          const max = qBalance / marketPrice;
          if (els.orderAmount) els.orderAmount.value = ((max * percent) / 100).toFixed(4);
        } else {
          const max = Number(wallet.BX || 0);
          if (els.orderAmount) els.orderAmount.value = ((max * percent) / 100).toFixed(4);
        }
      };
    });
  }

  return {
    init,
    destroy,
    executeTrade
  };
})();

/* ======================================================
   BX INSTITUTIONAL CHART ENGINE v5 STABLE
====================================================== */
window.PRO_CHART = {
  canvas: null,
  ctx: null,
  tooltip: null,

  candles: [],
  ema: [],
  vwap: [],

  timeframe: 5000,
  maxCandles: 150,
  visibleCount: 60,
  minVisible: 20,
  maxVisible: 150,

  current: null,
  viewMax: null,
  viewMin: null,
  raf: null,
  running: false,

  init() {
    this.canvas = document.getElementById("bxChart");
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    this.tooltip = document.getElementById("chartTooltip");

    this.resize();
    window.addEventListener("resize", () => {
      requestAnimationFrame(() => this.resize());
    });

    this.bindTimeframes();
    this.bindControls();
    this.bindMouse();
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  },

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  },

  loop() {
    if (!this.running) return;
    this.render();
    this.raf = requestAnimationFrame(() => this.loop());
  },

  resize() {
    if (!this.canvas) return;
    const p = this.canvas.parentElement;
    if (!p) return;
    this.canvas.width = p.clientWidth;
    this.canvas.height = p.clientHeight || 320;
  },

  reset(price) {
    this.candles = [];
    this.ema = [];
    this.vwap = [];
    this.current = null;
    this.viewMax = null;
    this.viewMin = null;
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

    if (now - this.current.time > this.timeframe) {
      this.current = {
        open: this.current.close,
        high: price,
        low: price,
        close: price,
        volume: 1,
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
      this.current.volume++;
    }

    this.calcEMA(14);
    this.calcVWAP();
  },

  calcEMA(period) {
    if (this.candles.length < period) return;

    const k = 2 / (period + 1);
    this.ema = [];
    let emaPrev = this.candles[0].close;

    for (let i = 0; i < this.candles.length; i++) {
      if (i === 0) {
        this.ema.push(emaPrev);
      } else {
        const val = this.candles[i].close * k + emaPrev * (1 - k);
        this.ema.push(val);
        emaPrev = val;
      }
    }
  },

  calcVWAP() {
    let pv = 0;
    let vol = 0;
    this.vwap = [];

    for (let c of this.candles) {
      const typical = (c.high + c.low + c.close) / 3;
      pv += typical * c.volume;
      vol += c.volume;
      this.vwap.push(vol ? pv / vol : typical);
    }
  },

  render() {
    if (!this.ctx || !this.canvas) return;

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

    const padding = (max - min) * 0.1;
    max += padding;
    min -= padding;

    if (this.viewMax === null || this.viewMin === null) {
      this.viewMax = max;
      this.viewMin = min;
    }

    this.viewMax += (max - this.viewMax) * 0.1;
    this.viewMin += (min - this.viewMin) * 0.1;

    const scaleY = (p) =>
      h - ((p - this.viewMin) / (this.viewMax - this.viewMin)) * (h - 30);

    const candleWidth = w / visible.length;

    /* grid */
    ctx.strokeStyle = "rgba(255,255,255,.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
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

      ctx.strokeStyle = up ? "#21c87a" : "#ff4d4f";
      ctx.fillStyle = up ? "#21c87a" : "#ff4d4f";
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
      ctx.strokeStyle = "#f4c430";
      ctx.lineWidth = 2;
      emaVisible.forEach((v, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = scaleY(v);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
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
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  },

  bindTimeframes() {
    document.querySelectorAll(".tf-btn").forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll(".tf-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const days = parseInt(btn.dataset.days || "1", 10);
        this.visibleCount = Math.min(this.maxVisible, Math.max(this.minVisible, days * 24));
      };
    });
  },

  bindControls() {
    const zoomIn = document.getElementById("zoomIn");
    const zoomOut = document.getElementById("zoomOut");
    const reset = document.getElementById("resetView");

    zoomIn && (zoomIn.onclick = () => {
      this.visibleCount = Math.max(this.minVisible, this.visibleCount - 10);
    });

    zoomOut && (zoomOut.onclick = () => {
      this.visibleCount = Math.min(this.maxVisible, this.visibleCount + 10);
    });

    reset && (reset.onclick = () => {
      this.visibleCount = 60;
      this.viewMax = null;
      this.viewMin = null;
    });
  },

  bindMouse() {
    if (!this.canvas) return;

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const visible = this.candles.slice(-this.visibleCount);
      const idx = Math.floor((x / this.canvas.width) * visible.length);
      const c = visible[idx];
      if (!c || !this.tooltip) return;

      this.tooltip.style.display = "block";
      this.tooltip.style.left = e.clientX + 12 + "px";
      this.tooltip.style.top = e.clientY + 12 + "px";

      this.tooltip.innerHTML = `
        O: ${c.open.toFixed(6)}<br>
        H: ${c.high.toFixed(6)}<br>
        L: ${c.low.toFixed(6)}<br>
        C: ${c.close.toFixed(6)}
      `;
    });

    this.canvas.addEventListener("mouseleave", () => {
      if (this.tooltip) this.tooltip.style.display = "none";
    });
  }
};

/* ================= AUTO INIT ================= */
window.addEventListener("DOMContentLoaded", () => {
  MARKET.init();
});

window.MARKET = MARKET;
