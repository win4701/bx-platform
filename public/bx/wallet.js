
/* =========================================================
   BLOXIO WALLET ENTERPRISE 2026
   Unified Wallet Engine V2
   Guest Browsing + Authenticated Wallet
   API Engine Compatible
   Preserves Existing DOM IDs and CSS Classes
========================================================= */

(function () {
"use strict";

/* =========================================================
   CONFIG
========================================================= */

const $ = id => document.getElementById(id);

const CONFIG = {
    COINS_PATH: "./data/coins.js",

    // API Engine adds /api automatically.
    API_WALLET: "/wallet",
    API_DEPOSIT: "/payments/create",
    API_WITHDRAW: "/payments/withdraw",
    API_TRANSFER: "/finance/transfer",

    SYNC_INTERVAL: 30000,
    MAX_TRANSACTIONS: 20
};

/* =========================================================
   STATE
========================================================= */

const state = {
    COINS: [],
    balances: {},
    prices: {},
    transactions: [],

    ws: null,
    listeners: [],
    apiListeners: [],

    syncing: false,
    initialized: false,
    authenticated: false,

    activeGroup: "main",
    activeAsset: null,
    search: "",

    coinsReady: false,
    syncTimer: null,
    requestVersion: 0
};

/* =========================================================
   HELPERS
========================================================= */

function safe(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function token() {
    try {
        if (window.API && typeof window.API.token === "function") {
            return window.API.token() || "";
        }

        return (
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token") ||
            ""
        );
    } catch {
        return "";
    }
}

function isAuthenticated() {
    return Boolean(token());
}

function notify(message) {
    const element = $("walletStatus");

    if (!element) {
        console.info("[WALLET]", message);
        return;
    }

    element.textContent = message;
    element.classList.remove("hidden");

    clearTimeout(notify.timer);

    notify.timer = setTimeout(() => {
        element.classList.add("hidden");
    }, 3000);
}

function setStatus(id, message) {
    const element = $(id);

    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");
}

function hideStatus(id) {
    const element = $(id);

    if (element) {
        element.classList.add("hidden");
    }
}

function getBalance(symbol) {
    return safe(state.balances[String(symbol).toUpperCase()]);
}

function getPrice(symbol) {
    const key = String(symbol).toUpperCase();
    const livePrice = state.prices[key];

    if (
        livePrice !== undefined &&
        Number.isFinite(Number(livePrice))
    ) {
        return Number(livePrice);
    }

    const coin = getCoin(key);

    return coin && Number.isFinite(Number(coin.price))
        ? Number(coin.price)
        : 0;
}

function getCoin(symbol) {
    const key = String(symbol || "").toUpperCase();

    return state.COINS.find(
        coin => String(coin.symbol).toUpperCase() === key
    ) || null;
}

function clearWalletData() {
    state.balances = {};
    state.prices = {};
    state.transactions = [];

    renderBalances();
}

function requireAuth() {
    if (isAuthenticated()) {
        state.authenticated = true;
        return true;
    }

    state.authenticated = false;

    notify("Please login to use your wallet");

    if (window.AUTH && typeof window.AUTH.openAuth === "function") {
        window.AUTH.openAuth("login");
    } else {
        $("headerLoginBtn")?.click();
    }

    return false;
}

function normalizeResponse(response) {
    if (!response || typeof response !== "object") {
        throw new Error("Invalid server response");
    }

    if (response.error) {
        throw new Error(
            response.error.message ||
            response.error ||
            "Request failed"
        );
    }

    if (response.success === false) {
        throw new Error(
            response.message ||
            response.error ||
            "Request failed"
        );
    }

    return response.data &&
        typeof response.data === "object"
        ? response.data
        : response;
}

/* =========================================================
   COIN REGISTRY
========================================================= */

async function loadCoins() {
    if (state.coinsReady) return true;

    try {
        const registry = await import(CONFIG.COINS_PATH);

        if (!Array.isArray(registry.COINS)) {
            throw new Error("Invalid coin registry");
        }

        state.COINS = registry.COINS.filter(
            coin =>
                coin &&
                coin.symbol &&
                coin.wallet !== false
        );

        state.coinsReady = true;

        return true;

    } catch (error) {
        console.error("[WALLET COINS]", error);
        notify("Unable to load wallet assets");

        return false;
    }
}

/* =========================================================
   ASSET FILTERS
========================================================= */

function getGroupAssets() {
    const coins = state.COINS;

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
                coin => coin.type === "stable"
            );

        case "defi": {
            const defiTypes = new Set(["defi"]);

            const defiSymbols = new Set([
                "AAVE", "UNI", "MKR", "SNX",
                "1INCH", "YFI", "CAKE", "GMX"
            ]);

            return coins.filter(coin =>
                defiTypes.has(coin.type) ||
                defiSymbols.has(coin.symbol)
            );
        }

        case "gaming":
            return coins.filter(
                coin => coin.casino === true
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

    if (state.search) {
        const query = state.search.toLowerCase();

        assets = assets.filter(coin => {
            const symbol = String(coin.symbol || "").toLowerCase();
            const name = String(coin.name || "").toLowerCase();

            return (
                symbol.includes(query) ||
                name.includes(query)
            );
        });
    }

    return assets;
}

/* =========================================================
   ASSET CARD
========================================================= */

function buildAssetCard(asset) {
    const card = document.createElement("div");

    card.className = "wallet-asset-card";
    card.dataset.symbol = asset.symbol;
    card.dataset.group = asset.category || "";

    const icon = document.createElement("img");

    icon.src = asset.icon || "";
    icon.alt = asset.symbol;
    icon.loading = "lazy";

    const meta = document.createElement("div");
    meta.className = "asset-meta";

    const symbol = document.createElement("strong");
    symbol.textContent = asset.symbol;

    const name = document.createElement("span");
    name.textContent = asset.name || asset.symbol;

    meta.append(symbol, name);

    const balance = document.createElement("div");
    balance.className = "asset-balance";

    balance.textContent = state.authenticated
        ? getBalance(asset.symbol).toFixed(4)
        : "—";

    card.append(icon, meta, balance);

    return card;
}

/* =========================================================
   RENDER ASSETS
========================================================= */

function renderAssets() {
    const container = $("walletAssetsContainer");

    if (!container) return;

    const assets = getVisibleAssets();
    const fragment = document.createDocumentFragment();

    assets.forEach(asset => {
        fragment.appendChild(buildAssetCard(asset));
    });

    container.replaceChildren(fragment);

    updateAssetCount(assets);
}

function updateAssetCount(assets) {
    const count = $("walletAssetCount");

    if (count) {
        count.textContent = String(assets.length);
    }

    const active = $("walletActiveAssets");

    if (active) {
        active.textContent = state.authenticated
            ? String(
                assets.filter(asset =>
                    getBalance(asset.symbol) > 0
                ).length
            )
            : "—";
    }
}

/* =========================================================
   WALLET TOTAL
========================================================= */

function renderWalletTotal() {
    let total = 0;
    let active = 0;

    if (state.authenticated) {
        Object.entries(state.balances).forEach(
            ([symbol, balance]) => {
                const amount = safe(balance);

                if (amount > 0) active++;

                total += amount * getPrice(symbol);
            }
        );
    }

    const element = $("walletTotal");

    if (element) {
        element.textContent = state.authenticated
            ? "$" + total.toFixed(2)
            : "—";
    }

    const activeElement = $("walletActiveAssets");

    if (activeElement) {
        activeElement.textContent = state.authenticated
            ? String(active)
            : "—";
    }

    const bx = $("bal-bx");
    const xbc = $("bal-xbc");

    if (bx) {
        bx.textContent = state.authenticated
            ? getBalance("BX").toFixed(4)
            : "—";
    }

    if (xbc) {
        xbc.textContent = state.authenticated
            ? getBalance("XBC").toFixed(4)
            : "—";
    }
}

/* =========================================================
   RENDER TRANSACTIONS
========================================================= */

function renderTransactions() {
    const container = $("walletTransactions");

    if (!container) return;

    container.replaceChildren();

    if (!state.authenticated) return;

    state.transactions
        .slice(0, CONFIG.MAX_TRANSACTIONS)
        .forEach(transaction => {
            const row = document.createElement("div");

            row.className = "wallet-transaction";

            const title = document.createElement("strong");

            title.textContent =
                transaction.type || "Transaction";

            const detail = document.createElement("span");

            detail.textContent = [
                transaction.asset || "",
                transaction.amount ?? ""
            ].join(" ");

            row.append(title, detail);
            container.appendChild(row);
        });
}

/* =========================================================
   RENDER ALL
========================================================= */

function renderBalances() {
    renderAssets();
    renderWalletTotal();
    renderTransactions();
}

/* =========================================================
   FILTER BUTTONS
========================================================= */

function bindCategories() {
    const tabs = {
        walletTabMain: "main",
        walletTabMarket: "market",
        walletTabStable: "stable",
        walletTabDefi: "defi",
        walletTabGaming: "gaming",
        walletTabAll: "all"
    };

    Object.entries(tabs).forEach(([id, group]) => {
        const button = $(id);

        if (!button || button.dataset.walletBound) return;

        button.dataset.walletBound = "true";

        button.addEventListener("click", () => {
            state.activeGroup = group;

            Object.keys(tabs).forEach(tabId => {
                const element = $(tabId);

                if (element) {
                    element.classList.toggle(
                        "active",
                        tabId === id
                    );
                }
            });

            renderAssets();
        });
    });
}

/* =========================================================
   SEARCH
========================================================= */

function bindSearch() {
    const input = $("walletAssetSearch");

    if (!input || input.dataset.walletBound) return;

    input.dataset.walletBound = "true";

    input.addEventListener("input", () => {
        state.search = input.value.trim();
        renderAssets();
    });
}

/* =========================================================
   ASSET SELECTION
========================================================= */

function openAssetSheet(symbol) {
    const asset = getCoin(symbol);

    if (!asset) return;

    state.activeAsset = asset;

    const icon = $("assetSheetIcon");
    const symbolElement = $("assetSheetSymbol");
    const nameElement = $("assetSheetName");
    const quickName = $("walletQuickAssetName");

    if (icon) icon.src = asset.icon || "";

    if (symbolElement) {
        symbolElement.textContent = asset.symbol;
    }

    if (nameElement) {
        nameElement.textContent = asset.name || asset.symbol;
    }

    if (quickName) {
        quickName.textContent =
            `${asset.name || asset.symbol} (${asset.symbol})`;
    }

    renderNetworks(asset.symbol);

    const quickSheet = $("walletQuickSheet");

    if (quickSheet) {
        quickSheet.classList.remove("wallet-hidden");
    }
}

/* =========================================================
   NETWORKS
========================================================= */

function renderNetworks(symbol) {
    const asset = getCoin(symbol);

    if (!asset) return;

    const deposit = $("depositNetwork");
    const withdraw = $("withdrawNetwork");

    [deposit, withdraw].forEach(select => {
        if (!select || !Array.isArray(asset.networks)) return;

        const previous = select.value;

        select.replaceChildren();

        asset.networks.forEach(network => {
            const option = document.createElement("option");

            option.value = network;
            option.textContent = network;

            select.appendChild(option);
        });

        if (asset.networks.includes(previous)) {
            select.value = previous;
        }
    });
}

/* =========================================================
   WALLET PANELS
========================================================= */

function openPanel(id) {
    const panel = $(id);

    if (!panel) return;

    panel.classList.remove("wallet-hidden");
}

function closePanel(id) {
    const panel = $(id);

    if (!panel) return;

    panel.classList.add("wallet-hidden");
}

function bindPanels() {
    if (state.panelsBound) return;

    state.panelsBound = true;

    document.addEventListener("click", event => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const openButton = target.closest("[data-wallet-open]");
        const closeButton = target.closest("[data-wallet-close]");

        if (openButton) {
            if (!requireAuth()) return;

            openPanel(openButton.dataset.walletOpen);
        }

        if (closeButton) {
            closePanel(closeButton.dataset.walletClose);
        }
    });
}

/* =========================================================
   API REQUEST
========================================================= */

async function request(method, url, body) {
    if (!window.API) {
        throw new Error("API Engine is unavailable");
    }

    const apiMethod = window.API[method];

    if (typeof apiMethod !== "function") {
        throw new Error(`API method ${method} is unavailable`);
    }

    const options = {
        auth: true,
        cache: false
    };

    const response = method === "get"
        ? await apiMethod.call(window.API, url, options)
        : await apiMethod.call(window.API, url, body, options);

    return normalizeResponse(response);
}

/* =========================================================
   WALLET SYNC
========================================================= */

async function syncWallet() {
    if (state.syncing) return;

    if (!isAuthenticated()) {
        state.authenticated = false;
        clearWalletData();
        return;
    }

    state.authenticated = true;
    state.syncing = true;

    const version = ++state.requestVersion;

    try {
        const data = await request(
            "get",
            CONFIG.API_WALLET
        );

        // Ignore stale responses after logout.
        if (
            version !== state.requestVersion ||
            !isAuthenticated()
        ) {
            return;
        }

        if (
            data.balances &&
            typeof data.balances === "object"
        ) {
            state.balances = data.balances;
        }

        if (
            data.prices &&
            typeof data.prices === "object"
        ) {
            state.prices = {
                ...state.prices,
                ...data.prices
            };
        }

        if (Array.isArray(data.transactions)) {
            state.transactions = data.transactions;
        }

        renderBalances();

        const lastSync = $("walletLastSync");

        if (lastSync) {
            lastSync.textContent =
                new Date().toLocaleTimeString();
        }

        hideStatus("walletStatus");

    } catch (error) {
        console.error("[WALLET SYNC]", error);

        if (
            error.message &&
            /401|unauthorized|session expired/i.test(error.message)
        ) {
            handleLogout();
        } else {
            notify(error.message || "Wallet sync unavailable");
        }

    } finally {
        state.syncing = false;
    }
}

/* =========================================================
   AUTH STATE
========================================================= */

function handleLogin() {
    if (!isAuthenticated()) return;

    state.authenticated = true;

    syncWallet();
    startSyncTimer();
}

function handleLogout() {
    state.authenticated = false;
    state.requestVersion++;

    stopSyncTimer();

    state.balances = {};
    state.prices = {};
    state.transactions = {};

    state.transactions = [];

    disconnectWS();
    renderBalances();

    hideStatus("depositStatus");
    hideStatus("withdrawStatus");
    hideStatus("transferStatus");
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

function stopSyncTimer() {
    if (state.syncTimer) {
        clearInterval(state.syncTimer);
        state.syncTimer = null;
    }
}

function bindAuthEvents() {
    if (!window.API || typeof window.API.on !== "function") {
        return;
    }

    const on = (event, callback) => {
        const unsubscribe = window.API.on(event, callback);

        if (typeof unsubscribe === "function") {
            state.apiListeners.push(unsubscribe);
        }
    };

    on("auth:logout", handleLogout);
    on("auth:login", handleLogin);
}

/* =========================================================
   SOCKET ADAPTER
========================================================= */

function disconnectWS() {
    if (state.ws && typeof state.ws.unsubscribe === "function") {
        try {
            state.ws.unsubscribe("wallet");
        } catch (error) {
            console.warn("[WALLET WS]", error);
        }
    }

    state.listeners.forEach(unsubscribe => {
        try {
            unsubscribe();
        } catch (error) {
            console.warn("[WALLET WS]", error);
        }
    });

    state.listeners = [];
    state.ws = null;
}

function connectWS() {
    if (!state.authenticated || !isAuthenticated()) return;

    if (!window.WS) {
        console.warn("[WALLET] WS adapter not available");
        return;
    }

    if (state.ws) return;

    state.ws = window.WS;

    if (typeof state.ws.connect === "function") {
        state.ws.connect();
    }

    if (typeof state.ws.subscribe === "function") {
        state.ws.subscribe("wallet");
    }

    const register = (event, callback) => {
        if (typeof state.ws.on !== "function") return;

        const unsubscribe = state.ws.on(event, callback);

        if (typeof unsubscribe === "function") {
            state.listeners.push(unsubscribe);
        }
    };

    register("wallet:update", data => {
        if (!data || !isAuthenticated()) return;

        if (data.balances) {
            state.balances = data.balances;
        }

        if (data.prices) {
            state.prices = {
                ...state.prices,
                ...data.prices
            };
        }

        if (Array.isArray(data.transactions)) {
            state.transactions = data.transactions;
        }

        renderBalances();
    });

    register("market:update", data => {
        if (!data || !isAuthenticated()) return;

        if (data.prices) {
            state.prices = {
                ...state.prices,
                ...data.prices
            };
        }

        renderWalletTotal();
    });

    register("deposit:confirmed", () => {
        notify("Deposit Confirmed");
        syncWallet();
    });

    register("transfer:received", () => {
        notify("Transfer Received");
        syncWallet();
    });

    register("airdrop:update", () => {
        syncWallet();
    });
}

/* =========================================================
   DEPOSIT
========================================================= */

async function handleDeposit() {
    if (!requireAuth()) return;

    const asset = $("depositAsset")?.value;
    const network = $("depositNetwork")?.value;
    const memo = $("depositMemo")?.value?.trim() || "";
    const destination =
        $("depositDestination")?.value?.trim() || "";

    if (!asset || !getCoin(asset)) {
        notify("Select a valid asset first");
        return;
    }

    setStatus("depositStatus", "Generating address...");

    try {
        const data = await request(
            "post",
            CONFIG.API_DEPOSIT,
            {
                asset,
                network,
                memo,
                destination
            }
        );

        if (!data.address) {
            throw new Error("Deposit address unavailable");
        }

        const address = $("depositAddressText");

        if (address) {
            address.textContent = data.address;
        }

        notify("Deposit Address Generated");

    } catch (error) {
        console.error("[DEPOSIT]", error);
        setStatus("depositStatus", error.message);
    }
}

/* =========================================================
   WITHDRAW
========================================================= */

async function handleWithdraw() {
    if (!requireAuth()) return;

    const asset = $("withdrawAsset")?.value;
    const network = $("withdrawNetwork")?.value;
    const amount = safe($("withdrawAmount")?.value);
    const address = $("withdrawAddress")?.value?.trim();
    const memo = $("withdrawMemo")?.value?.trim() || "";

    if (
        !asset ||
        !getCoin(asset) ||
        amount <= 0 ||
        !address
    ) {
        notify("Invalid withdrawal details");
        return;
    }

    if (amount > getBalance(asset)) {
        notify("Insufficient balance");
        return;
    }

    setStatus("withdrawStatus", "Processing withdrawal...");

    try {
        await request(
            "post",
            CONFIG.API_WITHDRAW,
            {
                asset,
                network,
                amount,
                address,
                memo
            }
        );

        notify("Withdrawal Request Submitted");

        await syncWallet();

    } catch (error) {
        console.error("[WITHDRAW]", error);
        setStatus("withdrawStatus", error.message);
    }
}

/* =========================================================
   TRANSFER
========================================================= */

async function handleTransfer() {
    if (!requireAuth()) return;

    const asset = $("transferAsset")?.value;
    const amount = safe($("transferAmount")?.value);
    const to = $("transferUser")?.value?.trim();

    if (
        !asset ||
        !getCoin(asset) ||
        amount <= 0 ||
        !to
    ) {
        notify("Invalid transfer details");
        return;
    }

    if (amount > getBalance(asset)) {
        notify("Insufficient balance");
        return;
    }

    setStatus("transferStatus", "Processing transfer...");

    try {
        await request(
            "post",
            CONFIG.API_TRANSFER,
            {
                asset,
                amount,
                to
            }
        );

        notify("Transfer Submitted");

        await syncWallet();

    } catch (error) {
        console.error("[TRANSFER]", error);
        setStatus("transferStatus", error.message);
    }
}

/* =========================================================
   SWAP
========================================================= */

function launchSwap() {
    if (!requireAuth()) return;

    if (!state.activeAsset) {
        notify("Select an asset first");
        return;
    }

    const from = $("swapFromAsset");
    const to = $("swapToAsset");

    if (from) {
        from.value = state.activeAsset.symbol;
    }

    if (to && state.activeAsset.symbol !== "BX") {
        to.value = "BX";
    }
}

/* =========================================================
   SELECT OPTIONS
========================================================= */

function populateSelect(id, assets) {
    const select = $(id);

    if (!select) return;

    const previous = select.value;

    select.replaceChildren();

    assets.forEach(asset => {
        const option = document.createElement("option");

        option.value = asset.symbol;
        option.textContent =
            `${asset.symbol} — ${asset.name || asset.symbol}`;

        select.appendChild(option);
    });

    if (assets.some(asset => asset.symbol === previous)) {
        select.value = previous;
    }
}

function populateWalletSelects() {
    const walletCoins = state.COINS.filter(
        coin => coin.wallet !== false
    );

    const swapCoins = state.COINS.filter(
        coin => coin.swap === true
    );

    populateSelect("depositAsset", walletCoins);
    populateSelect("withdrawAsset", walletCoins);
    populateSelect("transferAsset", walletCoins);
    populateSelect("swapFromAsset", swapCoins);
}

/* =========================================================
   EVENT DELEGATION
========================================================= */

function bindActions() {
    if (state.actionsBound) return;

    state.actionsBound = true;

    document.addEventListener("click", event => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const card = target.closest(".wallet-asset-card");

        if (card) {
            openAssetSheet(card.dataset.symbol);
        }

        if (target.closest("#generateDepositBtn")) {
            handleDeposit();
        }

        if (target.closest("#submitWithdrawBtn")) {
            handleWithdraw();
        }

        if (target.closest("#submitTransferBtn")) {
            handleTransfer();
        }

        if (target.closest("#walletQuickSwap")) {
            launchSwap();
        }

        if (target.closest("#walletQuickDeposit")) {
            if (requireAuth()) openPanel("depositPanel");
        }

        if (target.closest("#walletQuickWithdraw")) {
            if (requireAuth()) openPanel("withdrawPanel");
        }

        if (target.closest("#walletQuickTransfer")) {
            if (requireAuth()) openPanel("transferPanel");
        }

        if (target.closest("#copyDepositBtn")) {
            if (!requireAuth()) return;

            const address =
                $("depositAddressText")?.textContent;

            if (
                address &&
                address !== "—" &&
                navigator.clipboard
            ) {
                navigator.clipboard.writeText(address)
                    .then(() => notify("Address Copied"))
                    .catch(() => notify("Unable to copy address"));
            }
        }
    });
}

/* =========================================================
   INIT
========================================================= */

async function init() {
    if (state.initialized) return;

    state.initialized = true;

    const loaded = await loadCoins();

    if (!loaded) {
        state.initialized = false;
        return;
    }

    populateWalletSelects();

    bindCategories();
    bindSearch();
    bindPanels();
    bindActions();
    bindAuthEvents();

    state.authenticated = isAuthenticated();

    renderBalances();

    if (state.authenticated) {
        connectWS();
        syncWallet();
        startSyncTimer();
    } else {
        clearWalletData();
    }

    console.log("[BLOXIO] Wallet Engine Ready");
}

/* =========================================================
   DESTROY
========================================================= */

function destroy() {
    stopSyncTimer();

    state.requestVersion++;

    disconnectWS();

    state.apiListeners.forEach(unsubscribe => {
        try {
            unsubscribe();
        } catch (error) {
            console.warn("[WALLET] API listener cleanup failed", error);
        }
    });

    state.apiListeners = [];

    state.initialized = false;
    state.syncing = false;
}

/* =========================================================
   PUBLIC API
========================================================= */

window.WALLET = {
    init,
    destroy,
    sync: syncWallet,
    render: renderBalances,
    getBalance,
    getCoin,

    onLogin: handleLogin,
    onLogout: handleLogout,

    getState: () => ({
        balances: { ...state.balances },
        prices: { ...state.prices },
        activeGroup: state.activeGroup,
        authenticated: state.authenticated,
        coinsReady: state.coinsReady
    })
};

/* =========================================================
   BOOT
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
        once: true
    });
} else {
    init();
}

})();
