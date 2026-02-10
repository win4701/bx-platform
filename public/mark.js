/* =========================================================
   BX MARKET ENGINE – CLEAN & SAFE VERSION
   No breaking wallet / router / other sections
========================================================= */

  /* ================= CONFIG ================= */
  const CONFIG = {
    BASE_PRICE_USDT: 24,
    MAX_BOOK_ROWS: 15,
    MAX_TRADES: 30,
    CHART_POINTS: 120,
    FAKE_INTERVAL: 1200,
  };

  const BINANCE_SYMBOLS = {
    USDT: "btcusdt",
    USDC: "btcusdt",
    BTC:  "btcusdt",
    ETH:  "ethusdt",
    BNB:  "bnbusdt",
    SOL:  "solusdt",
    TON:  "tonusdt",
    AVAX: "avaxusdt",
    LTC:  "ltcusdt",
    ZEC:  "zecusdt"
  };

  /* ================= STATE ================= */
  let currentQuote = "USDT";
  let lastPrice = CONFIG.BASE_PRICE_USDT;
  let lastDisplayedPrice = lastPrice;
  let trades = [];
  let chartData = [];

  let priceWS = null;
  let lastRef = null;

  /* ================= DOM ================= */
  const priceEl  = document.querySelector(".price-main");
  const pairEl   = document.querySelector(".pair-title");
  const bidsEl   = document.querySelector(".orderbook-bids");
  const asksEl   = document.querySelector(".orderbook-asks");
  const tradesEl = document.querySelector(".trades-list");

  const fmt = (n, d = 6) => Number(n).toFixed(d);

  /* ================= PRICE UI ================= */
  function flash(up) {
    if (!priceEl) return;
    priceEl.classList.remove("flash-up", "flash-down");
    void priceEl.offsetWidth;
    priceEl.classList.add(up ? "flash-up" : "flash-down");
  }

  function updatePriceUI(price) {
    lastDisplayedPrice = price;
    if (priceEl) priceEl.textContent = fmt(price);
  }

  /* ================= ORDER BOOK ================= */
  function buildFakeOrderBook(mid) {
    const bids = [];
    const asks = [];

    for (let i = 1; i <= CONFIG.MAX_BOOK_ROWS; i++) {
      bids.push({
        price: mid * (1 - i * 0.0008),
        qty: Math.random() * 2
      });
      asks.push({
        price: mid * (1 + i * 0.0008),
        qty: Math.random() * 2
      });
    }

    renderBook(bids, asks);
  }

  function renderBook(bids, asks) {
    if (bidsEl) {
      bidsEl.innerHTML = bids.map(b => `
        <div class="row bid">
          <span>${fmt(b.price)}</span>
          <span>${fmt(b.qty,3)}</span>
        </div>
      `).join("");
    }

    if (asksEl) {
      asksEl.innerHTML = asks.map(a => `
        <div class="row ask">
          <span>${fmt(a.price)}</span>
          <span>${fmt(a.qty,3)}</span>
        </div>
      `).join("");
    }
  }

  /* ================= TRADES ================= */
  function pushTradeFromPrice(price) {
    trades.unshift({
      price: fmt(price),
      qty: fmt(Math.random() * 1.5, 3),
      time: new Date().toLocaleTimeString(),
      side: Math.random() > 0.5 ? "buy" : "sell"
    });

    if (trades.length > CONFIG.MAX_TRADES) {
      trades.length = CONFIG.MAX_TRADES;
    }
    renderTrades();
  }

  function renderTrades() {
    if (!tradesEl) return;
    tradesEl.innerHTML = trades.map(t => `
      <div class="trade ${t.side}">
        <span>${t.price}</span>
        <span>${t.qty}</span>
        <span>${t.time}</span>
      </div>
    `).join("");
  }

  /* ================= CHART ================= */
  let chart, lineSeries;

  function initChart() {
    if (!window.LightweightCharts) return;
    const el = document.getElementById("chart");
    if (!el) return;

    chart = LightweightCharts.createChart(el, {
      layout: { background: { color: "#0b0f14" }, textColor: "#aaa" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: { visible: false },
      rightPriceScale: { visible: false }
    });

    lineSeries = chart.addLineSeries({ color: "#0ecb81", lineWidth: 2 });
  }

  function updateChart(price) {
    if (!lineSeries) return;
    chartData.push({ time: Date.now()/1000, value: price });
    if (chartData.length > CONFIG.CHART_POINTS) chartData.shift();
    lineSeries.setData(chartData);
  }

  /* ================= MARKET HANDLER ================= */
  function onMarketPrice(price) {
    const up = price >= lastDisplayedPrice;
    updatePriceUI(price);
    flash(up);
    updateChart(price);
    buildFakeOrderBook(price);
    pushTradeFromPrice(price);
  }

  /* ================= BINANCE WS ================= */
  function connectPriceWS() {
    if (priceWS) priceWS.close();

    const symbol = BINANCE_SYMBOLS[currentQuote];
    if (!symbol) return;

    priceWS = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@trade`
    );

    priceWS.onmessage = e => {
      const data = JSON.parse(e.data);
      const ref = +data.p;
      if (!ref) return;

      if (!lastRef) lastRef = ref;

      const delta = (ref - lastRef) / lastRef;
      const bxPrice = CONFIG.BASE_PRICE_USDT * (1 + delta);

      lastRef = ref;
      onMarketPrice(bxPrice);
    };
  }

  /* ================= PAIR SWITCH ================= */
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-quote]");
    if (!btn) return;

    currentQuote = btn.dataset.quote;

    document.querySelectorAll("[data-quote]")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (pairEl) pairEl.textContent = `BX / ${currentQuote}`;

    chartData = [];
    lastRef = null;
    connectPriceWS();
  });

  /* ================= WALLET SNAPSHOT ================= */
  function emitMarketSnapshot(side) {
    document.dispatchEvent(
      new CustomEvent("market:price", {
        detail: {
          pair: `BX/${currentQuote}`,
          price: lastDisplayedPrice,
          side,
          ts: Date.now()
        }
      })
    );
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    initChart();
    buildFakeOrderBook(lastPrice);
    onMarketPrice(lastPrice);
    connectPriceWS();
  });
