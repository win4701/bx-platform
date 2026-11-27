/* BLOXIO unified SVG icon adapter — safe when the icon library is not loaded. */
const BLOXIO_ICON = (() => {
  const get = (kind, code, options) => {
    const api = window.BLOXIO_ICONS;
    if (!api) return "";
    const fn = api[kind];
    if (typeof fn !== "function") return "";
    try { return fn.call(api, code, options); } catch (_) { return ""; }
  };
  return Object.freeze({
    token: (code, fallback = "", options = { extension: "png" }) => get("token", code, options) || fallback,
    game: (code, fallback = "") => get("game", code) || fallback,
    casino: (code, fallback = "") => get("casino", code) || fallback,
    commodity: (code, fallback = "") => get("commodity", code) || fallback,
    flag: (code, fallback = "", options = { width: 40 }) => get("flag", code, options) || fallback,
    action: (code, fallback = "") => get("action", code) || fallback
  });
})();


/* =========================================================
   BLOXIO MARKET ENGINE V10.1
   public/bx/market.js
========================================================= */

"use strict";


const BLOXIO_MARKET_PAIRS = Object.freeze((() => {
  const pairs = [];
  const add = (base, quote, group, name, icon, extra = {}) => {
    if (!base || !quote || base === quote) return;
    pairs.push({ base, quote, group, name, icon, ...extra });
  };
  const coinIcon = symbol => `/assets/images/coins/${symbol.toLowerCase()}.png`;
  const companyIcon = symbol => `/assets/images/companies/${symbol.toLowerCase()}.png`;
  const metalIcon = symbol => `/assets/images/commodities/${({
    XAU:"gold",XAG:"silver",XPT:"platinum",XPD:"palladium"
  })[symbol] || symbol.toLowerCase()}.png`;

  add("BX","USDT","core","Bloxio",coinIcon("BX"));
  add("EUBX","USDT","core","Bloxio Euro",coinIcon("EUBX"));
  add("USDC","EUBX","core","USD Coin",coinIcon("USDC"));

  const crypto = [
    ["BTC","Bitcoin"],["ETH","Ethereum"],["BNB","BNB"],["XRP","XRP"],
    ["ADA","Cardano"],["AVAX","Avalanche"],["DOT","Polkadot"],["LINK","Chainlink"],
    ["LTC","Litecoin"],["BCH","Bitcoin Cash"],["TON","Toncoin"],["DOGE","Dogecoin"],
    ["UNI","Uniswap"],["AAVE","Aave"],["MKR","Maker"],["TRX","TRON"]
  ];
  for (const [symbol,name] of crypto) {
    const icon = coinIcon(symbol);
    const quotes = symbol === "BNB"
      ? ["BX","EUBX"]
      : ["USDT","USDC","SOL","BX","EUBX"];
    for (const quote of quotes) add(symbol,quote,"crypto",name,icon);
  }

  const platformAssets = [
    ...crypto.map(([symbol]) => symbol),
    "STR","USDT","USDC","TUSD","DAI","SOL","PI","ZEC","DASH","XMR",
    "ATOM","ARB","APT","FIL","HBAR","ICP","NEAR","NEO","OP","POL","SUI",
    "VET","ETC","XLM","ALGO","XTZ","FLOW","WAVES","KCS","CAKE","SNX",
    "1INCH","YFI","KSM","CHZ","APE","PEPE","SHIB","BONK","BAT","ENJ",
    "INJ","MASK","GMX","ICX","QTUM","HT","BGB"
  ];
  for (const symbol of [...new Set(platformAssets)].filter(x => !["BX","EUBX","XBC"].includes(x))) {
    const icon = coinIcon(symbol);
    add(symbol,"BX","crypto",symbol,icon);
    add(symbol,"EUBX","crypto",symbol,icon);
  }

  const companies = [
    ["AMZN","Amazon"],["AAPL","Apple"],["BABA","Alibaba"],["COIN","Coinbase"],
    ["GOOGL","Google"],["INTC","Intel"],["META","Meta"],["MSFT","Microsoft"],
    ["NFLX","Netflix"],["NVDA","Nvidia"],["PLTR","Palantir"],["TSLA","Tesla"]
  ];
  for (const [symbol,name] of companies) {
    const icon = companyIcon(symbol);
    add(symbol,"BX","companies",name,icon);
    add(symbol,"EUBX","companies",name,icon);
  }

  const commodities = [
    ["XAU","Gold"],["XAG","Silver"],["XPT","Platinum"],["XPD","Palladium"],
    ["COPPER","Copper"],["OIL","Crude Oil"],["BRENT","Brent Oil"],["NG","Natural Gas"],
    ["RHODIUM","Rhodium"],["IRIDIUM","Iridium"]
  ];
  for (const [symbol,name] of commodities) {
    const icon = metalIcon(symbol);
    add(symbol,"BX","commodities",name,icon);
    add(symbol,"EUBX","commodities",name,icon);
  }

  const fanTokens = [
    ["PSG","Paris Saint-Germain","psg.png"],["BAR","Barcelona","bar.png"],
    ["JUV","Juventus","juv.png"],["CITY","Manchester City","city.png"],
    ["AFC","Arsenal","afc.png"],["ACM","AC Milan","acm.jpg"],
    ["INTER","Inter Milan","inter.jpg"],["ATM","Atletico Madrid","atm.png"],
    ["ASR","AS Roma","asr.jpg"],["GAL","Galatasaray","gal.jpg"],
    ["TRA","Trabzonspor","tra.jpg"],["LAZIO","Lazio","lazio.png"]
  ];
  for (const [symbol,name,file] of fanTokens) {
    const icon = `/assets/images/fan-tokens/${file}`;
    for (const quote of ["BX","EUBX","USDT","USDC"]) add(symbol,quote,"fan-tokens",name,icon);
  }

  return [...new Map(pairs.map(pair => [`${pair.base}_${pair.quote}`,pair])).values()];
})());


