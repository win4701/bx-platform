/* BLOXIO TRADE / MARKET UI ENHANCEMENTS
 * Native selects remain the source of truth; custom controls mirror their values.
 * Order execution and market data remain owned by market.js / the backend.
 */
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const ICON_ROOT = "/assets/images/coins/";

  function iconForPair(value) {
    const base = String(value || "").split(/[_/]/)[0].toLowerCase();
    const aliases = { xau: "gold", xag: "silver", xpt: "platinum", xpd: "palladium" };
    return `${ICON_ROOT}${aliases[base] || base}.png`;
  }

  function enhanceSelect(select) {
    if (!select || select.dataset.customized === "1") return;
    select.dataset.customized = "1";

    const wrapper = document.createElement("div");
    wrapper.className = "bx-custom-select";
    wrapper.dataset.customSelect = select.id || "select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "bx-custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const value = document.createElement("span");
    value.className = "bx-custom-select-value";
    const chevron = document.createElement("span");
    chevron.className = "bx-custom-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";
    trigger.append(value, chevron);

    const menu = document.createElement("div");
    menu.className = "bx-custom-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    const renderValue = () => {
      const option = select.options[select.selectedIndex];
      value.replaceChildren();
      if (!option) return;
      if (select.id === "tradePairSelect") {
        const img = document.createElement("img");
        img.className = "bx-select-token-icon";
        img.src = iconForPair(option.value);
        img.alt = "";
        img.onerror = () => { img.hidden = true; };
        value.append(img);
      }
      const label = document.createElement("span");
      label.textContent = option.textContent.trim();
      value.append(label);
      [...menu.children].forEach((item) => {
        const selected = item.dataset.value === select.value;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", String(selected));
      });
    };

    [...select.options].forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "bx-custom-select-option";
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      if (select.id === "tradePairSelect") {
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
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        renderValue();
        closeMenu();
      });
      menu.append(item);
    });

    function openMenu() {
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

    trigger.addEventListener("click", () => menu.hidden ? openMenu() : closeMenu());
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openMenu();
        menu.querySelector(".bx-custom-select-option")?.focus();
      }
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closeMenu(); trigger.focus(); }
    });
    select.addEventListener("change", renderValue);

    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(trigger, menu);
    select.classList.add("bx-native-select");
    renderValue();
  }

  function initTradeEnhancements() {
    const page = document.body?.dataset.page;
    if (!["trade", "market"].includes(page)) return;

    ["tradePairSelect", "bxOrderType", "bxTimeInForce", "bxMarketQuote"]
      .forEach((id) => enhanceSelect($(id)));

    const pairSelect = $("tradePairSelect");
    pairSelect?.addEventListener("change", () => {
      const market = window.MARKET;
      if (market?.connectPair) {
        market.connectPair(pairSelect.value);
        const icon = $("tradeBaseIcon");
        if (icon) {
          icon.src = iconForPair(pairSelect.value);
          icon.alt = pairSelect.value.split(/[_/]/)[0];
        }
      }
    });

    const orderType = $("bxOrderType");
    const applyOrderType = () => {
      const market = window.MARKET;
      if (!orderType) return;
      if (market) market.orderType = orderType.value;
      const price = $("orderPrice");
      if (price) {
        price.disabled = orderType.value === "market";
        if (price.disabled && market?.price > 0) price.value = String(market.price);
      }
      market?.updateOrderTotal?.();
    };
    orderType?.addEventListener("change", applyOrderType);
    applyOrderType();

    // Time-in-force is a UI preference only until the connected order API supports it.
    const tif = $("bxTimeInForce");
    tif?.addEventListener("change", () => {
      tif.dataset.selectedTif = tif.value;
    });

    const price = $("orderPrice");
    const quantity = $("orderAmount");
    const total = $("orderTotal");
    const quote = $("bxQuoteSymbol");
    const base = $("bxBaseSymbol");
    const totalSymbol = $("bxTotalSymbol");
    const updateUnits = () => {
      const pair = window.MARKET?.displayPair || pairSelect?.selectedOptions?.[0]?.textContent || "BX/USDT";
      const [baseCode, quoteCode] = pair.split("/");
      if (base) base.textContent = baseCode || "BX";
      if (quote) quote.textContent = quoteCode || "USDT";
      if (totalSymbol) totalSymbol.textContent = quoteCode || "USDT";
      if (price) price.dataset.unit = quoteCode || "USDT";
      if (quantity) quantity.dataset.unit = baseCode || "BX";
      if (total) total.dataset.unit = quoteCode || "USDT";
    };
    pairSelect?.addEventListener("change", updateUnits);
    updateUnits();

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".bx-custom-select")) {
        document.querySelectorAll(".bx-custom-select.is-open").forEach((wrapper) => {
          wrapper.classList.remove("is-open");
          const menu = wrapper.querySelector(".bx-custom-select-menu");
          const trigger = wrapper.querySelector(".bx-custom-select-trigger");
          if (menu) menu.hidden = true;
          trigger?.setAttribute("aria-expanded", "false");
        });
      }
    });

    // Currency units are displayed as suffixes inside the input frame.
    document.querySelectorAll(".bx-trade-field").forEach((field) => {
      const input = field.querySelector("input.market-input");
      const unit = field.querySelector("span small");
      if (!input || !unit || field.querySelector(".bx-input-unit")) return;
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTradeEnhancements, { once: true });
  } else {
    initTradeEnhancements();
  }
})();
