/* =========================================================
   BLOXIO CORE ENGINE V4
   Resilient multi-page boot • guest-first • failure isolation
   ========================================================= */
(function () {
  "use strict";
  if (window.BX_CORE?.__V4__) return;

  const CONFIG = Object.freeze({
    VERSION: "4.0.0",
    API_BASE: `${location.origin}/api`,
    BOOT_TIMEOUT: 12000,
    MODULE_TIMEOUT: 2500
  });

  const APP = window.APP = Object.assign(window.APP || {}, {
    version: CONFIG.VERSION,
    ready: false,
    booting: true,
    online: navigator.onLine,
    user: window.APP?.user || null,
    modules: window.APP?.modules || {},
    services: window.APP?.services || {},
    errors: window.APP?.errors || [],
    page: document.body?.dataset?.page || "unknown"
  });

  const $ = (id) => document.getElementById(id);
  const log = (...args) => console.info("[BLOXIO CORE]", ...args);
  const warn = (...args) => console.warn("[BLOXIO CORE]", ...args);
  const recordError = (scope, err) => {
    const item = { scope, message: String(err?.message || err || "Unknown error"), at: Date.now() };
    APP.errors.push(item);
    console.error("[BLOXIO CORE]", scope, err);
  };

  let bootPromise = null;
  let hardStop = null;
  let finished = false;

  function progress(value) {
    const bar = $("loaderProgress");
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function revealApplication(reason = "ready") {
    if (finished) return;
    finished = true;
    APP.ready = true;
    APP.booting = false;
    APP.bootReason = reason;

    document.body.classList.remove("loading", "app-preload", "auth-lock", "auth-loading");
    document.body.classList.add("app-ready");

    const app = $("app");
    if (app) {
      app.classList.remove("app-hidden");
      app.style.visibility = "visible";
      app.style.opacity = "1";
      app.style.pointerEvents = "auto";
    }

    hideLoader();
    progress(100);
    log("Application revealed:", reason);
  }

  function showLoader() {
    const loader = $("globalLoader");
    if (!loader) return;
    loader.classList.remove("hidden");
    loader.setAttribute("aria-hidden", "false");
  }

  function hideLoader() {
    const loader = $("globalLoader");
    if (!loader) return;
    loader.classList.add("hidden");
    loader.setAttribute("aria-hidden", "true");
  }

  function safeCall(name, fn) {
    try {
      if (typeof fn === "function") {
        const result = fn();
        APP.modules[name] = "started";
        if (result && typeof result.catch === "function") {
          result.catch((e) => recordError(name, e));
        }
      } else {
        APP.modules[name] = "not-present";
      }
    } catch (e) {
      APP.modules[name] = "failed";
      recordError(name, e);
    }
  }

  function networkWatcher() {
    window.addEventListener("online", () => {
      APP.online = true;
      document.documentElement.dataset.network = "online";
      log("Network online");
    });
    window.addEventListener("offline", () => {
      APP.online = false;
      document.documentElement.dataset.network = "offline";
      warn("Network offline — public interface remains available");
    });
    APP.online = navigator.onLine;
  }

  function initServices() {
    safeCall("auth", () => window.AUTH?.init?.());
    safeCall("websocket", () => {
      if (window.WS?.connect) return window.WS.connect();
    });

    // Page modules are optional; only the module for this page should run.
    const page = APP.page;
    const pageInitializers = {
      wallet: () => window.WALLET?.init?.(),
      market: () => window.initMarket?.(),
      casino: () => window.CASINO?.init?.(),
      mining: () => window.renderMining?.(),
      airdrop: () => window.initAirdrop?.(),
      p2p: () => window.BLOXIO_P2P?.init?.(),
      news: () => window.BLOXIO_NEWS?.init?.()
    };
    if (pageInitializers[page]) safeCall(`page:${page}`, pageInitializers[page]);
    else APP.modules[`page:${page}`] = "no-page-initializer";
  }

  async function boot() {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      log("Guest-first boot started", { page: APP.page, version: CONFIG.VERSION });

      // The public interface is revealed immediately without external sign-in.
      networkWatcher();
      APP.services.api = window.API ? "available" : "missing";
      APP.services.websocket = window.WS ? "available" : "missing";

      if (!window.API) warn("API service missing; page will open in guest mode");
      revealApplication("guest-first");

      // Authentication and page services initialize independently after the UI is visible.
      initServices();
    })();
    return bootPromise;
  }

  window.addEventListener("error", (event) => recordError("runtime", event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => recordError("promise", event.reason));

  window.BX_CORE = {
    __V4__: true,
    CONFIG,
    boot,
    reveal: revealApplication,
    showLoader,
    hideLoader,
    safeCall,
    get APP() { return APP; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
