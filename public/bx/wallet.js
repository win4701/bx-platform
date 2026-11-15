/* ==========================================================================
   BLOXIO WALLET ENGINE — V3
   Unified Wallet • Assets • Portfolio • Transactions • API • WebSocket
   IMPORTANT:
   This file manages the wallet frontend.
   Financial operations require valid backend API endpoints.
========================================================================== */

(function () {
    "use strict";

    /* ======================================================================
       01. CONFIGURATION
    ====================================================================== */

    const CONFIG = Object.freeze({
        COINS_PATH: "./data/coins.js",

        API: {
            WALLET: "/wallet",
            DEPOSIT: "/payments/create",
            WITHDRAW: "/payments/withdraw",
            TRANSFER: "/finance/transfer"
        },

        SYNC_INTERVAL: 30000,
        REQUEST_TIMEOUT: 15000,
        MAX_TRANSACTIONS: 20,

        DEFAULT_GROUP: "main",

        DEFAULT_ASSET: "BX",

        LOG_PREFIX: "[BLOXIO WALLET]"
    });


    /* ======================================================================
       02. DOM HELPERS
    ====================================================================== */

    const $ = id => document.getElementById(id);

    const exists = element =>
        element instanceof Element;

    const setText = (id, value) => {
        const element = $(id);

        if (element) {
            element.textContent = String(value ?? "");
        }
    };

    const show = element => {
        if (!element) return;

        element.classList.remove("hidden");
        element.classList.remove("wallet-hidden");
    };

    const hide = element => {
        if (!element) return;

        element.classList.add("wallet-hidden");
    };

    const toggleClass = (
        element,
        className,
        enabled
    ) => {
        if (element) {
            element.classList.toggle(
                className,
                Boolean(enabled)
            );
        }
    };


    /* ======================================================================
       03. APPLICATION STATE
    ====================================================================== */

    const state = {
        COINS: [],

        balances: {},
        prices: {},
        transactions: [],

        activeAsset: null,
        activeGroup: CONFIG.DEFAULT_GROUP,
        search: "",

        authenticated: false,

        initialized: false,
        initializing: false,
        coinsReady: false,

        syncing: false,
        requestVersion: 0,

        syncTimer: null,
        notificationTimer: null,

        ws: null,
        wsListeners: [],
        apiListeners: [],

        actionsBound: false,
        categoriesBound: false,
        searchBound: false,
        panelsBound: false,
        keyboardBound: false,

        lastSync: null
    };


    /* ======================================================================
       04. NORMALIZATION
    ====================================================================== */

    function safeNumber(value, fallback = 0) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    function normalizeSymbol(symbol) {
        return String(symbol || "")
            .trim()
            .toUpperCase();
    }


    function normalizeBalances(input) {
        if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input)
        ) {
            return {};
        }

        const result = {};

        Object.entries(input).forEach(
            ([symbol, amount]) => {
                const key = normalizeSymbol(symbol);

                if (!key) return;

                const value = safeNumber(amount, NaN);

                if (Number.isFinite(value)) {
                    result[key] = value;
                }
            }
        );

        return result;
    }


    function normalizePrices(input) {
        if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input)
        ) {
            return {};
        }

        const result = {};

        Object.entries(input).forEach(
            ([symbol, priceData]) => {
                const key = normalizeSymbol(symbol);

                if (!key) return;

                const raw =
                    typeof priceData === "object" &&
                    priceData !== null
                        ? (
                            priceData.usd ??
                            priceData.price ??
                            priceData.last ??
                            priceData.close
                        )
                        : priceData;

                const price = safeNumber(raw, NaN);

                if (
                    Number.isFinite(price) &&
                    price >= 0
                ) {
                    result[key] = price;
                }
            }
        );

        return result;
    }


    function normalizeTransactions(input) {
        if (!Array.isArray(input)) {
            return [];
        }

        return input
            .filter(item =>
                item &&
                typeof item === "object"
            )
            .slice(0, CONFIG.MAX_TRANSACTIONS);
    }


    function normalizeResponse(response) {
        if (
            !response ||
            typeof response !== "object"
        ) {
            throw new Error("Invalid server response");
        }

        if (response.error) {
            const message =
                typeof response.error === "object"
                    ? response.error.message
                    : response.error;

            throw new Error(
                message || "Request failed"
            );
        }

        if (response.success === false) {
            throw new Error(
                response.message ||
                "Request failed"
            );
        }

        if (
            response.data &&
            typeof response.data === "object"
        ) {
            return response.data;
        }

        return response;
    }


    /* ======================================================================
       05. AUTHENTICATION
    ====================================================================== */

    function getToken() {
        try {
            if (
                window.API &&
                typeof window.API.token === "function"
            ) {
                return window.API.token() || "";
            }

            return (
                localStorage.getItem("accessToken") ||
                localStorage.getItem("token") ||
                ""
            );

        } catch (error) {
            console.warn(
                CONFIG.LOG_PREFIX,
                "Unable to read authentication token",
                error
            );

            return "";
        }
    }


    function isAuthenticated() {
        return Boolean(getToken());
    }


    function requireAuth() {
        if (isAuthenticated()) {
            state.authenticated = true;
            return true;
        }

        state.authenticated = false;

        notify("Please login to use your wallet", "warning");

        if (
            window.AUTH &&
            typeof window.AUTH.openAuth === "function"
        ) {
            window.AUTH.openAuth("login");

        } else {
            $("headerLoginBtn")?.click();
        }

        return false;
    }


    /* ======================================================================
       06. NOTIFICATIONS
    ====================================================================== */

    function notify(message, type = "info") {
        const element = $("walletStatus");

        if (!element) {
            console.info(
                CONFIG.LOG_PREFIX,
                message
            );

            return;
        }

        element.textContent = String(message);

        element.dataset.state = type;

        element.classList.remove("hidden");

        clearTimeout(state.notificationTimer);

        state.notificationTimer = setTimeout(() => {
            element.classList.add("hidden");
        }, 3500);
    }


    function setStatus(id, message, type = "info") {
        const element = $(id);

        if (!element) return;

        element.textContent = String(message);

        element.dataset.state = type;

        element.classList.remove("hidden");
    }


    function clearStatus(id) {
        const element = $(id);

        if (!element) return;

        element.textContent = "";
        element.classList.add("hidden");
    }


    /* ======================================================================
       07. COIN REGISTRY
    ====================================================================== */

    async function loadCoins() {
        if (state.coinsReady) {
            return true;
        }

        try {
            const registry = await import(
                CONFIG.COINS_PATH
            );

            if (!Array.isArray(registry.COINS)) {
                throw new Error(
                    "COINS registry must be an array"
                );
            }

            state.COINS = registry.COINS.filter(
                coin =>
                    coin &&
                    typeof coin.symbol === "string" &&
                    coin.symbol.trim() !== ""
            ).map(coin => ({
                ...coin,

                symbol: normalizeSymbol(coin.symbol),

                name: String(
                    coin.name || coin.symbol
                ),

                wallet: coin.wallet !== false
            }));

            state.coinsReady = true;

            console.info(
                CONFIG.LOG_PREFIX,
                "Coin registry loaded:",
                state.COINS.length
            );

            return true;

        } catch (error) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Coin registry failed:",
                error
            );

            notify(
                "Unable to load wallet assets",
                "error"
            );

            return false;
        }
    }


    function getCoin(symbol) {
        const key = normalizeSymbol(symbol);

        if (!key) return null;

        return state.COINS.find(
            coin => coin.symbol === key
        ) || null;
    }


    function getWalletCoins() {
        return state.COINS.filter(
            coin => coin.wallet !== false
        );
    }


    function getSwapCoins() {
        return state.COINS.filter(
            coin => coin.swap !== false
        );
    }


    /* ======================================================================
       08. BALANCES AND PRICES
    ====================================================================== */

    function getBalance(symbol) {
        const key = normalizeSymbol(symbol);

        return safeNumber(
            state.balances[key],
            0
        );
    }


    function getPrice(symbol) {
        const key = normalizeSymbol(symbol);

        if (
            Object.prototype.hasOwnProperty.call(
                state.prices,
                key
            )
        ) {
            return safeNumber(
                state.prices[key],
                0
            );
        }

        const coin = getCoin(key);

        return coin
            ? safeNumber(coin.price, 0)
            : 0;
    }


    function getAssetValue(symbol) {
        return (
            getBalance(symbol) *
            getPrice(symbol)
        );
    }


    function formatAmount(
        value,
        digits = 4
    ) {
        const number = safeNumber(value, 0);

        return new Intl.NumberFormat(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: digits
            }
        ).format(number);
    }


    function formatUSD(value) {
        const number = safeNumber(value, 0);

        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(number);
    }


    /* ======================================================================
       09. ASSET FILTERS
    ====================================================================== */

    function getGroupAssets() {
        const coins = getWalletCoins();

        switch (state.activeGroup) {

            case "main":
                return coins.filter(
                    coin => coin.category === "main"
                );

            case "market":
                return coins.filter(
                    coin => coin.market === true
                );

            case "stable":
                return coins.filter(
                    coin =>
                        coin.type === "stable" ||
                        coin.category === "stable"
                );

            case "defi": {
                const defiSymbols = new Set([
                    "AAVE",
                    "UNI",
                    "MKR",
                    "SNX",
                    "1INCH",
                    "YFI",
                    "CAKE",
                    "GMX"
                ]);

                return coins.filter(
                    coin =>
                        coin.type === "defi" ||
                        coin.category === "defi" ||
                        defiSymbols.has(coin.symbol)
                );
            }

            case "gaming":
                return coins.filter(
                    coin =>
                        coin.casino === true ||
                        coin.category === "gaming"
                );

            case "all":
                return coins;

            default:
                return coins.filter(
                    coin => coin.category === "main"
                );
        }
    }


    function getVisibleAssets() {
        let assets = getGroupAssets();

        if (!state.search) {
            return assets;
        }

        const query = state.search.toLowerCase();

        return assets.filter(coin => {
            const symbol =
                String(coin.symbol || "").toLowerCase();

            const name =
                String(coin.name || "").toLowerCase();

            return (
                symbol.includes(query) ||
                name.includes(query)
            );
        });
    }


    /* ======================================================================
       10. ASSET CARD
    ====================================================================== */

    function buildAssetCard(asset) {
        const card = document.createElement("div");

        card.className = "wallet-asset-card";

        card.dataset.symbol = asset.symbol;
        card.dataset.group = asset.category || "";

        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");

        card.setAttribute(
            "aria-label",
            `Open ${asset.name} wallet actions`
        );

        const icon = document.createElement("img");

        icon.src = asset.icon || "";
        icon.alt = asset.symbol;
        icon.loading = "lazy";

        icon.onerror = () => {
            icon.style.visibility = "hidden";
        };

        const meta = document.createElement("div");

        meta.className = "asset-meta";

        const symbol = document.createElement("strong");

        symbol.textContent = asset.symbol;

        const name = document.createElement("span");

        name.textContent =
            asset.name || asset.symbol;

        meta.append(symbol, name);

        const balance = document.createElement("div");

        balance.className = "asset-balance";

        balance.textContent = state.authenticated
            ? formatAmount(
                getBalance(asset.symbol),
                4
            )
            : "—";

        card.append(
            icon,
            meta,
            balance
        );

        return card;
    }


    /* ======================================================================
       11. ASSET RENDERING
    ====================================================================== */

    function renderAssets() {
        const container = $("walletAssetsContainer");

        if (!container) return;

        const assets = getVisibleAssets();

        const fragment =
            document.createDocumentFragment();

        assets.forEach(asset => {
            fragment.appendChild(
                buildAssetCard(asset)
            );
        });

        container.replaceChildren(fragment);

        updateAssetCount(assets);
    }


    function updateAssetCount(assets) {
        setText(
            "walletAssetCount",
            assets.length
        );

        const active = assets.filter(
            asset =>
                getBalance(asset.symbol) > 0
        ).length;

        setText(
            "walletActiveAssets",
            state.authenticated
                ? active
                : "—"
        );
    }


    /* ======================================================================
       12. PORTFOLIO OVERVIEW
    ====================================================================== */

    function calculatePortfolio() {
        let total = 0;
        let active = 0;

        Object.entries(state.balances).forEach(
            ([symbol, balance]) => {
                const amount = safeNumber(balance, 0);

                if (amount > 0) {
                    active++;
                }

                total += (
                    amount *
                    getPrice(symbol)
                );
            }
        );

        return {
            total,
            active
        };
    }


    function renderWalletTotal() {
        const portfolio = calculatePortfolio();

        setText(
            "walletTotal",
            state.authenticated
                ? formatUSD(portfolio.total)
                : "—"
        );

        setText(
            "walletActiveAssets",
            state.authenticated
                ? portfolio.active
                : "—"
        );

        setText(
            "bal-bx",
            state.authenticated
                ? formatAmount(
                    getBalance("BX"),
                    4
                )
                : "—"
        );

        setText(
            "bal-xbc",
            state.authenticated
                ? formatAmount(
                    getBalance("XBC"),
                    4
                )
                : "—"
        );

        setText(
            "walletHealth",
            "100%"
        );
    }


    /* ======================================================================
       13. PNL
    ====================================================================== */

    function renderPnL() {
        const element = $("walletPnL");

        if (!element) return;

        if (!state.authenticated) {
            element.textContent = "+$0.00";
            return;
        }

        // No historical portfolio baseline is provided
        // by the current wallet API contract.
        // Therefore this is a neutral placeholder.
        element.textContent = "+$0.00";
    }


    /* ======================================================================
       14. TRANSACTIONS
    ====================================================================== */

    function renderTransactions() {
        const container = $("walletTransactions");

        if (!container) return;

        container.replaceChildren();

        if (!state.authenticated) {
            const empty = document.createElement("div");

            empty.className = "wallet-empty-state";

            empty.textContent =
                "Login to view your recent activity.";

            container.appendChild(empty);

            return;
        }

        if (!state.transactions.length) {
            const empty = document.createElement("div");

            empty.className = "wallet-empty-state";

            empty.textContent =
                "No recent transactions.";

            container.appendChild(empty);

            return;
        }

        const fragment =
            document.createDocumentFragment();

        state.transactions
            .slice(0, CONFIG.MAX_TRANSACTIONS)
            .forEach(transaction => {
                const row = document.createElement("div");

                row.className = "wallet-transaction";

                const title =
                    document.createElement("strong");

                title.textContent =
                    transaction.type ||
                    transaction.action ||
                    "Transaction";

                const detail =
                    document.createElement("span");

                detail.textContent = [
                    transaction.asset ||
                    transaction.symbol ||
                    "",

                    transaction.amount ?? ""
                ].filter(Boolean).join(" ");

                row.append(title, detail);

                fragment.appendChild(row);
            });

        container.appendChild(fragment);
    }


    /* ======================================================================
       15. LAST SYNC
    ====================================================================== */

    function renderLastSync() {
        if (!state.lastSync) {
            setText("walletLastSync", "--");
            return;
        }

        setText(
            "walletLastSync",
            state.lastSync.toLocaleTimeString()
        );
    }


    /* ======================================================================
       16. RENDER ALL
    ====================================================================== */

    function renderBalances() {
        renderAssets();
        renderWalletTotal();
        renderPnL();
        renderTransactions();
        renderLastSync();
    }


    /* ======================================================================
       17. CATEGORY BUTTONS
    ====================================================================== */

    function bindCategories() {
        if (state.categoriesBound) return;

        state.categoriesBound = true;

        const tabs = {
            walletTabMain: "main",
            walletTabMarket: "market",
            walletTabStable: "stable",
            walletTabDefi: "defi",
            walletTabGaming: "gaming",
            walletTabAll: "all"
        };

        Object.entries(tabs).forEach(
            ([id, group]) => {
                const button = $(id);

                if (!button) return;

                button.addEventListener("click", () => {
                    state.activeGroup = group;

                    Object.keys(tabs).forEach(tabId => {
                        const tab = $(tabId);

                        toggleClass(
                            tab,
                            "active",
                            tabId === id
                        );
                    });

                    renderAssets();
                });
            }
        );
    }


    /* ======================================================================
       18. ASSET SEARCH
    ====================================================================== */

    function bindSearch() {
        if (state.searchBound) return;

        state.searchBound = true;

        const input = $("walletAssetSearch");

        if (!input) return;

        input.addEventListener("input", () => {
            state.search = input.value
                .trim()
                .toLowerCase();

            renderAssets();
        });
    }


    /* ======================================================================
       19. NETWORK SELECTORS
    ====================================================================== */

    function renderNetworks(symbol) {
        const asset = getCoin(symbol);

        if (!asset) return;

        const networks = Array.isArray(asset.networks)
            ? asset.networks
            : [];

        [
            $("depositNetwork"),
            $("withdrawNetwork")
        ].forEach(select => {
            if (!select) return;

            const previous = select.value;

            select.replaceChildren();

            networks.forEach(network => {
                const option =
                    document.createElement("option");

                option.value = String(network);
                option.textContent = String(network);

                select.appendChild(option);
            });

            if (
                networks.some(
                    network =>
                        String(network) === previous
                )
            ) {
                select.value = previous;
            }
        });
    }


    /* ======================================================================
       20. WALLET SELECT OPTIONS
    ====================================================================== */

    function populateSelect(id, assets) {
        const select = $(id);

        if (!select) return;

        const previous = select.value;

        select.replaceChildren();

        assets.forEach(asset => {
            const option =
                document.createElement("option");

            option.value = asset.symbol;

            option.textContent =
                `${asset.symbol} — ${asset.name}`;

            select.appendChild(option);
        });

        if (
            assets.some(
                asset => asset.symbol === previous
            )
        ) {
            select.value = previous;
        }
    }


    function populateWalletSelects() {
        const walletCoins = getWalletCoins();

        const swapCoins = getSwapCoins();

        populateSelect(
            "depositAsset",
            walletCoins
        );

        populateSelect(
            "withdrawAsset",
            walletCoins
        );

        populateSelect(
            "transferAsset",
            walletCoins
        );

        populateSelect(
            "swapFromAsset",
            swapCoins
        );

        populateSelect(
            "swapToAsset",
            swapCoins
        );
    }

    function bindOperationAssetSelectors() {
        [
            "depositAsset",
            "withdrawAsset"
        ].forEach(id => {
            const select = $(id);
            if (!select || select.dataset.walletNetworkBound === "true") return;

            select.dataset.walletNetworkBound = "true";
            select.addEventListener("change", () => {
                renderNetworks(select.value);
            });
        });
    }


    /* ======================================================================
       21. ASSET QUICK SHEET
    ====================================================================== */

    function createQuickSheetCloseButton() {
        const sheet = $("walletQuickSheet");

        const card = sheet?.querySelector(
            ".wallet-quick-card"
        );

        if (!sheet || !card) return;

        if (
            card.querySelector(
                "[data-wallet-close-sheet]"
            )
        ) {
            return;
        }

        const closeButton =
            document.createElement("button");

        closeButton.type = "button";

        closeButton.className =
            "wallet-panel-close";

        closeButton.dataset.walletCloseSheet = "true";

        closeButton.setAttribute(
            "aria-label",
            "Close asset actions"
        );

        closeButton.textContent = "×";

        card.insertBefore(
            closeButton,
            card.firstChild
        );
    }


    function createFallbackAsset(
        symbol,
        sourceElement
    ) {
        const key = normalizeSymbol(symbol);

        if (!key) return null;

        const image =
            sourceElement?.querySelector("img");

        const nameElement =
            sourceElement?.querySelector(
                ".wallet-left span"
            ) ||
            sourceElement?.querySelector("span");

        return {
            symbol: key,

            name:
                nameElement?.textContent?.trim() ||
                key,

            icon:
                image?.getAttribute("src") ||
                "",

            networks: [],

            wallet: true
        };
    }


    function openAssetSheet(
        symbol,
        sourceElement = null
    ) {
        const key = normalizeSymbol(symbol);

        if (!key) return false;

        let asset = getCoin(key);

        if (!asset && sourceElement) {
            asset = createFallbackAsset(
                key,
                sourceElement
            );
        }

        if (!asset) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Asset missing from registry:",
                key
            );

            notify(
                `Asset ${key} is unavailable`,
                "error"
            );

            return false;
        }

        state.activeAsset = asset;

        setText(
            "walletQuickAssetName",
            `${asset.name || key} (${key})`
        );

        const icon = $("assetSheetIcon");

        if (icon) {
            icon.src = asset.icon || "";
            icon.alt = key;
        }

        setText("assetSheetSymbol", key);

        setText(
            "assetSheetName",
            asset.name || key
        );

        renderNetworks(key);

        // Keep operation selectors synchronized.
        [
            "depositAsset",
            "withdrawAsset",
            "transferAsset"
        ].forEach(id => {
            const select = $(id);

            if (
                select &&
                Array.from(select.options).some(
                    option => option.value === key
                )
            ) {
                select.value = key;
            }
        });

        const sheet = $("walletQuickSheet");

        if (!sheet) {
            console.error(
                CONFIG.LOG_PREFIX,
                "walletQuickSheet element not found"
            );

            return false;
        }

        createQuickSheetCloseButton();

        sheet.classList.remove("wallet-hidden");
        sheet.classList.remove("hidden");

        sheet.setAttribute("aria-hidden", "false");

        sheet.dataset.activeAsset = key;

        console.info(
            CONFIG.LOG_PREFIX,
            "Asset quick sheet opened:",
            key
        );

        return true;
    }


    function closeAssetSheet() {
        const sheet = $("walletQuickSheet");

        if (!sheet) return;

        sheet.classList.add("wallet-hidden");

        sheet.setAttribute("aria-hidden", "true");

        delete sheet.dataset.activeAsset;
    }


    /* ======================================================================
       22. WALLET PANELS
    ====================================================================== */

    function openPanel(id) {
        const panel = $(id);

        if (!panel) {
            console.warn(
                CONFIG.LOG_PREFIX,
                "Panel not found:",
                id
            );

            return false;
        }

        // Direct operation cards may open a form without using the asset sheet.
        // Populate the matching network selector before displaying the form.
        if (id === "depositPanel") {
            renderNetworks($("depositAsset")?.value);
        } else if (id === "withdrawPanel") {
            renderNetworks($("withdrawAsset")?.value);
        }

        panel.classList.remove("wallet-hidden");
        panel.classList.remove("hidden");

        panel.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

        return true;
    }


    function closePanel(id) {
        const panel = $(id);

        if (!panel) return;

        panel.classList.add("wallet-hidden");
    }


    function closeAllPanels() {
        [
            "depositPanel",
            "withdrawPanel",
            "transferPanel"
        ].forEach(closePanel);
    }


    /* ======================================================================
       23. API REQUEST ENGINE
    ====================================================================== */

    async function request(
        method,
        endpoint,
        body = null
    ) {
        if (!window.API) {
            throw new Error(
                "API Engine is unavailable"
            );
        }

        const apiMethod = window.API[method];

        if (typeof apiMethod !== "function") {
            throw new Error(
                `API method ${method} is unavailable`
            );
        }

        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            CONFIG.REQUEST_TIMEOUT
        );

        try {
            const options = {
                auth: true,
                cache: false,
                signal: controller.signal
            };

            const response = method === "get"
                ? await apiMethod.call(
                    window.API,
                    endpoint,
                    options
                )
                : await apiMethod.call(
                    window.API,
                    endpoint,
                    body,
                    options
                );

            return normalizeResponse(response);

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "Request timed out"
                );
            }

            throw error;

        } finally {
            clearTimeout(timeout);
        }
    }


    /* ======================================================================
       24. WALLET SYNCHRONIZATION
    ====================================================================== */

    async function syncWallet() {
        if (state.syncing) return false;

        if (!isAuthenticated()) {
            handleLogout();
            return false;
        }

        state.authenticated = true;

        state.syncing = true;

        const version = ++state.requestVersion;

        try {
            const data = await request(
                "get",
                CONFIG.API.WALLET
            );

            // Prevent stale responses from updating state.
            if (
                version !== state.requestVersion ||
                !isAuthenticated()
            ) {
                return false;
            }

            if (data.balances) {
                state.balances =
                    normalizeBalances(data.balances);
            }

            if (data.prices) {
                state.prices = {
                    ...state.prices,
                    ...normalizePrices(data.prices)
                };
            }

            if (Array.isArray(data.transactions)) {
                state.transactions =
                    normalizeTransactions(data.transactions);
            }

            state.lastSync = new Date();

            renderBalances();

            clearStatus("walletStatus");

            return true;

        } catch (error) {
            if (
                /401|unauthorized|session expired/i.test(
                    error.message || ""
                )
            ) {
                handleLogout();

            } else {
                console.error(
                    CONFIG.LOG_PREFIX,
                    "Wallet sync failed:",
                    error
                );

                notify(
                    error.message ||
                    "Wallet synchronization failed",
                    "error"
                );
            }

            return false;

        } finally {
            if (version === state.requestVersion) {
                state.syncing = false;
            }
        }
    }


    /* ======================================================================
       25. SYNC TIMER
    ====================================================================== */

    function stopSyncTimer() {
        if (state.syncTimer) {
            clearInterval(state.syncTimer);

            state.syncTimer = null;
        }
    }


    function startSyncTimer() {
        stopSyncTimer();

        if (!state.authenticated) return;

        state.syncTimer = setInterval(() => {
            if (isAuthenticated()) {
                syncWallet();
            } else {
                handleLogout();
            }
        }, CONFIG.SYNC_INTERVAL);
    }


    /* ======================================================================
       26. LOGIN / LOGOUT
    ====================================================================== */

    function handleLogin() {
        if (!isAuthenticated()) return;

        state.authenticated = true;

        syncWallet();

        connectWS();

        startSyncTimer();
    }


    function handleLogout() {
        state.authenticated = false;

        state.requestVersion++;

        state.syncing = false;

        stopSyncTimer();

        disconnectWS();

        state.balances = {};
        state.prices = {};
        state.transactions = [];

        state.lastSync = null;

        closeAssetSheet();
        closeAllPanels();

        renderBalances();

        [
            "depositStatus",
            "withdrawStatus",
            "transferStatus"
        ].forEach(clearStatus);

        console.info(
            CONFIG.LOG_PREFIX,
            "Wallet logged out"
        );
    }


    /* ======================================================================
       27. AUTH EVENTS
    ====================================================================== */

    function bindAuthEvents() {
        if (
            !window.API ||
            typeof window.API.on !== "function"
        ) {
            return;
        }

        const register = (event, callback) => {
            const unsubscribe =
                window.API.on(event, callback);

            if (typeof unsubscribe === "function") {
                state.apiListeners.push(unsubscribe);
            }
        };

        register("auth:login", handleLogin);

        register("auth:logout", handleLogout);
    }


    /* ======================================================================
       28. WEBSOCKET
    ====================================================================== */

    function disconnectWS() {
        state.wsListeners.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.warn(
                    CONFIG.LOG_PREFIX,
                    "WebSocket cleanup failed",
                    error
                );
            }
        });

        state.wsListeners = [];

        if (
            state.ws &&
            typeof state.ws.unsubscribe === "function"
        ) {
            try {
                state.ws.unsubscribe("wallet");
            } catch (error) {
                console.warn(
                    CONFIG.LOG_PREFIX,
                    error
                );
            }
        }

        state.ws = null;
    }


    function connectWS() {
        if (
            !state.authenticated ||
            !isAuthenticated() ||
            !window.WS ||
            state.ws
        ) {
            return;
        }

        state.ws = window.WS;

        if (typeof state.ws.connect === "function") {
            state.ws.connect();
        }

        if (typeof state.ws.subscribe === "function") {
            state.ws.subscribe("wallet");
        }

        const register = (event, callback) => {
            if (typeof state.ws.on !== "function") {
                return;
            }

            const unsubscribe =
                state.ws.on(event, callback);

            if (typeof unsubscribe === "function") {
                state.wsListeners.push(unsubscribe);
            }
        };


        register("wallet:update", data => {
            if (
                !data ||
                !isAuthenticated()
            ) {
                return;
            }

            if (data.balances) {
                state.balances =
                    normalizeBalances(data.balances);
            }

            if (data.prices) {
                state.prices = {
                    ...state.prices,
                    ...normalizePrices(data.prices)
                };
            }

            if (Array.isArray(data.transactions)) {
                state.transactions =
                    normalizeTransactions(data.transactions);
            }

            state.lastSync = new Date();

            renderBalances();
        });


        register("market:update", data => {
            if (
                !data ||
                !isAuthenticated()
            ) {
                return;
            }

            if (data.prices) {
                state.prices = {
                    ...state.prices,
                    ...normalizePrices(data.prices)
                };
            }

            renderWalletTotal();
        });


        register("deposit:confirmed", () => {
            notify("Deposit confirmed", "success");

            syncWallet();
        });


        register("transfer:received", () => {
            notify("Transfer received", "success");

            syncWallet();
        });


        register("airdrop:update", () => {
            syncWallet();
        });
    }


    /* ======================================================================
       29. DEPOSIT
    ====================================================================== */

    async function handleDeposit() {
        if (!requireAuth()) return;

        const asset = normalizeSymbol(
            $("depositAsset")?.value
        );

        const network =
            $("depositNetwork")?.value || "";

        const memo =
            $("depositMemo")?.value?.trim() || "";

        const destination =
            $("depositDestination")?.value?.trim() || "";

        if (!asset || !getCoin(asset)) {
            notify(
                "Select a valid deposit asset",
                "warning"
            );

            return;
        }

        setStatus(
            "depositStatus",
            "Generating deposit address..."
        );

        const button = $("generateDepositBtn");

        if (button) {
            button.disabled = true;
        }

        try {
            const data = await request(
                "post",
                CONFIG.API.DEPOSIT,
                {
                    asset,
                    network,
                    memo,
                    destination
                }
            );

            if (!data.address) {
                throw new Error(
                    "Deposit address unavailable"
                );
            }

            setText(
                "depositAddressText",
                data.address
            );

            show($("wallet-address-box"));

            notify(
                "Deposit address generated",
                "success"
            );

        } catch (error) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Deposit failed:",
                error
            );

            setStatus(
                "depositStatus",
                error.message || "Deposit request failed",
                "error"
            );

        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }


    /* ======================================================================
       30. WITHDRAW
    ====================================================================== */

    async function handleWithdraw() {
        if (!requireAuth()) return;

        const asset = normalizeSymbol(
            $("withdrawAsset")?.value
        );

        const network =
            $("withdrawNetwork")?.value || "";

        const amount = safeNumber(
            $("withdrawAmount")?.value,
            NaN
        );

        const address =
            $("withdrawAddress")?.value?.trim() || "";

        const memo =
            $("withdrawMemo")?.value?.trim() || "";

        if (
            !asset ||
            !getCoin(asset) ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !address
        ) {
            notify(
                "Invalid withdrawal details",
                "warning"
            );

            return;
        }

        if (amount > getBalance(asset)) {
            notify(
                "Insufficient balance",
                "warning"
            );

            return;
        }

        setStatus(
            "withdrawStatus",
            "Processing withdrawal..."
        );

        const button = $("submitWithdrawBtn");

        if (button) {
            button.disabled = true;
        }

        try {
            await request(
                "post",
                CONFIG.API.WITHDRAW,
                {
                    asset,
                    network,
                    amount,
                    address,
                    memo
                }
            );

            notify(
                "Withdrawal request submitted",
                "success"
            );

            await syncWallet();

        } catch (error) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Withdrawal failed:",
                error
            );

            setStatus(
                "withdrawStatus",
                error.message || "Withdrawal failed",
                "error"
            );

        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }


    /* ======================================================================
       31. INTERNAL TRANSFER
    ====================================================================== */

    async function handleTransfer() {
        if (!requireAuth()) return;

        const asset = normalizeSymbol(
            $("transferAsset")?.value
        );

        const amount = safeNumber(
            $("transferAmount")?.value,
            NaN
        );

        const to =
            $("transferUser")?.value?.trim() || "";

        if (
            !asset ||
            !getCoin(asset) ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !to
        ) {
            notify(
                "Invalid transfer details",
                "warning"
            );

            return;
        }

        if (amount > getBalance(asset)) {
            notify(
                "Insufficient balance",
                "warning"
            );

            return;
        }

        setStatus(
            "transferStatus",
            "Processing transfer..."
        );

        const button = $("submitTransferBtn");

        if (button) {
            button.disabled = true;
        }

        try {
            await request(
                "post",
                CONFIG.API.TRANSFER,
                {
                    asset,
                    amount,
                    to
                }
            );

            notify(
                "Transfer submitted",
                "success"
            );

            await syncWallet();

        } catch (error) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Transfer failed:",
                error
            );

            setStatus(
                "transferStatus",
                error.message || "Transfer failed",
                "error"
            );

        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }


    /* ======================================================================
       32. SWAP INTEGRATION
    ====================================================================== */

    function launchSwap() {
        const asset = state.activeAsset;

        if (!asset) {
            notify(
                "Select an asset first",
                "warning"
            );

            return;
        }

        const swapSection = $("bloxioSwap");

        if (!swapSection) {
            notify(
                "Bloxio Swap interface is unavailable",
                "error"
            );

            return;
        }

        closeAssetSheet();

        swapSection.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        // The current Swap Engine uses bxsFromTrigger
        // and bxsToTrigger, not the old swapFromAsset IDs.
        const fromTrigger = $("bxsFromTrigger");

        if (fromTrigger) {
            fromTrigger.dataset.walletSelectedAsset =
                asset.symbol;
        }

        notify(
            `Swap interface opened for ${asset.symbol}`,
            "success"
        );
    }


    /* ======================================================================
       33. COPY DEPOSIT ADDRESS
    ====================================================================== */

    async function copyDepositAddress() {
        if (!requireAuth()) return;

        const address =
            $("depositAddressText")?.textContent?.trim();

        if (
            !address ||
            address === "—"
        ) {
            notify(
                "No deposit address to copy",
                "warning"
            );

            return;
        }

        try {
            if (
                navigator.clipboard &&
                window.isSecureContext
            ) {
                await navigator.clipboard.writeText(address);

            } else {
                const input =
                    document.createElement("textarea");

                input.value = address;

                input.style.position = "fixed";
                input.style.opacity = "0";

                document.body.appendChild(input);

                input.select();

                const copied =
                    document.execCommand("copy");

                input.remove();

                if (!copied) {
                    throw new Error("Copy failed");
                }
            }

            notify(
                "Deposit address copied",
                "success"
            );

        } catch (error) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Clipboard error:",
                error
            );

            notify(
                "Unable to copy address",
                "error"
            );
        }
    }


    /* ======================================================================
       34. ASSET SELECTION EVENTS
    ====================================================================== */

    function handleAssetClick(target) {
        const card = target.closest(
            ".wallet-asset-card"
        );

        const mainAsset = target.closest(
            ".wallet-row[data-asset]"
        );

        if (card) {
            return openAssetSheet(
                card.dataset.symbol,
                card
            );
        }

        if (mainAsset) {
            return openAssetSheet(
                mainAsset.dataset.asset,
                mainAsset
            );
        }

        return false;
    }


    /* ======================================================================
       35. GLOBAL CLICK EVENTS
    ====================================================================== */

    function bindActions() {
        if (state.actionsBound) return;

        state.actionsBound = true;

        document.addEventListener(
            "click",
            event => {
                const target = event.target;

                if (!exists(target)) return;

                // Asset selection
                const selected =
                    handleAssetClick(target);

                if (selected) return;


                // Close quick sheet
                if (
                    target.closest(
                        "[data-wallet-close-sheet]"
                    )
                ) {
                    closeAssetSheet();
                    return;
                }


                // Quick actions
                if (
                    target.closest("#walletQuickDeposit")
                ) {
                    if (!requireAuth()) return;

                    closeAssetSheet();

                    openPanel("depositPanel");

                    return;
                }


                if (
                    target.closest("#walletQuickWithdraw")
                ) {
                    if (!requireAuth()) return;

                    closeAssetSheet();

                    openPanel("withdrawPanel");

                    return;
                }


                if (
                    target.closest("#walletQuickTransfer")
                ) {
                    if (!requireAuth()) return;

                    closeAssetSheet();

                    openPanel("transferPanel");

                    return;
                }


                if (
                    target.closest("#walletQuickSwap")
                ) {
                    launchSwap();

                    return;
                }


                // Form actions
                if (
                    target.closest("#generateDepositBtn")
                ) {
                    handleDeposit();
                    return;
                }


                if (
                    target.closest("#submitWithdrawBtn")
                ) {
                    handleWithdraw();
                    return;
                }


                if (
                    target.closest("#submitTransferBtn")
                ) {
                    handleTransfer();
                    return;
                }


                if (
                    target.closest("#copyDepositBtn")
                ) {
                    copyDepositAddress();
                    return;
                }


                // Existing generic panel controls
                const openButton = target.closest(
                    "[data-wallet-open]"
                );

                if (openButton) {
                    if (!requireAuth()) return;

                    openPanel(
                        openButton.dataset.walletOpen
                    );

                    return;
                }


                const closeButton = target.closest(
                    "[data-wallet-close]"
                );

                if (closeButton) {
                    closePanel(
                        closeButton.dataset.walletClose
                    );

                    return;
                }


                // Close quick sheet when clicking outside.
                const sheet = $("walletQuickSheet");

                if (
                    sheet &&
                    !sheet.classList.contains("wallet-hidden") &&
                    !target.closest("#walletQuickSheet")
                ) {
                    closeAssetSheet();
                }
            }
        );
    }


    /* ======================================================================
       36. KEYBOARD ACCESSIBILITY
    ====================================================================== */

    function bindKeyboard() {
        if (state.keyboardBound) return;

        state.keyboardBound = true;

        document.addEventListener(
            "keydown",
            event => {
                if (event.key === "Escape") {
                    closeAssetSheet();
                    closeAllPanels();
                }

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    const target = event.target;

                    if (!exists(target)) return;

                    const card = target.closest(
                        ".wallet-asset-card[role='button']"
                    );

                    if (!card) return;

                    event.preventDefault();

                    openAssetSheet(
                        card.dataset.symbol,
                        card
                    );
                }
            }
        );
    }


    /* ======================================================================
       37. PANEL BINDINGS
    ====================================================================== */

    function bindPanels() {
        if (state.panelsBound) return;

        state.panelsBound = true;

        document.addEventListener(
            "click",
            event => {
                const target = event.target;

                if (!exists(target)) return;

                const closeButton = target.closest(
                    "[data-wallet-close]"
                );

                if (closeButton) {
                    closePanel(
                        closeButton.dataset.walletClose
                    );
                }
            }
        );
    }


    /* ======================================================================
       38. RESET WALLET
    ====================================================================== */

    function clearWalletData() {
        state.balances = {};
        state.prices = {};
        state.transactions = [];

        state.lastSync = null;

        renderBalances();
    }


    /* ======================================================================
       39. INITIALIZATION
    ====================================================================== */

    async function init() {
        if (
            state.initialized ||
            state.initializing
        ) {
            return;
        }

        state.initializing = true;

        try {
            const loaded = await loadCoins();

            if (!loaded) {
                throw new Error(
                    "Wallet coin registry could not be loaded"
                );
            }

            populateWalletSelects();
            bindOperationAssetSelectors();

            bindCategories();
            bindSearch();
            bindPanels();
            bindActions();
            bindKeyboard();
            bindAuthEvents();

            state.authenticated = isAuthenticated();

            renderBalances();

            if (state.authenticated) {
                connectWS();

                await syncWallet();

                startSyncTimer();

            } else {
                clearWalletData();
            }

            state.initialized = true;

            console.info(
                CONFIG.LOG_PREFIX,
                "Wallet Engine V3 initialized"
            );

        } catch (error) {
            console.error(
                CONFIG.LOG_PREFIX,
                "Initialization failed:",
                error
            );

            notify(
                "Wallet initialization failed",
                "error"
            );

        } finally {
            state.initializing = false;
        }
    }


    /* ======================================================================
       40. DESTROY
    ====================================================================== */

    function destroy() {
        stopSyncTimer();

        state.requestVersion++;

        state.syncing = false;

        disconnectWS();

        state.apiListeners.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.warn(
                    CONFIG.LOG_PREFIX,
                    "API listener cleanup failed",
                    error
                );
            }
        });

        state.apiListeners = [];

        state.initialized = false;

        state.initializing = false;

        state.actionsBound = false;
        state.categoriesBound = false;
        state.searchBound = false;
        state.panelsBound = false;
        state.keyboardBound = false;

        console.info(
            CONFIG.LOG_PREFIX,
            "Wallet Engine destroyed"
        );
    }


    /* ======================================================================
       41. PUBLIC API
    ====================================================================== */

    window.WALLET = {
        init,
        destroy,

        sync: syncWallet,
        render: renderBalances,

        getBalance,
        getPrice,
        getCoin,
        getAssetValue,

        openAsset: openAssetSheet,
        closeAsset: closeAssetSheet,

        openPanel,
        closePanel,

        onLogin: handleLogin,
        onLogout: handleLogout,

        getState: () => ({
            balances: {
                ...state.balances
            },

            prices: {
                ...state.prices
            },

            transactions: [
                ...state.transactions
            ],

            activeGroup: state.activeGroup,

            activeAsset:
                state.activeAsset?.symbol || null,

            authenticated: state.authenticated,

            initialized: state.initialized,

            coinsReady: state.coinsReady,

            syncing: state.syncing,

            lastSync: state.lastSync
                ? state.lastSync.toISOString()
                : null
        })
    };


    /* ======================================================================
       42. BOOTSTRAP
    ====================================================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {
        init();
    }

})();