(function () {

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
        "1h", "4h", "1d", "1w", "1M"
    ]
};

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
    fixedReference: false,

    volume: 0,
    change: 0,
    spread: 0,

    tradeSide: "buy",
    orderType: "limit",
    timeframe: "1m",

    orderBook: { asks: [], bids: [] },
    trades: [],
    candles: [],

    heartbeat: null,
    listeners: [],
    generation: 0,

    lastUpdate: null,
    lastError: null,
    pairTickerCache: Object.create(null),

    marketMode: "spot",
    marketCategory: "crypto",

    init() {

        if (this.initialized) {
            this.refresh();
            return true;
        }

        this.initialized = true;
        this.destroyed = false;

        this.restoreSavedPair();

        this.renderBloxioPairs();
        this.renderQuickPairs();
        this.bindBloxioMarketFilters();
        this.bindQuoteDropdown();
        this.bindAssets();
        this.bindSearch();
        this.bindPairSelect();
        this.bindTradeTabs();
        this.bindTradeForm();
        this.bindBloxioTradeInputs();
        this.bindChartToolbar();
        this.bindMobileTabs();
        this.bindOrderTypeSelect();
        this.bindVisibility();
        this.bindTradeModeTabs();
        this.bindTradeViewTabs();

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

        console.log("[BLOXIO MARKET] V10.1 READY");
        return true;
    },

    restoreSavedPair() {
        let stored = null;
        try { stored = localStorage.getItem("bloxio:selectedMarketPair"); } catch (_) {}
        if (!stored) return;
        const normalized = this.normalizePair(stored);
        const exists = BLOXIO_MARKET_PAIRS.some(p => `${p.base}_${p.quote}` === normalized);
        if (exists) {
            this.pair = normalized;
            this.displayPair = normalized.replace("_", "/");
        }
    },

    assetIconPath(symbol, group = "") {
        const code = String(symbol || "").toUpperCase();
        const pair = BLOXIO_MARKET_PAIRS.find(item => item.base === code);
        if (pair?.icon) return pair.icon;

        const aliases = { XAU: "gold", XAG: "silver", XPT: "platinum", XPD: "palladium" };
        const key = aliases[code] || code.toLowerCase();
        const folder = group === "commodities" ? "commodities" : "coins";

        const icons = window.BLOXIO_ICONS;
        if (icons) {
            return folder === "commodities"
                ? BLOXIO_ICON.commodity(code, `/assets/images/commodities/${key}.png`)
                : BLOXIO_ICON.token(code, `/assets/images/${folder}/${key}.png`);
        }
        return `/assets/images/${folder}/${key}.png`;
    },

    assetMarkup(symbol, name, icon) {
        const src = icon || this.assetIconPath(symbol);
        const safeSymbol = escapeHTML(symbol);
        return `<span class="bx-token-icon"><img src="${src}" alt="${safeSymbol}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${safeSymbol.slice(0,3)}</span></span>`;
    },

    renderBloxioPairs() {
        const base = $("marketBaseAssets");
        const pairs = $("marketPairAssets");
        if (!base || !pairs) return;

        const categories = [
            { id: "crypto", label: "Crypto" },
            { id: "fan-tokens", label: "Fan Tokens" },
            { id: "companies", label: "Companies" },
            { id: "commodities", label: "Commodities" }
        ];
        const activeCategory = categories.some(x => x.id === this.marketCategory) ? this.marketCategory : "crypto";
        this.marketCategory = activeCategory;

        const all = BLOXIO_MARKET_PAIRS.filter(pair =>
            pair.group === activeCategory ||
            (activeCategory === "crypto" && (pair.group === "core" || pair.group === "crypto"))
        );
        const quoteFilter = $("bxMarketQuote")?.value || "ALL";
        const visible = all.filter(pair => quoteFilter === "ALL" || pair.quote === quoteFilter);
        const query = ($("marketSearch")?.value || "").trim().toLowerCase();
        const filtered = visible.filter(pair => `${pair.base}${pair.quote} ${pair.name}`.toLowerCase().includes(query));

        base.innerHTML = categories.map(category =>
            `<button type="button" class="bx-market-category ${activeCategory === category.id ? "active" : ""}" data-bx-category="${category.id}" aria-pressed="${activeCategory === category.id}">${category.label}</button>`
        ).join("");

        pairs.innerHTML = filtered.map(pair => {
            const pairKey = `${pair.base}_${pair.quote}`;
            const selected = this.pair === pairKey;
            const cached = this.pairTickerCache[pairKey] || {};
            const shownPrice = cached.price > 0 ? format(cached.price, 8) : "—";
            const changeValue = Number.isFinite(cached.change) ? cached.change : null;
            const shownChange = changeValue === null ? "—" : `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(2)}%`;
            const changeClass = changeValue === null ? "is-neutral" : changeValue > 0 ? "is-positive" : changeValue < 0 ? "is-negative" : "is-neutral";
            const shownVolume = cached.volume > 0 ? this.formatMarketVolume(cached.volume) : "—";
            const displayName = pair.name && pair.name.toLowerCase() !== pair.base.toLowerCase() ? pair.name : pair.base;
            const displayIcon = pair.icon || this.assetIconPath(pair.base, pair.group);
            const categoryLabel = ({
                commodities: "Commodity",
                "fan-tokens": "Fan Token",
                companies: "Stock",
                core: "Crypto",
                crypto: "Crypto"
            })[pair.group] || pair.group;
            return `<button type="button" class="market-asset bx-market-asset ${selected ? "active" : ""}" data-pair="${pairKey}" aria-pressed="${selected}">
                <span class="bx-market-card-identity">
                    ${this.assetMarkup(pair.base, displayName, displayIcon)}
                    <span class="bx-token-copy">
                        <strong>${escapeHTML(displayName)}</strong>
                        <small>${escapeHTML(pair.base)}/${escapeHTML(pair.quote)} · ${categoryLabel}${this.marketMode === "futures" ? " · Perpetual" : ""}</small>
                    </span>
                </span>
                <span class="bx-market-card-metrics">
                    <span class="bx-market-metric bx-market-price-cell">
                        <small>Last Price</small>
                        <strong data-market-last="${pairKey}">${shownPrice}</strong>
                    </span>
                    <span class="bx-market-metric bx-market-change-cell ${changeClass}">
                        <small>24h Change</small>
                        <strong data-market-change="${pairKey}">${shownChange}</strong>
                    </span>
                    <span class="bx-market-metric bx-market-volume-cell">
                        <small>Volume</small>
                        <strong data-market-volume="${pairKey}">${shownVolume}</strong>
                    </span>
                </span>
            </button>`;
        }).join("") || `<p class="market-empty">No markets match your filters.</p>`;

        const empty = $("bxMarketEmpty");
        if (empty) empty.hidden = filtered.length > 0;

        this.loadPairTickers(filtered);

        const title = $("marketPairsTitle");
        const count = $("marketPairsCount");
        if (title) title.textContent = `${this.marketMode === "futures" ? "Futures" : "Spot"} markets`;
        if (count) count.textContent = `${filtered.length} pairs`;
        const description = $("marketCategoryDescription");
        if (description) description.textContent = this.marketMode === "futures"
            ? "Perpetual contract market list. Order execution depends on enabled backend support."
            : ({
                crypto: "Digital assets and spot trading pairs",
                "fan-tokens": "12 football club Fan Tokens",
                companies: "Company markets quoted only in BX and EUBX",
                commodities: "Precious metals and energy markets, including Rhodium and Iridium"
            })[this.marketCategory] || "Market listings";
    },

    renderQuickPairs() {
        const container = $("tradePairQuickList");
        if (!container) return;
        const quick = ["BX_USDT", "BTC_USDT", "ETH_USDT", "SOL_USDT", "BNB_BX"]
            .map(key => BLOXIO_MARKET_PAIRS.find(p => `${p.base}_${p.quote}` === key))
            .filter(Boolean);
        container.innerHTML = quick.map(pair => {
            const key = `${pair.base}_${pair.quote}`;
            const selected = this.pair === key;
            const icon = pair.icon || this.assetIconPath(pair.base, pair.group);
            return `<button type="button" class="bx-quick-pair ${selected ? "active" : ""}" data-pair="${key}" aria-pressed="${selected}">
                <img src="${icon}" alt="${escapeHTML(pair.base)}" onerror="this.hidden=true"/>
                <span>${escapeHTML(pair.base)}/${escapeHTML(pair.quote)}</span>
            </button>`;
        }).join("");
        if (container.dataset.bound === "1") return;
        container.dataset.bound = "1";
        container.addEventListener("click", event => {
            const btn = event.target.closest("[data-pair]");
            if (!btn) return;
            this.connectPair(btn.dataset.pair);
        });
    },

    formatMarketVolume(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return "—";
        return new Intl.NumberFormat(undefined, {
            notation: "compact",
            maximumFractionDigits: 2
        }).format(amount);
    },

    async loadPairTickers(pairs = []) {
        const requested = (Array.isArray(pairs) ? pairs : []).filter(pair => {
            const key = `${pair.base}_${pair.quote}`;
            return !this.pairTickerCache[key]?.loaded;
        });
        await Promise.allSettled(requested.map(async pair => {
            const key = `${pair.base}_${pair.quote}`;
            try {
                const response = await this.apiGet(CONFIG.endpoints.price, { pair: key });
                const data = this.unwrap(response, "price");
                const record = data && typeof data === "object" ? data : { price: data };
                const price = number(record.price ?? record.last ?? record.lastPrice);
                const rawChange = record.change24h ?? record.change_percent ?? record.change ?? record.priceChangePercent;
                const rawVolume = record.volume24h ?? record.quoteVolume24h ?? record.quote_volume ?? record.volume ?? record.baseVolume;
                const changeValue = rawChange == null || rawChange === "" ? NaN : Number(rawChange);
                const volumeValue = rawVolume == null || rawVolume === "" ? NaN : Number(rawVolume);

                this.pairTickerCache[key] = {
                    price: price > 0 ? price : 0,
                    change: Number.isFinite(changeValue) ? changeValue : NaN,
                    volume: Number.isFinite(volumeValue) && volumeValue > 0 ? volumeValue : 0,
                    loaded: true
                };

                const priceNode = document.querySelector(`[data-market-last="${key}"]`);
                const changeNode = document.querySelector(`[data-market-change="${key}"]`);
                const volumeNode = document.querySelector(`[data-market-volume="${key}"]`);
                if (priceNode) priceNode.textContent = price > 0 ? format(price, 8) : "—";
                if (changeNode) {
                    changeNode.textContent = Number.isFinite(changeValue)
                        ? `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(2)}%`
                        : "—";
                    changeNode.parentElement?.classList.toggle("is-positive", Number.isFinite(changeValue) && changeValue > 0);
                    changeNode.parentElement?.classList.toggle("is-negative", Number.isFinite(changeValue) && changeValue < 0);
                    changeNode.parentElement?.classList.toggle("is-neutral", !Number.isFinite(changeValue) || changeValue === 0);
                }
                if (volumeNode) volumeNode.textContent = Number.isFinite(volumeValue) && volumeValue > 0
                    ? this.formatMarketVolume(volumeValue)
                    : "—";
            } catch (error) {
                this.pairTickerCache[key] = { price: 0, change: NaN, volume: 0, loaded: true };
            }
        }));
    },

    bindBloxioMarketFilters() {
        document.querySelectorAll("[data-bx-market-mode]").forEach(button => {
            if (button.dataset.bound === "1") return;
            button.dataset.bound = "1";
            button.addEventListener("click", () => {
                const mode = button.dataset.bxMarketMode;
                if (!["spot", "futures"].includes(mode)) return;
                this.marketMode = mode;
                document.querySelectorAll("[data-bx-market-mode]").forEach(tab => {
                    const active = tab === button;
                    tab.classList.toggle("active", active);
                    tab.setAttribute("aria-pressed", String(active));
                });
                this.renderBloxioPairs();
                window.BXChart?.resize?.();
            });
        });

        document.querySelectorAll("[data-market-category]").forEach(button => {
            if (button.dataset.bound === "1") return;
            button.dataset.bound = "1";
            button.addEventListener("click", () => {
                this.marketCategory = button.dataset.marketCategory || "crypto";
                document.querySelectorAll("[data-market-category]").forEach(tab => {
                    const active = tab === button;
                    tab.classList.toggle("active", active);
                    tab.setAttribute("aria-selected", String(active));
                });
                this.renderBloxioPairs();
            });
        });

        $("bxMarketQuote")?.addEventListener("change", () => {
            this.syncQuoteTriggerLabel();
            this.renderBloxioPairs();
        });

        $("marketBaseAssets")?.addEventListener("click", event => {
            const button = event.target.closest("[data-bx-category]");
            if (!button) return;
            this.marketCategory = button.dataset.bxCategory;
            document.querySelectorAll("[data-market-category]").forEach(tab => {
                const active = tab.dataset.marketCategory === this.marketCategory;
                tab.classList.toggle("active", active);
                tab.setAttribute("aria-selected", String(active));
            });
            this.renderBloxioPairs();
        });
    },

    quoteIconMarkup(symbol) {
        const code = String(symbol || "ALL").toUpperCase();
        if (code === "ALL") return `<span class="bx-quote-all-icon" aria-hidden="true">A</span>`;
        return this.assetMarkup(code, code, this.assetIconPath(code));
    },

    syncQuoteTriggerLabel() {
        const select = $("bxMarketQuote");
        const label = $("bxQuoteValue");
        const currentIcon = $("bxQuoteCurrentIcon");
        if (!select) return;
        const symbol = String(select.value || "ALL").toUpperCase();
        if (label) label.textContent = symbol === "ALL" ? "All" : symbol;
        if (currentIcon) currentIcon.innerHTML = this.quoteIconMarkup(symbol);
    },

    bindQuoteDropdown() {
        const trigger = $("bxQuoteTrigger");
        const menu = $("bxQuoteMenu");
        const select = $("bxMarketQuote");
        if (!trigger || !menu || !select || trigger.dataset.bound === "1") return;
        trigger.dataset.bound = "1";

        const closeMenu = () => {
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        };
        const buildMenu = () => {
            menu.innerHTML = Array.from(select.options).map(opt => {
                const symbol = String(opt.value || "ALL").toUpperCase();
                const icon = this.quoteIconMarkup(symbol);
                const label = symbol === "ALL" ? "All" : symbol;
                const selected = opt.value === select.value;
                return `<button type="button" role="option" data-value="${escapeHTML(opt.value)}" class="bx-quote-option ${selected ? "selected" : ""}" aria-selected="${selected}">
                    <span class="bx-quote-option-icon">${icon}</span>
                    <strong>${escapeHTML(label)}</strong>
                    <span class="bx-quote-option-check" aria-hidden="true">✓</span>
                </button>`;
            }).join("");
        };

        this.syncQuoteTriggerLabel();
        buildMenu();
        trigger.addEventListener("click", () => {
            const shouldOpen = menu.hidden;
            menu.hidden = !shouldOpen;
            trigger.setAttribute("aria-expanded", String(shouldOpen));
        });
        menu.addEventListener("click", event => {
            const option = event.target.closest("[data-value]");
            if (!option) return;
            select.value = option.dataset.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            buildMenu();
            closeMenu();
        });
        document.addEventListener("click", event => {
            if (!menu.hidden && !event.target.closest("#bxQuotePicker")) closeMenu();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !menu.hidden) {
                closeMenu();
                trigger.focus();
            }
        });
    },

    bindPairSelect() {
        const select = $("tradePairSelect");
        if (!select || select.dataset.bound === "1") return;
        select.dataset.bound = "1";

        const key = this.pair;
        if (Array.from(select.options).some(o => o.value === key)) select.value = key;

        select.addEventListener("change", () => {
            this.connectPair(select.value);
        });
    },

    isAuthenticated() {
        if (window.AUTH?.state?.authenticated === true) return true;
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
        if (this.isAuthenticated()) return true;
        this.notify("Login required to place an order", "warning");
        if (window.AUTH?.openAuth) {
            window.AUTH.openAuth("login");
        } else if (window.AUTH?.showAuth) {
            window.AUTH.showAuth("login");
        } else {
            $("headerLoginBtn")?.click();
        }
        return false;
    },

    async apiGet(endpoint, params = {}) {
        if (!window.API?.get) throw new Error("API_UNAVAILABLE");
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.set(key, String(value));
            }
        });
        const url = endpoint + (query.toString() ? "?" + query.toString() : "");
        const response = await window.API.get(url, { auth: false, cache: false });
        return this.unwrapResponse(response);
    },

    async apiPost(endpoint, body) {
        if (!window.API?.post) throw new Error("API_UNAVAILABLE");
        const response = await window.API.post(endpoint, body, { auth: true, cache: false });
        return this.unwrapResponse(response);
    },

    unwrapResponse(response) {
        if (!response || typeof response !== "object") throw new Error("INVALID_SERVER_RESPONSE");
        if (response.error) {
            const message = typeof response.error === "string" ? response.error : response.error.message;
            throw new Error(message || "REQUEST_FAILED");
        }
        if (response.success === false) throw new Error(response.message || "REQUEST_FAILED");
        return response;
    },

    unwrap(response, key) {
        let data = response;
        if (data?.data !== undefined) data = data.data;
        if (key && data && data[key] !== undefined) return data[key];
        return data;
    },

    normalizePair(pair) {
        const value = String(pair || CONFIG.displayPair).toUpperCase().trim().replace("/", "_");
        if (value === "BXUSDT" || value === "BX_USDT") return "BX_USDT";
        if (value === "EUBXUSDT" || value === "EUBX_USDT") return "EUBX_USDT";
        return value;
    },

    connectPair(pair) {
        const normalized = this.normalizePair(pair);
        const exists = BLOXIO_MARKET_PAIRS.some(p => `${p.base}_${p.quote}` === normalized);
        if (!exists) {
            this.notify(`Unknown market pair: ${pair}`, "error");
            return;
        }

        if (normalized === this.pair) {
            this.refresh();
            return;
        }

        this.pair = normalized;
        this.displayPair = normalized.replace("_", "/");
        this.fixedReference = false;
        try { localStorage.setItem("bloxio:selectedMarketPair", this.displayPair); } catch {}

        const select = $("tradePairSelect");
        if (select && Array.from(select.options).some(o => o.value === normalized)) {
            select.value = normalized;
        }

        window.BXChart?.setPair?.(this.pair);

        this.generation++;

        this.price = 0;
        this.prevPrice = 0;
        this.volume = 0;
        this.change = 0;
        this.orderBook = { asks: [], bids: [] };
        this.trades = [];
        this.candles = [];

        this.updatePairUI();
        this.renderOrderBook();
        this.renderHistory();
        this.renderQuickPairs();

        document.querySelectorAll("#marketPairAssets .market-asset").forEach(btn => {
            const active = btn.dataset.pair === normalized;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-pressed", String(active));
        });

        // ✅ V10.1 — notify listeners (trade.js) that the active pair changed.
        this.dispatch("bloxio:market-pair-changed", {
            pair: this.pair,
            displayPair: this.displayPair
        });

        this.refresh();
        this.refreshTrades();
        this.loadCandles();
    },

    updatePairUI() {
        if ($("marketPair")) $("marketPair").textContent = this.displayPair;

        document.querySelectorAll(".market-asset").forEach(button => {
            button.classList.toggle("active", this.normalizePair(button.dataset.pair) === this.pair);
        });

        const [base, quote] = this.displayPair.split("/");
        if ($("bxBaseSymbol")) $("bxBaseSymbol").textContent = base || "BX";
        if ($("bxQuoteSymbol")) $("bxQuoteSymbol").textContent = quote || "USDT";
        if ($("bxTotalSymbol")) $("bxTotalSymbol").textContent = quote || "USDT";
        if ($("tradeTitle")) $("tradeTitle").textContent = `${base || "BX"} Trading`;

        const baseIcon = $("tradeBaseIcon");
        if (baseIcon) {
            const icon = this.assetIconPath(base || "BX");
            baseIcon.src = icon;
            baseIcon.alt = base || "BX";
        }

        if ($("tradeContractLabel")) {
            $("tradeContractLabel").textContent = this.marketMode === "futures" ? "Perpetual" : "Spot";
        }

        this.refreshActionButton();
    },

    async refresh() {
        if (this.destroyed || this.loading) return;
        this.loading = true;
        const generation = this.generation;

        const tasks = this.fixedReference
            ? [this.loadPrice(generation)]
            : [
                this.loadPrice(generation),
                this.loadOrderBook(generation),
                this.loadStats(generation)
            ];

        if (this.fixedReference) {
            this.orderBook = { asks: [], bids: [] };
            this.trades = [];
            this.volume = 0;
            this.change = 0;
            this.renderOrderBook();
            this.showEmptyHistory("Reference asset");
        }

        const results = await Promise.allSettled(tasks);
        if (generation !== this.generation) {
            this.loading = false;
            return;
        }

        const failed = results.some(result => result.status === "rejected");
        this.updateConnectionStatus(failed ? (this.price > 0 ? "partial" : "offline") : "online");
        this.loading = false;
    },

    async loadPrice(generation = this.generation) {
        const response = await this.apiGet(CONFIG.endpoints.price, { pair: this.pair });
        if (generation !== this.generation || this.destroyed) return;
        const data = this.unwrap(response, "price");
        const price = number(typeof data === "object" ? data.price : data);
        if (price <= 0) throw new Error("INVALID_MARKET_PRICE");
        this.prevPrice = this.price || price;
        this.price = price;
        this.lastUpdate = Date.now();
        this.lastError = null;
        this.updateStats();
    },

    async loadOrderBook(generation = this.generation) {
        const response = await this.apiGet(CONFIG.endpoints.orderbook, { pair: this.pair });
        if (generation !== this.generation || this.destroyed) return;
        const data = this.unwrap(response, "depth");
        const book = data?.depth || data;
        this.orderBook.asks = Array.isArray(book?.asks) ? book.asks : [];
        this.orderBook.bids = Array.isArray(book?.bids) ? book.bids : [];
        this.orderBookDemo = false;
        this.renderOrderBook();
        this.updateIntel();
    },

    normalizeBookRows(rows) {
        if (!Array.isArray(rows)) return [];
        return rows.map(row => ({
            price: number(Array.isArray(row) ? row[0] : row.price),
            amount: number(Array.isArray(row) ? row[1] : (row.amount ?? row.quantity))
        })).filter(row => row.price > 0 && row.amount > 0);
    },

    renderOrderBook() {
        const grid = $("orderBookGrid");
        if (!grid) return;

        const asks = this.normalizeBookRows(this.orderBook.asks)
            .sort((a, b) => b.price - a.price)
            .slice(0, CONFIG.depthLimit);

        const bids = this.normalizeBookRows(this.orderBook.bids)
            .sort((a, b) => b.price - a.price)
            .slice(0, CONFIG.depthLimit);

        if (!asks.length && !bids.length && !this.orderBookDemo) {
            const mid = number(this.price || this.referencePrice || 0);
            if (mid > 0) {
                const step = Math.max(mid * 0.00035, 0.00000001);
                this.orderBook.asks = Array.from({ length: 10 }, (_, i) => ({
                    price: mid + step * (i + 1),
                    amount: Number((0.18 + ((i * 7) % 13) * 0.11).toFixed(6))
                }));
                this.orderBook.bids = Array.from({ length: 10 }, (_, i) => ({
                    price: Math.max(mid - step * (i + 1), mid * 0.5),
                    amount: Number((0.22 + ((i * 5) % 11) * 0.13).toFixed(6))
                }));
                this.orderBookDemo = true;
                return this.renderOrderBook();
            }
        }

        if (!asks.length && !bids.length) {
            grid.innerHTML = `
                <div class="orderbook-heading">
                    <span>Price</span><span>Amount</span><span>Total</span>
                </div>
                <div class="market-empty">Order book data unavailable</div>
            `;
            return;
        }

        const [base, quote] = this.displayPair.split("/");
        const maxAmount = Math.max(...asks.map(r => r.amount), ...bids.map(r => r.amount), 1);

        const renderRows = (rows, side) => {
            let total = 0;
            return rows.map(row => {
                total += row.amount;
                const width = Math.min(100, row.amount / maxAmount * 100);
                return `
                    <div class="orderbook-row ${side}">
                        <span class="orderbook-price">${format(row.price, 8)}</span>
                        <span class="orderbook-amount">${format(row.amount, 6)}</span>
                        <span class="orderbook-total">${format(total * row.price, 4)}</span>
                        <span class="orderbook-depth" style="width:${width}%"></span>
                    </div>
                `;
            }).join("");
        };

        const bestAsk = asks.length ? Math.min(...asks.map(r => r.price)) : 0;
        const bestBid = bids.length ? Math.max(...bids.map(r => r.price)) : 0;
        this.spread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestAsk) * 100 : 0;

        grid.innerHTML = `
            <div class="orderbook-heading">
                <span>Price (${escapeHTML(quote)})</span>
                <span>Amount (${escapeHTML(base)})</span>
                <span>Total (${escapeHTML(quote)})</span>
            </div>
            <div class="orderbook-asks">${renderRows(asks, "ask")}</div>
            <div class="orderbook-spread">
                <span>${escapeHTML(this.displayPair)}${this.orderBookDemo ? " · DEMO" : ""}</span>
                <strong>${format(this.price || this.referencePrice, 4)}</strong>
            </div>
            <div class="orderbook-bids">${renderRows(bids, "bid")}</div>
        `;
        grid.classList.add("orderbook-enhanced");

        if ($("spread")) $("spread").textContent = this.spread.toFixed(4) + "%";
        this.updateIntel();

        // ✅ V10.1 — notify listeners of the current depth snapshot.
        this.dispatch("bloxio:market-depth", {
            pair: this.pair,
            displayPair: this.displayPair,
            asks: asks.map(r => [r.price, r.amount]),
            bids: bids.map(r => [r.price, r.amount]),
            spread: this.spread,
            demo: Boolean(this.orderBookDemo)
        });
    },

    async loadStats(generation = this.generation) {
        const response = await this.apiGet(CONFIG.endpoints.stats, { pair: this.pair });
        if (generation !== this.generation || this.destroyed) return;
        const data = this.unwrap(response, "stats");
        if (!data || typeof data !== "object") return;
        this.volume = number(data.volume ?? data.quoteVolume ?? data.totalVolume);
        if (data.change !== undefined) this.change = number(data.change);
        this.updateStats();
    },

    updateStats() {
        const displayPrice = this.price > 0 ? this.price : this.referencePrice;
        if ($("marketPrice")) $("marketPrice").textContent = format(displayPrice, 8);

        if ($("marketVolume")) {
            $("marketVolume").textContent = "$" + Math.round(this.volume).toLocaleString();
        }

        if ($("marketChange")) {
            const change = this.change !== 0
                ? this.change
                : this.prevPrice > 0
                    ? ((this.price - this.prevPrice) / this.prevPrice) * 100
                    : 0;
            $("marketChange").textContent = change.toFixed(2) + "%";
            $("marketChange").classList.toggle("positive", change >= 0);
            $("marketChange").classList.toggle("negative", change < 0);
        }

        if (this.orderType === "market" && $("orderPrice")) {
            $("orderPrice").value = format(displayPrice, 8);
        }

        if ($("marketTooltip")) {
            $("marketTooltip").textContent = `${this.displayPair} ${format(displayPrice, 8)}`;
        }

        this.updateOrderTotal();
        this.updateIntel();

        // ✅ V10.1 — notify listeners (trade.js) of the latest display price.
        this.dispatch("bloxio:market-price", {
            pair: this.pair,
            displayPair: this.displayPair,
            price: displayPrice
        });
    },

    async refreshTrades() {
        const generation = this.generation;
        try {
            const response = await this.apiGet(CONFIG.endpoints.trades, { pair: this.pair, limit: CONFIG.historyLimit });
            if (generation !== this.generation || this.destroyed) return;
            const data = this.unwrap(response, "trades");
            if (!Array.isArray(data)) throw new Error("INVALID_TRADES_RESPONSE");
            this.trades = data;
            this.renderHistory();
        } catch (error) {
            console.warn("[MARKET TRADES]", error);
            this.showEmptyHistory("Trade history unavailable");
        }
    },

    renderHistory() {
        const grid = $("tradeHistoryGrid");
        if (!grid) return;
        if (!this.trades.length) {
            this.showEmptyHistory("No completed trades");
            return;
        }
        grid.innerHTML = this.trades.slice(0, CONFIG.historyLimit).map(trade => {
            const side = String(trade.side || trade.type || "buy").toLowerCase();
            const price = number(trade.price);
            const amount = number(trade.amount ?? trade.quantity);
            const timestamp = trade.time || trade.timestamp || trade.createdAt;
            const time = timestamp ? new Date(timestamp).toLocaleTimeString() : "--";
            return `
                <div class="trade-row ${side}">
                    <span>${escapeHTML(time)}</span>
                    <span>${escapeHTML(side.toUpperCase())}</span>
                    <span>${format(price, 8)}</span>
                    <span>${format(amount, 6)}</span>
                </div>
            `;
        }).join("");

        // ✅ V10.1 — notify listeners of the latest trades snapshot.
        this.dispatch("bloxio:market-trades", {
            pair: this.pair,
            displayPair: this.displayPair,
            trades: this.trades.slice(0, CONFIG.historyLimit)
        });
    },

    showEmptyHistory(message) {
        const grid = $("tradeHistoryGrid");
        if (!grid) return;
        grid.innerHTML = `<div class="trade-empty">${escapeHTML(message)}</div>`;
    },

    async loadCandles() {
        const generation = this.generation;
        try {
            const response = await this.apiGet(CONFIG.endpoints.candles, {
                pair: this.pair,
                timeframe: this.timeframe,
                limit: 300
            });
            if (generation !== this.generation || this.destroyed) return;
            const data = this.unwrap(response, "candles");
            if (!Array.isArray(data)) throw new Error("INVALID_CANDLES_RESPONSE");
            this.candles = data;
            this.dispatch("bloxio:market-candles", {
                pair: this.pair,
                timeframe: this.timeframe,
                currency: this.displayPair.split("/")[1] || "USDT",
                fixedReference: false,
                candles: this.candles
            });
        } catch (error) {
            console.warn("[MARKET CANDLES]", error);
            this.notify("Market chart data unavailable", "warning");
        }
    },

    setTimeframe(timeframe) {
        if (!CONFIG.timeframes.includes(timeframe)) return;
        this.timeframe = timeframe;
        window.BXChart?.setTimeframe?.(timeframe);
        this.loadCandles();
    },

    updateIntel() {
        const diff = Math.abs(this.price - this.prevPrice);
        const trend = this.price >= this.prevPrice ? "Bullish" : "Bearish";
        const volatility = diff < 0.001 ? "Low" : diff < 0.01 ? "Medium" : "High";
        const sentiment = diff < 0.001 ? "Stable" : trend;

        if ($("marketTrend")) $("marketTrend").textContent = trend;
        if ($("marketSentiment")) $("marketSentiment").textContent = sentiment;
        if ($("marketVolatility")) $("marketVolatility").textContent = volatility;

        if ($("marketLiquidity")) {
            const depth = this.orderBook.asks.length + this.orderBook.bids.length;
            $("marketLiquidity").textContent = depth > 10 ? "Available" : "Limited";
        }
    },

    bindTradeTabs() {
        $("buyTab")?.addEventListener("click", () => this.setTradeSide("buy"));
        $("sellTab")?.addEventListener("click", () => this.setTradeSide("sell"));
        this.setTradeSide("buy");
    },

    setTradeSide(side) {
        if (!["buy", "sell"].includes(side)) return;
        this.tradeSide = side;
        $("buyTab")?.classList.toggle("active", side === "buy");
        $("sellTab")?.classList.toggle("active", side === "sell");
        this.refreshActionButton();
        this.updateOrderTotal();
    },

    refreshActionButton() {
        const button = $("actionBtn");
        if (!button) return;
        const [base] = this.displayPair.split("/");
        const side = this.tradeSide.toUpperCase();
        button.textContent = `PLACE ${side} ORDER`;
        button.classList.toggle("is-buy", this.tradeSide === "buy");
        button.classList.toggle("is-sell", this.tradeSide === "sell");
    },

    bindOrderTypeSelect() {
        const select = $("bxOrderType");
        if (select && select.dataset.bound !== "1") {
            select.dataset.bound = "1";
            select.addEventListener("change", () => {
                const type = select.value;
                if (!["limit", "market"].includes(type)) return;
                this.orderType = type;
                const priceInput = $("orderPrice");
                if (priceInput) {
                    priceInput.disabled = type === "market";
                    if (type === "market") {
                        priceInput.value = format(this.price || this.referencePrice, 8);
                    }
                }
                this.updateOrderTotal();
            });
        }
    },

    bindTradeForm() {
        $("orderAmount")?.addEventListener("input", () => this.updateOrderTotal());
        $("orderPrice")?.addEventListener("input", () => this.updateOrderTotal());
        $("actionBtn")?.addEventListener("click", () => this.executeTrade());
    },

    bindBloxioTradeInputs() {
        const slider = $("bxTradePercent");
        if (slider && slider.dataset.bound !== "1") {
            slider.dataset.bound = "1";
            slider.addEventListener("input", () => {
                const pct = Number(slider.value) || 0;
                if ($("bxTradeAvailable")) {
                    $("bxTradeAvailable").dataset.percent = String(pct);
                }
            });
        }
    },

    updateOrderTotal() {
        const amount = number($("orderAmount")?.value);
        const price = this.orderType === "market"
            ? this.price
            : number($("orderPrice")?.value) || this.price || this.referencePrice;
        const total = amount * price;

        if ($("orderTotal")) $("orderTotal").value = format(total, 8);
        return total;
    },

    async executeTrade() {
        if (this.submitting) return;

        if (this.marketMode === "futures") {
            this.notify("Futures browsing is enabled, but Futures order execution is not connected to a backend yet.", "warning");
            return;
        }

        if (!this.requireAuth()) return;

        const amount = number($("orderAmount")?.value);
        const price = this.orderType === "limit" ? number($("orderPrice")?.value) : 0;

        if (amount <= 0) { this.notify("Enter a valid amount", "error"); return; }
        if (this.orderType === "limit" && price <= 0) { this.notify("Enter a valid limit price", "error"); return; }
        if (this.orderType === "market" && this.price <= 0) { this.notify("Live market price unavailable", "error"); return; }

        const button = $("actionBtn");
        this.submitting = true;
        if (button) {
            button.disabled = true;
            button.dataset.previousText = button.textContent;
            button.textContent = "Processing...";
        }

        try {
            const payload = { pair: this.pair, side: this.tradeSide, amount };
            let response;
            if (this.orderType === "limit") {
                payload.price = price;
                response = await this.apiPost(CONFIG.endpoints.limitOrder, payload);
            } else {
                response = await this.apiPost(CONFIG.endpoints.marketOrder, payload);
            }

            this.notify("Order submitted successfully", "success");
            this.dispatch("bloxio:order-submitted", {
                pair: this.pair,
                side: this.tradeSide,
                order: response.order || response
            });

            await Promise.allSettled([this.refresh(), this.refreshTrades()]);

            if ($("orderAmount")) $("orderAmount").value = "";
            this.updateOrderTotal();
        } catch (error) {
            console.error("[MARKET ORDER]", error);
            this.notify(error.message || "Order submission failed", "error");
        } finally {
            this.submitting = false;
            if (button) {
                button.disabled = false;
                button.textContent = button.dataset.previousText || "PLACE ORDER";
            }
        }
    },

    async cancelOrder(orderId) {
        if (!this.requireAuth()) return false;
        const id = Number(orderId);
        if (!Number.isInteger(id) || id <= 0) {
            this.notify("Invalid order ID", "error");
            return false;
        }
        try {
            await this.apiPost(CONFIG.endpoints.cancel, { orderId: id });
            this.notify("Order cancelled", "success");
            await this.refresh();
            return true;
        } catch (error) {
            this.notify(error.message || "Cancel failed", "error");
            return false;
        }
    },

    bindSearch() {
        $("marketSearch")?.addEventListener("input", () => this.renderBloxioPairs());
    },

    bindAssets() {
        const container = $("marketPairAssets");
        if (!container || container.dataset.bound === "1") return;
        container.dataset.bound = "1";
        container.addEventListener("click", event => {
            const asset = event.target.closest(".market-asset[data-pair]");
            if (!asset) return;
            this.connectPair(asset.dataset.pair);
        });
    },

    bindChartToolbar() {
        const buttons = document.querySelectorAll(".chart-time");
        buttons.forEach(button => {
            if (button.dataset.bound === "1") return;
            button.dataset.bound = "1";
            button.addEventListener("click", () => {
                buttons.forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                const tf = button.dataset.tf
                    || button.textContent.trim().toLowerCase();
                const normalized = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w", "1ma": "1M", "1M": "1M" }[tf];
                if (normalized) this.setTimeframe(normalized);
            });
        });
    },

    bindMobileTabs() {
        document.querySelectorAll("[data-trade-mobile-panel], .market-mobile-tab").forEach(tab => {
            if (tab.dataset.bound === "1") return;
            tab.dataset.bound = "1";
            tab.addEventListener("click", () => {
                document.querySelectorAll("[data-trade-mobile-panel], .market-mobile-tab").forEach(btn => {
                    btn.classList.remove("active");
                    btn.setAttribute("aria-selected", "false");
                });
                tab.classList.add("active");
                tab.setAttribute("aria-selected", "true");

                const panel = tab.dataset.tradeMobilePanel;
                if (panel) {
                    const orderbook = document.querySelector(".bx-trade-orderbook");
                    const recent = document.querySelector(".bx-trade-recent");
                    if (orderbook) orderbook.classList.toggle("mobile-active", panel === "orderbook");
                    if (recent) recent.classList.toggle("mobile-active", panel === "recent");
                }

                window.BXChart?.resize?.();
            });
        });
    },

    bindTradeModeTabs() {
        document.querySelectorAll("[data-bx-trade-mode]").forEach(btn => {
            if (btn.dataset.bound === "1") return;
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                const mode = btn.dataset.bxTradeMode;
                if (!["spot", "futures"].includes(mode)) return;
                this.marketMode = mode;
                document.querySelectorAll("[data-bx-trade-mode]").forEach(t => {
                    const active = t === btn;
                    t.classList.toggle("active", active);
                    t.setAttribute("aria-pressed", String(active));
                });
                document.querySelectorAll("[data-bx-market-mode]").forEach(t => {
                    const active = t.dataset.bxMarketMode === mode;
                    t.classList.toggle("active", active);
                    t.setAttribute("aria-pressed", String(active));
                });
                if ($("tradeModeNotice")) $("tradeModeNotice").hidden = mode !== "futures";
                this.updatePairUI();
                this.renderBloxioPairs();
            });
        });
    },

    bindTradeViewTabs() {
        document.querySelectorAll("[data-trade-view]").forEach(btn => {
            if (btn.dataset.bound === "1") return;
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                const view = btn.dataset.tradeView;
                document.querySelectorAll("[data-trade-view]").forEach(t => {
                    const active = t === btn;
                    t.classList.toggle("active", active);
                    t.setAttribute("aria-selected", String(active));
                });
                const workspace = document.querySelector(".bx-trade-workspace");
                if (workspace) workspace.classList.toggle("trade-chart-mode", view === "chart");
                window.BXChart?.resize?.();
            });
        });
    },

    subscribeWS() {
        if (!window.WS?.on) return;
        const events = [
            "market:price", "market:depth", "market:trade",
            "market:candle", "market:kline", "market:update"
        ];
        events.forEach(event => {
            const handler = payload => {
                if (!payload || this.destroyed) return;
                const incomingPair = payload.pair;
                if (incomingPair && this.normalizePair(incomingPair) !== this.pair) return;

                if (event === "market:price") {
                    const price = number(payload.price);
                    if (price > 0) {
                        this.prevPrice = this.price || price;
                        this.price = price;
                        this.updateStats();
                    }
                } else if (event === "market:depth") {
                    const depth = payload.depth || payload;
                    this.orderBook.asks = depth.asks || [];
                    this.orderBook.bids = depth.bids || [];
                    this.renderOrderBook();
                } else if (event === "market:trade") {
                    this.trades.unshift(payload);
                    this.trades = this.trades.slice(0, CONFIG.historyLimit);
                    this.renderHistory();
                } else if (event === "market:candle" || event === "market:kline") {
                    this.dispatch("bloxio:market-candle", {
                        pair: this.pair,
                        timeframe: payload.timeframe || this.timeframe,
                        candle: payload.candle || payload.kline || payload
                    });
                } else {
                    this.refresh();
                }
            };
            window.WS.on(event, handler);
            this.listeners.push({ event, handler });
        });
        window.WS.subscribe?.("market");
    },

    updateConnectionStatus(status) {
        const element = $("systemStatus");
        if (element) {
            element.dataset.marketStatus = status;
            element.classList.toggle("market-online", status === "online");
            element.classList.toggle("market-offline", status === "offline");
        }

        const label = $("marketConnectionStatus");
        if (label) {
            const messages = {
                loading: "Connecting...",
                online: "Market Live",
                partial: "Partial Data",
                offline: "Market Offline"
            };
            label.textContent = messages[status] || status;
        }

        const feed = $("bxMarketFeedLabel");
        if (feed) {
            const messages = {
                loading: "Waiting for market feed...",
                online: "Live market feed",
                partial: "Partial market feed",
                offline: "Market feed offline"
            };
            feed.textContent = messages[status] || status;
            feed.dataset.state = status;
        }

        // ✅ V10.1 — Overview feed label (top of the market overview card).
        const overviewFeed = $("bxMarketOverviewFeedLabel");
        if (overviewFeed) {
            const messages = {
                loading: "Waiting for market feed",
                online: "Live market feed",
                partial: "Partial market feed",
                offline: "Market feed offline"
            };
            const textNode = Array.from(overviewFeed.childNodes)
                .find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = " " + (messages[status] || status);
            } else {
                overviewFeed.append(" " + (messages[status] || status));
            }
            overviewFeed.dataset.state = status;
        }
    },

    startHeartbeat() {
        clearInterval(this.heartbeat);
        this.heartbeat = setInterval(() => {
            if (this.destroyed || document.hidden) return;
            this.refresh();
            this.refreshTrades();
        }, CONFIG.refreshInterval);
    },

    bindVisibility() {
        this.visibilityHandler = () => {
            if (!document.hidden && this.initialized && !this.destroyed) {
                window.BXChart?.resize?.();
                this.refresh();
                this.refreshTrades();
                this.loadCandles();
            }
        };
        document.addEventListener("visibilitychange", this.visibilityHandler);
    },

    notify(message, type = "info") {
        console[type === "error" ? "error" : "log"]("[MARKET]", message);
        const status = $("marketStatus");
        if (status) {
            status.textContent = message;
            status.dataset.type = type;
            status.classList.remove("hidden");
        }
        this.dispatch("bloxio:market-message", { message, type });
    },

    dispatch(name, detail = {}) {
        document.dispatchEvent(new CustomEvent(name, { detail }));
    },

    destroy() {
        this.destroyed = true;
        this.initialized = false;
        this.generation++;
        clearInterval(this.heartbeat);
        if (this.visibilityHandler) {
            document.removeEventListener("visibilitychange", this.visibilityHandler);
        }
        this.listeners.forEach(({ event, handler }) => {
            window.WS?.off?.(event, handler);
        });
        this.listeners = [];
        window.WS?.unsubscribe?.("market");
        console.log("[BLOXIO MARKET] DESTROYED");
    },

    getState() {
        return {
            pair: this.pair,
            displayPair: this.displayPair,
            price: this.price,
            referencePrice: this.referencePrice,
            fixedReference: this.fixedReference,
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

window.MARKET = MARKET;
window.BLOXIO_MARKET_PAIRS = BLOXIO_MARKET_PAIRS;

function bootMarket() {
    if (window.MARKET) window.MARKET.init();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootMarket, { once: true });
} else {
    bootMarket();
}

})();
