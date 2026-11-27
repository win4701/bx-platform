/* =========================================================
   BLOXIO TRADE UI ENHANCEMENTS — V10
   public/bx/trade.js

   - Converts native <select> into accessible custom dropdowns.
   - Mirrors the select's value; select stays the source of truth.
   - Syncs market.js state (order type, pair, units).
   - Does NOT touch order execution or market data (owned by market.js).

   Depends on:
   - window.MARKET (market.js V10)
   - window.BLOXIO_ICONS (optional icon library)
========================================================= */

"use strict";

(() => {

  /* ---------- Guard: avoid double-init ---------- */
  if (window.__BLOXIO_TRADE_UI_V10__) return;
  window.__BLOXIO_TRADE_UI_V10__ = true;

  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = (id) => document.getElementById(id);

  const COMMODITY_SYMBOLS = new Set([
    "XAU", "XAG", "XPT", "XPD",
    "COPPER", "OIL", "BRENT", "NG", "RHODIUM", "IRIDIUM"
  ]);

  const COMMODITY_ALIASES = {
    XAU: "gold",
    XAG: "silver",
    XPT: "platinum",
    XPD: "palladium"
  };

  /**
   * Resolve the icon path for a given pair value (e.g., "BX_USDT").
   * Uses window.BLOXIO_ICONS if available, else falls back to a static path.
   */
  function iconForPair(value) {
    const rawBase = String(value || "").split(/[_/]/)[0].toUpperCase();
    if (!rawBase) return "";

    const fileName = COMMODITY_ALIASES[rawBase] || rawBase.toLowerCase();
    const folder = COMMODITY_SYMBOLS.has(rawBase) ? "commodities" : "coins";
    const fallback = `/assets/images/${folder}/${fileName}.png`;

    const icons = window.BLOXIO_ICONS;
    if (icons && typeof icons === "object") {
      try {
        const resolved = COMMODITY_SYMBOLS.has(rawBase)
          ? icons.commodity?.(rawBase)
          : icons.token?.(rawBase, { extension: "png" });
        if (resolved) return resolved;
      } catch (_) { /* ignore icon library errors */ }
    }
    return fallback;
  }

  /* =========================================================
     CUSTOM SELECT ENHANCEMENT
  ========================================================= */

  /**
   * Wraps a native <select> with a custom accessible dropdown.
   * - Keeps the native select as the source of truth.
   * - Reflects value changes both ways.
   * - Skips if already wrapped.
   */
  function enhanceSelect(select) {
    if (!select || select.dataset.customized === "1") return;
    if (select.closest(".bx-custom-select")) return;

    select.dataset.customized = "1";

    const wrapper = document.createElement("div");
    wrapper.className = "bx-custom-select";
    wrapper.dataset.customSelect = select.id || "select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "bx-custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const valueEl = document.createElement("span");
    valueEl.className = "bx-custom-select-value";

    const chevron = document.createElement("span");
    chevron.className = "bx-custom-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";

    trigger.append(valueEl, chevron);

    const menu = document.createElement("div");
    menu.className = "bx-custom-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    const isPairSelect = select.id === "tradePairSelect";

    /* ---------- Render current value ---------- */
    const renderValue = () => {
      const option = select.options[select.selectedIndex];
      valueEl.replaceChildren();
      if (!option) return;

      if (isPairSelect) {
        const img = document.createElement("img");
        img.className = "bx-select-token-icon";
        img.src = iconForPair(option.value);
        img.alt = "";
        img.onerror = () => { img.hidden = true; };
        valueEl.append(img);
      }

      const label = document.createElement("span");
      label.textContent = option.textContent.trim();
      valueEl.append(label);

      // Sync selected state in menu
      [...menu.children].forEach((item) => {
        const selected = item.dataset.value === select.value;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", String(selected));
      });
    };

    /* ---------- Build menu items ---------- */
    [...select.options].forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "bx-custom-select-option";
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));

      if (isPairSelect) {
        const img = document.createElement("img");
        img.className = "bx-select-token-icon";
        img.src = iconForPair(option.value);
        img.alt = "";
        img.onerror = () => { img.hidden = true; };
        item.append(img);
      }

      const text = document.createElement("span");
      text.textContent = option.textContent.trim();
      item.append(text);

      item.addEventListener("click", () => {
        if (select.value !== option.value) {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        renderValue();
        closeMenu();
        trigger.focus();
      });

      menu.append(item);
    });

    /* ---------- Open / close ---------- */
    function openMenu() {
      // Close any other open custom selects
      document.querySelectorAll(".bx-custom-select.is-open").forEach((other) => {
        if (other !== wrapper) {
          other.classList.remove("is-open");
          const otherMenu = other.querySelector(".bx-custom-select-menu");
          const otherTrigger = other.querySelector(".bx-custom-select-trigger");
          if (otherMenu) otherMenu.hidden = true;
          otherTrigger?.setAttribute("aria-expanded", "false");
        }
      });
      wrapper.classList.add("is-open");
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      wrapper.classList.remove("is-open");
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closeMenu(); return; }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openMenu();
        menu.querySelector(".bx-custom-select-option")?.focus();
      }
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closeMenu(); trigger.focus(); }
    });

    // React to native select changes (from market.js or programmatic updates)
    select.addEventListener("change", renderValue);

    // Mount the native select INSIDE the wrapper. This is required for the
    // .bx-custom-select > select clipping rule to hide the duplicate native UI.
    // The native select remains the source of truth for all market/order logic.
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select, trigger, menu);
    select.classList.add("bx-native-select");

    renderValue();
  }

  /* =========================================================
     SYNC HELPERS
  ========================================================= */

  /**
   * Sync the header pair icon when the pair select changes.
   */
  function syncPairIcon() {
    const pairSelect = $("tradePairSelect");
    const icon = $("tradeBaseIcon");
    if (!pairSelect || !icon) return;
    icon.src = iconForPair(pairSelect.value);
    icon.alt = String(pairSelect.value || "").split(/[_/]/)[0];
  }

  /**
   * Sync the unit labels (bxBaseSymbol, bxQuoteSymbol, bxTotalSymbol)
   * with the currently selected pair.
   */
  function syncUnitLabels() {
    const pairSelect = $("tradePairSelect");
    const displayPair = window.MARKET?.displayPair
      || pairSelect?.selectedOptions?.[0]?.textContent
      || "BX/USDT";
    const [baseCode, quoteCode] = String(displayPair).split("/");

    const base = $("bxBaseSymbol");
    const quote = $("bxQuoteSymbol");
    const totalSymbol = $("bxTotalSymbol");

    if (base) base.textContent = baseCode || "BX";
    if (quote) quote.textContent = quoteCode || "USDT";
    if (totalSymbol) totalSymbol.textContent = quoteCode || "USDT";

    const price = $("orderPrice");
    const quantity = $("orderAmount");
    const total = $("orderTotal");
    if (price) price.dataset.unit = quoteCode || "USDT";
    if (quantity) quantity.dataset.unit = baseCode || "BX";
    if (total) total.dataset.unit = quoteCode || "USDT";
  }

  /**
   * Apply order type: disable price input in market mode, fill current price.
   */
  function applyOrderType() {
    const orderType = $("bxOrderType");
    const market = window.MARKET;
    if (!orderType) return;

    if (market) market.orderType = orderType.value;

    const price = $("orderPrice");
    if (price) {
      price.disabled = orderType.value === "market";
      if (price.disabled && market?.price > 0) {
        price.value = String(market.price);
      }
    }
    market?.updateOrderTotal?.();
  }

  /* =========================================================
     INPUT FRAME DECORATION
     Wraps .market-input with a unit suffix (.bx-input-unit)
  ========================================================= */

  function decorateInputs() {
    document.querySelectorAll(".bx-trade-field").forEach((field) => {
      const input = field.querySelector("input.market-input");
      const unit = field.querySelector("span small");
      if (!input || !unit) return;
      if (field.querySelector(".bx-input-frame")) return;

      const frame = document.createElement("div");
      frame.className = "bx-input-frame";
      input.parentNode.insertBefore(frame, input);
      frame.append(input);

      const suffix = document.createElement("span");
      suffix.className = "bx-input-unit";
      suffix.textContent = unit.textContent.trim();
      frame.append(suffix);
    });
  }

  /* =========================================================
     INIT
  ========================================================= */

  function initTradeEnhancements() {
    const page = document.body?.dataset.page;
    if (!["trade", "market"].includes(page)) return;

    // 1. Enhance native selects
    ["tradePairSelect", "bxOrderType", "bxTimeInForce", "bxMarketQuote"]
      .forEach((id) => enhanceSelect($(id)));

    // 2. Pair select → connect market + sync icon/units
    const pairSelect = $("tradePairSelect");
    pairSelect?.addEventListener("change", () => {
      const market = window.MARKET;
      if (market?.connectPair) {
        market.connectPair(pairSelect.value);
      }
      syncPairIcon();
      syncUnitLabels();
    });
    syncPairIcon();
    syncUnitLabels();

    // 3. Order type → disable price + sync market.orderType
    const orderType = $("bxOrderType");
    orderType?.addEventListener("change", applyOrderType);
    applyOrderType();

    // 4. Time in force — UI preference only until backend supports it
    const tif = $("bxTimeInForce");
    tif?.addEventListener("change", () => {
      tif.dataset.selectedTif = tif.value;
    });

    // 5. Decorate inputs with unit suffixes
    decorateInputs();

    // 6. Click outside → close any open custom select
    document.addEventListener("click", (event) => {
      if (event.target.closest(".bx-custom-select")) return;
      document.querySelectorAll(".bx-custom-select.is-open").forEach((wrapper) => {
        wrapper.classList.remove("is-open");
        const menu = wrapper.querySelector(".bx-custom-select-menu");
        const trigger = wrapper.querySelector(".bx-custom-select-trigger");
        if (menu) menu.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
      });
    });

    // 7. React to market.js pair changes (watchlist click, quick pairs)
    document.addEventListener("bloxio:market-pair-changed", () => {
      syncPairIcon();
      syncUnitLabels();
      // Sync custom select display to the new pair
      const select = $("tradePairSelect");
      if (select) {
        const current = select.value;
        const next = window.MARKET?.pair;
        if (next && select.value !== next) {
          select.value = next;
        }
        // Re-render custom trigger
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // 8. React to market.js price changes (to sync price input in market mode)
    document.addEventListener("bloxio:market-price", (event) => {
      const price = $("orderPrice");
      const market = window.MARKET;
      if (!price || !market) return;
      if (market.orderType === "market" && market.price > 0) {
        price.value = String(market.price);
      }
    });
  }

  /* =========================================================
     BOOT
  ========================================================= */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTradeEnhancements, { once: true });
  } else {
    initTradeEnhancements();
  }

})();
