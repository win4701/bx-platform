/* =========================================================
   BLOXIO CORE ENGINE V5
   Single boot coordinator • guest-first • failure-isolated
   ========================================================= */
(function () {
  "use strict";

  if (window.BX_CORE?.__V5__) return;

  const CONFIG = Object.freeze({
    VERSION: "5.0.0",
    API_BASE: `${location.origin}/api`,
    BOOT_TIMEOUT: 12000
  });

  const APP = window.APP = Object.assign(window.APP || {}, {
    version: CONFIG.VERSION,
    ready: false,
    booting: true,
    online: navigator.onLine !== false,
    user: window.APP?.user || null,
    modules: window.APP?.modules || {},
    services: window.APP?.services || {},
    errors: Array.isArray(window.APP?.errors) ? window.APP.errors : [],
    page: document.body?.dataset?.page || "unknown"
  });

  const byId = id => document.getElementById(id);
  const log = (...args) => console.info("[BLOXIO CORE]", ...args);
  const warn = (...args) => console.warn("[BLOXIO CORE]", ...args);

  let bootPromise = null;
  let hardStop = null;
  let finished = false;
  let networkBound = false;

  function recordError(scope, error) {
    const item = {
      scope,
      message: String(error?.message || error || "Unknown error"),
      at: Date.now()
    };
    APP.errors.push(item);
    if (APP.errors.length > 100) APP.errors.shift();
    console.error("[BLOXIO CORE]", scope, error);
  }

  function progress(value) {
    const bar = byId("loaderProgress");
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  }

  function revealApplication(reason = "ready") {
    if (finished) return false;
    finished = true;

    APP.ready = true;
    APP.booting = false;
    APP.bootReason = reason;

    const body = document.body;
    body?.classList.remove(
      "loading",
      "app-preload",
      "app-hidden",
      "auth-lock",
      "auth-loading"
    );
    body?.classList.add("app-ready");

    const app = byId("app");
    if (app) {
      app.classList.remove("app-hidden", "hidden");
      app.hidden = false;
      app.style.visibility = "visible";
      app.style.opacity = "1";
      app.style.pointerEvents = "auto";
      app.setAttribute("aria-busy", "false");
    }

    const loader = byId("globalLoader");
    if (loader) {
      loader.setAttribute("aria-hidden", "true");
      loader.classList.add("hidden");
      loader.style.pointerEvents = "none";
      window.setTimeout(() => loader.remove(), 550);
    }

    progress(100);
    log("Application revealed:", reason);
    window.dispatchEvent(new CustomEvent("bloxio:ready", {
      detail: { reason, page: APP.page }
    }));
    return true;
  }

  function safeCall(name, callback) {
    if (typeof callback !== "function") {
      APP.modules[name] = "not-present";
      return false;
    }

    try {
      const result = callback();
      APP.modules[name] = result === false ? "unavailable" : "started";

      if (result && typeof result.then === "function") {
        result.catch(error => {
          APP.modules[name] = "failed";
          recordError(name, error);
        });
      }
      return result;
    } catch (error) {
      APP.modules[name] = "failed";
      recordError(name, error);
      return false;
    }
  }

  function networkWatcher() {
    if (networkBound) return;
    networkBound = true;

    const update = online => {
      APP.online = online;
      document.documentElement.dataset.network = online ? "online" : "offline";
      if (window.STATE?.set) {
        try { window.STATE.set("system.online", online); } catch (error) {
          recordError("state:network", error);
        }
      }
    };

    window.addEventListener("online", () => {
      update(true);
      log("Network online");
    });

    window.addEventListener("offline", () => {
      update(false);
      warn("Network offline — public interface remains available");
    });

    update(navigator.onLine !== false);
  }

  function initServices() {
    // CORE owns app-level service startup. Page feature initialization belongs
    // exclusively to main.js to avoid running page initializers twice.
    safeCall("auth", () => window.AUTH?.init?.());

    APP.services.api = window.API ? "available" : "missing";
    APP.services.websocket = window.WS ? "available" : "missing";

    if (!window.API) warn("API service missing; opening public interface");
    if (!window.WS) warn("WebSocket service missing; realtime features disabled");

    // A single owner starts the realtime connection. ws.js only defines it.
    safeCall("websocket", () => window.WS?.connect?.());
  }

  async function boot() {
    if (bootPromise) return bootPromise;

    bootPromise = (async () => {
      log("Boot started", { page: APP.page, version: CONFIG.VERSION });

      document.body?.classList.add("loading");
      if (byId("app")) byId("app").setAttribute("aria-busy", "true");

      hardStop = window.setTimeout(
        () => revealApplication("boot-timeout-recovery"),
        CONFIG.BOOT_TIMEOUT
      );

      try {
        networkWatcher();
        progress(12);

        // No network request, auth verification, or optional service is awaited
        // before the public shell is revealed.
        initServices();
        progress(78);
        revealApplication("boot-complete");
      } catch (error) {
        recordError("boot", error);
        revealApplication("boot-error-recovery");
      } finally {
        if (hardStop) {
          window.clearTimeout(hardStop);
          hardStop = null;
        }
        progress(100);
      }
    })();

    return bootPromise;
  }

  window.addEventListener("error", event => {
    recordError("runtime", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", event => {
    recordError("promise", event.reason);
  });

  window.BX_CORE = {
    __V5__: true,
    CONFIG,
    boot,
    reveal: revealApplication,
    safeCall,
    get APP() { return APP; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
