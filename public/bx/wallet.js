
/* =========================================================
   BLOXIO WALLET ENTERPRISE 2026
   Socket.IO Integrated Edition
   Preserves existing DOM IDs and CSS classes
========================================================= */

import { COINS } from "./data/coins.js";

(function () {

"use strict";

/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const safe = n => {
    const value = Number(n);
    return Number.isFinite(value) ? value : 0;
};

const state = {
    balances: {},
    prices: {},
    ws: null,
    syncing: false,
    activeGroup: "main",
    activeAsset: null,
    initialized: false,
    listeners: []
};

/* =========================================================
   API
========================================================= */

async function api(url, body = {}) {

    const token = (() => {
        try {
            return localStorage.getItem("token") || "";
        } catch {
            return "";
        }
    })();

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify(body)
    });

    let data = {};

    try {
        data = await res.json();
    } catch {
        throw new Error("Invalid server response");
    }

    if (!res.ok) {
        throw new Error(
            data.error || `Request failed (${res.status})`
        );
    }

    return data;
}

/* =========================================================
   ASSET GROUPS
========================================================= */

function getGroupAssets() {

    const groups = {
        main: ["BX", "BTC", "ETH", "USDT"],
        secondary: ["BNB", "SOL", "TON", "LTC"],
        extended: []
    };

    const symbols =
        groups[state.activeGroup] || groups.extended;

    const selected = COINS.filter(asset =>
        symbols.includes(asset.symbol)
    );

    if (state.activeGroup === "extended") {
        return COINS.filter(asset =>
            !groups.main.includes(asset.symbol) &&
            !groups.secondary.includes(asset.symbol)
        );
    }

    return selected;
}

/* =========================================================
   BALANCES
========================================================= */

function getBalance(symbol) {
    return safe(state.balances[symbol]);
}

/* =========================================================
   ASSET CARD
========================================================= */

function buildAssetCard(asset) {

    const balance = getBalance(asset.symbol);

    return `
        <div
            class="wallet-asset-card"
            data-symbol="${asset.symbol}"
            data-group="${asset.group || "extended"}">

            <img
                src="${asset.icon || ""}"
                alt="${asset.symbol}"
                loading="lazy">

            <div class="asset-meta">

                <strong>${asset.symbol}</strong>

                <span>${asset.name || asset.symbol}</span>

            </div>

            <div class="asset-balance">
                ${balance.toFixed(4)}
            </div>

        </div>
    `;
}

/* =========================================================
   RENDER ASSETS
========================================================= */

function renderAssets() {

    const container = $("walletAssetsContainer");

    if (!container) return;

    container.innerHTML =
        getGroupAssets()
            .map(buildAssetCard)
            .join("");
}

/* =========================================================
   WALLET TOTAL
========================================================= */

function renderWalletTotal() {

    let total = 0;

    Object.entries(state.balances).forEach(
        ([symbol, balance]) => {

            const price = safe(state.prices[symbol]);

            total += safe(balance) * price;

        }
    );

    if ($("walletTotal")) {
        $("walletTotal").textContent =
            "$" + total.toFixed(2);
    }
}

/* =========================================================
   RENDER BALANCES
========================================================= */

function renderBalances() {

    renderAssets();
    renderWalletTotal();

}

/* =========================================================
   ASSET SHEET
========================================================= */

function openAssetSheet(symbol) {

    const asset = COINS.find(
        c => c.symbol === symbol
    );

    if (!asset) return;

    state.activeAsset = asset;

    if ($("assetSheetIcon")) {
        $("assetSheetIcon").src = asset.icon || "";
    }

    if ($("assetSheetSymbol")) {
        $("assetSheetSymbol").textContent = asset.symbol;
    }

    if ($("assetSheetName")) {
        $("assetSheetName").textContent = asset.name || asset.symbol;
    }

    renderNetworks(asset.symbol);

}

/* =========================================================
   NETWORKS
========================================================= */

function renderNetworks(symbol) {

    const asset = COINS.find(
        c => c.symbol === symbol
    );

    if (!asset) return;

    const select = $("depositNetwork");

    if (!select || !Array.isArray(asset.networks)) {
        return;
    }

    select.replaceChildren();

    asset.networks.forEach(network => {

        const option = document.createElement("option");

        option.value = network;
        option.textContent = network;

        select.appendChild(option);

    });

}

/* =========================================================
   CATEGORIES
========================================================= */

function bindCategories() {

    document
        .querySelectorAll(".wallet-category-btn")
        .forEach(btn => {

            btn.addEventListener("click", () => {

                document
                    .querySelectorAll(".wallet-category-btn")
                    .forEach(el =>
                        el.classList.remove("active")
                    );

                btn.classList.add("active");

                state.activeGroup =
                    btn.dataset.group || "main";

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

        const q = input.value.toLowerCase().trim();

        const container = $("walletAssetsContainer");

        if (!container) return;

        const results = COINS.filter(asset => {

            return (
                asset.symbol.toLowerCase().includes(q) ||
                (asset.name || "")
                    .toLowerCase()
                    .includes(q)
            );

        });

        container.innerHTML =
            results.map(buildAssetCard).join("");

    });

}

/* =========================================================
   SYNC WALLET
========================================================= */

async function syncWallet() {

    if (state.syncing) return;

    state.syncing = true;

    try {

        const res = await fetch("/api/wallet", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Authorization:
                    `Bearer ${localStorage.getItem("token") || ""}`
            }
        });

        if (!res.ok) {
            throw new Error(`Wallet sync failed: ${res.status}`);
        }

        const data = await res.json();

        if (data.balances &&
            typeof data.balances === "object") {

            state.balances = data.balances;

        }

        if (data.prices &&
            typeof data.prices === "object") {

            state.prices = data.prices;

        }

        renderBalances();

    } catch (err) {

        console.error("[WALLET SYNC]", err);

        toast("Wallet sync failed");

    } finally {

        state.syncing = false;

    }

}

