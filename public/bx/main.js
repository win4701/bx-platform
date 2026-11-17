/* =========================================================
   BLOXIO MAIN ENGINE V6
   Multi-page navigation controller
   Keeps each HTML page authoritative; no cross-page view hiding.
   ========================================================= */
(() => {
  "use strict";

  if (window.BX_MAIN?.version === "6.0.0") return;

  const APP = window.BX_APP = window.BX_APP || {};
  APP.ui = APP.ui || {};
  APP.router = APP.router || {};

  const CONFIG = Object.freeze({
    VERSION: "6.0.0",
    STORE: "bloxio:view",
    PAGES: {
      wallet: "/index.html",
      market: "/pages/market.html",
      casino: "/pages/casino.html",
      mining: "/pages/mining.html",
      airdrop: "/pages/airdrop.html",
      p2p: "/pages/p2p.html",
      news: "/pages/news.html",
      settings: "/pages/settings.html",
      more: "/pages/more.html"
    }
  });

  let booted = false;
  let currentPage = "wallet";

  const log = (...args) => console.info("[BLOXIO MAIN]", ...args);
  const warn = (...args) => console.warn("[BLOXIO MAIN]", ...args);

  function normalizePath(path) {
    if (!path) return "/";
    const clean = path.replace(/\/+$/, "");
    return clean || "/";
  }

  function resolveCurrentPage() {
    const declared = document.body?.dataset?.page;
    if (declared && CONFIG.PAGES[declared]) return declared;

    const path = normalizePath(location.pathname);
    return Object.keys(CONFIG.PAGES).find(
      key => normalizePath(CONFIG.PAGES[key]) === path
    ) || "wallet";
  }

  function setNavigation(page) {
    document.querySelectorAll("[data-view]").forEach((element) => {
      const active = element.dataset.view === page;
      element.classList.toggle("active", active);
      if (active) element.setAttribute("aria-current", "page");
      else element.removeAttribute("aria-current");

      // Preserve the real destination in the anchor itself.
      const href = CONFIG.PAGES[element.dataset.view];
      if (href && element.tagName === "A") element.setAttribute("href", href);
    });
  }

  function runSafely(label, callback) {
    if (typeof callback !== "function") return;
    try {
      const result = callback();
      if (result && typeof result.catch === "function") {
        result.catch(error => warn(`${label} async initialization failed`, error));
      }
    } catch (error) {
      warn(`${label} initialization failed`, error);
    }
  }

  function dispatchPageReady(page) {
    try {
      document.dispatchEvent(new CustomEvent("bloxio:view", {
        detail: page
      }));
      window.STATE?.set?.("ui.view", page);
    } catch (error) {
      warn("Could not publish page state", error);
    }

    // Initialize only the feature belonging to the current HTML document.
    const initializers = {
      wallet: () => {
        runSafely("wallet renderer", window.renderWallet);
        runSafely("wallet UI", window.updateWalletUI);
      },
      market: () => {
        runSafely("market renderer", window.renderMarket);
        runSafely("market UI", window.updateMarketUI);
        runSafely("market chart resize", window.resizeMarketChart);
      },
      casino: () => {
        runSafely("casino lobby", window.renderCasinoLobby);
        runSafely("casino UI", window.updateCasinoUI);
      },
      mining: () => {
        runSafely("mining renderer", window.renderMining);
        runSafely("mining plans", window.renderMiningPlans);
        runSafely("mining UI", window.updateMiningUI);
      },
      airdrop: () => runSafely("airdrop renderer", window.renderAirdrop),
      p2p: () => runSafely("P2P", () => window.BLOXIO_P2P?.init?.()),
      news: () => runSafely("News", () => window.BLOXIO_NEWS?.init?.()),
      settings: () => runSafely("settings renderer", window.renderSettings),
      more: () => {}
    };

    runSafely(`page:${page}`, initializers[page]);
  }

  function navigate(page, options = {}) {
    const target = CONFIG.PAGES[page];
    if (!target) {
      warn("Unknown destination:", page);
      return false;
    }

    const currentPath = normalizePath(location.pathname);
    const targetPath = normalizePath(target);

    if (currentPath === targetPath) {
      setNavigation(page);
      if (options.refresh === true) location.reload();
      return true;
    }

    // Use browser navigation so server returns the actual standalone HTML page.
    if (options.replace === true) location.replace(target);
    else location.assign(target);

    return true;
  }

  function handleNavigationClick(event) {
    const link = event.target.closest("a[data-view], [data-action]");
    if (!link) return;

    // Respect native browser behavior (new tab, download, modified click).
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;

    if (document.body?.classList.contains("auth-lock")) {
      // Only block actions explicitly marked as protected.
      if (link.dataset.authRequired === "true") {
        event.preventDefault();
        window.AUTH?.openAuth?.("login");
        return;
      }
    }

    const page = link.dataset.view;
    if (page && CONFIG.PAGES[page]) {
      event.preventDefault();
      navigate(page);
      return;
    }

    const action = link.dataset.action;
    const actionPages = {
      "go-wallet": "wallet",
      "go-market": "market",
      "go-casino": "casino",
      "go-mining": "mining",
      "go-airdrop": "airdrop",
      "go-p2p": "p2p",
      "go-news": "news",
      "go-settings": "settings",
      "go-more": "more"
    };

    if (actionPages[action]) {
      event.preventDefault();
      navigate(actionPages[action]);
    }
  }

  function bindNavigation() {
    // Delegation supports desktop sidebar, mobile nav and dynamically inserted links.
    document.addEventListener("click", handleNavigationClick);
  }

  function networkStatus() {
    document.documentElement.dataset.network = navigator.onLine ? "online" : "offline";
    window.addEventListener("online", () => {
      document.documentElement.dataset.network = "online";
      document.body?.classList.remove("offline");
    });
    window.addEventListener("offline", () => {
      document.documentElement.dataset.network = "offline";
      document.body?.classList.add("offline");
    });
  }

  function closeTransientPanels() {
    document.querySelectorAll(".market-modal.open").forEach(el => el.classList.remove("open"));
    document.querySelectorAll(".wallet-panel").forEach(el => {
      if (currentPage !== "wallet") el.classList.add("wallet-hidden");
    });
    document.querySelectorAll(".mining-sub-panel").forEach(el => {
      el.classList.add("mining-hidden");
    });
  }

  function boot() {
    if (booted) return;
    booted = true;

    currentPage = resolveCurrentPage();
    APP.router.current = currentPage;
    APP.router.pages = CONFIG.PAGES;
    APP.router.go = navigate;

    // Current HTML page, not a stale localStorage value, is authoritative.
    try { localStorage.setItem(CONFIG.STORE, currentPage); } catch {}

    setNavigation(currentPage);
    bindNavigation();
    networkStatus();
    closeTransientPanels();
    dispatchPageReady(currentPage);

    window.BX_MAIN = {
      version: CONFIG.VERSION,
      config: CONFIG,
      navigate,
      get currentPage() { return currentPage; }
    };

    log("Ready", { version: CONFIG.VERSION, page: currentPage });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
