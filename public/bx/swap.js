
/* ==========================================================================
   BLOXIO SWAP ENGINE
   Version: 3.0
   File: public/assets/js/swap.js

   Registry: /bx/data/coins.js

   Features:
   - Dynamic asset registry
   - Searchable token selectors
   - Token icons and names
   - Reverse swap direction
   - USDT reference pricing
   - 0.30% trading fee
   - 0.50% slippage allowance
   - Optional live price feed
   - Quote validation
   - Wallet balance event integration
   - No simulated on-chain transactions
   ========================================================================== */

import { SWAP_COINS } from "/bx/data/coins.js";

(() => {
  "use strict";

  /* =========================================================
     1. CONFIGURATION
  ========================================================= */

  const CONFIG = Object.freeze({
    feeRate: 0.003,
    slippage: 0.005,

    pricesUrl: "/api/market/prices",

    refreshInterval: 30000,
    requestTimeout: 10000,

    defaultFrom: "BX",
    defaultTo: "XBC",

    currency: "USD",

    maxAmount: Number.MAX_SAFE_INTEGER
  });

  const TOTAL_ADJUSTMENT =
    (1 - (1 - CONFIG.feeRate) * (1 - CONFIG.slippage)) * 100;

  /* =========================================================
     2. DOM HELPERS
  ========================================================= */

  const $ = id => document.getElementById(id);

  const root = $("bloxioSwap");

  if (!root) {
    console.info("[BLOXIO SWAP] Swap section not found.");
    return;
  }

  if (root.dataset.initialized === "true") {
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
    ui.amount,
    ui.receive,
    ui.fromUsd,
    ui.toUsd,
    ui.rate,
    ui.deduction,
    ui.message,
    ui.execute,
    ui.reverse,

    ...Object.values(sides).flatMap(side => [
      side.trigger,
      side.menu,
      side.search,
      side.options,
      side.icon,
      side.symbol,
      side.name
    ])
  ];

  if (requiredElements.some(element => !element)) {
    console.error(
      "[BLOXIO SWAP] Required HTML elements are missing."
    );
    return;
  }

  /* =========================================================
     3. FORMATTERS
  ========================================================= */

  const number = value => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return NaN;
    }

    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : NaN;
  };

  const formatNumber = (value, digits = 8) => {
    if (!Number.isFinite(value)) {
      return "—";
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatUSD = value => {
    if (!Number.isFinite(value)) {
      return "—";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: CONFIG.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const normalizeSymbol = value =>
    String(value ?? "")
      .trim()
      .toUpperCase();

  /* =========================================================
     4. MESSAGE SYSTEM
  ========================================================= */

  function setMessage(message, type = "info") {
    ui.message.textContent = message;

    ui.message.dataset.state = type;

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

  /* =========================================================
     5. COIN REGISTRY
  ========================================================= */

  if (!Array.isArray(SWAP_COINS)) {
    console.error(
      "[BLOXIO SWAP] SWAP_COINS is not an array."
    );
    return;
  }

  const coins = SWAP_COINS
    .filter(asset =>
      asset &&
      asset.swap === true &&
      asset.symbol &&
      asset.name &&
      asset.icon
    )
    .map(asset => {
      const price = number(
        asset.priceInUSDT ?? asset.price
      );

      return {
        symbol: normalizeSymbol(asset.symbol),

        name: String(asset.name).trim(),

        icon: String(asset.icon).trim(),

        category: asset.category || "secondary",

        type: asset.type || "crypto",

        priceInUSDT:
          Number.isFinite(price) && price > 0
            ? price
            : null
      };
    })
    .filter(asset =>
      asset.symbol &&
      asset.name &&
      asset.icon
    );

  const coinMap = new Map(
    coins.map(asset => [
      asset.symbol,
      asset
    ])
  );

  if (coins.length < 2) {
    setMessage(
      "At least two swap-enabled assets are required.",
      "error"
    );

    console.error(
      "[BLOXIO SWAP] Insufficient swap assets."
    );

    return;
  }

  /* =========================================================
     6. STATE
  ========================================================= */

  const state = {
    initialized: false,

    from: coinMap.has(CONFIG.defaultFrom)
      ? CONFIG.defaultFrom
      : coins[0].symbol,

    to: coinMap.has(CONFIG.defaultTo)
      ? CONFIG.defaultTo
      : coins[1].symbol,

    prices: new Map(),

    balances: {},

    openMenu: null,

    loadingPrices: false,

    priceUpdatedAt: null,

    priceFeedAvailable: false,

    refreshTimer: null,

    requestController: null,

    destroyed: false
  };

  /* =========================================================
     7. PRICE ENGINE
  ========================================================= */

  function getPrice(symbol) {
    const key = normalizeSymbol(symbol);

    const livePrice = state.prices.get(key);

    if (
      Number.isFinite(livePrice) &&
      livePrice > 0
    ) {
      return livePrice;
    }

    const asset = coinMap.get(key);

    if (
      asset &&
      Number.isFinite(asset.priceInUSDT) &&
      asset.priceInUSDT > 0
    ) {
      return asset.priceInUSDT;
    }

    return null;
  }

  function normalizePricePayload(payload) {
    const source =
      payload?.prices ??
      payload?.data?.prices ??
      payload?.data;

    if (
      !source ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      throw new Error(
        "Invalid market price response."
      );
    }

    const result = new Map();

    Object.entries(source).forEach(([key, raw]) => {
      const ticker = normalizeSymbol(key);

      if (!coinMap.has(ticker)) {
        return;
      }

      const value =
        raw && typeof raw === "object"
          ? number(
              raw.usd ??
              raw.price ??
              raw.last ??
              raw.close
            )
          : number(raw);

      if (
        Number.isFinite(value) &&
        value > 0
      ) {
        result.set(ticker, value);
      }
    });

    return result;
  }

  async function requestPrices() {
    if (state.loadingPrices || state.destroyed) {
      return;
    }

    state.loadingPrices = true;

    const controller = new AbortController();

    state.requestController = controller;

    const timeout = window.setTimeout(
      () => controller.abort(),
      CONFIG.requestTimeout
    );

    try {
      const response = await fetch(
        CONFIG.pricesUrl,
        {
          method: "GET",

          credentials: "same-origin",

          cache: "no-store",

          headers: {
            Accept: "application/json"
          },

          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(
          `Price server returned HTTP ${response.status}.`
        );
      }

      const payload = await response.json();

      const prices = normalizePricePayload(payload);

      prices.forEach((price, symbol) => {
        state.prices.set(symbol, price);
      });

      state.priceUpdatedAt = Date.now();

      state.priceFeedAvailable = true;

      updateQuote();

      window.dispatchEvent(
        new CustomEvent("bloxio-swap-prices-updated", {
          detail: {
            updatedAt: state.priceUpdatedAt,
            assets: prices.size
          }
        })
      );

    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn(
          "[BLOXIO SWAP] Price feed unavailable:",
          error.message
        );
      }

      state.priceFeedAvailable = false;

      updateQuote();

    } finally {
      window.clearTimeout(timeout);

      if (state.requestController === controller) {
        state.requestController = null;
      }

      state.loadingPrices = false;
    }
  }

  /* =========================================================
     8. TOKEN IMAGE HANDLING
  ========================================================= */

  function setTokenImage(image, asset) {
    image.onerror = () => {
      image.onerror = null;

      image.style.visibility = "hidden";
    };

    image.onload = () => {
      image.style.visibility = "visible";
    };

    image.src = asset.icon;

    image.alt = "";
  }

  /* =========================================================
     9. SELECTED TOKEN DISPLAY
  ========================================================= */

  function renderSelected(sideName) {
    const asset = coinMap.get(state[sideName]);

    if (!asset) {
      return;
    }

    const side = sides[sideName];

    setTokenImage(side.icon, asset);

    side.symbol.textContent = asset.symbol;

    side.name.textContent = asset.name;

    side.trigger.setAttribute(
      "aria-label",
      `${asset.symbol} ${asset.name}`
    );
  }

  /* =========================================================
     10. TOKEN OPTION RENDERER
  ========================================================= */

  function renderOptions(sideName) {
    const side = sides[sideName];

    const query = side.search.value
      .trim()
      .toLowerCase();

    const selected = state[sideName];

    const other = sideName === "from"
      ? state.to
      : state.from;

    const results = coins.filter(asset => {
      const searchable =
        `${asset.symbol} ${asset.name}`
          .toLowerCase();

      return (
        asset.symbol !== other &&
        searchable.includes(query)
      );
    });

    side.options.replaceChildren();

    if (!results.length) {
      const empty = document.createElement("div");

      empty.className = "bxs-swap-empty";

      empty.textContent = "No matching assets found.";

      side.options.appendChild(empty);

      return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach(asset => {
      const button = document.createElement("button");

      button.type = "button";

      button.className = "bxs-swap-option";

      button.setAttribute("role", "option");

      button.setAttribute(
        "aria-selected",
        String(asset.symbol === selected)
      );

      button.dataset.symbol = asset.symbol;

      const image = document.createElement("img");

      image.src = asset.icon;

      image.alt = "";

      image.loading = "lazy";

      image.onerror = () => {
        image.style.visibility = "hidden";
      };

      const copy = document.createElement("span");

      const symbol = document.createElement("strong");

      symbol.textContent = asset.symbol;

      const name = document.createElement("small");

      name.textContent = asset.name;

      copy.append(symbol, name);

      button.append(image, copy);

      const price = getPrice(asset.symbol);

      if (price === null) {
        const status = document.createElement("small");

        status.className = "bxs-swap-no-price";

        status.textContent = "Price unavailable";

        button.appendChild(status);
      }

      button.addEventListener("click", () => {
        selectAsset(sideName, asset.symbol);
      });

      fragment.appendChild(button);
    });

    side.options.appendChild(fragment);
  }

  /* =========================================================
     11. MENU CONTROL
  ========================================================= */

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
    closeMenus();

    const side = sides[sideName];

    if (!side) {
      return;
    }

    side.menu.hidden = false;

    side.menu.classList.add("is-open");

    side.trigger.setAttribute(
      "aria-expanded",
      "true"
    );

    state.openMenu = sideName;

    side.search.value = "";

    renderOptions(sideName);

    side.search.focus();
  }

  /* =========================================================
     12. ASSET SELECTION
  ========================================================= */

  function selectAsset(sideName, symbol) {
    const key = normalizeSymbol(symbol);

    if (!coinMap.has(key)) {
      return;
    }

    const other = sideName === "from"
      ? state.to
      : state.from;

    if (key === other) {
      setMessage(
        "The source and destination assets must be different.",
        "warning"
      );

      return;
    }

    state[sideName] = key;

    closeMenus();

    renderSelected("from");

    renderSelected("to");

    renderOptions("from");

    renderOptions("to");

    updateQuote();
  }

  /* =========================================================
     13. REVERSE SWAP
  ========================================================= */

  function reversePair() {
    const previousFrom = state.from;

    state.from = state.to;

    state.to = previousFrom;

    renderSelected("from");

    renderSelected("to");

    renderOptions("from");

    renderOptions("to");

    closeMenus();

    updateQuote();
  }

  /* =========================================================
     14. QUOTE CALCULATION
  ========================================================= */

  function calculateQuote() {
    const from = coinMap.get(state.from);

    const to = coinMap.get(state.to);

    const amount = number(ui.amount.value);

    if (!from || !to) {
      return {
        error: "Select valid source and destination assets."
      };
    }

    if (from.symbol === to.symbol) {
      return {
        error: "Choose two different assets."
      };
    }

    if (
      ui.amount.value.trim() === "" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return {
        error: "Enter an amount greater than zero."
      };
    }

    if (amount > CONFIG.maxAmount) {
      return {
        error: "The entered amount exceeds the allowed limit."
      };
    }

    const fromPrice = getPrice(from.symbol);

    const toPrice = getPrice(to.symbol);

    if (fromPrice === null || toPrice === null) {
      const missing = [];

      if (fromPrice === null) {
        missing.push(from.symbol);
      }

      if (toPrice === null) {
        missing.push(to.symbol);
      }

      return {
        error:
          `A valid USDT price is unavailable for ${missing.join(" and ")}.`
      };
    }

    const fromValue = amount * fromPrice;

    const grossReceive = fromValue / toPrice;

    const feeAmount =
      grossReceive * CONFIG.feeRate;

    const afterFee =
      grossReceive - feeAmount;

    const slippageAmount =
      afterFee * CONFIG.slippage;

    const netReceive =
      afterFee - slippageAmount;

    const rate = fromPrice / toPrice;

    if (
      !Number.isFinite(netReceive) ||
      netReceive <= 0
    ) {
      return {
        error: "Unable to calculate a valid quote."
      };
    }

    return {
      from,
      to,

      amount,

      fromPrice,
      toPrice,

      fromValue,

      grossReceive,

      feeAmount,

      afterFee,

      slippageAmount,

      netReceive,

      rate,

      totalAdjustment: TOTAL_ADJUSTMENT
    };
  }

  /* =========================================================
     15. UPDATE QUOTE UI
  ========================================================= */

  function updateQuote() {
    const quote = calculateQuote();

    ui.deduction.textContent =
      `${TOTAL_ADJUSTMENT.toFixed(4)}%`;

    if (quote.error) {
      ui.receive.value = "—";

      ui.fromUsd.textContent = "—";

      ui.toUsd.textContent = "—";

      ui.rate.textContent = "—";

      ui.execute.disabled = true;

      const needsPrice =
        quote.error.includes("USDT price");

      setMessage(
        quote.error,
        needsPrice ? "warning" : "info"
      );

      return null;
    }

    ui.receive.value =
      formatNumber(quote.netReceive, 8);

    ui.fromUsd.textContent =
      formatUSD(quote.fromValue);

    ui.toUsd.textContent =
      formatUSD(quote.netReceive * quote.toPrice);

    ui.rate.textContent =
      `1 ${quote.from.symbol} = ${formatNumber(quote.rate, 8)} ${quote.to.symbol}`;

    ui.execute.disabled = false;

    setMessage(
      `Estimated receive: ${formatNumber(quote.netReceive, 8)} ${quote.to.symbol}. Fee and slippage are included.`,
      "success"
    );

    return quote;
  }

  /* =========================================================
     16. WALLET BALANCE INTEGRATION
  ========================================================= */

  function updateBalances(payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const source =
      payload.balances &&
      typeof payload.balances === "object"
        ? payload.balances
        : payload;

    Object.entries(source).forEach(([key, value]) => {
      const ticker = normalizeSymbol(key);

      if (!coinMap.has(ticker)) {
        return;
      }

      const balance =
        value && typeof value === "object"
          ? number(value.balance ?? value.available)
          : number(value);

      if (
        Number.isFinite(balance) &&
        balance >= 0
      ) {
        state.balances[ticker] = balance;
      }
    });

    window.dispatchEvent(
      new CustomEvent("bloxio-swap-balances-updated", {
        detail: {
          balances: { ...state.balances }
        }
      })
    );
  }

  /* =========================================================
     17. SWAP EXECUTION GUARD
  ========================================================= */

  function executeSwap() {
    const quote = updateQuote();

    if (!quote) {
      return;
    }

    /*
      Security:
      This frontend does not submit blockchain transactions.

      A real swap requires:
      - Connected wallet
      - Verified liquidity route
      - Server-side quote validation
      - Transaction signing
      - On-chain confirmation

      Never report a successful transaction here.
    */

    setMessage(
      "Quote ready. On-chain execution is not connected yet. Integrate a verified liquidity router and wallet transaction service before enabling swaps.",
      "warning"
    );

    window.dispatchEvent(
      new CustomEvent("bloxio-swap-preview", {
        detail: {
          from: quote.from.symbol,
          to: quote.to.symbol,

          amount: quote.amount,

          estimatedReceive: quote.netReceive,

          feeRate: CONFIG.feeRate,

          slippage: CONFIG.slippage,

          referenceValueUSD: quote.fromValue
        }
      })
    );
  }

  /* =========================================================
     18. WALLET EVENTS
  ========================================================= */

  function bindWalletEvents() {
    window.addEventListener(
      "wallet-balances-updated",
      event => {
        updateBalances(event.detail);
      }
    );

    window.addEventListener(
      "wallet-sync",
      event => {
        updateBalances(event.detail);
      }
    );

    window.addEventListener(
      "wallet-swap-open",
      event => {
        const symbol = normalizeSymbol(
          event.detail?.symbol
        );

        if (!coinMap.has(symbol)) {
          return;
        }

        selectAsset("from", symbol);

        root.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    );
  }

  /* =========================================================
     19. EVENT LISTENERS
  ========================================================= */

  function bindEvents() {
    ui.amount.addEventListener(
      "input",
      updateQuote
    );

    ui.amount.addEventListener(
      "change",
      updateQuote
    );

    ui.reverse.addEventListener(
      "click",
      reversePair
    );

    ui.execute.addEventListener(
      "click",
      executeSwap
    );

    Object.entries(sides).forEach(([name, side]) => {
      side.trigger.addEventListener("click", event => {
        event.stopPropagation();

        if (state.openMenu === name) {
          closeMenus();
        } else {
          openMenu(name);
        }
      });

      side.search.addEventListener(
        "input",
        () => renderOptions(name)
      );

      side.menu.addEventListener(
        "click",
        event => event.stopPropagation()
      );
    });

    document.addEventListener("click", event => {
      if (!root.contains(event.target)) {
        closeMenus();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeMenus();
      }
    });

    bindWalletEvents();
  }

  /* =========================================================
     20. PUBLIC API
  ========================================================= */

  function getState() {
    const quote = calculateQuote();

    return {
      from: state.from,

      to: state.to,

      assets: coins.length,

      balances: { ...state.balances },

      priceUpdatedAt: state.priceUpdatedAt,

      priceFeedAvailable: state.priceFeedAvailable,

      quote: quote.error
        ? null
        : {
            amount: quote.amount,

            estimatedReceive: quote.netReceive,

            rate: quote.rate,

            fee: quote.feeAmount,

            slippage: quote.slippageAmount,

            referenceValueUSD: quote.fromValue
          }
    };
  }

  function setPair(from, to) {
    const source = normalizeSymbol(from);

    const destination = normalizeSymbol(to);

    if (
      !coinMap.has(source) ||
      !coinMap.has(destination) ||
      source === destination
    ) {
      return false;
    }

    state.from = source;

    state.to = destination;

    renderSelected("from");

    renderSelected("to");

    renderOptions("from");

    renderOptions("to");

    updateQuote();

    return true;
  }

  function destroy() {
    state.destroyed = true;

    if (state.refreshTimer) {
      window.clearInterval(state.refreshTimer);
    }

    if (state.requestController) {
      state.requestController.abort();
    }

    closeMenus();

    root.dataset.initialized = "false";
  }

  /* =========================================================
     21. INITIALIZATION
  ========================================================= */

  function init() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    root.dataset.initialized = "true";

    root.dataset.assetCount = String(coins.length);

    ui.deduction.textContent =
      `${TOTAL_ADJUSTMENT.toFixed(4)}%`;

    renderSelected("from");

    renderSelected("to");

    renderOptions("from");

    renderOptions("to");

    bindEvents();

    updateQuote();

    requestPrices();

    state.refreshTimer = window.setInterval(
      requestPrices,
      CONFIG.refreshInterval
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden && !state.destroyed) {
          requestPrices();
        }
      }
    );

    console.info(
      `[BLOXIO SWAP] Initialized with ${coins.length} assets.`
    );
  }

  /* =========================================================
     22. EXTERNAL API
  ========================================================= */

  window.BloxioSwap = Object.freeze({
    init,

    destroy,

    updateQuote,

    refreshPrices: requestPrices,

    getState,

    setPair,

    getAssets() {
      return coins.map(asset => ({
        ...asset
      }));
    }
  });

  /* =========================================================
     23. START
  ========================================================= */

  init();

})();