/* =========================================================
   SOCKET.IO
========================================================= */

function connectWS() {

    if (!window.WS) {

        console.error("[WALLET] WS adapter missing");

        return;

    }

    state.ws = window.WS;

    window.WS.connect();

    window.WS.subscribe("wallet");

    const register = (event, callback) => {

        const unsubscribe =
            window.WS.on(event, callback);

        state.listeners.push(unsubscribe);

    };

    register("wallet:update", data => {

        if (!data) return;

        state.balances =
            data.balances || state.balances;

        state.prices =
            data.prices || state.prices;

        renderBalances();

    });

    register("market:update", data => {

        if (!data) return;

        if (data.prices) {
            state.prices = data.prices;
        }

        renderWalletTotal();

    });

    register("deposit:confirmed", () => {

        toast("Deposit Confirmed");

        syncWallet();

    });

    register("transfer:received", () => {

        toast("Transfer Received");

        syncWallet();

    });

    register("airdrop:claim", data => {

        if (!data || !Number.isFinite(Number(data.amount))) {
            syncWallet();
            return;
        }

        state.balances.BX =
            getBalance("BX") + safe(data.amount);

        renderBalances();

    });

}

/* =========================================================
   DEPOSIT
========================================================= */

async function handleDeposit() {

    const asset = $("depositAsset")?.value;

    const amount = safe($("depositAmount")?.value);

    if (!asset || amount <= 0) {
        toast("Invalid deposit details");
        return;
    }

    setStatus("depositStatus", "Generating...");

    try {

        const data = await api(
            "/api/payments/create",
            { asset, amount }
        );

        if (!data.address) {
            throw new Error(data.error || "Address unavailable");
        }

        $("depositAddressText").textContent =
            data.address;

        toast("Address Generated");

    } catch (err) {

        console.error("[DEPOSIT]", err);
        toast(err.message || "Deposit Error");

    }

}

/* =========================================================
   WITHDRAW
========================================================= */

async function handleWithdraw() {

    const asset = $("withdrawAsset")?.value;

    const amount = safe($("withdrawAmount")?.value);

    const address =
        $("withdrawAddress")?.value?.trim();

    if (!asset || amount <= 0 || !address) {
        toast("Invalid withdrawal details");
        return;
    }

    setStatus("withdrawStatus", "Processing...");

    try {

        const data = await api(
            "/api/payments/withdraw",
            { asset, amount, address }
        );

        if (data.error) {
            throw new Error(data.error);
        }

        toast("Withdraw Request Submitted");

        await syncWallet();

    } catch (err) {

        console.error("[WITHDRAW]", err);
        toast(err.message || "Withdraw Error");

    }

}

/* =========================================================
   TRANSFER
========================================================= */

async function handleTransfer() {

    const asset =
        $("transferAsset")?.value || "BX";

    const amount =
        safe($("transferAmount")?.value);

    const to =
        $("transferUser")?.value?.trim();

    if (!asset || amount <= 0 || !to) {
        toast("Invalid transfer details");
        return;
    }

    setStatus("transferStatus", "Processing...");

    try {

        const data = await api(
            "/api/finance/transfer",
            { asset, amount, to }
        );

        if (data.error) {
            throw new Error(data.error);
        }

        toast("Transfer Submitted");

        await syncWallet();

    } catch (err) {

        console.error("[TRANSFER]", err);
        toast(err.message || "Transfer Error");

    }

}

/* =========================================================
   SWAP
========================================================= */

function launchSwap() {

    if (!state.activeAsset) return;

    if (state.activeAsset.symbol === "BX") return;

    if ($("swapFromAsset")) {
        $("swapFromAsset").value =
            state.activeAsset.symbol;
    }

    if ($("swapToAsset")) {
        $("swapToAsset").value = "BX";
    }

}

/* =========================================================
   TOAST
========================================================= */

function toast(msg) {

    const el = $("walletStatus");

    if (!el) return;

    el.textContent = msg;

    el.classList.remove("hidden");

    setTimeout(() => {
        el.classList.add("hidden");
    }, 2500);

}

/* =========================================================
   STATUS
========================================================= */

function setStatus(id, msg) {

    const el = $(id);

    if (!el) return;

    el.textContent = msg;

    el.classList.remove("hidden");

}

/* =========================================================
   BIND EVENTS
========================================================= */

function bind() {

    document.addEventListener("click", e => {

        const card =
            e.target.closest(".wallet-asset-card");

        if (card) {
            openAssetSheet(card.dataset.symbol);
        }

        if (e.target.closest("#generateDepositBtn")) {
            handleDeposit();
        }

        if (e.target.closest("#submitWithdrawBtn")) {
            handleWithdraw();
        }

        if (e.target.closest("#submitTransferBtn")) {
            handleTransfer();
        }

        if (e.target.closest("#walletQuickSwap")) {
            launchSwap();
        }

    });

}

/* =========================================================
   INIT
========================================================= */

function init() {

    if (state.initialized) return;

    state.initialized = true;

    bind();
    bindSearch();
    bindCategories();

    renderAssets();

    connectWS();
    syncWallet();

    console.log(
        "🚀 BLOXIO WALLET ENTERPRISE READY"
    );

}

/* =========================================================
   CLEANUP
========================================================= */

function destroy() {

    state.listeners.forEach(unsubscribe => {

        if (typeof unsubscribe === "function") {
            unsubscribe();
        }

    });

    state.listeners = [];

    state.initialized = false;

}

/* =========================================================
   BOOT
========================================================= */

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
