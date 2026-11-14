
/* ==========================================================================
   BLOXIO SWAP ENGINE — FULL UPDATE V6
   File: public/bx/swap.js
   Registry: public/bx/data/coins.js

   IMPORTANT:
   This version calculates indicative quotes.
   It does not execute blockchain transactions.
========================================================================== */

import { SWAP_COINS } from "./data/coins.js";

(() => {
  "use strict";

  /* ========================================================================
     01. INITIALIZATION
  ======================================================================== */

  const root = document.getElementById("bloxioSwap");

  if (!root || root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";

  const $ = (id) => document.getElementById(id);

  const CONFIG = Object.freeze({
    pricesUrl: "/api/market/prices",

    refreshInterval: 15000,

    requestTimeout: 10000,

    feeRate: 0.003,

    slippageRate: 0.005,

    maxAmount: Number.MAX_SAFE_INTEGER,

    defaultFrom: "BX",

    defaultTo: "XBC"
  });

  const TOTAL_ADJUSTMENT =
    1 - (1 - CONFIG.feeRate) * (1 - CONFIG.slippageRate);


  /* ========================================================================
     02. USER INTERFACE ELEMENTS
  ======================================================================== */

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


  /* ========================================================================
     03. REQUIRED ELEMENT VALIDATION
  ======================================================================== */

  const requiredElements = [
    ui.amount,
    ui.receive,
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

  const missingElements = requiredElements.filter(
    element => !element
  );

  if (missingElements.length) {
    console.error(
      "[Bloxio Swap] Missing required HTML elements.",
      missingElements
    );

    root.dataset.initialized = "false";
    return;
  }


  /* ========================================================================
     04. COIN REGISTRY
  ======================================================================== */

  const coins = (
    Array.isArray(SWAP_COINS) ? SWAP_COINS : []
  )
    .filter(asset =>
      asset &&
      asset.swap !== false &&
      typeof asset.symbol === "string" &&
      typeof asset.name === "string" &&
      typeof asset.icon === "string"
    )
    .map(asset => {
      const rawPrice =
        asset.priceInUSDT ?? asset.price;

      const price = Number(rawPrice);

      return {
        symbol: asset.symbol.trim().toUpperCase(),

        name: asset.name.trim(),

        icon: asset.icon,

        category: asset.category || "other",

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


  /* ========================================================================
     05. APPLICATION STATE
  ======================================================================== */

  const state = {
    from: coinMap.has(CONFIG.defaultFrom)
      ? CONFIG.defaultFrom
      : coins[0]?.symbol || "",

    to: coinMap.has(CONFIG.defaultTo)
      ? CONFIG.defaultTo
      : coins[1]?.symbol || "",

    prices: {},

    quote: null,

    loadingPrices: false,

    executing: false,

    priceError: false,

    lastPriceUpdate: 0,

    refreshTimer: null,

    requestController: null,

    openPicker: null
  };


  /* ========================================================================
     06. UTILITIES
  ======================================================================== */

  const toNumber = value => {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      const parsed = Number(value);

      return Number.isFinite(parsed)
        ? parsed
        : NaN;
    }

    return NaN;
  };


  const formatNumber = (value, digits = 8) => {
    const number = toNumber(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 2
    }).format(number);
  };


  const formatUSD = value => {
    const number = toNumber(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(number);
  };


  const getCoin = symbol => {
    return coinMap.get(
      String(symbol || "").trim().toUpperCase()
    ) || null;
  };


  const setMessage = (message, type = "info") => {
    if (!ui.message) return;

    ui.message.textContent = message;
    ui.message.dataset.state = type;
  };


  const setText = (element, value) => {
    if (element) {
      element.textContent = String(value);
    }
  };


  const getPrice = symbol => {
    const key = String(symbol || "").toUpperCase();

    const marketPrice = toNumber(state.prices[key]);

    if (
      Number.isFinite(marketPrice) &&
      marketPrice > 0
    ) {
      return marketPrice;
    }

    const asset = getCoin(key);

    if (
      asset &&
      Number.isFinite(asset.priceInUSDT) &&
      asset.priceInUSDT > 0
    ) {
      return asset.priceInUSDT;
    }

    return 0;
  };


  /* ========================================================================
     07. BUTTON STATE
  ======================================================================== */

  function updateExecuteButton(valid = false) {
    const enabled =
      valid === true &&
      !state.executing;

    ui.execute.disabled = !enabled;

    ui.execute.classList.toggle(
      "is-ready",
      enabled
    );

    ui.execute.setAttribute(
      "aria-disabled",
      String(!enabled)
    );

    ui.execute.setAttribute(
      "aria-busy",
      String(state.executing)
    );

    if (state.executing) {
      ui.execute.textContent = "PROCESSING...";
    } else {
      ui.execute.textContent = "EXECUTE SWAP";
    }
  }


  /* ========================================================================
     08. SELECTED ASSET RENDERING
  ======================================================================== */

  function renderSelected(which) {
    const asset = getCoin(state[which]);

    if (!asset) return;

    const side = sides[which];

    side.icon.src = asset.icon;

    side.icon.alt = asset.symbol;

    side.icon.style.visibility = "visible";

    side.icon.onerror = () => {
      side.icon.style.visibility = "hidden";
    };

    side.icon.onload = () => {
      side.icon.style.visibility = "visible";
    };

    side.symbol.textContent = asset.symbol;

    side.name.textContent = asset.name;

    side.trigger.setAttribute(
      "aria-label",
      `Select ${which} asset. Current asset: ${asset.symbol}`
    );
  }


  /* ========================================================================
     09. ASSET PICKER
  ======================================================================== */

  function closeMenus() {
    Object.entries(sides).forEach(([which, side]) => {
      side.menu.hidden = true;

      side.trigger.setAttribute(
        "aria-expanded",
        "false"
      );
    });

    state.openPicker = null;
  }


  function renderOptions(which, query = "") {
    const side = sides[which];

    if (!side) return;

    const search = query.trim().toLowerCase();

    const found = coins.filter(asset => {
      return (
        asset.symbol.toLowerCase().includes(search) ||
        asset.name.toLowerCase().includes(search)
      );
    });

    side.options.replaceChildren();

    if (!found.length) {
      const empty = document.createElement("div");

      empty.className = "bxs-swap-empty";

      empty.textContent = "No matching assets.";

      side.options.append(empty);

      return;
    }

    const fragment = document.createDocumentFragment();

    found.forEach(asset => {
      const selected =
        state[which] === asset.symbol;

      const opposite =
        which === "from" ? "to" : "from";

      const conflict =
        state[opposite] === asset.symbol;

      const button = document.createElement("button");

      button.type = "button";

      button.className = "bxs-swap-option";

      button.setAttribute("role", "option");

      button.setAttribute(
        "aria-selected",
        String(selected)
      );

      button.disabled = conflict && !selected;

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

      if (getPrice(asset.symbol) <= 0) {
        const unavailable = document.createElement("small");

        unavailable.className = "bxs-swap-no-price";

        unavailable.textContent = "Price unavailable";

        button.append(unavailable);
      }

      button.addEventListener("click", () => {
        if (button.disabled) return;

        state[which] = asset.symbol;

        closeMenus();

        renderAll();

        updateQuote();
      });

      fragment.append(button);
    });

    side.options.append(fragment);
  }


  function openMenu(which) {
    closeMenus();

    const side = sides[which];

    if (!side) return;

    side.menu.hidden = false;

    side.trigger.setAttribute(
      "aria-expanded",
      "true"
    );

    state.openPicker = which;

    side.search.value = "";

    renderOptions(which);

    side.search.focus();
  }


  /* ========================================================================
     10. MARKET PRICE API
  ======================================================================== */

  function normalizePriceData(data) {
    const source =
      data?.prices ??
      data?.data?.prices ??
      data?.data ??
      data;

    const result = {};

    if (Array.isArray(source)) {
      source.forEach(item => {
        if (!item || !item.symbol) return;

        const price = toNumber(
          item.usd ??
          item.price ??
          item.last ??
          item.close
        );

        if (price > 0) {
          result[
            String(item.symbol).toUpperCase()
          ] = price;
        }
      });

      return result;
    }

    if (
      source &&
      typeof source === "object"
    ) {
      Object.entries(source).forEach(([key, value]) => {
        const price = toNumber(
          typeof value === "object" && value !== null
            ? value.usd ??
              value.price ??
              value.last ??
              value.close
            : value
        );

        if (price > 0) {
          result[key.toUpperCase()] = price;
        }
      });
    }

    return result;
  }


  async function refreshPrices() {
    if (state.loadingPrices) return;

    state.loadingPrices = true;

    if (state.requestController) {
      state.requestController.abort();
    }

    const controller = new AbortController();

    state.requestController = controller;

    const timeout = setTimeout(() => {
      controller.abort();
    }, CONFIG.requestTimeout);

    try {
      const response = await fetch(
        CONFIG.pricesUrl,
        {
          method: "GET",

          headers: {
            Accept: "application/json"
          },

          cache: "no-store",

          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(
          `Market API error: ${response.status}`
        );
      }

      const data = await response.json();

      const prices = normalizePriceData(data);

      if (!Object.keys(prices).length) {
        throw new Error("No valid market prices returned.");
      }

      state.prices = {
        ...state.prices,
        ...prices
      };

      state.lastPriceUpdate = Date.now();

      state.priceError = false;

      if (state.openPicker) {
        renderOptions(state.openPicker);
      }

      updateQuote();

      return true;

    } catch (error) {
      state.priceError = true;

      console.warn(
        "[Bloxio Swap] Market price feed unavailable:",
        error.message
      );

      return false;

    } finally {
      clearTimeout(timeout);

      state.loadingPrices = false;

      state.requestController = null;
    }
  }


  /* ========================================================================
     11. QUOTE CALCULATION
  ======================================================================== */

  function calculateQuote() {
    const from = getCoin(state.from);

    const to = getCoin(state.to);

    const rawAmount = ui.amount.value.trim();

    const amount = toNumber(rawAmount);

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

    if (
      rawAmount === "" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > CONFIG.maxAmount
    ) {
      return {
        error: "Enter a valid amount greater than zero."
      };
    }

    const fromPrice = getPrice(from.symbol);

    const toPrice = getPrice(to.symbol);

    if (fromPrice <= 0 || toPrice <= 0) {
      const missing = [];

      if (fromPrice <= 0) {
        missing.push(from.symbol);
      }

      if (toPrice <= 0) {
        missing.push(to.symbol);
      }

      return {
        error:
          `Price unavailable for ${missing.join(" and ")}. ` +
          "Waiting for a valid market price."
      };
    }

    const fromValue =
      amount * fromPrice;

    const grossReceive =
      fromValue / toPrice;

    const feeAmount =
      grossReceive * CONFIG.feeRate;

    const afterFee =
      grossReceive - feeAmount;

    const slippageAmount =
      afterFee * CONFIG.slippageRate;

    const netReceive =
      afterFee - slippageAmount;

    const exchangeRate =
      fromPrice / toPrice;

    if (
      !Number.isFinite(netReceive) ||
      netReceive <= 0
    ) {
      return {
        error: "Unable to calculate a valid quote."
      };
    }

    return {
      valid: true,

      from,
      to,

      amount,

      fromPrice,
      toPrice,

      fromValue,

      grossReceive,

      feeAmount,

      slippageAmount,

      netReceive,

      exchangeRate,

      feeRate: CONFIG.feeRate,

      slippageRate: CONFIG.slippageRate,

      totalAdjustment: TOTAL_ADJUSTMENT,

      timestamp: Date.now()
    };
  }


  /* ========================================================================
     12. UPDATE QUOTE DISPLAY
  ======================================================================== */

  function updateQuote() {
    const quote = calculateQuote();

    state.quote = null;

    setText(
      ui.deduction,
      `${(TOTAL_ADJUSTMENT * 100).toFixed(4)}%`
    );

    if (!quote.valid) {
      ui.receive.value = "—";

      setText(ui.fromUsd, "—");

      setText(ui.toUsd, "—");

      setText(ui.rate, "—");

      updateExecuteButton(false);

      setMessage(
        quote.error,
        "warning"
      );

      return null;
    }

    state.quote = quote;

    ui.receive.value = formatNumber(
      quote.netReceive,
      8
    );

    setText(
      ui.fromUsd,
      formatUSD(quote.fromValue)
    );

    setText(
      ui.toUsd,
      formatUSD(
        quote.netReceive * quote.toPrice
      )
    );

    setText(
      ui.rate,
      `1 ${quote.from.symbol} = ${formatNumber(
        quote.exchangeRate,
        8
      )} ${quote.to.symbol}`
    );

    updateExecuteButton(true);

    setMessage(
      `Estimated receive: ${formatNumber(
        quote.netReceive,
        8
      )} ${quote.to.symbol}. Trading fee and slippage included.`,
      "success"
    );

    return quote;
  }


  /* ========================================================================
     13. REVERSE SWAP
  ======================================================================== */

  function reversePair() {
    const previousFrom = state.from;

    state.from = state.to;

    state.to = previousFrom;

    renderAll();

    updateQuote();
  }


  /* ========================================================================
     14. RENDER ALL
  ======================================================================== */

  function renderAll() {
    renderSelected("from");

    renderSelected("to");

    renderOptions("from");

    renderOptions("to");
  }


  /* ========================================================================
     15. EXECUTE BUTTON HANDLER
  ======================================================================== */

  function handleExecute() {
    const quote = state.quote;

    if (
      !quote ||
      !calculateQuote().valid ||
      state.executing
    ) {
      updateQuote();
      return;
    }

    /*
      SECURITY:
      No blockchain transaction is submitted here.

      A real swap requires:
      1. Connected wallet.
      2. Verified liquidity route.
      3. Backend quote validation.
      4. Transaction signing.
      5. On-chain confirmation.

      Never report a simulated swap as completed.
    */

    setMessage(
      "Your quote is ready. On-chain execution is not connected yet. A wallet, verified liquidity route and transaction service are required.",
      "warning"
    );

    console.info(
      "[Bloxio Swap] Indicative quote:",
      quote
    );
  }


  /* ========================================================================
     16. EVENT LISTENERS
  ======================================================================== */

  Object.entries(sides).forEach(([which, side]) => {
    side.trigger.addEventListener("click", event => {
      event.stopPropagation();

      if (side.menu.hidden) {
        openMenu(which);
      } else {
        closeMenus();
      }
    });

    side.search.addEventListener("input", () => {
      renderOptions(
        which,
        side.search.value
      );
    });
  });


  ui.amount.addEventListener("input", () => {
    updateQuote();
  });


  ui.amount.addEventListener("change", () => {
    updateQuote();
  });


  ui.reverse.addEventListener("click", () => {
    reversePair();
  });


  ui.execute.addEventListener("click", () => {
    handleExecute();
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


  /* ========================================================================
     17. PRICE REFRESH TIMER
  ======================================================================== */

  function startPriceRefresh() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }

    state.refreshTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshPrices();
      }
    }, CONFIG.refreshInterval);
  }


  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") {
        refreshPrices();
      }
    }
  );


  /* ========================================================================
     18. PUBLIC API
  ======================================================================== */

  window.BloxioSwap = Object.freeze({

    getState() {
      return {
        from: state.from,

        to: state.to,

        quote: state.quote
          ? { ...state.quote }
          : null,

        prices: { ...state.prices },

        loadingPrices: state.loadingPrices,

        priceError: state.priceError,

        lastPriceUpdate: state.lastPriceUpdate
      };
    },


    setPair(from, to) {
      const source = String(from).toUpperCase();

      const destination = String(to).toUpperCase();

      if (
        !coinMap.has(source) ||
        !coinMap.has(destination) ||
        source === destination
      ) {
        return false;
      }

      state.from = source;

      state.to = destination;

      renderAll();

      updateQuote();

      return true;
    },


    reverse() {
      reversePair();

      return this.getState();
    },


    refreshPrices() {
      return refreshPrices();
    },


    updateQuote() {
      return updateQuote();
    },


    getAssets() {
      return coins.map(asset => ({
        ...asset
      }));
    }

  });


  /* ========================================================================
     19. INITIALIZATION
  ======================================================================== */

  renderAll();

  setText(
    ui.deduction,
    `${(TOTAL_ADJUSTMENT * 100).toFixed(4)}%`
  );

  updateExecuteButton(false);

  updateQuote();

  startPriceRefresh();

  refreshPrices();

  root.dataset.assetCount = String(coins.length);

  root.dataset.swapVersion = "6.0";

  console.info(
    `[Bloxio Swap V6] Initialized successfully. ${coins.length} assets loaded.`
  );

})();
