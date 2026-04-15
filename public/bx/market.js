/* =========================================================
   BLOXIO MARKET — MASTER FINAL CLEAN
   HTML-safe • CSS-safe • Mobile-safe • NO LAST TRADES
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */
  const ROWS = 12;
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

  const orderBookRowsEl = $("#orderBookRows");
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

  function renderOrderBook() {
    if (!orderBookRowsEl) return;

    orderBookRowsEl.innerHTML = "";

    const bestBids = bids.slice(0, ROWS);
    const bestAsks = asks.slice(0, ROWS);

    const maxBidTotal = Math.max(...bestBids.map(x => x.total), 1);
    const maxAskTotal = Math.max(...bestAsks.map(x => x.total), 1);

    const totalRows = Math.max(bestBids.length, bestAsks.length);

    for (let i = 0; i < totalRows; i++) {
      const bid = bestBids[i];
      const ask = bestAsks[i];

      const row = document.createElement("div");
      row.className = "ob-row";

      const bidCell = document.createElement("div");
      bidCell.className = "ob-cell bid-cell";

      if (bid) {
        const bidDepth = (bid.total / maxBidTotal) * 100;

        bidCell.innerHTML = `
          <div class="ob-depth bid-depth" style="width:${bidDepth}%"></div>
          <div class="ob-inner">
            <span class="ob-price bid-row ob-click" data-price="${bid.price}">${fmtPrice(bid.price)}</span>
            <span class="ob-amount">${fmtAmount(bid.amount, 3)}</span>
          </div>
        `;
      } else {
        bidCell.innerHTML = `<div class="ob-inner"><span class="ob-empty">—</span></div>`;
      }

      const midCell = document.createElement("div");
      midCell.className = "ob-cell mid-cell";

      const bestBid = bids[0]?.price || marketPrice;
      const bestAsk = asks[0]?.price || marketPrice;
      const midPrice = ((bestBid + bestAsk) / 2);

      midCell.innerHTML = `
        <span class="ob-mid-dot">${i === Math.floor(totalRows / 2) ? fmtPrice(midPrice) : "•"}</span>
      `;

      const askCell = document.createElement("div");
      askCell.className = "ob-cell ask-cell";

      if (ask) {
        const askDepth = (ask.total / maxAskTotal) * 100;

        askCell.innerHTML = `
          <div class="ob-depth ask-depth" style="width:${askDepth}%"></div>
          <div class="ob-inner">
            <span class="ob-price ask-row ob-click" data-price="${ask.price}">${fmtPrice(ask.price)}</span>
            <span class="ob-amount">${fmtAmount(ask.amount, 3)}</span>
          </div>
        `;
      } else {
        askCell.innerHTML = `<div class="ob-inner"><span class="ob-empty">—</span></div>`;
      }

      row.appendChild(bidCell);
      row.appendChild(midCell);
      row.appendChild(askCell);

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
   PRO CHART ENGINE — ULTRA (Telegram Ready)
========================================================= */

const PRO_CHART = {
  chart: null,
  candleSeries: null,
  emaSeries: null,
  vwapSeries: null,

  candles: [],
  ema: [],
  vwap: [],

  lastCandle: null,
  timeframe: 60,

  init() {
    const container = document.getElementById("marketChart");
    if (!container) return;

    this.chart = LightweightCharts.createChart(container, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#cbd5f5"
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: "#1f2937"
      },
      timeScale: {
        borderColor: "#1f2937",
        timeVisible: true,
        secondsVisible: false
      }
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d"
    });

    this.emaSeries = this.chart.addLineSeries({
      color: "#f0b90b",
      lineWidth: 2
    });

    this.vwapSeries = this.chart.addLineSeries({
      color: "#a855f7",
      lineWidth: 2
    });
  },

  update(price) {
    if (!price) return;

    const time = Math.floor(Date.now() / 1000);

    if (!this.lastCandle || time - this.lastCandle.time >= this.timeframe) {
      this.lastCandle = {
        time,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: Math.random() * 5
      };

      this.candles.push(this.lastCandle);

      if (this.candles.length > 200) this.candles.shift();

    } else {
      this.lastCandle.high = Math.max(this.lastCandle.high, price);
      this.lastCandle.low = Math.min(this.lastCandle.low, price);
      this.lastCandle.close = price;
      this.lastCandle.volume += Math.random();
    }

    this.candleSeries.setData(this.candles);

    this.calculateEMA(14);
    this.calculateVWAP();

    this.emaSeries.setData(this.ema);
    this.vwapSeries.setData(this.vwap);

    this.updateMetrics();
  },

  calculateEMA(period) {
    const k = 2 / (period + 1);
    let ema = [];

    let prev = this.candles[0]?.close || 0;

    this.candles.forEach((c, i) => {
      if (i === 0) {
        ema.push({ time: c.time, value: prev });
      } else {
        const val = c.close * k + prev * (1 - k);
        ema.push({ time: c.time, value: val });
        prev = val;
      }
    });

    this.ema = ema;
  },

  calculateVWAP() {
    let pv = 0;
    let vol = 0;
    let vwap = [];

    this.candles.forEach(c => {
      const typical = (c.high + c.low + c.close) / 3;
      pv += typical * c.volume;
      vol += c.volume;

      vwap.push({
        time: c.time,
        value: vol ? pv / vol : typical
      });
    });

    this.vwap = vwap;
  },

  updateMetrics() {
    if (!this.candles.length) return;

    const visible = this.candles.slice(-24);

    const open = visible[0].open;
    const close = visible[visible.length - 1].close;
    const high = Math.max(...visible.map(c => c.high));
    const low = Math.min(...visible.map(c => c.low));
    const vol = visible.reduce((a, c) => a + c.volume, 0);

    document.getElementById("metricOpen").textContent = open.toFixed(6);
    document.getElementById("metricHigh").textContent = high.toFixed(6);
    document.getElementById("metricLow").textContent = low.toFixed(6);
    document.getElementById("metricClose").textContent = close.toFixed(6);

    document.getElementById("metricOpenPanel").textContent = open.toFixed(6);
    document.getElementById("metricHighPanel").textContent = high.toFixed(6);
    document.getElementById("metricLowPanel").textContent = low.toFixed(6);
    document.getElementById("metricClosePanel").textContent = close.toFixed(6);
    document.getElementById("metricVol").textContent = vol.toFixed(2);
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

    PRO_CHART.update(marketPrice);
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
