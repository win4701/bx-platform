
/* =========================================================
   BLOXIO MARKET ENGINE V8
   public/bx/market.js

   Market Data / Order Book / Trading UI
   BXChart Integration / API / Responsive UI
========================================================= */

"use strict";

(function () {

/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const number = value => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const format = (value, digits = 8) => {
  return number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  });
};

const escapeHTML = value => {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
};

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
  endpoints: {
    price: "/market/price",
    depth: "/market/depth",
    trades: "/market/trades",
    stats: "/market/stats",
    ticker: "/market/ticker",
    snapshot: "/market/snapshot"
  },

  refreshInterval: 5000,
  depthLimit: 10,
  historyLimit: 50,

  defaultPair: "BX/BTC",

  pairs: [
    "BX/BTC",
    "BX/ETH",
    "BX/BNB",
    "BX/SOL",
    "BX/TON",
    "BX/LTC",
    "BX/BCH",
    "BX/USDT",
    "BX/USDC",
    "BX/ZEC",
    "BX/AAVE",
    "BX/AVAX",
    "BX/DOT",
    "BX/LINK",
    "BX/DASH",
    "BX/XMR"
  ]
};

/* =========================================================
   MARKET ENGINE
========================================================= */

const MARKET = {

  initialized: false,
  loading: false,
  destroyed: false,

  pair: CONFIG.defaultPair,
  quote: "BTC",

  price: 0,
  prevPrice: 0,
  volume: 0,
  change: 0,
  quotePrice: 0,

  tradeSide: "buy",

  orderBook: {
    asks: [],
    bids: []
  },

  trades: [],

  heartbeat: null,
  requestController: null,
  requestGeneration: 0,

  listeners: [],

  /* =====================================================
     INIT
  ===================================================== */

  init() {

    if (this.initialized) {
      this.refresh();
      return true;
    }

    this.initialized = true;
    this.destroyed = false;

    this.bindAssets();
    this.bindSearch();
    this.bindTradeTabs();
    this.bindTradeForm();
    this.bindChartToolbar();
    this.bindMobileTabs();

    this.connectPair(this.pair);

    this.startHeartbeat();

    this.subscribeWS();

    console.log("[BLOXIO MARKET] V8 READY");

    return true;
  },

  /* =====================================================
     API
  ===================================================== */

  async apiGet(endpoint, params = {}) {

    if (!window.API?.get) {
      throw new Error("API_UNAVAILABLE");
    }

    const query = new URLSearchParams(params);

    const url = endpoint +
      (query.toString() ? "?" + query.toString() : "");

    const response = await window.API.get(url, {
      auth: false,
      cache: false
    });

    if (
      !response ||
      response.error ||
      response.success === false
    ) {
      throw new Error(
        response?.error || "MARKET_REQUEST_FAILED"
      );
    }

    return response;
  },

  /* =====================================================
     RESPONSE NORMALIZATION
  ===================================================== */

  unwrap(response, key) {

    if (response?.data !== undefined) {
      response = response.data;
    }

    if (
      key &&
      response &&
      response[key] !== undefined
    ) {
      return response[key];
    }

    return response;
  },

  /* =====================================================
     PAIR
  ===================================================== */

  normalizePair(pair) {

    const value = String(
      pair || CONFIG.defaultPair
    ).toUpperCase().trim();

    if (value.startsWith("BX/")) {
      return value;
    }

    return "BX/" + value.replace(/^BX/, "");
  },

  connectPair(pair) {

    const normalized = this.normalizePair(pair);

    if (normalized === this.pair && this.initialized) {
      this.refresh();
      return;
    }

    this.pair = normalized;
    this.quote = normalized.split("/")[1] || "BTC";

    this.requestGeneration++;

    if (this.requestController) {
      this.requestController.abort();
      this.requestController = null;
    }

    this.updatePairUI();

    if (window.BXChart) {

      window.BXChart.setPair(
        this.quote + "USDT"
      );

    }

    this.refresh();

    this.refreshTrades();

    this.updateOrderTotal();

  },

  updatePairUI() {

    if ($("marketPair")) {
      $("marketPair").textContent = this.pair;
    }

    document.querySelectorAll(".market-asset")
      .forEach(button => {

        button.classList.toggle(
          "active",
          this.normalizePair(button.dataset.pair) === this.pair
        );

      });

  },

  /* =====================================================
     REFRESH
  ===================================================== */

  async refresh() {

    if (this.destroyed || this.loading) {
      return;
    }

    this.loading = true;

    const generation = this.requestGeneration;

    try {

      const results = await Promise.allSettled([
        this.loadPrice(generation),
        this.loadDepth(generation),
        this.loadStats(generation)
      ]);

      results.forEach(result => {

        if (result.status === "rejected") {
          console.warn(
            "[MARKET REFRESH]",
            result.reason
          );
        }

      });

    } finally {

      this.loading = false;

    }

  },

  /* =====================================================
     PRICE
  ===================================================== */

  async loadPrice(generation = this.requestGeneration) {

    const response = await this.apiGet(
      CONFIG.endpoints.price,
      {
        pair: this.pair
      }
    );

    if (
      generation !== this.requestGeneration ||
      this.destroyed
    ) {
      return;
    }

    const data = this.unwrap(response, "price");

    const price = number(
      typeof data === "object"
        ? data.price
        : data
    );

    if (price <= 0) {
      return;
    }

    this.prevPrice = this.price || price;
    this.price = price;

    this.updateStats();

  },

  /* =====================================================
     ORDER BOOK DATA
  ===================================================== */

  async loadDepth(generation = this.requestGeneration) {

    const response = await this.apiGet(
      CONFIG.endpoints.depth,
      {
        pair: this.pair
      }
    );

    if (
      generation !== this.requestGeneration ||
      this.destroyed
    ) {
      return;
    }

    const data = this.unwrap(response, "depth");

    this.orderBook.asks = Array.isArray(data?.asks)
      ? data.asks
      : [];

    this.orderBook.bids = Array.isArray(data?.bids)
      ? data.bids
      : [];

    this.renderOrderBook();

  },

  /* =====================================================
     STATS
  ===================================================== */

  async loadStats(generation = this.requestGeneration) {

    const response = await this.apiGet(
      CONFIG.endpoints.stats,
      {
        pair: this.pair
      }
    );

    if (
      generation !== this.requestGeneration ||
      this.destroyed
    ) {
      return;
    }

    const data = this.unwrap(response, "stats");

    if (!data || typeof data !== "object") {
      return;
    }

    this.volume = number(
      data.volume ??
      data.quoteVolume ??
      data.totalVolume
    );

    if (data.change !== undefined) {
      this.change = number(data.change);
    }

    this.updateStats();

  },

  /* =====================================================
     TRADES
  ===================================================== */

  async refreshTrades() {

    try {

      const response = await this.apiGet(
        CONFIG.endpoints.trades,
        {
          pair: this.pair,
          limit: CONFIG.historyLimit
        }
      );

      const data = this.unwrap(response, "trades");

      if (!Array.isArray(data)) {
        return;
      }

      this.trades = data;

      this.renderHistory();

    } catch (error) {

      console.warn(
        "[MARKET TRADES]",
        error
      );

    }

  },

  /* =====================================================
     HEADER STATS
  ===================================================== */

  updateStats() {

    if ($("marketPrice")) {
      $("marketPrice").textContent =
        format(this.price, 8);
    }

    if ($("marketVolume")) {

      $("marketVolume").textContent =
        "$" + Math.round(this.volume).toLocaleString();

    }

    if ($("execPrice")) {
      $("execPrice").value =
        format(this.price, 8);
    }

    const change = this.change !== 0
      ? this.change
      : this.prevPrice
        ? ((this.price - this.prevPrice) / this.prevPrice) * 100
        : 0;

    if ($("marketChange")) {

      $("marketChange").textContent =
        change.toFixed(2) + "%";

      $("marketChange").classList.toggle(
        "positive",
        change >= 0
      );

      $("marketChange").classList.toggle(
        "negative",
        change < 0
      );

    }

    this.updateTooltip();
    this.updateOrderTotal();
    this.updateIntel();

  },

  /* =====================================================
     TOOLTIP
  ===================================================== */

  updateTooltip() {

    const tooltip = $("marketTooltip");

    if (!tooltip) return;

    tooltip.textContent =
      this.pair + " " + format(this.price, 8);

  },

  /* =====================================================
     ORDER BOOK
  ===================================================== */

  normalizeBookRows(rows) {

    return rows
      .map(row => ({
        price: number(row.price ?? row[0]),
        amount: number(row.amount ?? row.quantity ?? row[1])
      }))
      .filter(row =>
        row.price > 0 &&
        row.amount > 0
      );

  },

  renderOrderBook() {

    const grid = $("orderBookGrid");

    if (!grid) return;

    const asks = this.normalizeBookRows(
      this.orderBook.asks
    )
      .sort((a, b) => b.price - a.price)
      .slice(0, CONFIG.depthLimit);

    const bids = this.normalizeBookRows(
      this.orderBook.bids
    )
      .sort((a, b) => b.price - a.price)
      .slice(0, CONFIG.depthLimit);

    const maxTotal = Math.max(
      ...asks.map(row => row.amount),
      ...bids.map(row => row.amount),
      1
    );

    const renderRows = (rows, side) => {

      let cumulative = 0;

      return rows.map(row => {

        cumulative += row.amount;

        const width = Math.min(
          100,
          (row.amount / maxTotal) * 100
        );

        return `
          <div class="orderbook-row ${side}"
               title="Total: ${format(cumulative, 6)}">

            <span class="orderbook-price">
              ${format(row.price, 8)}
            </span>

            <span class="orderbook-amount">
              ${format(row.amount, 6)}
            </span>

            <span class="orderbook-total">
              ${format(cumulative, 6)}
            </span>

            <span class="orderbook-depth"
                  style="width:${width}%"></span>

          </div>
        `;

      }).join("");

    };

    grid.innerHTML = `
      <div class="orderbook-heading">
        <span>Price</span>
        <span>Amount</span>
        <span>Total</span>
      </div>

      <div class="orderbook-asks">
        ${renderRows(asks, "ask")}
      </div>

      <div class="orderbook-spread">
        <span>Market Price</span>
        <strong>${format(this.price, 8)}</strong>
      </div>

      <div class="orderbook-bids">
        ${renderRows(bids, "bid")}
      </div>
    `;

    grid.classList.add("orderbook-enhanced");

  },

  /* =====================================================
     TRADE TABS
  ===================================================== */

  bindTradeTabs() {

    $("buyTab")?.addEventListener(
      "click",
      () => this.setTradeSide("buy")
    );

    $("sellTab")?.addEventListener(
      "click",
      () => this.setTradeSide("sell")
    );

    this.setTradeSide("buy");

  },

  setTradeSide(side) {

    if (!["buy", "sell"].includes(side)) {
      return;
    }

    this.tradeSide = side;

    $("buyTab")?.classList.toggle(
      "active",
      side === "buy"
    );

    $("sellTab")?.classList.toggle(
      "active",
      side === "sell"
    );

    const button = $("actionBtn");

    if (button) {

      button.textContent =
        side === "buy" ? "BUY BX" : "SELL BX";

      button.classList.toggle(
        "buy",
        side === "buy"
      );

      button.classList.toggle(
        "sell",
        side === "sell"
      );

    }

    this.updateOrderTotal();

  },

  /* =====================================================
     TRADE FORM
  ===================================================== */

  bindTradeForm() {

    $("orderAmount")?.addEventListener(
      "input",
      () => this.updateOrderTotal()
    );

    $("actionBtn")?.addEventListener(
      "click",
      () => this.executeTrade()
    );

  },

  updateOrderTotal() {

    const amount = number(
      $("orderAmount")?.value
    );

    const total = amount * this.price;

    if ($("orderTotal")) {

      $("orderTotal").value =
        format(total, 8);

    }

    if ($("execPrice")) {

      $("execPrice").value =
        format(this.price, 8);

    }

    return total;

  },

  /* =====================================================
     ORDER SUBMISSION
     Disabled until a confirmed backend route exists.
  ===================================================== */

  async executeTrade() {

    const amount = number(
      $("orderAmount")?.value
    );

    if (amount <= 0) {
      this.notify("Enter a valid amount", "error");
      return;
    }

    if (this.price <= 0) {
      this.notify("Market price unavailable", "error");
      return;
    }

    if (!window.AUTH?.state?.authenticated) {
      window.AUTH?.showAuth?.("login");
      return;
    }

    /*
      Backend routes reviewed so far expose:
      GET  /market/price
      GET  /market/depth
      GET  /market/trades
      GET  /market/candles
      GET  /market/stats
      POST /market/cancel

      No verified POST order-placement route was found.
      Therefore this method intentionally does not fabricate
      a successful trade or mutate the wallet locally.
    */

    this.notify(
      "Order placement is not enabled: backend order route is not verified.",
      "warning"
    );

  },

  /* =====================================================
     TRADE HISTORY
  ===================================================== */

  renderHistory() {

    const grid = $("tradeHistoryGrid");

    if (!grid) return;

    if (!this.trades.length) {

      grid.innerHTML =
        '<div class="trade-empty">No market trades yet</div>';

      return;
    }

    grid.innerHTML = this.trades
      .slice(0, CONFIG.historyLimit)
      .map(trade => {

        const side = String(
          trade.side || trade.type || "buy"
        ).toLowerCase();

        const price = number(trade.price);

        const amount = number(
          trade.amount ?? trade.quantity
        );

        const time = trade.time
          ? new Date(trade.time).toLocaleTimeString()
          : trade.timestamp
            ? new Date(trade.timestamp).toLocaleTimeString()
            : "--";

        return `
          <div class="trade-row ${side}">
            <span>${escapeHTML(time)}</span>
            <span>${escapeHTML(side.toUpperCase())}</span>
            <span>${format(price, 8)}</span>
            <span>${format(amount, 6)}</span>
          </div>
        `;

      }).join("");

  },

  /* =====================================================
     INTELLIGENCE
  ===================================================== */

  updateIntel() {

    const diff = Math.abs(
      this.price - this.prevPrice
    );

    const trend =
      this.price >= this.prevPrice
        ? "Bullish"
        : "Bearish";

    const volatility =
      diff < 0.001
        ? "Low"
        : diff < 0.01
          ? "Medium"
          : "High";

    const sentiment =
      diff < 0.001
        ? "Stable"
        : trend;

    if ($("marketTrend")) {
      $("marketTrend").textContent = trend;
    }

    if ($("marketSentiment")) {
      $("marketSentiment").textContent = sentiment;
    }

    if ($("marketVolatility")) {
      $("marketVolatility").textContent = volatility;
    }

    if ($("marketLiquidity")) {

      const depth =
        this.orderBook.asks.length +
        this.orderBook.bids.length;

      $("marketLiquidity").textContent =
        depth > 10 ? "Available" : "Limited";

    }

  },

  /* =====================================================
     SEARCH
  ===================================================== */

  bindSearch() {

    $("marketSearch")?.addEventListener(
      "input",
      event => {

        const query = event.target.value
          .trim()
          .toLowerCase();

        document.querySelectorAll(
          ".market-asset"
        ).forEach(asset => {

          const text = (
            asset.textContent +
            " " +
            asset.dataset.pair
          ).toLowerCase();

          asset.hidden = !text.includes(query);

        });

      }
    );

  },

  /* =====================================================
     ASSETS
  ===================================================== */

  bindAssets() {

    document.querySelectorAll(
      ".market-asset"
    ).forEach(asset => {

      asset.addEventListener(
        "click",
        () => {

          this.connectPair(
            asset.dataset.pair
          );

        }
      );

    });

  },

  /* =====================================================
     CHART TOOLBAR
  ===================================================== */

  bindChartToolbar() {

    const map = {
      "1M": "1m",
      "5M": "5m",
      "15M": "15m",
      "1H": "1h",
      "4H": "4h",
      "1D": "1d",
      "1W": "1w"
    };

    document.querySelectorAll(
      ".chart-time"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document.querySelectorAll(
            ".chart-time"
          ).forEach(item => {
            item.classList.remove("active");
          });

          button.classList.add("active");

          const timeframe = map[
            button.textContent.trim().toUpperCase()
          ];

          if (timeframe && window.BXChart) {
            window.BXChart.setTimeframe(timeframe);
          }

        }
      );

    });

  },

  /* =====================================================
     MOBILE
  ===================================================== */

  bindMobileTabs() {

    document.querySelectorAll(
      ".market-mobile-tab"
    ).forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          document.querySelectorAll(
            ".market-mobile-tab"
          ).forEach(button => {
            button.classList.remove("active");
          });

          tab.classList.add("active");

          window.BXChart?.resize?.();

        }
      );

    });

  },

  /* =====================================================
     SOCKET.IO
  ===================================================== */

  subscribeWS() {

    if (!window.WS?.on) {
      return;
    }

    const events = [
      "market:price",
      "market:depth",
      "market:trade",
      "market:update"
    ];

    events.forEach(event => {

      const handler = payload => {

        if (!payload) return;

        const pair = payload.pair;

        if (
          pair &&
          this.normalizePair(pair) !== this.pair
        ) {
          return;
        }

        if (event === "market:price") {

          const price = number(payload.price);

          if (price > 0) {

            this.prevPrice = this.price || price;
            this.price = price;

            this.updateStats();

          }

        } else if (event === "market:depth") {

          const depth =
            payload.depth || payload;

          this.orderBook.asks =
            depth.asks || [];

          this.orderBook.bids =
            depth.bids || [];

          this.renderOrderBook();

        } else if (event === "market:trade") {

          this.trades.unshift(payload);

          this.trades =
            this.trades.slice(0, CONFIG.historyLimit);

          this.renderHistory();

        } else {

          this.refresh();

        }

      };

      window.WS.on(event, handler);

      this.listeners.push({
        event,
        handler
      });

    });

    window.WS.subscribe?.("market");

  },

  /* =====================================================
     HEARTBEAT
  ===================================================== */

  startHeartbeat() {

    clearInterval(this.heartbeat);

    this.heartbeat = setInterval(
      () => {

        if (
          this.destroyed ||
          document.hidden
        ) {
          return;
        }

        this.refresh();

      },
      CONFIG.refreshInterval
    );

  },

  /* =====================================================
     NOTIFICATIONS
  ===================================================== */

  notify(message, type = "info") {

    console[type === "error" ? "error" : "log"](
      "[MARKET]",
      message
    );

    const status = $("marketStatus");

    if (status) {

      status.textContent = message;

      status.dataset.type = type;

      status.classList.remove("hidden");

    }

    document.dispatchEvent(
      new CustomEvent("bloxio:market-message", {
        detail: {
          message,
          type
        }
      })
    );

  },

  /* =====================================================
     VISIBILITY
  ===================================================== */

  onVisibility() {

    if (
      !document.hidden &&
      this.initialized &&
      !this.destroyed
    ) {

      window.BXChart?.resize?.();

      this.refresh();

    }

  },

  /* =====================================================
     DESTROY
  ===================================================== */

  destroy() {

    this.destroyed = true;
    this.initialized = false;

    clearInterval(this.heartbeat);

    if (this.requestController) {
      this.requestController.abort();
      this.requestController = null;
    }

    this.listeners.forEach(({ event, handler }) => {
      window.WS?.off?.(event, handler);
    });

    this.listeners = [];

    window.WS?.unsubscribe?.("market");

    console.log("[BLOXIO MARKET] DESTROYED");

  }

};

/* =========================================================
   VISIBILITY EVENT
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => MARKET.onVisibility()
);

/* =========================================================
   GLOBAL EXPORT
========================================================= */

window.MARKET = MARKET;

/* =========================================================
   AUTO INIT
========================================================= */

function bootMarket() {

  if (window.MARKET) {
    window.MARKET.init();
  }

}

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    bootMarket,
    { once: true }
  );

} else {

  bootMarket();

}

})();
