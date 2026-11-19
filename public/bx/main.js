/*!
 * BLOXIO MAIN ENGINE V6.2.0
 * Multi-page navigation controller
 * Each HTML page remains authoritative; no cross-page view hiding.
 */
(() => {
  "use strict";

  const VERSION = "6.2.0";
  const BOOT_FLAG = "__BX_MAIN_V620_LOADING__";

  // Prevent duplicate initialization if the script is included more than once.
  if (window.BX_MAIN?.version === VERSION || window[BOOT_FLAG]) return;
  window[BOOT_FLAG] = true;

  const APP = window.BX_APP = window.BX_APP || {};
  APP.ui = APP.ui || {};
  APP.router = APP.router || {};

  const CONFIG = Object.freeze({
    VERSION,
    STORE: "bloxio:view",
    PAGES: Object.freeze({
      wallet: "/index.html",
      market: "/pages/market.html",
      casino: "/pages/casino.html",
      mining: "/pages/mining.html",
      airdrop: "/pages/airdrop.html",
      p2p: "/pages/p2p.html",
      mint: "/pages/mint.html",
      settings: "/pages/settings.html",
      more: "/pages/more.html",
      game: "/pages/game.html",
      reward: "/pages/reward.html",
      profile: "/pages/profile.html"
    }),
    // Old News links are retained as a compatibility alias for Mint.
    ALIASES: Object.freeze({
      news: "mint"
    })
  });

  let booted = false;
  let currentPage = "wallet";
  let navigationBound = false;
  let networkListenersBound = false;

  const log = (...args) => console.info("[BLOXIO MAIN]", ...args);
  const warn = (...args) => console.warn("[BLOXIO MAIN]", ...args);

  function normalizePath(path) {
    if (!path) return "/";
    const withoutQuery = String(path).split(/[?#]/, 1)[0];
    const clean = withoutQuery.replace(/\/+$/, "");
    return clean || "/";
  }

  function normalizePage(page) {
    const key = String(page || "").trim().toLowerCase();
    return CONFIG.ALIASES[key] || (CONFIG.PAGES[key] ? key : null);
  }

  function resolveCurrentPage() {
    const declared = normalizePage(document.body?.dataset?.page);
    if (declared) return declared;

    const path = normalizePath(window.location.pathname);
    const match = Object.entries(CONFIG.PAGES).find(
      ([, url]) => normalizePath(url) === path
    );

    if (match) return match[0];

    // Compatibility with older /pages/news.html links.
    if (path === "/pages/news" || path === "/pages/news.html") return "mint";

    return "wallet";
  }

  function setNavigation(page) {
    const activePage = normalizePage(page) || page;

    document.querySelectorAll("[data-view]").forEach((element) => {
      const elementPage = normalizePage(element.dataset.view) || element.dataset.view;
      const active = elementPage === activePage;

      element.classList.toggle("active", active);

      if (active) element.setAttribute("aria-current", "page");
      else element.removeAttribute("aria-current");

      // Keep anchors pointed at the canonical destination.
      const hrefPage = normalizePage(element.dataset.view);
      const href = hrefPage ? CONFIG.PAGES[hrefPage] : null;

      if (href && element.tagName === "A") {
        element.setAttribute("href", href);
      }
    });

    // More is the mobile navigation entry for secondary pages.
    // Keep it active only on the More directory itself; child pages remain
    // individually identifiable in their dropdown/sidebar links.
  }

  function runSafely(label, callback) {
    if (typeof callback !== "function") return;

    try {
      const result = callback();
      if (result && typeof result.then === "function") {
        result.catch((error) => warn(`${label} async initialization failed`, error));
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
      mint: () => runSafely("Mint", () => window.BLOXIO_MINT?.init?.()),
      settings: () => runSafely("settings renderer", window.renderSettings),
      more: () => {},
      game: () => runSafely("game", () => window.BLOXIO_GAME?.init?.()),
      reward: () => runSafely("rewards", () => window.BLOXIO_REWARDS?.init?.()),
      profile: () => runSafely("profile", () => window.BLOXIO_PROFILE?.init?.())
    };

    runSafely(`page:${page}`, initializers[page]);
  }

  function closeHeaderMenus(except = null) {
    document.querySelectorAll(".header-more-menu[open], .locale-box[open], .user-toolbar[open]")
      .forEach((menu) => {
        if (menu !== except) menu.removeAttribute("open");
      });

    // Support common details-based header dropdowns without assuming a
    // particular implementation for locale or user menus.
    document.querySelectorAll("details.header-more-menu[open]").forEach((menu) => {
      if (menu !== except) menu.open = false;
    });
  }

  function navigate(page, options = {}) {
    const normalized = normalizePage(page);
    const target = normalized ? CONFIG.PAGES[normalized] : null;

    if (!target) {
      warn("Unknown destination:", page);
      return false;
    }

    const currentPath = normalizePath(window.location.pathname);
    const targetPath = normalizePath(target);

    closeHeaderMenus();

    if (currentPath === targetPath) {
      currentPage = normalized;
      APP.router.current = normalized;
      setNavigation(normalized);
      if (options.refresh === true) window.location.reload();
      return true;
    }

    if (options.replace === true) window.location.replace(target);
    else window.location.assign(target);

    return true;
  }

  function handleNavigationClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest("a[data-view], a[data-action]");
    if (!link) return;

    // Preserve native browser behavior for modified clicks and non-left clicks.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;

    if (document.body?.classList.contains("auth-lock") &&
        link.dataset.authRequired === "true") {
      event.preventDefault();
      window.AUTH?.openAuth?.("login");
      return;
    }

    const page = normalizePage(link.dataset.view);
    if (page) {
      event.preventDefault();
      navigate(page);
      return;
    }

    const actionPages = {
      "go-wallet": "wallet",
      "go-market": "market",
      "go-casino": "casino",
      "go-mining": "mining",
      "go-airdrop": "airdrop",
      "go-p2p": "p2p",
      "go-mint": "mint",
      "go-news": "mint",
      "go-settings": "settings",
      "go-more": "more",
      "go-game": "game",
      "go-reward": "reward",
      "go-profile": "profile"
    };

    const actionPage = actionPages[link.dataset.action];
    if (actionPage) {
      event.preventDefault();
      navigate(actionPage);
    }
  }

  function handleDocumentPointer(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openMenu = document.querySelector("details.header-more-menu[open]");
    if (openMenu && !openMenu.contains(target)) {
      openMenu.open = false;
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key !== "Escape") return;
    closeHeaderMenus();
  }

  function bindNavigation() {
    if (navigationBound) return;
    navigationBound = true;

    document.addEventListener("click", handleNavigationClick);
    document.addEventListener("click", handleDocumentPointer);
    document.addEventListener("keydown", handleDocumentKeydown);
  }

  function networkStatus() {
    if (networkListenersBound) return;
    networkListenersBound = true;

    const updateNetworkState = () => {
      const online = window.navigator.onLine;
      document.documentElement.dataset.network = online ? "online" : "offline";
      document.body?.classList.toggle("offline", !online);
    };

    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
  }

  function closeTransientPanels() {
    document.querySelectorAll(".market-modal.open").forEach((element) => {
      element.classList.remove("open");
    });

    document.querySelectorAll(".wallet-panel").forEach((element) => {
      if (currentPage !== "wallet") element.classList.add("wallet-hidden");
    });

    document.querySelectorAll(".mining-sub-panel").forEach((element) => {
      element.classList.add("mining-hidden");
    });

    closeHeaderMenus();
  }

  function boot() {
    if (booted) return;
    booted = true;

    currentPage = resolveCurrentPage();
    APP.router.current = currentPage;
    APP.router.pages = CONFIG.PAGES;
    APP.router.go = navigate;

    try {
      window.localStorage.setItem(CONFIG.STORE, currentPage);
    } catch (error) {
      // Storage may be unavailable in private or restricted browsing contexts.
      warn("Could not persist current page", error);
    }

    setNavigation(currentPage);
    bindNavigation();
    networkStatus();
    closeTransientPanels();
    dispatchPageReady(currentPage);

    window.BX_MAIN = {
      version: VERSION,
      config: CONFIG,
      navigate,
      setNavigation,
      get currentPage() {
        return currentPage;
      }
    };

    window[BOOT_FLAG] = false;
    log("Ready", { version: VERSION, page: currentPage });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
