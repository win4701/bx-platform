/* BLOXIO P2P FRONTEND
   Read-only offers feed + guarded offer creation.
   Backend endpoints are explicit integration contracts; no escrow/payment
   or settlement is simulated in the browser.
*/
(function () {
  "use strict";
  if (window.BLOXIO_P2P) return;

  const CONFIG = {
    offersEndpoint: "/p2p/offers",
    createOfferEndpoint: "/p2p/offers",
    refreshMs: 30000
  };

  const $ = (id) => document.getElementById(id);
  const state = { offers: [], loading: false, error: null, timer: null };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function notify(message, type) {
    const target = $("p2pStatus");
    if (target) {
      target.textContent = message;
      target.dataset.state = type || "info";
    } else {
      console.info("[BLOXIO P2P]", message);
    }
  }

  function unwrap(response) {
    if (response?.data !== undefined) return response.data;
    return response;
  }

  async function loadOffers() {
    if (state.loading) return;
    state.loading = true;
    const list = $("p2pOffers");
    const empty = $("p2pEmptyState");
    try {
      if (!window.API?.get) throw new Error("BLOXIO API service is not loaded.");
      const result = unwrap(await window.API.get(CONFIG.offersEndpoint, { auth: false, cache: false }));
      const offers = Array.isArray(result) ? result : (result?.offers || result?.items || []);
      if (!Array.isArray(offers)) throw new Error("Unexpected offers response format.");
      state.offers = offers;
      renderOffers();
      if (empty) empty.hidden = offers.length > 0;
      notify(offers.length ? `${offers.length} offer(s) loaded from the P2P service.` : "No active offers were returned by the P2P service.", "success");
    } catch (error) {
      state.error = error;
      if (list) list.innerHTML = "";
      if (empty) empty.hidden = false;
      notify(`P2P feed unavailable: ${error.message}`, "error");
    } finally {
      state.loading = false;
    }
  }

  function renderOffers() {
    const list = $("p2pOffers");
    if (!list) return;
    list.innerHTML = state.offers.map((offer) => {
      const id = escapeHTML(offer.id);
      const asset = escapeHTML(offer.asset || offer.symbol || "—");
      const side = escapeHTML(offer.side || "—");
      const price = escapeHTML(offer.price ?? "—");
      const currency = escapeHTML(offer.fiatCurrency || offer.quoteCurrency || "");
      const amount = escapeHTML(offer.availableAmount ?? offer.amount ?? "—");
      const payment = escapeHTML(Array.isArray(offer.paymentMethods) ? offer.paymentMethods.join(", ") : (offer.paymentMethod || "—"));
      return `<article class="card p2p-offer" data-offer-id="${id}">
        <h3>${side} ${asset}</h3>
        <p>Price: ${price} ${currency}</p>
        <p>Available: ${amount}</p>
        <p>Payment: ${payment}</p>
      </article>`;
    }).join("");
  }

  async function createOffer(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    const payload = {
      side: $("p2pSide")?.value,
      asset: $("p2pAsset")?.value?.trim(),
      price: Number($("p2pPrice")?.value),
      amount: Number($("p2pAmount")?.value),
      quoteCurrency: $("p2pQuoteCurrency")?.value?.trim()
    };
    if (!payload.asset || !payload.quoteCurrency || !["buy", "sell"].includes(payload.side) ||
        !Number.isFinite(payload.price) || payload.price <= 0 ||
        !Number.isFinite(payload.amount) || payload.amount <= 0) {
      notify("Enter a valid side, asset, quote currency, price and amount.", "error");
      return;
    }
    if (!window.API?.post) {
      notify("API service unavailable. Offer was not submitted.", "error");
      return;
    }
    try {
      if (submit) submit.disabled = true;
      const result = await window.API.post(CONFIG.createOfferEndpoint, payload);
      if (result?.error || result?.success === false) throw new Error(result.message || "Offer rejected by server.");
      notify("Offer submitted. The server must confirm its status before it is treated as active.", "success");
      form.reset();
      await loadOffers();
    } catch (error) {
      notify(`Could not submit offer: ${error.message}`, "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function init() {
    $("p2pRefreshBtn")?.addEventListener("click", loadOffers);
    $("p2pOfferForm")?.addEventListener("submit", createOffer);
    loadOffers();
    state.timer = window.setInterval(() => {
      if (!document.hidden) loadOffers();
    }, CONFIG.refreshMs);
  }

  window.BLOXIO_P2P = { init, loadOffers, get state() { return state; }, config: CONFIG };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
