/* =========================================================
   BLOXIO SWAP ENGINE — FULL VERSION
   File: public/bx/swap.js
   Registry: ./data/coins.js

   GET  /api/market/prices
   POST /api/swap/execute

   Features:
   - Asset picker with coin images
   - Search and category filters
   - Swap pair selection and reversal
   - Live price refresh
   - Balance synchronization
   - Quote calculation
   - Slippage and fee estimation
   - Server-side swap execution
========================================================= */

import {
  SWAP_COINS,
  BX_PRICE,
  XBC_PRICE
} from "./data/coins.js";

(() => {
  "use strict";

  /* =======================================================
     CONFIGURATION
  ======================================================= */

  const CONFIG = Object.freeze({
    pricesUrl: "/api/market/prices",
    executeUrl: "/api/swap/execute",
    refreshMs: 15000,
    timeoutMs: 12000,
    feeRate: 0.003,
    defaultSlippage: 0.5,

    fixedPrices: {
      BX: Number(BX_PRICE) || 45,
      XBC: Number(XBC_PRICE) || 0.15,
      USDT: 1,
      USDC: 1,
      TUSD: 1,
      DAI: 1
    }
  });

  /* =======================================================
     HELPERS
  ======================================================= */

  const $ = id => document.getElementById(id);

  const root = () => $("walletSwapEngine");

  const symbol = value =>
    String(value ?? "").trim().toUpperCase();

  const number = value => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : NaN;
    }

    if (typeof value !== "string" || !value.trim()) {
      return NaN;
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  };

  const format = (value, digits = 8) => {
    const n = number(value);

    return Number.isFinite(n)
      ? new Intl.NumberFormat(undefined, {
          maximumFractionDigits: digits
        }).format(n)
      : "—";
  };

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = String(value);
  };

  const setValue = (id, value) => {
    const el = $(id);
    if (el) el.value = String(value);
  };

  function setStatus(message, type = "info") {
    const el = $("swapStatus");
    if (!el) return;

    el.textContent = message;
    el.dataset.state = type;
  }

  /* =======================================================
     COIN REGISTRY
  ======================================================= */

  const coins = Array.isArray(SWAP_COINS)
    ? SWAP_COINS.filter(asset =>
        asset?.symbol && asset.swap !== false
      )
    : [];

  const coinMap = new Map(
    coins.map(asset => [
      symbol(asset.symbol),
      asset
    ])
  );

  const coin = key =>
    coinMap.get(symbol(key)) || null;

  /* =======================================================
     STATE
  ======================================================= */

  const state = {
    initialized: false,

    from: "BX",
    to: "XBC",

    prices: {
      ...CONFIG.fixedPrices
    },

    balances: {},

    quote: null,

    priceUpdatedAt: 0,
    priceFeedError: false,
    loadingPrices: false,
    executing: false,

    openPicker: null,
    refreshTimer: null,

    search: {
      from: "",
      to: ""
    },

    filter: {
      from: "all",
      to: "all"
    }
  };

  /* =======================================================
     PRICE ENGINE
  ======================================================= */

  function getPrice(key) {
    const ticker = symbol(key);

    const fixed = CONFIG.fixedPrices[ticker];

    if (Number.isFinite(fixed) && fixed > 0) {
      return fixed;
    }

    const raw = state.prices[ticker];

    const price = raw && typeof raw === "object"
      ? number(
          raw.usd ??
          raw.price ??
          raw.last ??
          raw.close
        )
      : number(raw);

    return Number.isFinite(price) && price > 0
      ? price
      : 0;
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();

    const timer = window.setTimeout(
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
          throw new Error("Invalid server response.");
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `HTTP ${response.status}`
        );
      }

      return data;

    } finally {
      window.clearTimeout(timer);
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
      throw new Error("Invalid market price response.");
    }

    const next = {
      ...CONFIG.fixedPrices
    };

    Object.entries(source).forEach(([key, raw]) => {
      const ticker = symbol(key);

      if (!coinMap.has(ticker)) return;

      const price = raw && typeof raw === "object"
        ? number(
            raw.usd ??
            raw.price ??
            raw.last ??
            raw.close
          )
        : number(raw);

      if (Number.isFinite(price) && price > 0) {
        next[ticker] = price;
      }
    });

    return next;
  }

  async function refreshPrices() {
    if (state.loadingPrices) return;

    state.loadingPrices = true;

    try {
      const data = await requestJson(
        CONFIG.pricesUrl,
        { method: "GET" }
      );

      state.prices = normalizePrices(data);

      state.priceUpdatedAt = Date.now();
      state.priceFeedError = false;

      updateQuote();

      const stamp = $("swapPriceUpdated");

      if (stamp) {
        stamp.textContent =
          `Updated ${new Date(
            state.priceUpdatedAt
          ).toLocaleTimeString()}`;
      }

    } catch (error) {
      state.priceFeedError = true;

      console.warn(
        "[BLOXIO SWAP] Price feed:",
        error
      );

      updateQuote();

      if (
        !getPrice(state.from) ||
        !getPrice(state.to)
      ) {
        setStatus(
          "Live prices are unavailable for this pair.",
          "warning"
        );
      }

    } finally {
      state.loadingPrices = false;
    }
  }

  /* =======================================================
     PICKER STYLES
  ======================================================= */

  function injectStyles() {
    if ($("bloxio-swap-picker-css")) return;

    const style = document.createElement("style");

    style.id = "bloxio-swap-picker-css";

    style.textContent = `
      #walletSwapEngine .swap-asset-control{
        position:relative;
      }

      #walletSwapEngine .swap-native-select{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        padding:0!important;
        margin:-1px!important;
        overflow:hidden!important;
        clip:rect(0,0,0,0)!important;
        white-space:nowrap!important;
        border:0!important;
      }

      #walletSwapEngine .swap-asset-trigger{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        min-height:42px;
        cursor:pointer;
      }

      #walletSwapEngine .swap-trigger-copy,
      #walletSwapEngine .swap-option-copy{
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        min-width:0;
        line-height:1.2;
      }

      #walletSwapEngine .swap-trigger-symbol,
      #walletSwapEngine .swap-option-symbol{
        font-weight:700;
      }

      #walletSwapEngine .swap-trigger-name,
      #walletSwapEngine .swap-option-name{
        font-size:11px;
        opacity:.62;
        white-space:nowrap;
      }

      #walletSwapEngine .swap-coin-image,
      #walletSwapEngine .swap-coin-fallback{
        width:30px;
        height:30px;
        min-width:30px;
        border-radius:50%;
        object-fit:contain;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
      }

      #walletSwapEngine .swap-coin-fallback{
        font-size:9px;
        font-weight:800;
        background:rgba(148,163,184,.14);
        border:1px solid rgba(148,163,184,.22);
      }

      #walletSwapEngine .swap-picker-chevron{
        margin-inline-start:4px;
        opacity:.65;
      }

      #walletSwapEngine .swap-asset-menu{
        position:absolute;
        z-index:1000;
        top:calc(100% + 9px);
        right:0;
        width:min(340px,calc(100vw - 36px));
        max-height:390px;
        overflow:hidden;
        padding:10px;
        border:1px solid var(--border-color,rgba(148,163,184,.22));
        border-radius:14px;
        background:var(--surface-1,#10201e);
        box-shadow:0 18px 50px rgba(0,0,0,.35);
        color:var(--text-primary,#e8efed);
      }

      #walletSwapEngine .swap-picker-search{
        width:100%;
        height:40px;
        padding:0 12px;
        border:1px solid var(--border-color,rgba(148,163,184,.2));
        border-radius:9px;
        background:var(--surface-2,rgba(255,255,255,.05));
        color:inherit;
        outline:none;
      }

      #walletSwapEngine .swap-picker-filters{
        display:flex;
        gap:6px;
        overflow-x:auto;
        padding:9px 0;
      }

      #walletSwapEngine .swap-picker-filter{
        border:1px solid var(--border-color,rgba(148,163,184,.2));
        border-radius:20px;
        padding:6px 10px;
        background:transparent;
        color:inherit;
        font-size:11px;
        white-space:nowrap;
        cursor:pointer;
      }

      #walletSwapEngine .swap-picker-filter.is-active{
        background:rgba(192,157,45,.16);
        border-color:#c09d2d;
        color:#d9bd65;
      }

      #walletSwapEngine .swap-picker-list{
        display:flex;
        flex-direction:column;
        gap:2px;
        max-height:275px;
        overflow-y:auto;
      }

      #walletSwapEngine .swap-picker-option{
        display:flex;
        align-items:center;
        gap:10px;
        width:100%;
        padding:9px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:inherit;
        text-align:left;
        cursor:pointer;
      }

      #walletSwapEngine .swap-picker-option:hover,
      #walletSwapEngine .swap-picker-option[aria-selected="true"]{
        background:rgba(148,163,184,.12);
      }

      #walletSwapEngine .swap-picker-option[aria-selected="true"] .swap-option-symbol{
        color:#c9a83f;
      }

      #walletSwapEngine .swap-picker-empty{
        padding:18px 10px;
        text-align:center;
        font-size:12px;
        opacity:.65;
      }

      #walletSwapEngine .swap-picker-option:focus-visible,
      #walletSwapEngine .swap-asset-trigger:focus-visible{
        outline:2px solid #c09d2d;
        outline-offset:2px;
      }

      @media(max-width:480px){
        #walletSwapEngine .swap-asset-menu{
          position:fixed;
          top:50%;
          left:50%;
          right:auto;
          transform:translate(-50%,-50%);
          width:calc(100vw - 28px);
          max-height:min(78vh,520px);
        }

        #walletSwapEngine .swap-picker-list{
          max-height:calc(78vh - 145px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =======================================================
     COIN IMAGES
  ======================================================= */

  function assetImage(asset, size = 30) {
    const ticker = symbol(asset?.symbol);

    const fallback = document.createElement("span");

    fallback.className = "swap-coin-fallback";
    fallback.style.width = `${size}px`;
    fallback.style.height = `${size}px`;
    fallback.textContent = ticker.slice(0, 4);
    fallback.setAttribute("aria-hidden", "true");

    const src = typeof asset?.icon === "string"
      ? asset.icon.trim()
      : "";

    if (!src) return fallback;

    const img = document.createElement("img");

    img.className = "swap-coin-image";
    img.width = size;
    img.height = size;
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";

    img.addEventListener(
      "error",
      () => img.replaceWith(fallback),
      { once: true }
    );

    return img;
  }

  function assetName(asset) {
    return String(
      asset?.name ||
      asset?.symbol ||
      "Unknown asset"
    );
  }

  /* =======================================================
     PICKER ELEMENTS
  ======================================================= */

  function pickerParts(side) {
    return {
      button: $(
        side === "from"
          ? "swapFromPickerButton"
          : "swapToPickerButton"
      ),

      menu: $(
        side === "from"
          ? "swapFromAssetMenu"
          : "swapToAssetMenu"
      ),

      select: $(
        side === "from"
          ? "swapFromAsset"
          : "swapToAsset"
      )
    };
  }

  function sortedAssets() {
    const rank = asset =>
      asset.symbol === "BX" ? 0 :
      asset.symbol === "XBC" ? 1 :
      asset.type === "stable" ? 2 :
      asset.category === "main" ? 3 : 4;

    return [...coins].sort((a, b) =>
      rank(a) - rank(b) ||
      a.symbol.localeCompare(b.symbol)
    );
  }

  /* =======================================================
     SELECTED ASSET BUTTON
  ======================================================= */

  function renderTrigger(side) {
    const { button } = pickerParts(side);

    const asset = coin(
      side === "from"
        ? state.from
        : state.to
    );

    if (!button || !asset) return;

    button.replaceChildren(
      assetImage(asset, 28)
    );

    const copy = document.createElement("span");
    copy.className = "swap-trigger-copy";

    const ticker = document.createElement("span");
    ticker.className = "swap-trigger-symbol";
    ticker.textContent = asset.symbol;

    const name = document.createElement("span");
    name.className = "swap-trigger-name";
    name.textContent = assetName(asset);

    copy.append(ticker, name);

    const arrow = document.createElement("span");
    arrow.className = "swap-picker-chevron";
    arrow.textContent = "⌄";
    arrow.setAttribute("aria-hidden", "true");

    button.append(copy, arrow);

    button.setAttribute(
      "aria-label",
      `Selected ${asset.symbol}. Choose ${
        side === "from" ? "sending" : "receiving"
      } asset.`
    );
  }

  /* =======================================================
     CREATE PICKER MENU
  ======================================================= */

  function ensureMenu(side) {
    const { menu } = pickerParts(side);

    if (!menu || menu.dataset.ready === "true") {
      return menu;
    }

    menu.replaceChildren();

    menu.setAttribute("role", "dialog");

    menu.setAttribute(
      "aria-label",
      side === "from"
        ? "Choose sending asset"
        : "Choose receiving asset"
    );

    /* SEARCH */

    const search = document.createElement("input");

    search.type = "search";
    search.className = "swap-picker-search";
    search.placeholder = "Search coin or symbol";
    search.autocomplete = "off";
    search.setAttribute("aria-label", "Search assets");

    search.addEventListener("input", () => {
      state.search[side] = search.value;
      renderOptions(side);
    });

    /* FILTERS */

    const filters = document.createElement("div");

    filters.className = "swap-picker-filters";

    const categories = [
      ["all", "All"],
      ["main", "Popular"],
      ["stable", "Stablecoins"],
      ["secondary", "More"]
    ];

    categories.forEach(([key, label]) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "swap-picker-filter";
      button.dataset.filter = key;
      button.textContent = label;

      button.addEventListener("click", () => {
        state.filter[side] = key;
        renderOptions(side);
      });

      filters.appendChild(button);
    });

    /* LIST */

    const list = document.createElement("div");

    list.className = "swap-picker-list";

    list.id =
      `swap${side === "from" ? "From" : "To"}PickerList`;

    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Available assets");

    menu.append(search, filters, list);

    menu.dataset.ready = "true";

    return menu;
  }

  /* =======================================================
     CATEGORY FILTERS
  ======================================================= */

  function matchesCategory(asset, filter) {
    if (filter === "all") return true;

    if (filter === "stable") {
      return asset.type === "stable";
    }

    if (filter === "secondary") {
      return asset.category === "secondary";
    }

    if (filter === "main") {
      return (
        asset.category === "main" ||
        [
          "BTC",
          "ETH",
          "BNB",
          "SOL",
          "USDT",
          "USDC"
        ].includes(asset.symbol)
      );
    }

    return true;
  }

  /* =======================================================
     RENDER ASSET OPTIONS
  ======================================================= */

  function renderOptions(side) {
    const menu = ensureMenu(side);

    if (!menu) return;

    const list = menu.querySelector(
      ".swap-picker-list"
    );

    const query = state.search[side]
      .trim()
      .toLowerCase();

    const filter = state.filter[side];

    const selected =
      side === "from"
        ? state.from
        : state.to;

    const other =
      side === "from"
        ? state.to
        : state.from;

    menu.querySelectorAll(
      ".swap-picker-filter"
    ).forEach(button => {
      const active =
        button.dataset.filter === filter;

      button.classList.toggle(
        "is-active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    const results = sortedAssets().filter(asset => {
      const searchable =
        `${asset.symbol} ${assetName(asset)}`
          .toLowerCase();

      return (
        asset.symbol !== other &&
        matchesCategory(asset, filter) &&
        (!query || searchable.includes(query))
      );
    });

    list.replaceChildren();

    if (!results.length) {
      const empty = document.createElement("div");

      empty.className = "swap-picker-empty";
      empty.textContent = "No matching assets found.";

      list.appendChild(empty);
      return;
    }

    results.forEach(asset => {
      const option = document.createElement("button");

      option.type = "button";
      option.className = "swap-picker-option";
      option.setAttribute("role", "option");

      option.setAttribute(
        "aria-selected",
        String(asset.symbol === selected)
      );

      option.dataset.symbol = asset.symbol;

      option.appendChild(
        assetImage(asset, 30)
      );

      const copy = document.createElement("span");
      copy.className = "swap-option-copy";

      const ticker = document.createElement("span");
      ticker.className = "swap-option-symbol";
      ticker.textContent = asset.symbol;

      const name = document.createElement("span");
      name.className = "swap-option-name";
      name.textContent = assetName(asset);

      copy.append(ticker, name);
      option.appendChild(copy);

      option.addEventListener("click", () => {
        selectAsset(side, asset.symbol);
      });

      list.appendChild(option);
    });
  }

  /* =======================================================
     OPEN / CLOSE PICKER
  ======================================================= */

  function openPicker(side) {
    if (
      state.openPicker &&
      state.openPicker !== side
    ) {
      closePicker(state.openPicker);
    }

    const { button, menu } = pickerParts(side);

    if (!button || !menu) return;

    ensureMenu(side);
    renderOptions(side);

    menu.hidden = false;

    button.setAttribute(
      "aria-expanded",
      "true"
    );

    state.openPicker = side;

    const search = menu.querySelector(
      ".swap-picker-search"
    );

    if (search) {
      search.value = state.search[side];

      window.setTimeout(
        () => search.focus(),
        0
      );
    }
  }

  function closePicker(side = state.openPicker) {
    if (!side) return;

    const { button, menu } = pickerParts(side);

    if (menu) menu.hidden = true;

    if (button) {
      button.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    if (state.openPicker === side) {
      state.openPicker = null;
    }
  }

  /* =======================================================
     SYNCHRONIZE SELECTORS
  ======================================================= */

  function syncSelectors() {
    setValue("swapFromAsset", state.from);
    setValue("swapToAsset", state.to);

    renderTrigger("from");
    renderTrigger("to");

    document.querySelectorAll(
      "[data-swap-asset]"
    ).forEach(button => {
      const active =
        symbol(button.dataset.swapAsset) === state.from;

      button.classList.toggle(
        "is-active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });
  }

  /* =======================================================
     SELECT ASSET
  ======================================================= */

  function selectAsset(side, key) {
    key = symbol(key);

    if (!coin(key)) return;

    if (side === "from") {
      if (key === state.to) {
        [state.from, state.to] = [
          state.to,
          state.from
        ];
      } else {
        state.from = key;
      }
    } else {
      if (key === state.from) {
        [state.from, state.to] = [
          state.to,
          state.from
        ];
      } else {
        state.to = key;
      }
    }

    closePicker(side);

    syncSelectors();

    renderOptions("from");
    renderOptions("to");

    updateQuote();
  }

  /* =======================================================
     PICKER EVENTS
  ======================================================= */

  function bindPickers() {
    $("swapFromPickerButton")?.addEventListener(
      "click",
      () => {
        state.openPicker === "from"
          ? closePicker("from")
          : openPicker("from");
      }
    );

    $("swapToPickerButton")?.addEventListener(
      "click",
      () => {
        state.openPicker === "to"
          ? closePicker("to")
          : openPicker("to");
      }
    );

    document.addEventListener("click", event => {
      if (!state.openPicker) return;

      const { button, menu } =
        pickerParts(state.openPicker);

      if (
        button?.contains(event.target) ||
        menu?.contains(event.target)
      ) {
        return;
      }

      closePicker();
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        state.openPicker
      ) {
        const side = state.openPicker;

        closePicker(side);

        pickerParts(side).button?.focus();
      }
    });
  }

  /* =======================================================
     POPULATE NATIVE SELECTS
  ======================================================= */

  function populateSelectors() {
    const from = $("swapFromAsset");
    const to = $("swapToAsset");

    if (!from || !to) {
      console.error(
        "[BLOXIO SWAP] Asset select elements are missing."
      );
      return;
    }

    [from, to].forEach(select => {
      const fragment =
        document.createDocumentFragment();

      sortedAssets().forEach(asset => {
        const option =
          document.createElement("option");

        option.value = asset.symbol;

        option.textContent =
          `${asset.symbol} — ${assetName(asset)}`;

        fragment.appendChild(option);
      });

      select.replaceChildren(fragment);
    });

    if (!coin(state.from)) {
      state.from = coins[0]?.symbol || "";
    }

    if (
      !coin(state.to) ||
      state.to === state.from
    ) {
      state.to =
        coins.find(
          asset => asset.symbol !== state.from
        )?.symbol || "";
    }

    syncSelectors();

    from.addEventListener("change", () => {
      selectAsset("from", from.value);
    });

    to.addEventListener("change", () => {
      selectAsset("to", to.value);
    });
  }

  /* =======================================================
     WALLET BALANCES
  ======================================================= */

  function parseBalance(raw) {
    if (raw && typeof raw === "object") {
      return number(
        raw.available ??
        raw.balance ??
        raw.free ??
        raw.amount
      );
    }

    return number(raw);
  }

  function getBalance(key) {
    const balance = parseBalance(
      state.balances[symbol(key)]
    );

    return Number.isFinite(balance) && balance >= 0
      ? balance
      : null;
  }

  function updateBalances() {
    const balance = getBalance(state.from);

    setText(
      "swapFromBalance",
      balance === null
        ? "Balance: —"
        : `Balance: ${format(balance)} ${state.from}`
    );

    setText(
      "swapToBalance",
      "Estimated amount"
    );

    const max = $("swapMaxButton");

    if (max) {
      max.disabled =
        balance === null ||
        balance <= 0;
    }
  }

  function acceptBalances(payload) {
    const balances =
      payload?.balances ??
      payload?.detail?.balances ??
      payload;

    if (
      !balances ||
      typeof balances !== "object" ||
      Array.isArray(balances)
    ) {
      return;
    }

    state.balances = {
      ...state.balances,
      ...balances
    };

    updateQuote();
  }

  function useMax() {
    const balance = getBalance(state.from);
    const input = $("swapAmount");

    if (balance === null || !input) {
      setStatus(
        "Wallet balance is not available.",
        "warning"
      );
      return;
    }

    input.value = String(balance);

    updateQuote();
  }

  /* =======================================================
     QUOTE ENGINE
  ======================================================= */

  function clearQuote(message) {
    state.quote = null;

    const output = $("estimatedReceive");

    if (output) {
      output.textContent = "0.00";
    }

    setText("swapOutputFiat", "≈ $0.00");
    setText("swapRate", "—");

    setText(
      "swapFee",
      `${(CONFIG.feeRate * 100).toFixed(2)}%`
    );

    setText("swapPriceImpact", "—");
    setText("swapMinimumReceived", "—");
    setText("swapReferencePrice", "—");
    setText("swapEstimatedFee", "—");

    setText(
      "swapQuoteStatus",
      message || "Waiting"
    );

    const button = $("swapButton");

    if (button) {
      button.disabled = true;
    }
  }

  function calculateQuote() {
    const amount = number(
      $("swapAmount")?.value
    );

    const fromPrice = getPrice(state.from);
    const toPrice = getPrice(state.to);

    const slippage = number(
      $("swapSlippage")?.value ??
      CONFIG.defaultSlippage
    );

    if (!coin(state.from) || !coin(state.to)) {
      return {
        error: "Choose both assets."
      };
    }

    if (state.from === state.to) {
      return {
        error: "Choose two different assets."
      };
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return {
        error: "Enter an amount greater than zero."
      };
    }

    if (
      !(fromPrice > 0) ||
      !(toPrice > 0)
    ) {
      return {
        error: "Live market price is unavailable."
      };
    }

    if (
      !Number.isFinite(slippage) ||
      slippage < 0 ||
      slippage > 50
    ) {
      return {
        error: "Invalid slippage tolerance."
      };
    }

    const balance = getBalance(state.from);

    if (
      balance !== null &&
      amount > balance
    ) {
      return {
        error: `Insufficient ${state.from} balance.`
      };
    }

    const grossReceive =
      (amount * fromPrice) / toPrice;

    const fee =
      grossReceive * CONFIG.feeRate;

    const receive =
      grossReceive - fee;

    const minimumReceived =
      receive * (1 - slippage / 100);

    const rate =
      fromPrice / toPrice;

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
        error: "Unable to calculate a safe quote."
      };
    }

    return {
      from: state.from,
      to: state.to,

      amount,
      fromPrice,
      toPrice,

      grossReceive,
      fee,
      receive,
      minimumReceived,

      rate,
      slippage,

      feeRate: CONFIG.feeRate,
      feeUsd: fee * toPrice,

      createdAt: Date.now()
    };
  }

  /* =======================================================
     UPDATE QUOTE UI
  ======================================================= */

  function updateQuote() {
    if (!root()) return;

    updateBalances();

    setText(
      "swapPreviewPair",
      `${state.from} / ${state.to}`
    );

    const fromAsset = coin(state.from);
    const toAsset = coin(state.to);

    setText(
      "swapPreviewDirection",
      fromAsset && toAsset
        ? `${assetName(fromAsset)} → ${assetName(toAsset)}`
        : "Select your pair"
    );

    if (state.from === state.to) {
      clearQuote(
        "Source and destination must be different."
      );

      setStatus(
        "Choose two different assets.",
        "warning"
      );

      return;
    }

    const quote = calculateQuote();

    if (quote.error) {
      clearQuote(quote.error);

      const amount = number(
        $("swapAmount")?.value
      );

      setStatus(
        Number.isFinite(amount) && amount > 0
          ? quote.error
          : "Select assets and enter an amount.",
        "info"
      );

      return;
    }

    state.quote = quote;

    const output = $("estimatedReceive");

    if (output) {
      output.textContent = format(quote.receive);
    }

    setText(
      "swapOutputFiat",
      `≈ $${format(
        quote.receive * quote.toPrice,
        2
      )}`
    );

    setText(
      "swapRate",
      `1 ${quote.from} ≈ ${format(
        quote.rate,
        10
      )} ${quote.to}`
    );

    setText(
      "swapFee",
      `${(quote.feeRate * 100).toFixed(2)}%`
    );

    setText(
      "swapPriceImpact",
      "—"
    );

    setText(
      "swapMinimumReceived",
      `${format(quote.minimumReceived)} ${quote.to}`
    );

    setText(
      "swapReferencePrice",
      `1 ${quote.from} = ${format(
        quote.rate,
        10
      )} ${quote.to}`
    );

    setText(
      "swapEstimatedFee",
      `${format(quote.fee)} ${quote.to}`
    );

    setText(
      "swapQuoteStatus",
      "Indicative quote"
    );

    const button = $("swapButton");

    if (button) {
      button.disabled = state.executing;

      button.textContent = state.executing
        ? "Processing..."
        : "Preview Conversion";
    }

    setStatus(
      "Indicative estimate. Final price and fees are confirmed by the server.",
      "success"
    );
  }

  /* =======================================================
     REVERSE PAIR
  ======================================================= */

  function reversePair() {
    [
      state.from,
      state.to
    ] = [
      state.to,
      state.from
    ];

    syncSelectors();

    updateQuote();
  }

  /* =======================================================
     QUICK ASSET PICKER
  ======================================================= */

  function quickPick(key) {
    if (coin(key)) {
      selectAsset("from", key);
    }
  }

  /* =======================================================
     EXECUTE SWAP
  ======================================================= */

  async function executeSwap() {
    if (state.executing) return;

    const quote = calculateQuote();

    if (quote.error) {
      setStatus(quote.error, "warning");
      return;
    }

    const confirmation = [
      `Convert ${format(quote.amount)} ${quote.from} to ${quote.to}?`,
      `Estimated receive: ${format(quote.receive)} ${quote.to}`,
      `Minimum received: ${format(quote.minimumReceived)} ${quote.to}`,
      `Indicative fee: ${(quote.feeRate * 100).toFixed(2)}%`,
      `Slippage tolerance: ${quote.slippage}%`,
      "",
      "The server must validate the final quote before settlement."
    ].join("\n");

    if (!window.confirm(confirmation)) {
      return;
    }

    state.executing = true;

    const button = $("swapButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Processing...";
    }

    setText(
      "swapQuoteStatus",
      "Submitting"
    );

    setStatus(
      "Submitting conversion request...",
      "info"
    );

    try {
      const result = await requestJson(
        CONFIG.executeUrl,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            from: quote.from,
            to: quote.to,
            amount: quote.amount,
            slippage: quote.slippage,

            quote: {
              referenceRate: quote.rate,
              referenceFromPrice: quote.fromPrice,
              referenceToPrice: quote.toPrice,
              feeRate: quote.feeRate,
              requestedAt: quote.createdAt
            }
          })
        }
      );

      if (
        result?.success === false ||
        result?.error
      ) {
        throw new Error(
          result.message ||
          result.error ||
          "Swap rejected by server."
        );
      }

      const detail = {
        from: quote.from,
        to: quote.to,
        amount: quote.amount,

        receive:
          result.receive ??
          result.data?.receive ??
          null,

        transactionId:
          result.transactionId ??
          result.data?.transactionId ??
          null,

        serverResult: result
      };

      setText(
        "swapQuoteStatus",
        "Completed"
      );

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

      const input = $("swapAmount");

      if (input) {
        input.value = "";
      }

      if (
        result.balances &&
        typeof result.balances === "object"
      ) {
        state.balances = {
          ...state.balances,
          ...result.balances
        };
      }

      state.quote = null;

      updateQuote();

      setStatus(
        result.message || "Conversion completed.",
        "success"
      );

    } catch (error) {
      console.error(
        "[BLOXIO SWAP] Execution failed:",
        error
      );

      setText(
        "swapQuoteStatus",
        "Failed"
      );

      setStatus(
        error.message || "Swap failed. Please try again.",
        "error"
      );

    } finally {
      state.executing = false;

      if (button) {
        button.textContent = "Preview Conversion";
      }

      updateQuote();
    }
  }

  /* =======================================================
     EVENT BINDINGS
  ======================================================= */

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

    $("swapButton")?.addEventListener(
      "click",
      executeSwap
    );

    document.querySelectorAll(
      "[data-swap-asset]"
    ).forEach(button => {
      button.addEventListener("click", () => {
        quickPick(button.dataset.swapAsset);
      });
    });

    /* WALLET BALANCES */

    window.addEventListener(
      "wallet-balances-updated",
      event => {
        const payload =
          event.detail?.balances ??
          event.detail;

        acceptBalances(payload);
      }
    );

    window.addEventListener(
      "wallet-sync",
      event => {
        if (event.detail?.balances) {
          acceptBalances(event.detail.balances);
        } else {
          updateBalances();
        }
      }
    );

    /* OPEN SWAP FROM WALLET */

    window.addEventListener(
      "wallet-swap-open",
      event => {
        const key = symbol(
          event.detail?.symbol
        );

        if (!coin(key)) return;

        selectAsset("from", key);

        root()?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    );

    bindPickers();
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function init() {
    if (state.initialized || !root()) {
      return;
    }

    if (!coins.length) {
      setStatus(
        "No swap assets are configured in coins.js.",
        "error"
      );

      console.error(
        "[BLOXIO SWAP] SWAP_COINS registry is empty."
      );

      return;
    }

    state.initialized = true;

    injectStyles();

    populateSelectors();

    ensureMenu("from");
    ensureMenu("to");

    bindEvents();

    updateQuote();

    refreshPrices();

    state.refreshTimer = window.setInterval(
      refreshPrices,
      CONFIG.refreshMs
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) {
          refreshPrices();
        }
      }
    );

    console.info(
      "[BLOXIO SWAP] Initialized:",
      coins.length,
      "assets"
    );
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  function destroy() {
    if (state.refreshTimer) {
      window.clearInterval(state.refreshTimer);
    }

    state.refreshTimer = null;

    closePicker("from");
    closePicker("to");

    state.initialized = false;
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.BloxioSwap = Object.freeze({

    init,

    destroy,

    refreshPrices,

    updateQuote,

    setPair(from, to) {
      if (
        !coin(from) ||
        !coin(to) ||
        symbol(from) === symbol(to)
      ) {
        return false;
      }

      state.from = symbol(from);
      state.to = symbol(to);

      syncSelectors();

      updateQuote();

      return true;
    },

    getState() {
      return {
        from: state.from,
        to: state.to,

        quote: state.quote
          ? { ...state.quote }
          : null,

        priceUpdatedAt: state.priceUpdatedAt,

        assets: coins.length
      };
    }
  });

  /* =======================================================
     DOM READY
  ======================================================= */

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
