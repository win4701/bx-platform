
/* =========================================================
   BLOXIO SWAP ENGINE V2
   File: public/bx/swap.js
   Registry: ./data/coins.js
   API:
   GET  /api/market/prices
   POST /api/swap/execute

   Client quotes are indicative.
   Server must validate and settle every swap.
========================================================= */

import { SWAP_COINS, BX_PRICE, XBC_PRICE } from "./data/coins.js";

(() => {
  "use strict";

  const CONFIG = Object.freeze({
    pricesUrl: "/api/market/prices",
    executeUrl: "/api/swap/execute",
    refreshMs: 15000,
    timeoutMs: 12000,
    feeRate: 0.003,
    defaultSlippage: 0.5,

    fixedPrices: Object.freeze({
      BX: Number(BX_PRICE) || 45,
      XBC: Number(XBC_PRICE) || 0.15,
      USDT: 1,
      USDC: 1,
      TUSD: 1,
      DAI: 1
    })
  });

  const $ = id => document.getElementById(id);

  const coins = Array.isArray(SWAP_COINS)
    ? SWAP_COINS.filter(c => c?.symbol)
    : [];

  const coinMap = new Map(
    coins.map(c => [String(c.symbol).toUpperCase(), c])
  );

  const state = {
    initialized: false,
    loadingPrices: false,
    executing: false,
    prices: { ...CONFIG.fixedPrices },
    balances: {},
    from: "BX",
    to: "XBC",
    quote: null,
    priceUpdatedAt: 0,
    priceError: null,
    refreshTimer: null
  };

  /* =========================================================
     UTILITIES
  ========================================================= */

  const symbol = value =>
    String(value ?? "").trim().toUpperCase();

  const coin = value =>
    coinMap.get(symbol(value)) || null;

  const num = value => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : NaN;
    }

    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      return Number.isFinite(n) ? n : NaN;
    }

    return NaN;
  };

  const fmt = (value, digits = 8) => {
    const n = num(value);

    return Number.isFinite(n)
      ? new Intl.NumberFormat(undefined, {
          maximumFractionDigits: digits
        }).format(n)
      : "—";
  };

  const text = (id, value) => {
    const el = $(id);
    if (el) el.textContent = String(value);
  };

  const value = (id, next) => {
    const el = $(id);
    if (el) el.value = String(next);
  };

  function status(message, type = "info") {
    const el = $("swapStatus");

    if (!el) return;

    el.textContent = message;
    el.dataset.state = type;
    el.classList.remove("hidden");
  }

  /* =========================================================
     PRICE ENGINE
  ========================================================= */

  function getPrice(assetSymbol) {
    const key = symbol(assetSymbol);
    const fixed = CONFIG.fixedPrices[key];

    if (Number.isFinite(fixed) && fixed > 0) {
      return fixed;
    }

    const raw = state.prices[key];

    const candidate = raw && typeof raw === "object"
      ? num(raw.usd ?? raw.price ?? raw.last ?? raw.close)
      : num(raw);

    return Number.isFinite(candidate) && candidate > 0
      ? candidate
      : 0;
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      CONFIG.timeoutMs
    );

    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.headers || {})
        }
      });

      const raw = await response.text();

      let data = {};

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error("INVALID_SERVER_RESPONSE");
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `HTTP_${response.status}`
        );
      }

      return data;

    } finally {
      clearTimeout(timer);
    }
  }

  function normalizePrices(payload) {
    const source =
      payload?.prices ??
      payload?.data?.prices ??
      payload?.data;

    if (
      !source ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      throw new Error("PRICE_FEED_INVALID");
    }

    const next = { ...CONFIG.fixedPrices };

    for (const [rawKey, raw] of Object.entries(source)) {
      const key = symbol(rawKey);

      if (!coinMap.has(key)) continue;

      const price = raw && typeof raw === "object"
        ? num(raw.usd ?? raw.price ?? raw.last ?? raw.close)
        : num(raw);

      if (Number.isFinite(price) && price > 0) {
        next[key] = price;
      }
    }

    return next;
  }

  async function refreshPrices() {
    if (state.loadingPrices) return;

    state.loadingPrices = true;

    try {
      const payload = await requestJson(
        CONFIG.pricesUrl,
        { method: "GET" }
      );

      state.prices = normalizePrices(payload);
      state.priceUpdatedAt = Date.now();
      state.priceError = null;

      updateQuote();
      updatePriceStamp();

    } catch (error) {
      state.priceError = error;

      console.warn(
        "[BLOXIO SWAP] Price feed unavailable:",
        error
      );

      invalidateQuote("Live market prices are unavailable.");

      text("swapQuoteStatus", "Price feed unavailable");

      status(
        "Live prices are unavailable. Swap preview is paused until valid prices arrive.",
        "warning"
      );

    } finally {
      state.loadingPrices = false;
    }
  }

  function updatePriceStamp() {
    const el = $("swapPriceUpdated");

    if (!el) return;

    el.textContent = state.priceUpdatedAt
      ? `Updated ${new Date(
          state.priceUpdatedAt
        ).toLocaleTimeString()}`
      : "Price update pending";
  }

  /* =========================================================
     ASSET SELECTORS
  ========================================================= */

  function optionFor(c) {
    const option = document.createElement("option");

    option.value = c.symbol;
    option.textContent = `${c.symbol} — ${c.name}`;

    return option;
  }

  function populateAssetSelectors() {
    const from = $("swapFromAsset");
    const to = $("swapToAsset");

    if (!from || !to) return;

    const sorted = [...coins].sort((a, b) => {
      const rank = c =>
        c.symbol === "BX" ? 0 :
        c.symbol === "XBC" ? 1 :
        c.type === "stable" ? 2 :
        c.category === "main" ? 3 : 4;

      return rank(a) - rank(b) ||
        a.symbol.localeCompare(b.symbol);
    });

    const fromFrag = document.createDocumentFragment();
    const toFrag = document.createDocumentFragment();

    sorted.forEach(c => {
      fromFrag.append(optionFor(c));
      toFrag.append(optionFor(c));
    });

    from.replaceChildren(fromFrag);
    to.replaceChildren(toFrag);

    if (!coin(state.from)) {
      state.from = sorted[0]?.symbol || "";
    }

    if (!coin(state.to) || state.to === state.from) {
      state.to = sorted.find(
        c => c.symbol !== state.from
      )?.symbol || "";
    }

    from.value = state.from;
    to.value = state.to;
  }

  function setPair(from, to, recalc = true) {
    const a = symbol(from);
    const b = symbol(to);

    if (!coin(a) || !coin(b) || a === b) {
      return false;
    }

    state.from = a;
    state.to = b;

    value("swapFromAsset", a);
    value("swapToAsset", b);

    document
      .querySelectorAll("[data-swap-asset]")
      .forEach(button => {
        button.classList.toggle(
          "is-active",
          symbol(button.dataset.swapAsset) === a
        );
      });

    if (recalc) updateQuote();

    return true;
  }

  /* =========================================================
     WALLET BALANCES
  ========================================================= */

  function getBalance(assetSymbol) {
    const n = num(state.balances[symbol(assetSymbol)]);

    return Number.isFinite(n) && n >= 0
      ? n
      : null;
  }

  function updateBalances() {
    const fromBalance = getBalance(state.from);
    const toBalance = getBalance(state.to);

    text(
      "swapFromBalance",
      fromBalance === null
        ? "Balance: —"
        : `Balance: ${fmt(fromBalance)} ${state.from}`
    );

    text(
      "swapToBalance",
      toBalance === null
        ? "Estimated output"
        : `Balance: ${fmt(toBalance)} ${state.to}`
    );

    const max = $("swapMaxButton");

    if (max) {
      max.disabled =
        fromBalance === null ||
        fromBalance <= 0;
    }
  }

  function updatePairPreview() {
    const a = coin(state.from);
    const b = coin(state.to);

    text(
      "swapPreviewPair",
      `${state.from} / ${state.to}`
    );

    text(
      "swapPreviewDirection",
      a && b
        ? `${a.name} → ${b.name}`
        : "Select your pair"
    );

    updateBalances();
  }

  /* =========================================================
     QUOTE ENGINE
  ========================================================= */

  function invalidateQuote(
    message = "Enter an amount to preview the conversion."
  ) {
    state.quote = null;

    if ($("estimatedReceive")) {
      $("estimatedReceive").textContent = "0.00";
    }

    text("swapOutputFiat", "≈ $0.00");
    text("swapRate", "—");
    text("swapPriceImpact", "Unavailable");
    text("swapReferencePrice", "—");
    text("swapEstimatedFee", "—");
    text("swapMinimumReceived", "—");
    text("swapQuoteStatus", message);

    const button = $("swapButton");

    if (button) {
      button.disabled = true;
    }
  }

  function calculateQuote() {
    const amount = num($("swapAmount")?.value);

    const fromPrice = getPrice(state.from);
    const toPrice = getPrice(state.to);

    const slippage = num(
      $("swapSlippage")?.value ??
      CONFIG.defaultSlippage
    );

    if (!coin(state.from) || !coin(state.to)) {
      return { error: "Select both assets." };
    }

    if (state.from === state.to) {
      return { error: "Choose two different assets." };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        error: "Enter an amount greater than zero."
      };
    }

    if (!(fromPrice > 0) || !(toPrice > 0)) {
      return {
        error: "A valid market price is unavailable for one or both assets."
      };
    }

    if (
      !Number.isFinite(slippage) ||
      slippage < 0 ||
      slippage > 50
    ) {
      return { error: "Invalid slippage tolerance." };
    }

    const grossUsd = amount * fromPrice;
    const grossReceive = grossUsd / toPrice;

    const fee = grossReceive * CONFIG.feeRate;
    const receive = grossReceive - fee;

    const minimumReceived =
      receive * (1 - slippage / 100);

    const rate = fromPrice / toPrice;

    if (
      ![
        grossReceive,
        fee,
        receive,
        minimumReceived,
        rate
      ].every(Number.isFinite)
    ) {
      return {
        error: "The quote could not be calculated safely."
      };
    }

    const balance = getBalance(state.from);

    if (balance !== null && amount > balance) {
      return {
        error: `Insufficient ${state.from} balance.`
      };
    }

    return {
      from: state.from,
      to: state.to,
      amount,
      fromPrice,
      toPrice,
      rate,
      grossReceive,
      fee,
      receive,
      minimumReceived,
      slippage,
      feeRate: CONFIG.feeRate,
      feeUsd: fee * toPrice,
      createdAt: Date.now()
    };
  }

  function updateQuote() {
    state.from = symbol(
      $("swapFromAsset")?.value || state.from
    );

    state.to = symbol(
      $("swapToAsset")?.value || state.to
    );

    updatePairPreview();

    if (state.from === state.to) {
      invalidateQuote(
        "Source and destination must be different."
      );

      status(
        "Choose two different assets to continue.",
        "warning"
      );

      return;
    }

    if (state.priceError) {
      invalidateQuote(
        "Waiting for valid market prices."
      );

      return;
    }

    const q = calculateQuote();

    if (q.error) {
      invalidateQuote(q.error);
      status(q.error, "info");
      return;
    }

    state.quote = q;

    if ($("estimatedReceive")) {
      $("estimatedReceive").textContent = fmt(q.receive);
    }

    text(
      "swapOutputFiat",
      `≈ $${fmt(q.receive * q.toPrice, 2)}`
    );

    text(
      "swapRate",
      `1 ${q.from} ≈ ${fmt(q.rate, 10)} ${q.to}`
    );

    text(
      "swapFee",
      `${(q.feeRate * 100).toFixed(2)}%`
    );

    // Price impact is unavailable without order-book depth.
    text("swapPriceImpact", "Unavailable");

    text(
      "swapReferencePrice",
      `1 ${q.from} = ${fmt(q.rate, 10)} ${q.to}`
    );

    text(
      "swapEstimatedFee",
      `${fmt(q.fee)} ${q.to} (≈ $${fmt(q.feeUsd, 2)})`
    );

    text(
      "swapMinimumReceived",
      `${fmt(q.minimumReceived)} ${q.to}`
    );

    text("swapQuoteStatus", "Indicative quote");

    const button = $("swapButton");

    if (button) {
      button.disabled = state.executing;
      button.textContent = "Review Conversion";
    }

    status(
      "Indicative quote calculated. Review the details before continuing.",
      "success"
    );
  }

  /* =========================================================
     SWAP CONTROLS
  ========================================================= */

  function reversePair() {
    setPair(state.to, state.from);
  }

  function quickPick(assetSymbol) {
    const key = symbol(assetSymbol);

    if (!coin(key)) return;

    if (key === state.to) {
      setPair(state.from, key);
    } else {
      setPair(key, state.to);
    }
  }

  function useMax() {
    const balance = getBalance(state.from);
    const input = $("swapAmount");

    if (balance === null || !input) {
      status(
        "Wallet balance is not available yet.",
        "warning"
      );

      return;
    }

    input.value = String(balance);
    updateQuote();
  }

  /* =========================================================
     WALLET EVENTS
  ========================================================= */

  function bindBalanceEvents() {
    window.addEventListener(
      "wallet-balances-updated",
      event => {
        const balances =
          event.detail?.balances ??
          event.detail;

        if (
          !balances ||
          typeof balances !== "object"
        ) {
          return;
        }

        state.balances = {
          ...state.balances,
          ...balances
        };

        updateQuote();
      }
    );

    window.addEventListener(
      "wallet-sync",
      () => updateBalances()
    );
  }

  function bindWalletLaunch() {
    window.addEventListener(
      "wallet-swap-open",
      event => {
        const key = symbol(event.detail?.symbol);

        if (!coin(key)) return;

        if (key === state.to) {
          setPair(state.from, key);
        } else {
          setPair(key, state.to);
        }

        $("walletSwapEngine")?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    );
  }

  /* =========================================================
     EVENT BINDINGS
  ========================================================= */

  function bindEvents() {
    $("swapAmount")?.addEventListener(
      "input",
      updateQuote
    );

    $("swapAmount")?.addEventListener(
      "change",
      updateQuote
    );

    $("swapSlippage")?.addEventListener(
      "change",
      updateQuote
    );

    $("swapReverseButton")?.addEventListener(
      "click",
      reversePair
    );

    $("swapMaxButton")?.addEventListener(
      "click",
      useMax
    );

    $("swapFromAsset")?.addEventListener(
      "change",
      () => {
        const selected = symbol(
          $("swapFromAsset").value
        );

        if (selected === state.to) {
          const alternative = coins.find(
            c => c.symbol !== selected
          )?.symbol;

          if (alternative) {
            state.to = alternative;
          }

          value("swapToAsset", state.to);
        }

        updateQuote();
      }
    );

    $("swapToAsset")?.addEventListener(
      "change",
      () => {
        const selected = symbol(
          $("swapToAsset").value
        );

        if (selected === state.from) {
          const alternative = coins.find(
            c => c.symbol !== selected
          )?.symbol;

          if (alternative) {
            state.from = alternative;
          }

          value("swapFromAsset", state.from);
        }

        updateQuote();
      }
    );

    document
      .querySelectorAll("[data-swap-asset]")
      .forEach(button => {
        button.addEventListener("click", () => {
          quickPick(button.dataset.swapAsset);
        });
      });

    $("swapButton")?.addEventListener(
      "click",
      executeSwap
    );
  }

  /* =========================================================
     EXECUTE SWAP
  ========================================================= */

  async function executeSwap() {
    if (state.executing) return;

    const q = calculateQuote();

    if (q.error) {
      status(q.error, "warning");
      return;
    }

    if (
      !coin(q.from) ||
      !coin(q.to) ||
      q.from === q.to ||
      !(q.amount > 0)
    ) {
      status(
        "Invalid conversion request.",
        "error"
      );

      return;
    }

    const confirmation = [
      `Convert ${fmt(q.amount)} ${q.from} to ${q.to}?`,
      `Estimated receive: ${fmt(q.receive)} ${q.to}`,
      `Minimum received: ${fmt(q.minimumReceived)} ${q.to}`,
      `Slippage tolerance: ${q.slippage}%`,
      "",
      "The server will recalculate the final quote."
    ].join("\n");

    if (!window.confirm(confirmation)) return;

    state.executing = true;

    const button = $("swapButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Processing...";
    }

    text("swapQuoteStatus", "Submitting");

    status(
      "Submitting conversion request securely...",
      "info"
    );

    try {
      const payload = {
        from: q.from,
        to: q.to,
        amount: q.amount,
        slippage: q.slippage,

        quote: {
          referenceRate: q.rate,
          referenceFromPrice: q.fromPrice,
          referenceToPrice: q.toPrice,
          feeRate: q.feeRate,
          requestedAt: q.createdAt
        }
      };

      const result = await requestJson(
        CONFIG.executeUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (
        result?.success === false ||
        result?.error
      ) {
        throw new Error(
          result.message ||
          result.error ||
          "SWAP_REJECTED"
        );
      }

      text("swapQuoteStatus", "Completed");

      status(
        result.message ||
        "Swap completed successfully.",
        "success"
      );

      const detail = {
        from: q.from,
        to: q.to,
        amount: q.amount,

        receive:
          result.receive ??
          result.data?.receive ??
          null,

        transactionId:
          result.transactionId ??
          result.data?.transactionId ??
          null
      };

      window.dispatchEvent(
        new CustomEvent("swap-completed", {
          detail
        })
      );

      window.dispatchEvent(
        new CustomEvent("wallet-sync", {
          detail: {
            source: "swap",
            ...detail
          }
        })
      );

      if ($("swapAmount")) {
        $("swapAmount").value = "";
      }

      invalidateQuote(
        "Conversion completed. Enter a new amount to continue."
      );

      const walletStatus = $("walletStatus");

      if (walletStatus) {
        walletStatus.textContent = "Swap completed";
        walletStatus.classList.remove("hidden");
      }

    } catch (error) {
      console.error(
        "[BLOXIO SWAP] Execution failed:",
        error
      );

      text("swapQuoteStatus", "Failed");

      status(
        error.message ||
        "Swap failed. Please try again.",
        "error"
      );

    } finally {
      state.executing = false;

      if (button) {
        button.textContent = "Review Conversion";
      }

      updateQuote();
    }
  }

  /* =========================================================
     PRICE POLLING
  ========================================================= */

  function startPricePolling() {
    refreshPrices();

    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }

    state.refreshTimer = setInterval(
      refreshPrices,
      CONFIG.refreshMs
    );
  }

  function stopPricePolling() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }

    state.refreshTimer = null;
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  function init() {
    if (state.initialized) return;

    const root = $("walletSwapEngine");

    if (!root) return;

    if (coins.length < 2) {
      status(
        "Swap registry is unavailable or contains fewer than two assets.",
        "error"
      );

      return;
    }

    state.initialized = true;

    populateAssetSelectors();
    bindEvents();
    bindBalanceEvents();
    bindWalletLaunch();

    updatePairPreview();
    invalidateQuote();

    startPricePolling();

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          stopPricePolling();
        } else {
          startPricePolling();
        }
      }
    );

    console.info(
      `[BLOXIO SWAP] Ready — ${coins.length} swap-enabled registry assets.`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */

  window.BloxioSwap = Object.freeze({

    refreshPrices,

    setBalances(balances) {
      if (
        !balances ||
        typeof balances !== "object"
      ) {
        return;
      }

      state.balances = { ...balances };

      updateQuote();
    },

    setPair,

    getState() {
      return {
        from: state.from,
        to: state.to,
        priceUpdatedAt: state.priceUpdatedAt,
        availableAssets: [...coinMap.keys()]
      };
    }

  });

})();
