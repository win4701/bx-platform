
/* ==========================================================================
   BLOXIO SWAP ENGINE
   Version: 5.0
   File: public/assets/js/swap.js

   Registry:
   /bx/data/coins.js

   HTML:
   #bloxioSwap

   Features:
   - Dynamic token selection
   - Token search
   - Token images and names
   - Swap pair reversal
   - USDT reference calculation
   - Fee and slippage calculation
   - Responsive dropdown interaction
   - Wallet integration events
   - Public JavaScript API

   Security:
   - No fabricated token prices
   - No simulated blockchain transactions
   ========================================================================== */

import { SWAP_COINS } from "/bx/data/coins.js";

(() => {
    "use strict";

    /* ==============================================================
       01. CONFIGURATION
    ============================================================== */

    const CONFIG = Object.freeze({
        feeRate: 0.003,
        slippage: 0.005,

        defaultFrom: "BX",
        defaultTo: "XBC",

        currency: "USD",

        selectors: {
            root: "bloxioSwap",
            amount: "bxsSwapAmount",
            receive: "bxsSwapReceive",
            execute: "bxsSwapExecute",
            reverse: "bxsSwapReverse"
        }
    });

    const TOTAL_ADJUSTMENT =
        1 - (1 - CONFIG.feeRate) * (1 - CONFIG.slippage);

    /* ==============================================================
       02. HELPERS
    ============================================================== */

    const $ = id => document.getElementById(id);

    const symbol = value =>
        String(value ?? "").trim().toUpperCase();

    const toNumber = value => {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : NaN;
        }

        if (
            typeof value !== "string" ||
            value.trim() === ""
        ) {
            return NaN;
        }

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : NaN;
    };

    const formatNumber = (value, digits = 8) => {
        if (!Number.isFinite(value)) return "—";

        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: digits
        }).format(value);
    };

    const formatUSD = value => {
        if (!Number.isFinite(value)) return "—";

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: CONFIG.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    /* ==============================================================
       03. ROOT AND ELEMENTS
    ============================================================== */

    const root = $(CONFIG.selectors.root);

    if (!root) {
        console.warn("[BLOXIO SWAP] Swap section not found.");
        return;
    }

    if (root.dataset.swapInitialized === "true") {
        return;
    }

    const ui = {
        amount: $("bxsSwapAmount"),
        receive: $("bxsSwapReceive"),

        fromUsd: $("bxsFromUsd"),
        toUsd: $("bxsToUsd"),

        rate: $("bxsSwapRate"),
        deduction: $("bxsSwapDeduction"),

        message: $("bxsSwapMessage"),

        execute: $("bxsSwapExecute"),
        reverse: $("bxsSwapReverse")
    };

    const sides = {
        from: {
            trigger: $("bxsFromTrigger"),
            menu: $("bxsFromMenu"),
            search: $("bxsFromSearch"),
            options: $("bxsFromOptions"),

            icon: $("bxsFromIcon"),
            symbol: $("bxsFromSymbol"),
            name: $("bxsFromName")
        },

        to: {
            trigger: $("bxsToTrigger"),
            menu: $("bxsToMenu"),
            search: $("bxsToSearch"),
            options: $("bxsToOptions"),

            icon: $("bxsToIcon"),
            symbol: $("bxsToSymbol"),
            name: $("bxsToName")
        }
    };

    const requiredElements = [
        ...Object.values(ui),
        ...Object.values(sides).flatMap(side =>
            Object.values(side)
        )
    ];

    if (requiredElements.some(element => !element)) {
        console.error(
            "[BLOXIO SWAP] Required HTML elements are missing."
        );

        return;
    }

    /* ==============================================================
       04. COIN REGISTRY
    ============================================================== */

    const coins = (
        Array.isArray(SWAP_COINS)
            ? SWAP_COINS
            : []
    )
        .filter(coin =>
            coin &&
            coin.swap === true &&
            coin.symbol &&
            coin.name
        )
        .map(coin => {
            const price = toNumber(
                coin.priceInUSDT ?? coin.price
            );

            return {
                ...coin,

                symbol: symbol(coin.symbol),

                name: String(coin.name),

                icon: typeof coin.icon === "string"
                    ? coin.icon.trim()
                    : "",

                price: Number.isFinite(price) && price > 0
                    ? price
                    : null
            };
        });

    const coinMap = new Map(
        coins.map(coin => [
            coin.symbol,
            coin
        ])
    );

    if (coins.length < 2) {
        console.error(
            "[BLOXIO SWAP] SWAP_COINS must contain at least two assets."
        );

        return;
    }

    const getCoin = key =>
        coinMap.get(symbol(key)) || null;

    const getPrice = key =>
        getCoin(key)?.price ?? null;

    /* ==============================================================
       05. STATE
    ============================================================== */

    const state = {
        from: getCoin(CONFIG.defaultFrom)
            ? CONFIG.defaultFrom
            : coins[0].symbol,

        to: getCoin(CONFIG.defaultTo)
            ? CONFIG.defaultTo
            : coins[1].symbol,

        openMenu: null,

        quote: null,

        initialized: false
    };

    if (state.from === state.to) {
        state.to = coins.find(
            coin => coin.symbol !== state.from
        ).symbol;
    }

    /* ==============================================================
       06. MESSAGE SYSTEM
    ============================================================== */

    function setMessage(text = "", type = "info") {
        ui.message.textContent = text;

        ui.message.dataset.state = type;

        ui.message.hidden = !text;

        ui.message.classList.toggle(
            "success",
            type === "success"
        );

        ui.message.classList.toggle(
            "warning",
            type === "warning"
        );

        ui.message.classList.toggle(
            "error",
            type === "error"
        );
    }

    /* ==============================================================
       07. TOKEN ICON
    ============================================================== */

    function updateIcon(image, coin) {
        image.onerror = null;

        image.alt = coin.symbol;

        if (!coin.icon) {
            image.style.visibility = "hidden";
            return;
        }

        image.style.visibility = "visible";

        image.onerror = () => {
            image.onerror = null;
            image.style.visibility = "hidden";
        };

        image.src = coin.icon;
    }

    /* ==============================================================
       08. RENDER SELECTED TOKEN
    ============================================================== */

    function renderSelected(sideName) {
        const side = sides[sideName];

        const coin = getCoin(state[sideName]);

        if (!coin) return;

        updateIcon(side.icon, coin);

        side.symbol.textContent = coin.symbol;

        side.name.textContent = coin.name;

        side.trigger.setAttribute(
            "aria-expanded",
            String(state.openMenu === sideName)
        );

        side.trigger.setAttribute(
            "aria-label",
            `Selected ${coin.symbol}. Choose another asset.`
        );
    }

    function renderAllSelected() {
        renderSelected("from");
        renderSelected("to");
    }

    /* ==============================================================
       09. TOKEN OPTION CREATION
    ============================================================== */

    function createTokenOption(coin, sideName) {
        const button = document.createElement("button");

        button.type = "button";

        button.className = "bxs-swap-option";

        button.dataset.symbol = coin.symbol;

        button.setAttribute("role", "option");

        const selected =
            state[sideName] === coin.symbol;

        const otherSide =
            sideName === "from" ? "to" : "from";

        const conflict =
            state[otherSide] === coin.symbol;

        button.setAttribute(
            "aria-selected",
            String(selected)
        );

        button.disabled = conflict;

        /* ICON */

        if (coin.icon) {
            const image = document.createElement("img");

            image.src = coin.icon;

            image.alt = "";

            image.loading = "lazy";

            image.onerror = () => {
                image.style.visibility = "hidden";
            };

            button.appendChild(image);
        }

        /* NAME AND SYMBOL */

        const copy = document.createElement("span");

        copy.className = "bxs-swap-option-copy";

        const ticker = document.createElement("strong");

        ticker.textContent = coin.symbol;

        const name = document.createElement("small");

        name.textContent = coin.name;

        copy.append(ticker, name);

        button.appendChild(copy);

        /* PRICE STATUS */

        if (coin.price === null) {
            const priceStatus = document.createElement("small");

            priceStatus.className = "bxs-swap-no-price";

            priceStatus.textContent = "No price";

            button.appendChild(priceStatus);
        }

        return button;
    }

    /* ==============================================================
       10. RENDER TOKEN LIST
    ============================================================== */

    function renderOptions(sideName) {
        const side = sides[sideName];

        const query = side.search.value
            .trim()
            .toLowerCase();

        const filtered = coins.filter(coin => {
            const searchable =
                `${coin.symbol} ${coin.name}`.toLowerCase();

            return searchable.includes(query);
        });

        side.options.replaceChildren();

        if (!filtered.length) {
            const empty = document.createElement("div");

            empty.className = "bxs-swap-empty";

            empty.textContent = "No matching assets found.";

            side.options.appendChild(empty);

            return;
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach(coin => {
            fragment.appendChild(
                createTokenOption(coin, sideName)
            );
        });

        side.options.appendChild(fragment);
    }

    function renderAllOptions() {
        renderOptions("from");
        renderOptions("to");
    }

    /* ==============================================================
       11. MENU OPEN / CLOSE
    ============================================================== */

    function closeMenus() {
        Object.entries(sides).forEach(([name, side]) => {
            side.menu.hidden = true;

            side.menu.classList.remove("is-open");

            side.trigger.setAttribute(
                "aria-expanded",
                "false"
            );
        });

        state.openMenu = null;
    }

    function openMenu(sideName) {
        const side = sides[sideName];

        if (!side) return;

        closeMenus();

        side.menu.hidden = false;

        side.menu.classList.add("is-open");

        side.trigger.setAttribute(
            "aria-expanded",
            "true"
        );

        state.openMenu = sideName;

        side.search.value = "";

        renderOptions(sideName);

        requestAnimationFrame(() => {
            side.search.focus();
        });
    }

    function toggleMenu(sideName) {
        if (state.openMenu === sideName) {
            closeMenus();
        } else {
            openMenu(sideName);
        }
    }

    /* ==============================================================
       12. SELECT TOKEN
    ============================================================== */

    function selectToken(sideName, key) {
        const selected = symbol(key);

        const coin = getCoin(selected);

        if (!coin) return false;

        const otherSide =
            sideName === "from" ? "to" : "from";

        if (selected === state[otherSide]) {
            setMessage(
                "The same asset cannot be selected on both sides.",
                "warning"
            );

            return false;
        }

        state[sideName] = selected;

        closeMenus();

        renderAllSelected();

        renderAllOptions();

        updateQuote();

        return true;
    }

    /* ==============================================================
       13. REVERSE PAIR
    ============================================================== */

    function reversePair() {
        const previousFrom = state.from;

        state.from = state.to;

        state.to = previousFrom;

        closeMenus();

        renderAllSelected();

        renderAllOptions();

        updateQuote();
    }

    /* ==============================================================
       14. EXCHANGE RATE
    ============================================================== */

    function calculateRate() {
        const fromPrice = getPrice(state.from);

        const toPrice = getPrice(state.to);

        if (
            fromPrice === null ||
            toPrice === null ||
            toPrice <= 0
        ) {
            return null;
        }

        return fromPrice / toPrice;
    }

    /* ==============================================================
       15. QUOTE CALCULATION
    ============================================================== */

    function calculateQuote() {
        const from = getCoin(state.from);

        const to = getCoin(state.to);

        const amountText = ui.amount.value.trim();

        const amount = toNumber(amountText);

        if (!from || !to) {
            return {
                error: "Choose both assets."
            };
        }

        if (from.symbol === to.symbol) {
            return {
                error: "Choose two different assets."
            };
        }

        if (!amountText) {
            return {
                empty: true
            };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                error: "Enter an amount greater than zero."
            };
        }

        if (
            from.price === null ||
            to.price === null
        ) {
            return {
                error:
                    `A reliable price is unavailable for ${
                        from.price === null
                            ? from.symbol
                            : to.symbol
                    }.`
            };
        }

        const fromValue = amount * from.price;

        const rate = from.price / to.price;

        const grossReceive = fromValue / to.price;

        const fee = grossReceive * CONFIG.feeRate;

        const afterFee = grossReceive - fee;

        const slippage = afterFee * CONFIG.slippage;

        const receive = afterFee - slippage;

        if (
            !Number.isFinite(receive) ||
            receive <= 0
        ) {
            return {
                error: "Unable to calculate a valid quote."
            };
        }

        return {
            from,
            to,

            amount,

            fromValue,

            rate,

            grossReceive,

            fee,

            slippage,

            receive,

            receiveValue: receive * to.price
        };
    }

    /* ==============================================================
       16. UPDATE QUOTE UI
    ============================================================== */

    function updateQuote() {
        ui.receive.readOnly = true;

        ui.receive.setAttribute(
            "aria-readonly",
            "true"
        );

        ui.deduction.textContent =
            `${(TOTAL_ADJUSTMENT * 100).toFixed(4)}%`;

        const fromPrice = getPrice(state.from);

        const toPrice = getPrice(state.to);

        const amount = toNumber(ui.amount.value);

        /* Reference values */

        ui.fromUsd.textContent =
            Number.isFinite(amount) &&
            amount > 0 &&
            fromPrice !== null
                ? formatUSD(amount * fromPrice)
                : "—";

        /* Exchange rate */

        const rate = calculateRate();

        ui.rate.textContent =
            rate !== null
                ? `1 ${state.from} = ${formatNumber(rate)} ${state.to}`
                : "—";

        /* Reset state */

        ui.execute.disabled = true;

        state.quote = null;

        const quote = calculateQuote();

        if (quote.empty) {
            ui.receive.value = "0.00";

            ui.toUsd.textContent = "—";

            setMessage(
                "Choose assets and enter an amount to calculate a quote.",
                "info"
            );

            return null;
        }

        if (quote.error) {
            ui.receive.value = "—";

            ui.toUsd.textContent = "—";

            setMessage(
                quote.error,
                quote.error.includes("price")
                    ? "warning"
                    : "error"
            );

            return null;
        }

        /* Valid quote */

        ui.receive.value = formatNumber(quote.receive);

        ui.toUsd.textContent = formatUSD(quote.receiveValue);

        state.quote = {
            from: quote.from.symbol,
            to: quote.to.symbol,

            amount: quote.amount,

            receive: quote.receive,

            rate: quote.rate,

            fromValue: quote.fromValue,

            receiveValue: quote.receiveValue,

            fee: quote.fee,

            slippage: quote.slippage,

            createdAt: Date.now()
        };

        ui.execute.disabled = false;

        setMessage(
            `Estimated receive: ${formatNumber(quote.receive)} ${quote.to.symbol}.`,
            "success"
        );

        return state.quote;
    }

    /* ==============================================================
       17. EXECUTE BUTTON
    ============================================================== */

    function executeSwap() {
        const quote = updateQuote();

        if (!quote) return;

        /*
         * This frontend currently provides an indicative quote.
         *
         * Real execution requires:
         * 1. Connected wallet.
         * 2. Verified liquidity route.
         * 3. Backend quote validation.
         * 4. Transaction signing.
         * 5. On-chain confirmation.
         */

        setMessage(
            "Quote ready. Connect a wallet and configure a verified liquidity route and transaction service before execution.",
            "warning"
        );

        window.dispatchEvent(
            new CustomEvent("bloxio-swap-preview", {
                detail: {
                    ...quote
                }
            })
        );
    }

    /* ==============================================================
       18. EVENT HANDLERS
    ============================================================== */

    function bindEvents() {

        /*
         * Delegated click handling:
         * One handler manages both token buttons,
         * all dynamically created options and reverse.
         */

        root.addEventListener("click", event => {

            /* FROM / TO BUTTONS */

            const trigger = event.target.closest(
                "#bxsFromTrigger, #bxsToTrigger"
            );

            if (trigger) {
                event.preventDefault();

                const sideName =
                    trigger.id === "bxsFromTrigger"
                        ? "from"
                        : "to";

                toggleMenu(sideName);

                return;
            }

            /* TOKEN OPTION */

            const option = event.target.closest(
                ".bxs-swap-option"
            );

            if (option && root.contains(option)) {
                event.preventDefault();

                if (option.disabled) return;

                const menu = option.closest(
                    "#bxsFromMenu, #bxsToMenu"
                );

                if (!menu) return;

                const sideName =
                    menu.id === "bxsFromMenu"
                        ? "from"
                        : "to";

                selectToken(
                    sideName,
                    option.dataset.symbol
                );

                return;
            }

            /* REVERSE */

            const reverse = event.target.closest(
                "#bxsSwapReverse"
            );

            if (reverse) {
                event.preventDefault();

                reversePair();

                return;
            }

            /* EXECUTE */

            const execute = event.target.closest(
                "#bxsSwapExecute"
            );

            if (execute) {
                event.preventDefault();

                if (!execute.disabled) {
                    executeSwap();
                }
            }
        });

        /* SEARCH INPUTS */

        sides.from.search.addEventListener(
            "input",
            () => renderOptions("from")
        );

        sides.to.search.addEventListener(
            "input",
            () => renderOptions("to")
        );

        /* AMOUNT INPUT */

        ui.amount.addEventListener(
            "input",
            updateQuote
        );

        ui.amount.addEventListener(
            "change",
            updateQuote
        );

        /* OUTSIDE CLICK */

        document.addEventListener("click", event => {
            if (!root.contains(event.target)) {
                closeMenus();
            }
        });

        /* ESCAPE */

        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;

            const openSide = state.openMenu;

            closeMenus();

            if (openSide) {
                sides[openSide].trigger.focus();
            }
        });

        /* WALLET OPEN SWAP BUTTON */

        $("openSwapBtn")?.addEventListener(
            "click",
            () => {
                root.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        );

        /* WALLET ASSET EVENT */

        window.addEventListener(
            "wallet-swap-open",
            event => {
                const key = symbol(
                    event.detail?.symbol
                );

                if (!getCoin(key)) return;

                selectToken("from", key);

                root.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        );
    }

    /* ==============================================================
       19. PUBLIC API
    ============================================================== */

    window.BloxioSwap = Object.freeze({

        getAssets() {
            return coins.map(coin => ({
                symbol: coin.symbol,
                name: coin.name,
                icon: coin.icon,
                price: coin.price
            }));
        },

        getState() {
            return {
                from: state.from,
                to: state.to,

                openMenu: state.openMenu,

                quote: state.quote
                    ? { ...state.quote }
                    : null,

                assets: coins.length
            };
        },

        setPair(from, to) {
            from = symbol(from);
            to = symbol(to);

            if (
                !getCoin(from) ||
                !getCoin(to) ||
                from === to
            ) {
                return false;
            }

            state.from = from;
            state.to = to;

            closeMenus();

            renderAllSelected();

            renderAllOptions();

            updateQuote();

            return true;
        },

        select(side, key) {
            if (
                side !== "from" &&
                side !== "to"
            ) {
                return false;
            }

            return selectToken(side, key);
        },

        reverse() {
            reversePair();
        },

        refresh() {
            return updateQuote();
        },

        open(side) {
            if (
                side !== "from" &&
                side !== "to"
            ) {
                return false;
            }

            openMenu(side);

            return true;
        },

        close() {
            closeMenus();
        }
    });

    /* ==============================================================
       20. INITIALIZATION
    ============================================================== */

    function init() {
        if (state.initialized) return;

        /* Initial token display */

        renderAllSelected();

        /* Initial option lists */

        renderAllOptions();

        /* Initial menu state */

        closeMenus();

        /* Receive field is read-only */

        ui.receive.readOnly = true;

        ui.receive.setAttribute(
            "aria-readonly",
            "true"
        );

        /* Execute starts disabled */

        ui.execute.disabled = true;

        /* Activate events */

        bindEvents();

        /* Initial quote */

        updateQuote();

        state.initialized = true;

        root.dataset.swapInitialized = "true";

        root.dataset.assetCount = String(coins.length);

        console.info(
            `[BLOXIO SWAP] Initialized successfully: ${coins.length} assets.`,
            window.BloxioSwap.getState()
        );
    }

    /* ==============================================================
       21. START
    ============================================================== */

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
