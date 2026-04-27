/* =========================================================
   BLOXIO MARKET — MASTER FINAL CLEAN
   HTML-safe • CSS-safe • Mobile-safe • NO LAST TRADES
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */
  const ROWS = 15;
  const BX_USDT_REFERENCE = 45;
  const PRICE_DECIMALS = 6;
  const AMOUNT_DECIMALS = 4;

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

  const quoteUsdFallback = {
    USDT: 1,
    USDC: 1,
    BTC: 65000,
    ETH: 3200,
    BNB: 600,
    SOL: 140,
    AVAX: 38,
    LTC: 90,
    ZEC: 28,
    TON: 5.4
  };

  /* =========================================================
     STATE
  ========================================================= */
  let currentQuote = "USDT";
  let marketPrice = BX_USDT_REFERENCE;
  let previousPrice = BX_USDT_REFERENCE;
  let quotePriceUSDT = 1;
  let tradeSide = "buy";

  let bids = [];
  let asks = [];

  let ws = null;
  let marketStarted = false;
  let pulseTimeout = null;
  let engineInterval = null;

  const wallet = window.WALLET || {
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
     DOM
  ========================================================= */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const marketRoot = $("#market");
  if (!marketRoot) return;

  const quoteAssetEl = $("#quoteAsset");
  const marketPriceEl = $("#marketPrice");
  const marketApproxEl = $("#marketApprox");

  const assetNameEl = $("#assetName");
  const assetSymbolEl = $("#assetSymbol");
  const assetPriceEl = $("#assetPrice");
  const assetChangeBadgeEl = $("#assetChangeBadge");

  const chartQuoteLabelEl = $("#chartQuoteLabel");
  const chartLivePriceEl = $("#chartLivePrice");
  const chartLiveChangeEl = $("#chartLiveChange");

  const walletBXEl = $("#walletBX");
  const walletQuoteEl = $("#walletUSDT");
  const walletQuoteLabelEl = $("#walletQuoteLabel");

  const buyTab = $("#buyTab");
  const sellTab = $("#sellTab");
  const tradeBox = $("#tradeBox");
  const actionBtn = $("#actionBtn");

  const orderAmount = $("#orderAmount");
  const execPriceEl = $("#execPrice");
  const slippageEl = $("#slippage");
  const spreadEl = $("#spread");

  const orderBookRowsEl = document.getElementById("orderBookGrid");
  const orderbookQuoteEl = $("#orderbookQuote");

  const metricOpen = $("#metricOpen");
  const metricHigh = $("#metricHigh");
  const metricLow = $("#metricLow");
  const metricClose = $("#metricClose");

  const metricOpenPanel = $("#metricOpenPanel");
  const metricHighPanel = $("#metricHighPanel");
  const metricLowPanel = $("#metricLowPanel");
  const metricClosePanel = $("#metricClosePanel");
  const metricVol = $("#metricVol");

  const statHigh = $("#statHigh");
  const statLow = $("#statLow");
  const statVolume = $("#statVolume");
  const statMarketCap = $("#statMarketCap");

  const pairButtons = $$("#market .pair-btn");
  const timeframeButtons = $$("#market .market-timeframes button");
  const chartModeButtons = $$("#market .market-chart-modes button");
  const percentButtons = $$("#market .percent-row button");

  const chartCanvas = $("#marketChart");
  const tooltipEl = $("#marketTooltip");

  /* =========================================================
     HELPERS
  ========================================================= */
  function fmtPrice(v, d = PRICE_DECIMALS) {
    return Number(v || 0).toFixed(d);
  }

  function fmtAmount(v, d = AMOUNT_DECIMALS) {
    return Number(v || 0).toFixed(d);
  }

  function fmtUsd(v) {
    return `$${Number(v || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function safeText(el, value) {
    if (el) el.textContent = value;
  }

  async function safeFetch(url, options = {}) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await res.json();
      }
      return await res.text();
    } catch (e) {
      console.warn("safeFetch error:", e);
      return null;
    }
  }

  function getWalletQuoteBalance() {
    return Number(wallet[currentQuote] || 0);
  }

  function triggerPricePulse(direction = "up") {
    if (!marketPriceEl) return;

    marketPriceEl.classList.remove("up", "down");
    assetPriceEl?.classList.remove("up", "down");

    marketPriceEl.classList.add(direction);
    assetPriceEl?.classList.add(direction);

    clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(() => {
      marketPriceEl.classList.remove("up", "down");
      assetPriceEl?.classList.remove("up", "down");
    }, 650);
  }

  /* =========================================================
     WALLET
  ========================================================= */
  async function loadMarketWallet() {
    try {
      const r = await fetch("https://api.bloxio.online/finance/wallet", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("jwt")
        }
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
    } catch (e) {
      console.warn("Wallet fetch failed, fallback wallet used.", e);
      updateWalletUI();
    }
  }

  function updateWalletUI() {
    safeText(walletBXEl, fmtAmount(wallet.BX));
    safeText(walletQuoteEl, fmtAmount(getWalletQuoteBalance()));
    safeText(walletQuoteLabelEl, currentQuote);
  }

  /* =========================================================
     PRICE ENGINE
  ========================================================= */
  function computeBXPrice() {
    previousPrice = marketPrice;

    if (!quotePriceUSDT || quotePriceUSDT <= 0) {
      quotePriceUSDT = quoteUsdFallback[currentQuote] || 1;
    }

    marketPrice = BX_USDT_REFERENCE / quotePriceUSDT;

    if (currentQuote === "USDT" || currentQuote === "USDC") {
      marketPrice = BX_USDT_REFERENCE;
    }

    if (!isFinite(marketPrice) || marketPrice <= 0) {
      marketPrice = BX_USDT_REFERENCE;
    }

    updatePriceUI();
    generateOrderBook();
    renderOrderBook();
    updateTradeInfo();
    PRO_CHART.update(marketPrice);
    updateMetrics();
  }

  function updatePriceUI() {
    const direction = marketPrice >= previousPrice ? "up" : "down";
    const pct = previousPrice
      ? ((marketPrice - previousPrice) / previousPrice) * 100
      : 0;

    safeText(marketPriceEl, fmtPrice(marketPrice));
    safeText(marketApproxEl, `≈ ${fmtPrice(marketPrice, 2)} ${currentQuote}`);

    safeText(assetNameEl, "Bloxio");
    safeText(assetSymbolEl, "BX");
    safeText(assetPriceEl, `$${fmtPrice(marketPrice, 5)}`);

    safeText(chartQuoteLabelEl, currentQuote);
    safeText(chartLivePriceEl, `$${fmtPrice(marketPrice, 5)}`);
    safeText(quoteAssetEl, currentQuote);
    safeText(orderbookQuoteEl, currentQuote);

    if (assetChangeBadgeEl) {
      assetChangeBadgeEl.classList.remove("is-up", "is-down");
      assetChangeBadgeEl.classList.add(direction === "up" ? "is-up" : "is-down");
      assetChangeBadgeEl.textContent = `${direction === "up" ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`;
    }

    if (chartLiveChangeEl) {
      chartLiveChangeEl.classList.remove("is-up", "is-down");
      chartLiveChangeEl.classList.add(direction === "up" ? "is-up" : "is-down");
      chartLiveChangeEl.textContent = `${direction === "up" ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`;
    }

    triggerPricePulse(direction);
  }

  /* =========================================================
     BINANCE STREAM
  ========================================================= */
  function connectBinance(symbol = quoteMap[currentQuote]) {
    if (!symbol) {
      quotePriceUSDT = quoteUsdFallback[currentQuote] || 1;
      computeBXPrice();
      return;
    }

    if (ws) {
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      ws = null;
    }

    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@miniTicker`);
      window.marketWS = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const price = parseFloat(msg.c);
        if (!price) return;

        quotePriceUSDT = price;
        computeBXPrice();
      };

      ws.onerror = () => {
        console.warn("Binance WS error. Fallback active.");
        quotePriceUSDT = quoteUsdFallback[currentQuote] || 1;
        computeBXPrice();
      };

      ws.onclose = () => {};
    } catch (e) {
      console.warn("WS init failed", e);
      quotePriceUSDT = quoteUsdFallback[currentQuote] || 1;
      computeBXPrice();
    }
  }

  /* =========================================================
     ORDER BOOK ENGINE
  ========================================================= */
  function generateOrderBook() {
    bids = [];
    asks = [];

    const mid = Number(marketPrice || BX_USDT_REFERENCE);

    let tick;
    if (mid >= 100) tick = 0.05;
    else if (mid >= 10) tick = 0.01;
    else if (mid >= 1) tick = 0.001;
    else if (mid >= 0.1) tick = 0.0005;
    else if (mid >= 0.01) tick = 0.00005;
    else tick = 0.000001;

    const spreadBase = tick * 2;

    for (let i = 0; i < ROWS; i++) {
      const price = +(mid - spreadBase - i * tick).toFixed(6);
      const amount = +(rand(1.25, 95).toFixed(3));
      const total = +(price * amount).toFixed(6);
      bids.push({ price, amount, total });
    }

    for (let i = 0; i < ROWS; i++) {
      const price = +(mid + spreadBase + i * tick).toFixed(6);
      const amount = +(rand(1.25, 95).toFixed(3));
      const total = +(price * amount).toFixed(6);
      asks.push({ price, amount, total });
    }

    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);
  }
   
