/* =========================================================
   BLOXIO SWAP ENGINE — BIDIRECTIONAL
   UI: radio-card asset selectors | Pricing: USDT intermediary
   Endpoint: POST /api/swap/execute (server-side validation required)
========================================================= */
import {
  SWAP_ASSETS,
  getCoin,
  createCoinImageElement
} from "./data/coins.js";

(() => {
  "use strict";

  const ROOT_ID = "wallet-swap-engine";
  const $ = (id) => document.getElementById(id);
  const FALLBACK_PRICES = Object.freeze({ BX: 45, XBC: 0.15 });
  const DEFAULT_FEE_RATE = 0.003;
  const DEFAULT_SLIPPAGE = 0.5;
  // Add symbols here when their reliable USDT price feed is enabled.
  const ENABLED_SWAP_SYMBOLS = ["BX", "XBC"];

  const state = {
    prices: { ...FALLBACK_PRICES },
    from: "BX",
    to: "XBC",
    quote: null,
    loading: false,
    balances: {}
  };

  const root = () => $(ROOT_ID);
  const money = (n) => Number.isFinite(n)
    ? `${n.toLocaleString(undefined, { maximumFractionDigits: 8 })} USDT`
    : "—";
  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const getPrice = (symbol) => number(state.prices[symbol]);
  const getAsset = (symbol) => getCoin(symbol);
  const getEnabledAssets = () => {
    const allowed = new Set(ENABLED_SWAP_SYMBOLS);
    return SWAP_ASSETS.filter((coin) => allowed.has(coin.symbol));
  };

  function setMessage(message = "", isError = false) {
    const el = $("swapValidation");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#f0bd68" : "";
  }

  function setStatus(message = "") {
    const el = $("swapStatus");
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function assetCard(coin, group, checked) {
    const label = document.createElement("label");
    label.className = "swap-asset-card";
    label.dataset.symbol = coin.symbol;

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `swap-${group}`;
    radio.value = coin.symbol;
    radio.checked = checked;
    radio.setAttribute("aria-label", `${coin.symbol} ${coin.name}`);

    const focus = document.createElement("span");
    focus.className = "swap-radio-focus";
    focus.setAttribute("aria-hidden", "true");

    const image = createCoinImageElement(coin.symbol, { size: 34 });
    if (image) {
      image.classList.add("swap-asset-icon");
      image.alt = "";
    }

    const copy = document.createElement("span");
    copy.className = "swap-asset-copy";
    const symbol = document.createElement("span");
    symbol.className = "swap-asset-symbol";
    symbol.textContent = coin.symbol;
    const name = document.createElement("span");
    name.className = "swap-asset-name";
    name.textContent = coin.name;
    copy.append(symbol, name);
    label.append(radio);
    if (image) label.append(image);
    label.append(copy, focus);
    return label;
  }

  function renderAssetOptions() {
    const fromBox = $("swapFromOptions");
    const toBox = $("swapToOptions");
    if (!fromBox || !toBox) return;

    const assets = getEnabledAssets();
    for (const [box, group, selected] of [
      [fromBox, "from", state.from],
      [toBox, "to", state.to]
    ]) {
      box.replaceChildren();
      assets.forEach((coin) => {
        box.append(assetCard(coin, group, coin.symbol === selected));
      });
    }
    updateSelectedAssetLabels();
  }

  function updateSelectedAssetLabels() {
    const fromCoin = getAsset(state.from);
    const toCoin = getAsset(state.to);
    if ($("swapAmountSymbol")) $("swapAmountSymbol").textContent = state.from;
    if ($("swapToSymbol")) $("swapToSymbol").textContent = state.to;
    if ($("swapFromBalance")) {
      const balance = state.balances[state.from];
      $("swapFromBalance").textContent = Number.isFinite(balance)
        ? `Available balance: ${balance} ${state.from}`
        : "Available balance: —";
    }
    if ($("swapToIcon") && toCoin) {
      $("swapToIcon").src = toCoin.icon;
      $("swapToIcon").alt = "";
      $("swapToIcon").onerror = () => {
        $("swapToIcon").hidden = true;
      };
      $("swapToIcon").hidden = false;
    }
    if (!fromCoin || !toCoin) return;
  }

  function readSlippage() {
    const input = $("slippage");
    const raw = input && input.value !== "" ? Number(input.value) : DEFAULT_SLIPPAGE;
    if (!Number.isFinite(raw) || raw < 0 || raw > 50) return null;
    return raw;
  }

  function calculateQuote() {
    const amount = number($("swapAmount")?.value);
    const fromPrice = getPrice(state.from);
    const toPrice = getPrice(state.to);
    const slippage = readSlippage();

    if (state.from === state.to) return { error: "Choose two different assets." };
    if (!(amount > 0)) return { error: "Enter an amount greater than zero." };
    if (!(fromPrice > 0) || !(toPrice > 0)) return { error: "A valid market price is not available for the selected asset." };
    if (slippage === null) return { error: "Slippage must be between 0% and 50%." };

    const grossUsd = amount * fromPrice;
    const grossReceive = grossUsd / toPrice;
    const fee = grossReceive * DEFAULT_FEE_RATE;
    const afterFee = grossReceive - fee;
    const receive = afterFee * (1 - slippage / 100);
    const rate = fromPrice / toPrice;
    return {
      from: state.from, to: state.to, amount,
      fromPrice, toPrice, rate, grossUsd,
      fee, feeRate: DEFAULT_FEE_RATE,
      slippage, receive
    };
  }

  function renderQuote() {
    updateSelectedAssetLabels();
    const quote = calculateQuote();
    state.quote = quote.error ? null : quote;

    if (quote.error) {
      $("estimatedReceiveText").textContent = "0.000000";
      $("swapRate").textContent = "—";
      $("swapMarketPrice").textContent = "—";
      $("swapFee").textContent = "—";
      setMessage(quote.error, true);
      $("swapButton").disabled = true;
      return;
    }

    $("swapRate").textContent =
      `1 ${quote.from} = ${quote.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${quote.to}`;
    $("swapMarketPrice").textContent =
      `${quote.from}: ${money(quote.fromPrice)} · ${quote.to}: ${money(quote.toPrice)}`;
    $("swapFee").textContent = `${quote.fee.toFixed(8)} ${quote.to}`;
    $("estimatedReceiveText").textContent = quote.receive.toFixed(8);
    setMessage("");
    $("swapButton").disabled = state.loading;
  }

  function chooseAsset(group, symbol) {
    const coin = getAsset(symbol);
    if (!coin || !ENABLED_SWAP_SYMBOLS.includes(symbol)) return;

    if (group === "from") state.from = symbol;
    else state.to = symbol;

    if (state.from === state.to) {
      // Prevent duplicate pair selection by moving the opposite side to the other enabled asset.
      const alternative = getEnabledAssets().find((item) => item.symbol !== symbol);
      if (alternative) {
        if (group === "from") state.to = alternative.symbol;
        else state.from = alternative.symbol;
      } else {
        setMessage("Choose two different assets.", true);
      }
    }

    renderAssetOptions();
    renderQuote();
  }

  async function loadPrices() {
    try {
      const response = await fetch("/api/market/prices", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Price feed HTTP ${response.status}`);
      const data = await response.json();
      const incoming = data?.prices || {};
      state.prices = { ...incoming, ...FALLBACK_PRICES };
      renderQuote();
    } catch (error) {
      // Fixed BX/XBC reference prices remain usable if the market endpoint is unavailable.
      console.warn("[Bloxio Swap] Market price feed unavailable; using configured reference prices.", error);
      state.prices = { ...FALLBACK_PRICES };
      renderQuote();
    }
  }

  async function executeSwap() {
    if (state.loading) return;
    const quote = calculateQuote();
    if (quote.error) {
      setMessage(quote.error, true);
      return;
    }
    state.quote = quote;
    state.loading = true;
    $("swapButton").disabled = true;
    $("swapButton").querySelector(".swap-button-label").textContent = "Executing…";
    setStatus("Submitting swap request…");

    try {
      const response = await fetch("/api/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          from: quote.from,
          to: quote.to,
          amount: quote.amount,
          fromPrice: quote.fromPrice,
          toPrice: quote.toPrice,
          rate: quote.rate,
          feeRate: quote.feeRate,
          fee: quote.fee,
          slippage: quote.slippage,
          estimatedReceive: quote.receive
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.error) {
        throw new Error(result?.error || `Swap request failed (${response.status}).`);
      }
      setStatus(result?.message || "Swap request completed.");
      $("swapAmount").value = "";
      window.dispatchEvent(new CustomEvent("wallet-sync"));
      renderQuote();
    } catch (error) {
      console.error("[Bloxio Swap] Execution failed:", error);
      setStatus(error.message || "Swap failed. Please try again.");
    } finally {
      state.loading = false;
      $("swapButton").querySelector(".swap-button-label").textContent = "Review Swap";
      renderQuote();
    }
  }

  function bindEvents() {
    root().addEventListener("change", (event) => {
      const radio = event.target.closest('input[type="radio"][name^="swap-"]');
      if (radio) chooseAsset(radio.name.endsWith("from") ? "from" : "to", radio.value);
    });

    $("swapAmount")?.addEventListener("input", renderQuote);
    $("slippage")?.addEventListener("input", renderQuote);
    $("swapReverseButton")?.addEventListener("click", () => {
      [state.from, state.to] = [state.to, state.from];
      renderAssetOptions();
      renderQuote();
    });
    $("swapButton")?.addEventListener("click", executeSwap);

    root().querySelectorAll("[data-swap-percent]").forEach((button) => {
      button.addEventListener("click", () => {
        const balance = number(state.balances[state.from]);
        const percent = number(button.dataset.swapPercent);
        if (balance > 0 && $("swapAmount")) {
          $("swapAmount").value = (balance * percent / 100).toString();
          renderQuote();
        } else {
          setMessage("Balance is not available for quick amount selection.", true);
        }
      });
    });

    window.addEventListener("wallet-swap-open", (event) => {
      const symbol = String(event.detail?.symbol || "").toUpperCase();
      if (ENABLED_SWAP_SYMBOLS.includes(symbol)) {
        state.from = symbol;
        state.to = ENABLED_SWAP_SYMBOLS.find((item) => item !== symbol) || state.to;
        renderAssetOptions();
        renderQuote();
      }
    });

    window.addEventListener("wallet-balances-updated", (event) => {
      state.balances = { ...state.balances, ...(event.detail?.balances || {}) };
      updateSelectedAssetLabels();
    });
  }

  function init() {
    if (!root() || root().dataset.swapInitialized === "true") return;
    root().dataset.swapInitialized = "true";
    renderAssetOptions();
    bindEvents();
    renderQuote();
    loadPrices();
    window.setInterval(loadPrices, 15000);
    console.info("[Bloxio Swap] Bidirectional swap engine initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
