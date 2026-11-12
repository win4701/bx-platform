
/* =========================================================
   BLOXIO MARKET ENGINE V9
   public/bx/market.js

   Default Market: BX/USDT
   Reference Opening Price: 45 USDT
   Backend-driven market data
   Guest browsing + authenticated trading
========================================================= */

"use strict";

(function () {

/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const number = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const format = (value, digits = 8) =>
    number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits
    });

const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

const CONFIG = {
    pair: "BX_USDT",
    displayPair: "BX/USDT",

    referencePrice: 45,

    endpoints: {
        price: "/market/price",
        orderbook: "/market/orderbook",
        trades: "/market/trades",
        candles: "/market/candles",
        stats: "/market/stats",
        limitOrder: "/market/order",
        marketOrder: "/market/market",
        cancel: "/market/cancel"
    },

    refreshInterval: 5000,
    historyLimit: 50,
    depthLimit: 10,

    timeframes: [
        "1m", "5m", "15m",
        "1h", "4h", "1d", "1w"
    ]
};

/* =========================================================
   MARKET ENGINE
========================================================= */

const MARKET = {

    initialized: false,
    destroyed: false,
    loading: false,
    submitting: false,

    pair: CONFIG.pair,
    displayPair: CONFIG.displayPair,

    price: 0,
    referencePrice: CONFIG.referencePrice,
    prevPrice: 0,

    volume: 0,
    change: 0,
    spread: 0,

    tradeSide: "buy",
    orderType: "limit",
    timeframe: "1m",

    orderBook: {
        asks: [],
        bids: []
    },

    trades: [],
    candles: [],

    heartbeat: null,
    listeners: [],
    generation: 0,

    lastUpdate: null,
    lastError: null,

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
        this.bindOrderType();
        this.bindVisibility();

        this.updatePairUI();

        this.renderOrderBook();
        this.renderHistory();
        this.updateStats();
        this.updateConnectionStatus("loading");

        this.refresh();
        this.refreshTrades();
        this.loadCandles();

        this.subscribeWS();
        this.startHeartbeat();

        console.log("[BLOXIO MARKET] V9 READY");

        return true;
    },

    /* =====================================================
       AUTH
    ===================================================== */

    isAuthenticated() {

        if (window.AUTH?.state?.authenticated === true) {
            return true;
        }

        try {
            return Boolean(
                window.API?.token?.() ||
                localStorage.getItem("accessToken") ||
                localStorage.getItem("token")
            );
        } catch {
            return false;
        }

    },

    requireAuth() {

        if (this.isAuthenticated()) {
            return true;
        }

        this.notify(
            "Login required to place an order",
            "warning"
        );

        if (window.AUTH?.openAuth) {
            window.AUTH.openAuth("login");
        } else if (window.AUTH?.showAuth) {
            window.AUTH.showAuth("login");
        } else {
            $("headerLoginBtn")?.click();
        }

        return false;
    },

    /* =====================================================
       API
    ===================================================== */

    async apiGet(endpoint, params = {}) {

        if (!window.API?.get) {
            throw new Error("API_UNAVAILABLE");
        }

        const query = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.set(key, String(value));
            }
        });

        const url = endpoint +
            (query.toString() ? "?" + query.toString() : "");

        const response = await window.API.get(url, {
            auth: false,
            cache: false
        });

        return this.unwrapResponse(response);
    },

    async apiPost(endpoint, body) {

        if (!window.API?.post) {
            throw new Error("API_UNAVAILABLE");
        }

        const response = await window.API.post(
            endpoint,
            body,
            {
                auth: true,
                cache: false
            }
        );

        return this.unwrapResponse(response);
    },

    unwrapResponse(response) {

        if (!response || typeof response !== "object") {
            throw new Error("INVALID_SERVER_RESPONSE");
        }

        if (response.error) {
            const message =
                typeof response.error === "string"
                    ? response.error
                    : response.error.message;

            throw new Error(message || "REQUEST_FAILED");
        }

        if (response.success === false) {
            throw new Error(
                response.message ||
                "REQUEST_FAILED"
            );
        }

        return response;
    },

    unwrap(response, key) {

        let data = response;

        if (data?.data !== undefined) {
            data = data.data;
        }

        if (
            key &&
            data &&
            data[key] !== undefined
        ) {
            return data[key];
        }

        return data;
    },

    /* =====================================================
       PAIR
    ===================================================== */

    normalizePair(pair) {

        const value = String(
            pair || CONFIG.displayPair
        ).toUpperCase().trim();

        if (
            value === "BX_USDT" ||
            value === "BX/USDT" ||
            value === "BXUSDT"
        ) {
            return CONFIG.pair;
        }

        return value.replace("/", "_");
    },

    connectPair(pair) {

        const normalized = this.normalizePair(pair);

        if (normalized === this.pair) {
            this.refresh();
            return;
        }

        this.pair = normalized;
        this.displayPair = normalized.replace("_", "/");

        this.generation++;

        this.price = 0;
        this.prevPrice = 0;
        this.volume = 0;
        this.change = 0;

        this.orderBook = {
            asks: [],
            bids: []
        };

        this.trades = [];
        this.candles = [];

        this.updatePairUI();

        this.renderOrderBook();
        this.renderHistory();

        this.refresh();
        this.refreshTrades();
        this.loadCandles();

    },

    updatePairUI() {

        if ($("marketPair")) {
            $("marketPair").textContent = this.displayPair;
        }

        document.querySelectorAll(".market-asset")
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    this.normalizePair(button.dataset.pair) === this.pair
                );
            });

        if ($("marketBaseAsset")) {
            $("marketBaseAsset").textContent = "BX";
        }

        if ($("marketQuoteAsset")) {
            $("marketQuoteAsset").textContent = "USDT";
        }

    },

    /* =====================================================
       REFRESH ALL
    ===================================================== */

    async refresh() {

        if (this.destroyed || this.loading) {
            return;
        }

        this.loading = true;

        const generation = this.generation;

        const tasks = [
            this.loadPrice(generation),
            this.loadOrderBook(generation),
            this.loadStats(generation)
        ];

        const results = await Promise.allSettled(tasks);

        if (generation !== this.generation) {
            this.loading = false;
            return;
        }

        const failed = results.some(
            result => result.status === "rejected"
        );

        if (failed) {
            this.updateConnectionStatus(
                this.price > 0 ? "partial" : "offline"
            );
        } else {
            this.updateConnectionStatus("online");
        }

        this.loading = false;

    },

    /* =====================================================
       PRICE
    ===================================================== */

    async loadPrice(generation = this.generation) {

        const response = await this.apiGet(
            CONFIG.endpoints.price,
            {
                pair: this.pair
            }
        );

        if (
            generation !== this.generation ||
            this.destroyed
        ) return;

        const data = this.unwrap(response, "price");

        const price = number(
            typeof data === "object"
                ? data.price
                : data
        );

        if (price <= 0) {
            throw new Error("INVALID_MARKET_PRICE");
        }

        this.prevPrice = this.price || price;
        this.price = price;

        this.lastUpdate = Date.now();
        this.lastError = null;

        this.updateStats();

    },

    /* =====================================================
       ORDER BOOK
    ===================================================== */

    async loadOrderBook(generation = this.generation) {

        const response = await this.apiGet(
            CONFIG.endpoints.orderbook,
            {
                pair: this.pair
            }
        );

        if (
            generation !== this.generation ||
            this.destroyed
        ) return;

        const data = this.unwrap(response, "depth");

        const book = data?.depth || data;

        this.orderBook.asks =
            Array.isArray(book?.asks)
                ? book.asks
                : [];

        this.orderBook.bids =
            Array.isArray(book?.bids)
                ? book.bids
                : [];

        this.renderOrderBook();
        this.updateIntel();

    },

    normalizeBookRows(rows) {

        if (!Array.isArray(rows)) return [];

        return rows.map(row => ({
            price: number(
                Array.isArray(row)
                    ? row[0]
                    : row.price
            ),

            amount: number(
                Array.isArray(row)
                    ? row[1]
                    : row.amount ?? row.quantity
            )
        })).filter(row =>
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

        if (!asks.length && !bids.length) {

            grid.innerHTML = `
                <div class="orderbook-heading">
                    <span>Price (USDT)</span>
                    <span>Amount (BX)</span>
                    <span>Total (USDT)</span>
                </div>

                <div class="market-empty">
                    Order book data unavailable
                </div>
            `;

            return;
        }

        const maxAmount = Math.max(
            ...asks.map(row => row.amount),
            ...bids.map(row => row.amount),
            1
        );

        const renderRows = (rows, side) => {

            let total = 0;

            return rows.map(row => {

                total += row.amount;

                const width = Math.min(
                    100,
                    row.amount / maxAmount * 100
                );

                return `
                    <div class="orderbook-row ${side}">
                        <span class="orderbook-price">
                            ${format(row.price, 8)}
                        </span>

                        <span class="orderbook-amount">
                            ${format(row.amount, 6)}
                        </span>

                        <span class="orderbook-total">
                            ${format(total * row.price, 4)}
                        </span>

                        <span class="orderbook-depth"
                              style="width:${width}%">
                        </span>
                    </div>
                `;

            }).join("");

        };

        const bestAsk = asks.length
            ? Math.min(...asks.map(row => row.price))
            : 0;

        const bestBid = bids.length
            ? Math.max(...bids.map(row => row.price))
            : 0;

        this.spread = bestAsk > 0 && bestBid > 0
            ? ((bestAsk - bestBid) / bestAsk) * 100
            : 0;

        grid.innerHTML = `
            <div class="orderbook-heading">
                <span>Price (USDT)</span>
                <span>Amount (BX)</span>
                <span>Total (USDT)</span>
            </div>

            <div class="orderbook-asks">
                ${renderRows(asks, "ask")}
            </div>

            <div class="orderbook-spread">
                <span>${this.displayPair}</span>
                <strong>${format(this.price || this.referencePrice, 4)}</strong>
            </div>

            <div class="orderbook-bids">
                ${renderRows(bids, "bid")}
            </div>
        `;

        grid.classList.add("orderbook-enhanced");

        if ($("spread")) {
            $("spread").textContent =
                this.spread.toFixed(4) + "%";
        }

        this.updateIntel();

    },

    /* =====================================================
       MARKET STATS
    ===================================================== */

    async loadStats(generation = this.generation) {

        const response = await this.apiGet(
            CONFIG.endpoints.stats,
            {
                pair: this.pair
            }
        );

        if (
            generation !== this.generation ||
            this.destroyed
        ) return;

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

    updateStats() {

        const displayPrice =
            this.price > 0
                ? this.price
                : this.referencePrice;

        if ($("marketPrice")) {
            $("marketPrice").textContent =
                format(displayPrice, 8);
        }

        if ($("marketVolume")) {
            $("marketVolume").textContent =
                "$" + Math.round(this.volume).toLocaleString();
        }

        if ($("marketChange")) {

            const change = this.change !== 0
                ? this.change
                : this.prevPrice > 0
                    ? (
                        (this.price - this.prevPrice) /
                        this.prevPrice
                    ) * 100
                    : 0;

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

        if ($("execPrice")) {
            $("execPrice").value =
                format(displayPrice, 8);
        }

        if ($("marketTooltip")) {
            $("marketTooltip").textContent =
                `${this.displayPair} ${format(displayPrice, 8)} USDT`;
        }

        this.updateOrderTotal();
        this.updateIntel();

    },

    /* =====================================================
       TRADES
    ===================================================== */

    async refreshTrades() {

        const generation = this.generation;

        try {

            const response = await this.apiGet(
                CONFIG.endpoints.trades,
                {
                    pair: this.pair,
                    limit: CONFIG.historyLimit
                }
            );

            if (
                generation !== this.generation ||
                this.destroyed
            ) return;

            const data = this.unwrap(response, "trades");

            if (!Array.isArray(data)) {
                throw new Error("INVALID_TRADES_RESPONSE");
            }

            this.trades = data;

            this.renderHistory();

        } catch (error) {

            console.warn("[MARKET TRADES]", error);

            this.showEmptyHistory(
                "Trade history unavailable"
            );

        }

    },

    renderHistory() {

        const grid = $("tradeHistoryGrid");

        if (!grid) return;

        if (!this.trades.length) {
            this.showEmptyHistory("No completed trades");
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

                const timestamp =
                    trade.time ||
                    trade.timestamp ||
                    trade.createdAt;

                const time = timestamp
                    ? new Date(timestamp).toLocaleTimeString()
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

    showEmptyHistory(message) {

        const grid = $("tradeHistoryGrid");

        if (!grid) return;

        grid.innerHTML = `
            <div class="trade-empty">
                ${escapeHTML(message)}
            </div>
        `;

    },

    /* =====================================================
       CANDLES
    ===================================================== */

    async loadCandles() {

        const generation = this.generation;

        try {

            const response = await this.apiGet(
                CONFIG.endpoints.candles,
                {
                    pair: this.pair,
                    timeframe: this.timeframe,
                    limit: 300
                }
            );

            if (
                generation !== this.generation ||
                this.destroyed
            ) return;

            const data = this.unwrap(response, "candles");

            if (!Array.isArray(data)) {
                throw new Error("INVALID_CANDLES_RESPONSE");
            }

            this.candles = data;

            /*
              BXChart V8 currently fetches Binance candles
              internally. It does not expose a method to
              inject Bloxio candles.

              Do not send BX/USDT to Binance as a substitute.
              The chart adapter must be updated separately
              to render these server candles.
            */

            this.dispatch("bloxio:market-candles", {
                pair: this.pair,
                timeframe: this.timeframe,
                candles: this.candles
            });

        } catch (error) {

            console.warn("[MARKET CANDLES]", error);

            this.notify(
                "Market chart data unavailable",
                "warning"
            );

        }

    },

    setTimeframe(timeframe) {

        if (!CONFIG.timeframes.includes(timeframe)) {
            return;
        }

        this.timeframe = timeframe;

        this.loadCandles();

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
       TRADE SIDE
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
       ORDER TYPE
    ===================================================== */

    bindOrderType() {

        document.querySelectorAll("[data-order-type]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    const type = button.dataset.orderType;

                    if (!["limit", "market"].includes(type)) {
                        return;
                    }

                    this.orderType = type;

                    document.querySelectorAll("[data-order-type]")
                        .forEach(item => {
                            item.classList.toggle(
                                "active",
                                item === button
                            );
                        });

                    const priceInput = $("orderPrice");

                    if (priceInput) {
                        priceInput.disabled = type === "market";
                        priceInput.value = type === "market"
                            ? format(this.price || this.referencePrice, 8)
                            : priceInput.value;
                    }

                });

            });

    },

    /* =====================================================
       ORDER FORM
    ===================================================== */

    bindTradeForm() {

        $("orderAmount")?.addEventListener(
            "input",
            () => this.updateOrderTotal()
        );

        $("orderPrice")?.addEventListener(
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

        const price = this.orderType === "market"
            ? this.price
            : number($("orderPrice")?.value) ||
                this.price ||
                this.referencePrice;

        const total = amount * price;

        if ($("orderTotal")) {
            $("orderTotal").value =
                format(total, 8);
        }

        if ($("execPrice")) {
            $("execPrice").value =
                format(price, 8);
        }

        return total;

    },

    /* =====================================================
       EXECUTE ORDER
    ===================================================== */

    async executeTrade() {

        if (this.submitting) return;

        if (!this.requireAuth()) return;

        const amount = number(
            $("orderAmount")?.value
        );

        const price = this.orderType === "limit"
            ? number($("orderPrice")?.value)
            : 0;

        if (amount <= 0) {
            this.notify("Enter a valid BX amount", "error");
            return;
        }

        if (
            this.orderType === "limit" &&
            price <= 0
        ) {
            this.notify("Enter a valid limit price", "error");
            return;
        }

        if (
            this.orderType === "market" &&
            this.price <= 0
        ) {
            this.notify("Live market price unavailable", "error");
            return;
        }

        const button = $("actionBtn");

        this.submitting = true;

        if (button) {
            button.disabled = true;
            button.dataset.previousText = button.textContent;
            button.textContent = "Processing...";
        }

        try {

            const payload = {
                pair: this.pair,
                side: this.tradeSide,
                amount
            };

            let response;

            if (this.orderType === "limit") {

                payload.price = price;

                response = await this.apiPost(
                    CONFIG.endpoints.limitOrder,
                    payload
                );

            } else {

                response = await this.apiPost(
                    CONFIG.endpoints.marketOrder,
                    payload
                );

            }

            this.notify(
                "Order submitted successfully",
                "success"
            );

            this.dispatch("bloxio:order-submitted", {
                pair: this.pair,
                side: this.tradeSide,
                order: response.order || response
            });

            await Promise.allSettled([
                this.refresh(),
                this.refreshTrades()
            ]);

            if ($("orderAmount")) {
                $("orderAmount").value = "";
            }

            this.updateOrderTotal();

        } catch (error) {

            console.error("[MARKET ORDER]", error);

            this.notify(
                error.message || "Order submission failed",
                "error"
            );

        } finally {

            this.submitting = false;

            if (button) {
                button.disabled = false;
                button.textContent =
                    button.dataset.previousText ||
                    (this.tradeSide === "buy" ? "BUY BX" : "SELL BX");
            }

        }

    },

    /* =====================================================
       CANCEL ORDER
    ===================================================== */

    async cancelOrder(orderId) {

        if (!this.requireAuth()) return false;

        const id = Number(orderId);

        if (!Number.isInteger(id) || id <= 0) {
            this.notify("Invalid order ID", "error");
            return false;
        }

        try {

            await this.apiPost(
                CONFIG.endpoints.cancel,
                {
                    orderId: id
                }
            );

            this.notify("Order cancelled", "success");

            await this.refresh();

            return true;

        } catch (error) {

            this.notify(
                error.message || "Cancel failed",
                "error"
            );

            return false;

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

                document.querySelectorAll(".market-asset")
                    .forEach(asset => {

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

        document.querySelectorAll(".market-asset")
            .forEach(asset => {

                asset.addEventListener("click", () => {

                    this.connectPair(
                        asset.dataset.pair
                    );

                });

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

        document.querySelectorAll(".chart-time")
            .forEach(button => {

                button.addEventListener("click", () => {

                    document.querySelectorAll(".chart-time")
                        .forEach(item => {
                            item.classList.remove("active");
                        });

                    button.classList.add("active");

                    const timeframe = map[
                        button.textContent.trim().toUpperCase()
                    ];

                    if (timeframe) {
                        this.setTimeframe(timeframe);
                    }

                });

            });

    },

    /* =====================================================
       MOBILE TABS
    ===================================================== */

    bindMobileTabs() {

        document.querySelectorAll(".market-mobile-tab")
            .forEach(tab => {

                tab.addEventListener("click", () => {

                    document.querySelectorAll(".market-mobile-tab")
                        .forEach(button => {
                            button.classList.remove("active");
                        });

                    tab.classList.add("active");

                    window.BXChart?.resize?.();

                });

            });

    },

    /* =====================================================
       WEBSOCKET
    ===================================================== */

    subscribeWS() {

        if (!window.WS?.on) return;

        const events = [
            "market:price",
            "market:depth",
            "market:trade",
            "market:update"
        ];

        events.forEach(event => {

            const handler = payload => {

                if (!payload || this.destroyed) return;

                const incomingPair = payload.pair;

                if (
                    incomingPair &&
                    this.normalizePair(incomingPair) !== this.pair
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

                    this.trades = this.trades.slice(
                        0,
                        CONFIG.historyLimit
                    );

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
       CONNECTION STATUS
    ===================================================== */

    updateConnectionStatus(status) {

        const element = $("systemStatus");

        if (element) {

            element.dataset.marketStatus = status;

            element.classList.toggle(
                "market-online",
                status === "online"
            );

            element.classList.toggle(
                "market-offline",
                status === "offline"
            );

        }

        const label = $("marketConnectionStatus");

        if (label) {

            const messages = {
                loading: "Connecting...",
                online: "Market Live",
                partial: "Partial Data",
                offline: "Market Offline"
            };

            label.textContent =
                messages[status] || status;

        }

    },

    /* =====================================================
       HEARTBEAT
    ===================================================== */

    startHeartbeat() {

        clearInterval(this.heartbeat);

        this.heartbeat = setInterval(() => {

            if (
                this.destroyed ||
                document.hidden
            ) return;

            this.refresh();
            this.refreshTrades();

        }, CONFIG.refreshInterval);

    },

    /* =====================================================
       VISIBILITY
    ===================================================== */

    bindVisibility() {

        this.visibilityHandler = () => {

            if (
                !document.hidden &&
                this.initialized &&
                !this.destroyed
            ) {

                window.BXChart?.resize?.();

                this.refresh();
                this.refreshTrades();
                this.loadCandles();

            }

        };

        document.addEventListener(
            "visibilitychange",
            this.visibilityHandler
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

        this.dispatch("bloxio:market-message", {
            message,
            type
        });

    },

    dispatch(name, detail = {}) {

        document.dispatchEvent(
            new CustomEvent(name, {
                detail
            })
        );

    },

    /* =====================================================
       DESTROY
    ===================================================== */

    destroy() {

        this.destroyed = true;
        this.initialized = false;

        this.generation++;

        clearInterval(this.heartbeat);

        if (this.visibilityHandler) {
            document.removeEventListener(
                "visibilitychange",
                this.visibilityHandler
            );
        }

        this.listeners.forEach(({ event, handler }) => {
            window.WS?.off?.(event, handler);
        });

        this.listeners = [];

        window.WS?.unsubscribe?.("market");

        console.log("[BLOXIO MARKET] DESTROYED");

    },

    /* =====================================================
       PUBLIC STATE
    ===================================================== */

    getState() {

        return {
            pair: this.pair,
            displayPair: this.displayPair,

            price: this.price,
            referencePrice: this.referencePrice,

            volume: this.volume,
            change: this.change,
            spread: this.spread,

            orderBook: {
                asks: [...this.orderBook.asks],
                bids: [...this.orderBook.bids]
            },

            trades: [...this.trades],
            candles: [...this.candles],

            timeframe: this.timeframe,
            tradeSide: this.tradeSide,

            initialized: this.initialized,
            authenticated: this.isAuthenticated(),

            lastUpdate: this.lastUpdate
        };

    }

};

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