// =====================================================
// ORDER BOOK — GRID (MATCH HTML CURRENT)
// =====================================================

function renderOrderBook() {

  if (!orderBookRowsEl) return;

  orderBookRowsEl.innerHTML = "";

  const rows = Math.max(bids.length, asks.length, ROWS);

  const maxBid = Math.max(...bids.map(x => x.total), 1);
  const maxAsk = Math.max(...asks.map(x => x.total), 1);

  for (let i = 0; i < rows; i++) {

    const bid = bids[i];
    const ask = asks[i];

    const row = document.createElement("div");
    row.className = "ob-grid-row";

    // 🟢 BID
    let bidCell = `<div class="ob-cell"></div>`;
    if (bid) {
      const depth = (bid.total / maxBid) * 100;

      bidCell = `
        <div class="ob-cell bid">
          <div class="ob-depth bid" style="width:${depth}%"></div>
          <span class="ob-bid ob-click" data-price="${bid.price}">
            ${fmtAmount(bid.amount)}
          </span>
        </div>
      `;
    }

    // ⚪ PRICE
    const price = bid?.price || ask?.price || marketPrice;

    const priceCell = `
      <div class="ob-cell center">
        <span class="price ob-click" data-price="${price}">
          ${fmtPrice(price)}
        </span>
      </div>
    `;

    // 🔴 ASK
    let askCell = `<div class="ob-cell"></div>`;
    if (ask) {
      const depth = (ask.total / maxAsk) * 100;

      askCell = `
        <div class="ob-cell ask">
          <div class="ob-depth ask" style="width:${depth}%"></div>
          <span class="ob-ask ob-click" data-price="${ask.price}">
            ${fmtAmount(ask.amount)}
          </span>
        </div>
      `;
    }

    row.innerHTML = `
      ${bidCell}
      ${priceCell}
      ${askCell}
    `;

    orderBookRowsEl.appendChild(row);
  }

  updateSpread();
}
     
  function updateSpread() {
    if (!asks.length || !bids.length) return;

    const bestAsk = asks[0].price;
    const bestBid = bids[0].price;

    const spread = Math.abs(bestAsk - bestBid);
    safeText(spreadEl, fmtPrice(spread));
  }

  function engineTick() {
    if (!bids.length || !asks.length) {
      generateOrderBook();
      renderOrderBook();
      return;
    }

    const drift = rand(-0.0008, 0.0008);

    if (currentQuote === "USDT" || currentQuote === "USDC") {
      previousPrice = marketPrice;
      marketPrice = BX_USDT_REFERENCE * (1 + drift * 0.12);
    } else {
      previousPrice = marketPrice;
      marketPrice = (BX_USDT_REFERENCE / (quotePriceUSDT || 1)) * (1 + drift * 0.18);
    }

    if (!isFinite(marketPrice) || marketPrice <= 0) {
      marketPrice = currentQuote === "USDT" || currentQuote === "USDC"
        ? BX_USDT_REFERENCE
        : BX_USDT_REFERENCE / (quotePriceUSDT || 1);
    }

    generateOrderBook();
    updatePriceUI();
    renderOrderBook();
    updateTradeInfo();
    PRO_CHART.update(marketPrice);
    updateMetrics();
  }

  function startEngine() {
    clearInterval(engineInterval);
    engineInterval = setInterval(() => {
      if (document.hidden) return;
      engineTick();
    }, 1100);
  }

  /* =========================================================
     TRADE
  ========================================================= */
  function setTradeSide(side) {
    tradeSide = side;

    tradeBox?.classList.toggle("buy", side === "buy");
    tradeBox?.classList.toggle("sell", side === "sell");

    buyTab?.classList.toggle("active", side === "buy");
    sellTab?.classList.toggle("active", side === "sell");

    actionBtn?.classList.remove("buy", "sell");
    actionBtn?.classList.add(side === "buy" ? "buy" : "sell");

    if (actionBtn) {
      actionBtn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
    }

    updateTradeInfo();
  }

  function updateTradeInfo() {
    const bestAsk = asks[0]?.price || marketPrice;
    const bestBid = bids[0]?.price || marketPrice;

    const price = tradeSide === "buy" ? bestAsk : bestBid;
    const spread = Math.abs(bestAsk - bestBid);
    const slippage = marketPrice ? (spread / marketPrice) * 100 : 0;

    safeText(execPriceEl, fmtPrice(price));
    safeText(spreadEl, fmtPrice(spread));
    safeText(slippageEl, `${slippage.toFixed(3)}%`);
  }

  async function executeTrade() {
    try {
      const amount = parseFloat(orderAmount?.value || "0");
      if (!amount || amount <= 0) return;

      const pair = `BX/${currentQuote}`;
      const price = tradeSide === "buy"
        ? (asks[0]?.price || marketPrice)
        : (bids[0]?.price || marketPrice);

      const payload = {
        uid: window.USER_ID,
        pair,
        side: tradeSide,
        price,
        amount
      };

      const data = await safeFetch("/exchange/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (tradeSide === "buy") {
        const cost = amount * price;
        if ((wallet[currentQuote] || 0) >= cost) {
          wallet[currentQuote] = Number(wallet[currentQuote] || 0) - cost;
          wallet.BX = Number(wallet.BX || 0) + amount;
        }
      } else {
        if ((wallet.BX || 0) >= amount) {
          wallet.BX = Number(wallet.BX || 0) - amount;
          wallet[currentQuote] = Number(wallet[currentQuote] || 0) + (amount * price);
        }
      }

      updateWalletUI();
      generateOrderBook();
      renderOrderBook();
      updateTradeInfo();
      PRO_CHART.update(price);

      if (data?.status) {
        await loadMarketWallet();
      }
    } catch (e) {
      console.error("Trade error", e);
    }
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindEvents() {
    pairButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        pairButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        currentQuote = btn.dataset.quote || "USDT";
        quotePriceUSDT = quoteUsdFallback[currentQuote] || 1;

        updateWalletUI();
        connectBinance(quoteMap[currentQuote]);
        updatePriceUI();
        updateTradeInfo();
        PRO_CHART.reset(marketPrice);
      });
    });

    buyTab?.addEventListener("click", () => setTradeSide("buy"));
    sellTab?.addEventListener("click", () => setTradeSide("sell"));
    actionBtn?.addEventListener("click", executeTrade);

    percentButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        percentButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const percent = parseInt(btn.dataset.percent || "0", 10);
        const maxBuy = getWalletQuoteBalance() / marketPrice;
        const maxSell = wallet.BX || 0;
        const max = tradeSide === "buy" ? maxBuy : maxSell;

        if (orderAmount) {
          orderAmount.value = fmtAmount((max * percent) / 100);
        }
      });
    });

    document.addEventListener("click", (e) => {
      const el = e.target.closest(".ob-click");
      if (!el) return;

      const p = parseFloat(el.dataset.price);
      if (!p) return;

      if (execPriceEl) execPriceEl.textContent = p.toFixed(6);
      if (orderAmount) orderAmount.placeholder = `@ ${p.toFixed(6)}`;
    });
  }

  /* =========================================================
     METRICS
  ========================================================= */
  function updateMetrics() {
    const candles = PRO_CHART.candles || [];
    const visible = candles.slice(-24);

    if (!visible.length) return;

    const open = visible[0]?.open || marketPrice;
    const high = Math.max(...visible.map(c => c.high || 0), marketPrice);
    const low = Math.min(...visible.map(c => c.low || marketPrice), marketPrice);
    const close = visible[visible.length - 1]?.close || marketPrice;
    const vol = visible.reduce((a, c) => a + (c.volume || 0), 0);

    safeText(metricOpen, fmtPrice(open));
    safeText(metricHigh, fmtPrice(high));
    safeText(metricLow, fmtPrice(low));
    safeText(metricClose, fmtPrice(close));

    safeText(metricOpenPanel, fmtPrice(open));
    safeText(metricHighPanel, fmtPrice(high));
    safeText(metricLowPanel, fmtPrice(low));
    safeText(metricClosePanel, fmtPrice(close));
    safeText(metricVol, fmtAmount(vol, 2));

    safeText(statHigh, fmtUsd(high));
    safeText(statLow, fmtUsd(low));
    safeText(statVolume, `${fmtAmount(vol, 2)} BX`);
    safeText(statMarketCap, fmtUsd((marketPrice || 0) * 1000000));
  }

  /* =========================================================
     PRO CHART ENGINE
  ========================================================= */
  const PRO_CHART = {
    canvas: null,
    ctx: null,
    tooltip: null,

    candles: [],
    ema: [],
    vwap: [],

    timeframe: 60 * 1000,
    visibleCount: 60,
    minVisible: 20,
    maxVisible: 150,
    maxCandles: 220,

    mode: "area",
    current: null,
    hoverIndex: -1,
    mouseX: 0,
    mouseY: 0,
    isHovering: false,
    raf: null,

    init() {
      this.canvas = chartCanvas;
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext("2d");
      this.tooltip = tooltipEl;

      this.resize();
      this.bindTimeframes();
      this.bindModes();
      this.bindMouse();

      window.addEventListener("resize", () => {
        requestAnimationFrame(() => this.resize());
      });

      this.reset(marketPrice);
      this.render();
    },

    resize() {
      if (!this.canvas) return;
      const p = this.canvas.parentElement;
      if (!p) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = p.clientWidth;
      const h = p.clientHeight;

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    reset(price) {
      this.candles = [];
      this.ema = [];
      this.vwap = [];
      this.current = null;
      this.bootstrap(price);
      this.seedHistory(price);
      updateMetrics();
    },

    bootstrap(price) {
      this.current = {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: rand(2, 8),
        time: Date.now()
      };
      this.candles.push(this.current);
    },

    seedHistory(price) {
      let p = price;
      for (let i = 0; i < 45; i++) {
        const drift = rand(-0.22, 0.22) * (price * 0.0014);
        const next = Math.max(0.000001, p + drift);

        this.current = {
          open: p,
          high: Math.max(p, next) + rand(0, price * 0.0007),
          low: Math.min(p, next) - rand(0, price * 0.0007),
          close: next,
          volume: rand(2, 16),
          time: Date.now() - (45 - i) * this.timeframe
        };

        this.candles.push(this.current);
        p = next;
      }

      this.current = this.candles[this.candles.length - 1];
      this.calcEMA(14);
      this.calcVWAP();
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
          volume: rand(1, 4),
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
        this.current.volume += rand(0.3, 1.2);
      }

      this.calcEMA(14);
      this.calcVWAP();
      updateMetrics();
    },

    calcEMA(period) {
      if (this.candles.length < 2) return;

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

      for (const c of this.candles) {
        const typical = (c.high + c.low + c.close) / 3;
        pv += typical * c.volume;
        vol += c.volume;
        this.vwap.push(vol ? pv / vol : typical);
      }
    },

    bindTimeframes() {
      timeframeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          timeframeButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");

          const range = btn.dataset.range || "1H";

          if (range === "1H") {
            this.timeframe = 60 * 1000;
            this.visibleCount = 60;
          } else if (range === "24H") {
            this.timeframe = 5 * 60 * 1000;
            this.visibleCount = 70;
          } else if (range === "7D") {
            this.timeframe = 30 * 60 * 1000;
            this.visibleCount = 80;
          } else if (range === "30D") {
            this.timeframe = 2 * 60 * 60 * 1000;
            this.visibleCount = 90;
          } else if (range === "90D") {
            this.timeframe = 6 * 60 * 60 * 1000;
            this.visibleCount = 100;
          }

          this.reset(marketPrice);
        });
      });
    },

    bindModes() {
      chartModeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          chartModeButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.mode = btn.dataset.chartMode || "area";
        });
      });
    },

    bindMouse() {
      if (!this.canvas) return;

      this.canvas.addEventListener("mousemove", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.isHovering = true;
      });

      this.canvas.addEventListener("mouseleave", () => {
        this.isHovering = false;
        this.hoverIndex = -1;
        if (this.tooltip) {
          this.tooltip.classList.remove("show");
        }
      });

      this.canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 4 : -4;
        this.visibleCount = clamp(this.visibleCount + delta, this.minVisible, this.maxVisible);
      }, { passive: false });
    },

    priceToY(price, min, max, chartTop, chartHeight) {
      return chartTop + ((max - price) / (max - min)) * chartHeight;
    },

    renderGrid(ctx, w, chartTop, chartHeight) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
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
      ctx.restore();
    },

    renderEMA(ctx, visible, min, max, chartTop, chartHeight, candleWidth) {
      if (this.ema.length < 2) return;

      const emaVisible = this.ema.slice(-visible.length);

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(240,185,11,.95)";

      emaVisible.forEach((val, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = this.priceToY(val, min, max, chartTop, chartHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
      ctx.restore();
    },

    renderVWAP(ctx, visible, min, max, chartTop, chartHeight, candleWidth) {
      if (this.vwap.length < 2) return;

      const vwapVisible = this.vwap.slice(-visible.length);

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(168,85,247,.92)";

      vwapVisible.forEach((val, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = this.priceToY(val, min, max, chartTop, chartHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
      ctx.restore();
    },

    renderArea(ctx, visible, min, max, chartTop, chartHeight, candleWidth, w) {
      const closes = visible.map(c => c.close);

      ctx.save();
      ctx.beginPath();

      closes.forEach((price, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = this.priceToY(price, min, max, chartTop, chartHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      const grad = ctx.createLinearGradient(0, chartTop, 0, chartTop + chartHeight);
      grad.addColorStop(0, "rgba(14,203,129,.34)");
      grad.addColorStop(.65, "rgba(14,203,129,.08)");
      grad.addColorStop(1, "rgba(14,203,129,0)");

      const lineGrad = ctx.createLinearGradient(0, chartTop, w, chartTop);
      lineGrad.addColorStop(0, "rgba(116,255,208,.95)");
      lineGrad.addColorStop(1, "rgba(56,217,154,.95)");

      const lastX = (closes.length - 1) * candleWidth + candleWidth / 2;
      ctx.lineTo(lastX, chartTop + chartHeight);
      ctx.lineTo(candleWidth / 2, chartTop + chartHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      closes.forEach((price, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = this.priceToY(price, min, max, chartTop, chartHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    },

    renderLine(ctx, visible, min, max, chartTop, chartHeight, candleWidth) {
      ctx.save();
      ctx.beginPath();

      visible.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = this.priceToY(c.close, min, max, chartTop, chartHeight);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = "rgba(116,255,208,.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    },

    renderCandles(ctx, visible, min, max, chartTop, chartHeight, candleWidth) {
      ctx.save();

      visible.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const openY = this.priceToY(c.open, min, max, chartTop, chartHeight);
        const closeY = this.priceToY(c.close, min, max, chartTop, chartHeight);
        const highY = this.priceToY(c.high, min, max, chartTop, chartHeight);
        const lowY = this.priceToY(c.low, min, max, chartTop, chartHeight);

        const up = c.close >= c.open;
        const color = up ? "#0ecb81" : "#f6465d";

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(closeY - openY));
        const bodyW = Math.max(4, candleWidth * 0.56);

        ctx.fillStyle = color;
        ctx.fillRect(x - bodyW / 2, bodyY, bodyW, bodyH);
      });

      ctx.restore();
    },

    renderVolume(ctx, visible, chartTop, chartHeight, w, h, candleWidth) {
      const volumeTop = chartTop + chartHeight + 8;
      const volumeHeight = h - volumeTop - 10;
      const maxVol = Math.max(...visible.map(c => c.volume), 1);

      ctx.save();
      visible.forEach((c, i) => {
        const x = i * candleWidth + candleWidth * 0.18;
        const barW = candleWidth * 0.64;
        const barH = (c.volume / maxVol) * volumeHeight;
        const y = volumeTop + (volumeHeight - barH);
        const up = c.close >= c.open;

        ctx.fillStyle = up
          ? "rgba(14,203,129,.28)"
          : "rgba(246,70,93,.26)";

        ctx.fillRect(x, y, barW, barH);
      });
      ctx.restore();
    },

    renderCrosshair(ctx, visible, min, max, chartTop, chartHeight, candleWidth, w) {
      if (!this.isHovering) return;

      const idx = clamp(Math.floor(this.mouseX / candleWidth), 0, visible.length - 1);
      this.hoverIndex = idx;

      const candle = visible[idx];
      if (!candle) return;

      const x = idx * candleWidth + candleWidth / 2;
      const y = this.priceToY(candle.close, min, max, chartTop, chartHeight);

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartTop + chartHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(116,255,208,.95)";
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      this.showTooltip(candle, x, y);
    },

    showTooltip(candle, x, y) {
      if (!this.tooltip || !this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      const left = clamp(x + 18, 10, rect.width - 190);
      const top = clamp(y + 18, 10, rect.height - 120);

      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;

      this.tooltip.innerHTML = `
        <div><strong>Open:</strong> ${fmtPrice(candle.open)}</div>
        <div><strong>High:</strong> ${fmtPrice(candle.high)}</div>
        <div><strong>Low:</strong> ${fmtPrice(candle.low)}</div>
        <div><strong>Close:</strong> ${fmtPrice(candle.close)}</div>
        <div><strong>Vol:</strong> ${fmtAmount(candle.volume, 2)}</div>
      `;
      this.tooltip.classList.add("show");
    },

    render() {
      if (!this.canvas || !this.ctx) return;

      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const visible = this.candles.slice(-this.visibleCount);
      if (visible.length < 2) {
        this.raf = requestAnimationFrame(() => this.render());
        return;
      }

      const chartTop = 12;
      const chartHeight = h - 110;
      const candleWidth = w / visible.length;

      const highs = visible.map(c => c.high);
      const lows = visible.map(c => c.low);

      let max = Math.max(...highs);
      let min = Math.min(...lows);

      if (Math.abs(max - min) < 0.0000001) {
        max += 0.0001;
        min -= 0.0001;
      }

      const padding = (max - min) * 0.12;
      max += padding;
      min -= padding;

      this.renderGrid(ctx, w, chartTop, chartHeight);

      if (this.mode === "candles") {
        this.renderCandles(ctx, visible, min, max, chartTop, chartHeight, candleWidth);
      } else if (this.mode === "line") {
        this.renderLine(ctx, visible, min, max, chartTop, chartHeight, candleWidth);
      } else {
        this.renderArea(ctx, visible, min, max, chartTop, chartHeight, candleWidth, w);
      }

      this.renderEMA(ctx, visible, min, max, chartTop, chartHeight, candleWidth);
      this.renderVWAP(ctx, visible, min, max, chartTop, chartHeight, candleWidth);
      this.renderVolume(ctx, visible, chartTop, chartHeight, w, h, candleWidth);
      this.renderCrosshair(ctx, visible, min, max, chartTop, chartHeight, candleWidth, w);

      this.raf = requestAnimationFrame(() => this.render());
    }
  };

  /* =========================================================
     INIT
  ========================================================= */
  function initMarket() {
    if (marketStarted) return;
    marketStarted = true;

    updateWalletUI();
    loadMarketWallet();
    bindEvents();

    quotePriceUSDT = quoteUsdFallback[currentQuote] || 1;
    connectBinance(quoteMap[currentQuote]);

    marketPrice = BX_USDT_REFERENCE;
    previousPrice = marketPrice;

    generateOrderBook();
    renderOrderBook();
    setTradeSide("buy");
    updateTradeInfo();
    updatePriceUI();

    PRO_CHART.init();
    startEngine();
  }

  window.initMarket = initMarket;
  window.PRO_CHART = PRO_CHART;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMarket);
  } else {
    initMarket();
  }
})();
