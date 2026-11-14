
/* =========================================================
   BLOXIO SWAP ENGINE
   Version: 4.1
   File: public/assets/js/swap.js

   Uses exported functions from:
   /bx/data/coins.js
   ========================================================= */

import {
    SWAP_COINS,
    getCoinPrice
} from "/bx/data/coins.js";

(() => {
    "use strict";

    /* =====================================================
       1. CONFIGURATION
    ===================================================== */

    const CONFIG = {
        fee: 0.003,
        slippage: 0.005,

        defaultFrom: "BX",
        defaultTo: "XBC",

        currency: "USD"
    };

    const $ = id => document.getElementById(id);

    const root = $("bloxioSwap");

    if (!root || root.dataset.swapReady === "true") {
        return;
    }

    /* =====================================================
       2. HTML ELEMENTS
    ===================================================== */

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

    const required = [
        ...Object.values(ui),
        ...Object.values(sides).flatMap(side =>
            Object.values(side)
        )
    ];

    if (required.some(element => !element)) {
        console.error(
            "[BLOXIO SWAP] Missing HTML elements."
        );
        return;
    }

    /* =====================================================
       3. TOKEN EXPORT IMPORT
    ===================================================== */

    if (!Array.isArray(SWAP_COINS)) {
        console.error(
            "[BLOXIO SWAP] SWAP_COINS export is invalid."
        );
        return;
    }

    const TOKENS = SWAP_COINS
        .filter(coin =>
            coin &&
            coin.swap === true &&
            coin.symbol &&
            coin.name &&
            coin.icon
        )
        .map(coin => ({
            symbol: String(coin.symbol).toUpperCase(),
            name: coin.name,
            icon: coin.icon,
            price: getCoinPrice(coin.symbol),
            decimals: Number(coin.decimals ?? 18)
        }));

    const TOKEN_MAP = new Map(
        TOKENS.map(token => [
            token.symbol,
            token
        ])
    );

    if (TOKENS.length < 2) {
        console.error(
            "[BLOXIO SWAP] Not enough exported tokens."
        );
        return;
    }

    /* =====================================================
       4. STATE
    ===================================================== */

    const state = {
        from: TOKEN_MAP.has(CONFIG.defaultFrom)
            ? CONFIG.defaultFrom
            : TOKENS[0].symbol,

        to: TOKEN_MAP.has(CONFIG.defaultTo)
            ? CONFIG.defaultTo
            : TOKENS[1].symbol,

        openMenu: null,
        quote: null
    };

    /* =====================================================
       5. FORMATTERS
    ===================================================== */

    const format = (value, digits = 8) => {
        if (!Number.isFinite(value)) return "—";

        return new Intl.NumberFormat("en-US", {
            maximumFractionDigits: digits
        }).format(value);
    };

    const usd = value => {
        if (!Number.isFinite(value)) return "—";

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: CONFIG.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const getPrice = symbol => {
        const token = TOKEN_MAP.get(symbol);

        if (!token) return null;

        const price = Number(token.price);

        return Number.isFinite(price) && price > 0
            ? price
            : null;
    };

    /* =====================================================
       6. MESSAGE
    ===================================================== */

    function message(text = "", type = "info") {
        ui.message.textContent = text;
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

    /* =====================================================
       7. TOKEN ICONS AND DISPLAY
    ===================================================== */

    function renderToken(sideName) {
        const side = sides[sideName];
        const token = TOKEN_MAP.get(state[sideName]);

        if (!token) return;

        side.icon.onerror = () => {
            side.icon.onerror = null;
            side.icon.style.visibility = "hidden";
        };

        side.icon.style.visibility = "visible";
        side.icon.src = token.icon;
        side.icon.alt = token.symbol;

        side.symbol.textContent = token.symbol;
        side.name.textContent = token.name;

        side.trigger.setAttribute(
            "aria-expanded",
            String(state.openMenu === sideName)
        );
    }

    /* =====================================================
       8. TOKEN SEARCH AND OPTIONS
    ===================================================== */

    function renderTokens(sideName) {
        const side = sides[sideName];

        const search = side.search.value
            .trim()
            .toLowerCase();

        const otherSymbol = sideName === "from"
            ? state.to
            : state.from;

        const fragment = document.createDocumentFragment();

        const filtered = TOKENS.filter(token => {
            if (token.symbol === otherSymbol) {
                return false;
            }

            const text =
                `${token.symbol} ${token.name}`.toLowerCase();

            return text.includes(search);
        });

        side.options.replaceChildren();

        if (!filtered.length) {
            const empty = document.createElement("div");

            empty.className = "bxs-swap-empty";
            empty.textContent = "No matching assets found.";

            side.options.appendChild(empty);
            return;
        }

        filtered.forEach(token => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "bxs-swap-option";
            button.setAttribute("role", "option");

            button.setAttribute(
                "aria-selected",
                String(token.symbol === state[sideName])
            );

            const icon = document.createElement("img");

            icon.src = token.icon;
            icon.alt = token.symbol;
            icon.loading = "lazy";

            icon.onerror = () => {
                icon.style.visibility = "hidden";
            };

            const details = document.createElement("span");

            const symbol = document.createElement("strong");
            symbol.textContent = token.symbol;

            const name = document.createElement("small");
            name.textContent = token.name;

            details.append(symbol, name);

            button.append(icon, details);

            button.addEventListener("click", () => {
                selectToken(sideName, token.symbol);
            });

            fragment.appendChild(button);
        });

        side.options.appendChild(fragment);
    }

    /* =====================================================
       9. OPEN / CLOSE TOKEN MENUS
    ===================================================== */

    function closeMenus() {
        Object.values(sides).forEach(side => {
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
        closeMenus();

        const side = sides[sideName];

        if (!side) return;

        side.menu.hidden = false;
        side.menu.classList.add("is-open");

        side.trigger.setAttribute(
            "aria-expanded",
            "true"
        );

        state.openMenu = sideName;

        side.search.value = "";

        renderTokens(sideName);

        side.search.focus();
    }

    function toggleMenu(sideName) {
        if (state.openMenu === sideName) {
            closeMenus();
        } else {
            openMenu(sideName);
        }
    }

    /* =====================================================
       10. SELECT TOKEN
    ===================================================== */

    function selectToken(sideName, symbol) {
        const selected = String(symbol).toUpperCase();

        if (!TOKEN_MAP.has(selected)) return;

        const other = sideName === "from"
            ? state.to
            : state.from;

        if (selected === other) {
            message(
                "Choose two different assets.",
                "warning"
            );
            return;
        }

        state[sideName] = selected;

        closeMenus();

        renderToken("from");
        renderToken("to");

        renderTokens("from");
        renderTokens("to");

        calculateQuote();
    }

    /* =====================================================
       11. REVERSE TOKEN PAIR
    ===================================================== */

    function reversePair() {
        const previous = state.from;

        state.from = state.to;
        state.to = previous;

        closeMenus();

        renderToken("from");
        renderToken("to");

        renderTokens("from");
        renderTokens("to");

        calculateQuote();
    }

    /* =====================================================
       12. EXCHANGE RATE
    ===================================================== */

    function renderRate() {
        const fromPrice = getPrice(state.from);
        const toPrice = getPrice(state.to);

        if (
            fromPrice === null ||
            toPrice === null
        ) {
            ui.rate.textContent = "—";
            return null;
        }

        const rate = fromPrice / toPrice;

        ui.rate.textContent =
            `1 ${state.from} = ${format(rate)} ${state.to}`;

        return rate;
    }

    /* =====================================================
       13. QUOTE CALCULATION
    ===================================================== */

    function calculateQuote() {
        ui.receive.readOnly = true;

        ui.receive.setAttribute(
            "aria-readonly",
            "true"
        );

        const rate = renderRate();

        ui.deduction.textContent = (
            (
                1 -
                (1 - CONFIG.fee) *
                (1 - CONFIG.slippage)
            ) * 100
        ).toFixed(4) + "%";

        const amountText = ui.amount.value.trim();
        const amount = Number(amountText);

        ui.execute.disabled = true;
        state.quote = null;

        if (
            !amountText ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            ui.receive.value = "0.00";

            ui.fromUsd.textContent = "—";
            ui.toUsd.textContent = "—";

            message("");

            return null;
        }

        const fromPrice = getPrice(state.from);
        const toPrice = getPrice(state.to);

        if (fromPrice === null || toPrice === null) {
            ui.receive.value = "—";

            ui.fromUsd.textContent = "—";
            ui.toUsd.textContent = "—";

            message(
                "A reliable price is unavailable for one or both assets.",
                "warning"
            );

            return null;
        }

        if (rate === null) {
            return null;
        }

        const referenceUSD = amount * fromPrice;

        const grossReceive = referenceUSD / toPrice;

        const feeAmount =
            grossReceive * CONFIG.fee;

        const afterFee =
            grossReceive - feeAmount;

        const slippageAmount =
            afterFee * CONFIG.slippage;

        const receive =
            afterFee - slippageAmount;

        if (
            !Number.isFinite(receive) ||
            receive <= 0
        ) {
            message(
                "Unable to calculate a valid quote.",
                "error"
            );

            return null;
        }

        ui.receive.value = format(receive);

        ui.fromUsd.textContent = usd(referenceUSD);

        ui.toUsd.textContent = usd(receive * toPrice);

        state.quote = {
            from: state.from,
            to: state.to,

            amount,
            receive,

            rate,

            referenceUSD,

            fee: feeAmount,
            slippage: slippageAmount
        };

        ui.execute.disabled = false;

        message(
            `Estimated receive: ${format(receive)} ${state.to}`,
            "success"
        );

        return state.quote;
    }

    /* =====================================================
       14. EXECUTE BUTTON
    ===================================================== */

    function executeSwap() {
        const quote = calculateQuote();

        if (!quote) return;

        /*
         * Preview event only.
         * Actual blockchain execution requires:
         * wallet connection,
         * verified liquidity route,
         * transaction signing,
         * on-chain confirmation.
         */

        message(
            "Quote ready. Connect a wallet and configure the verified swap router to execute this transaction.",
            "warning"
        );

        window.dispatchEvent(
            new CustomEvent("bloxio-swap-preview", {
                detail: { ...quote }
            })
        );
    }

    /* =====================================================
       15. BUTTON ACTIVATION
    ===================================================== */

    function bindButtons() {
        // FROM token button
        sides.from.trigger.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                toggleMenu("from");
            }
        );

        // TO token button
        sides.to.trigger.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                toggleMenu("to");
            }
        );

        // Search buttons
        sides.from.search.addEventListener(
            "input",
            () => renderTokens("from")
        );

        sides.to.search.addEventListener(
            "input",
            () => renderTokens("to")
        );

        // Reverse button
        ui.reverse.addEventListener(
            "click",
            event => {
                event.preventDefault();
                reversePair();
            }
        );

        // Execute button
        ui.execute.addEventListener(
            "click",
            event => {
                event.preventDefault();

                if (!ui.execute.disabled) {
                    executeSwap();
                }
            }
        );

        // Amount field
        ui.amount.addEventListener(
            "input",
            calculateQuote
        );

        ui.amount.addEventListener(
            "change",
            calculateQuote
        );

        // Prevent dropdown from closing on internal click
        Object.values(sides).forEach(side => {
            side.menu.addEventListener(
                "click",
                event => event.stopPropagation()
            );
        });

        // Close menus on outside click
        document.addEventListener("click", event => {
            if (!root.contains(event.target)) {
                closeMenus();
            }
        });

        // Escape closes menus
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeMenus();
            }
        });
    }

    /* =====================================================
       16. PUBLIC API
    ===================================================== */

    window.BloxioSwap = Object.freeze({
        getAssets() {
            return TOKENS.map(token => ({ ...token }));
        },

        getState() {
            return {
                from: state.from,
                to: state.to,
                quote: state.quote
                    ? { ...state.quote }
                    : null
            };
        },

        setPair(from, to) {
            from = String(from).toUpperCase();
            to = String(to).toUpperCase();

            if (
                !TOKEN_MAP.has(from) ||
                !TOKEN_MAP.has(to) ||
                from === to
            ) {
                return false;
            }

            state.from = from;
            state.to = to;

            renderToken("from");
            renderToken("to");

            renderTokens("from");
            renderTokens("to");

            calculateQuote();

            return true;
        },

        refresh() {
            return calculateQuote();
        }
    });

    /* =====================================================
       17. INITIALIZE
    ===================================================== */

    function init() {
        ui.receive.readOnly = true;

        ui.execute.disabled = true;

        // Initial token selection
        renderToken("from");
        renderToken("to");

        // Initial dropdown content
        renderTokens("from");
        renderTokens("to");

        // Activate all controls
        bindButtons();

        // Calculate initial reference rate
        calculateQuote();

        root.dataset.swapReady = "true";

        console.info(
            `[BLOXIO SWAP] Ready: ${TOKENS.length} exported tokens.`,
            window.BloxioSwap.getState()
        );
    }

    init();

})();
