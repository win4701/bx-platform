/* BLOXIO TRADE PAGE CONTROLLER
 * Isolated page enhancement. Order submission remains owned by market.js.
 * No mock prices, balances, fills, or API endpoints are introduced.
 */
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);

  function initTradePage() {
    if (document.body?.dataset.page !== "trade") return;
    const box = $("tradeBox");
    if (!box || box.dataset.tradeControllerReady === "1") return;
    box.dataset.tradeControllerReady = "1";

    const amount = $("orderAmount");
    const price = $("orderPrice");
    const total = $("orderTotal");
    const title = $("tradeTitle");
    const buy = $("buyTab");
    const sell = $("sellTab");
    const action = $("actionBtn");

    if (title && !title.textContent.trim()) title.textContent = "BX Trading";

    // This page uses the existing MARKET engine; do not duplicate its order listeners.
    const market = window.MARKET;
    if (!market) {
      if (action) {
        action.disabled = true;
        action.title = "Market engine is unavailable";
      }
      const status = document.createElement("p");
      status.className = "text-metadata";
      status.setAttribute("role", "status");
      status.textContent = "Trading engine is unavailable. No order has been submitted.";
      box.appendChild(status);
      return;
    }

    const syncTotal = () => {
      const qty = Number(amount?.value);
      const unit = Number(price?.value || market.price || market.referencePrice || 0);
      if (total && Number.isFinite(qty) && qty > 0 && Number.isFinite(unit) && unit > 0) {
        total.value = String(Number((qty * unit).toFixed(8)));
      } else if (total) {
        total.value = "";
      }
    };

    amount?.addEventListener("input", syncTotal);
    price?.addEventListener("input", syncTotal);

    // Preserve market.js as the sole owner of buy/sell and order execution.
    [buy, sell].forEach((button) => {
      button?.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
      button?.addEventListener("click", () => {
        window.setTimeout(() => {
          buy?.setAttribute("aria-pressed", buy.classList.contains("active") ? "true" : "false");
          sell?.setAttribute("aria-pressed", sell.classList.contains("active") ? "true" : "false");
        }, 0);
      });
    });

    syncTotal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTradePage, { once: true });
  } else {
    initTradePage();
  }
})();
