/*========================================================
   PART 2 — NAVIGATION (General Update)
========================================================= */

const VIEWS = ["wallet", "market", "casino", "mining", "airdrop"];

/* ================= SIMPLE ROUTER (FIXED) ================= */

const VIEWS = document.querySelectorAll(".view");
const NAV_BTNS = document.querySelectorAll(".bottom-nav button");

function switchView(viewId) {
  VIEWS.forEach(v => v.classList.remove("active"));
  NAV_BTNS.forEach(b => b.classList.remove("active"));

  const view = document.getElementById(viewId);
  const btn = document.querySelector(`[data-view="${viewId}"]`);

  if (view) view.classList.add("active");
  if (btn) btn.classList.add("active");

  document.dispatchEvent(
    new CustomEvent("view:change", { detail: viewId })
  );
}

NAV_BTNS.forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    if (view) switchView(view);
  });
});

/* default */
document.addEventListener("DOMContentLoaded", () => {
  switchView("wallet");
});

/* ================= NAV BUTTONS ================= */

function syncNavButtons(activeView) {
  const buttons = $$(".bottom-nav button");

  buttons.forEach(btn => {
    const view = btn.dataset.view;
    if (!view) return;

    btn.classList.toggle("active", view === activeView);
  });
}

/* =========================
   VIEW BINDING (SSOT)
========================= */

let CURRENT_VIEW = null;

document.addEventListener("view:change", (e) => {
  const view = e.detail;
  if (!view || view === CURRENT_VIEW) return;

  log.info("VIEW CHANGE:", CURRENT_VIEW, "→", view);

   /* ========= EXIT OLD VIEW ========= */
  switch (CURRENT_VIEW) {
    case "market":
      stopMarket();
      if (MARKET.ws) {
        MARKET.ws.close();
        MARKET.ws = null;
        log.info("Market WS closed");
      }
      break;
  }

   /* ========= ENTER NEW VIEW ========= */
   document.addEventListener("view:change", e => {
  const view = e.detail;

  switch (view) {
    case "wallet":
      loadWallet();
      break;

    case "market":
      initMarket();
      startPriceFeed();
      connectDepthWS();
      break;

    case "casino":
      initCasino();
      break;

    case "mining":
      renderMining();
      break;

    case "airdrop":
      loadAirdrop();
      break;
  }
});
