
/* =========================================================
   BLOXIO WALLET ENTERPRISE 2026
   Unified Wallet Engine
   Socket.IO Compatible
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
    API_WALLET: "/api/wallet",
    API_DEPOSIT: "/api/payments/create",
    API_WITHDRAW: "/api/payments/withdraw",
    API_TRANSFER: "/api/finance/transfer"
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
    syncing: false,
    initialized: false,
    activeGroup: "main",
    activeAsset: null,
    search: "",
    coinsReady: false
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
        return localStorage.getItem("token") || "";
    } catch {
        return "";
    }
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
    return safe(state.balances[symbol]);
}

function getPrice(symbol) {
    const livePrice = state.prices[symbol];

    if (Number.isFinite(Number(livePrice))) {
        return Number(livePrice);
    }

    const coin = getCoin(symbol);

    return coin && Number.isFinite(Number(coin.price))
        ? Number(coin.price)
        : 0;
}

function getCoin(symbol) {
    return state.COINS.find(
        coin => coin.symbol === String(symbol).toUpperCase()
    ) || null;
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
            coin => coin && coin.symbol && coin.wallet !== false
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
    const group = state.activeGroup;

    switch (group) {
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
            const defiTypes = new Set([
                "defi"
            ]);

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

        assets = state.COINS.filter(coin => {
            const matches =
                coin.symbol.toLowerCase().includes(query) ||
                String(coin.name || "").toLowerCase().includes(query);

            return matches;
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
    balance.textContent = getBalance(asset.symbol).toFixed(4);

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
        active.textContent = String(
            assets.filter(asset =>
                getBalance(asset.symbol) > 0
            ).length
        );
    }
}

/* =========================================================
   WALLET TOTAL
========================================================= */

function renderWalletTotal() {
    let total = 0;
    let active = 0;

    Object.entries(state.balances).forEach(
        ([symbol, balance]) => {
            const amount = safe(balance);

            if (amount > 0) active++;

            total += amount * getPrice(symbol);
        }
    );

    const element = $("walletTotal");

    if (element) {
        element.textContent = "$" + total.toFixed(2);
    }

    const activeElement = $("walletActiveAssets");

    if (activeElement) {
        activeElement.textContent = String(active);
    }

    const bx = $("bal-bx");
    const xbc = $("bal-xbc");

    if (bx) {
        bx.textContent = getBalance("BX").toFixed(4);
    }

    if (xbc) {
        xbc.textContent = getBalance("XBC").toFixed(4);
    }
}

/* =========================================================
   RENDER TRANSACTIONS
========================================================= */

function renderTransactions() {
    const container = $("walletTransactions");

    if (!container) return;

    container.replaceChildren();

    state.transactions.slice(0, 20).forEach(transaction => {
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

        if (!button) return;

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

    if (!input) return;

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

        select.replaceChildren();

        asset.networks.forEach(network => {
            const option = document.createElement("option");

            option.value = network;
            option.textContent = network;

            select.appendChild(option);
        });
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
    document.addEventListener("click", event => {
        const openButton = event.target.closest("[data-wallet-open]");
        const closeButton = event.target.closest("[data-wallet-close]");

        if (openButton) {
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

async function request(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(token()
            ? { Authorization: `Bearer ${token()}` }
            : {}),
        ...(options.headers || {})
    };

    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        throw new Error("Invalid server response");
    }

    if (!response.ok || data.success === false) {
        throw new Error(
            data.error || `Request failed (${response.status})`
        );
    }

    return data;
}

/* =========================================================
   WALLET SYNC
========================================================= */

async function syncWallet() {
    if (state.syncing) return;

    state.syncing = true;

    try {
        const data = await request(
            CONFIG.API_WALLET,
            { method: "GET" }
        );

        if (data.balances &&
            typeof data.balances === "object") {
            state.balances = data.balances;
        }

        if (data.prices &&
            typeof data.prices === "object") {
            state.prices = data.prices;
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
        notify(error.message || "Wallet sync unavailable");

    } finally {
        state.syncing = false;
    }
}

/* =========================================================
   SOCKET.IO ADAPTER
========================================================= */

function connectWS() {
    if (!window.WS) {
        console.warn("[WALLET] WS adapter not available");
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
        if (typeof state.ws.on !== "function") return;

        const unsubscribe = state.ws.on(event, callback);

        if (typeof unsubscribe === "function") {
            state.listeners.push(unsubscribe);
        }
    };

    register("wallet:update", data => {
        if (!data) return;

        if (data.balances) {
            state.balances = data.balances;
        }

        if (data.prices) {
            state.prices = data.prices;
        }

        if (Array.isArray(data.transactions)) {
            state.transactions = data.transactions;
        }

        renderBalances();
    });

    register("market:update", data => {
        if (!data) return;

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
    const asset = $("depositAsset")?.value;
    const network = $("depositNetwork")?.value;
    const memo = $("depositMemo")?.value?.trim() || "";
    const destination = $("depositDestination")?.value?.trim() || "";

    if (!asset) {
        notify("Select an asset first");
        return;
    }

    setStatus("depositStatus", "Generating address...");

    try {
        const data = await request(CONFIG.API_DEPOSIT, {
            method: "POST",
            body: JSON.stringify({
                asset,
                network,
                memo,
                destination
            })
        });

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
    const asset = $("withdrawAsset")?.value;
    const network = $("withdrawNetwork")?.value;
    const amount = safe($("withdrawAmount")?.value);
    const address = $("withdrawAddress")?.value?.trim();
    const memo = $("withdrawMemo")?.value?.trim() || "";

    if (!asset || amount <= 0 || !address) {
        notify("Invalid withdrawal details");
        return;
    }

    setStatus("withdrawStatus", "Processing withdrawal...");

    try {
        await request(CONFIG.API_WITHDRAW, {
            method: "POST",
            body: JSON.stringify({
                asset,
                network,
                amount,
                address,
                memo
            })
        });

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
    const asset = $("transferAsset")?.value;
    const amount = safe($("transferAmount")?.value);
    const to = $("transferUser")?.value?.trim();

    if (!asset || amount <= 0 || !to) {
        notify("Invalid transfer details");
        return;
    }

    setStatus("transferStatus", "Processing transfer...");

    try {
        await request(CONFIG.API_TRANSFER, {
            method: "POST",
            body: JSON.stringify({
                asset,
                amount,
                to
            })
        });

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
            openPanel("depositPanel");
        }

        if (target.closest("#walletQuickWithdraw")) {
            openPanel("withdrawPanel");
        }

        if (target.closest("#walletQuickTransfer")) {
            openPanel("transferPanel");
        }

        if (target.closest("#copyDepositBtn")) {
            const address = $("depositAddressText")?.textContent;

            if (address && address !== "—" && navigator.clipboard) {
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

    renderBalances();

    connectWS();
    syncWallet();

    console.log("[BLOXIO] Wallet Engine Ready");
}

/* =========================================================
   DESTROY
========================================================= */

function destroy() {
    state.listeners.forEach(unsubscribe => {
        try {
            unsubscribe();
        } catch (error) {
            console.warn("[WALLET] Listener cleanup failed", error);
        }
    });

    state.listeners = [];
    state.initialized = false;
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
    getState: () => ({
        balances: { ...state.balances },
        prices: { ...state.prices },
        activeGroup: state.activeGroup
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
