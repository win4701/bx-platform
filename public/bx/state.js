/* =========================================================
   BLOXIO STATE ENGINE V6
   Safe hydration • guarded updates • cross-tab synchronization
   Public API preserved: get/set/update/batch/subscribe/reset/use/persist
   ========================================================= */
"use strict";

window.STATE = (function () {
  const VERSION = "6.0.0";
  const STORAGE_KEY = "BX_STATE";

  if (window.STATE?.__BLOXIO_STATE_V6__) return window.STATE;

  const listeners = new Map();
  const middleware = [];
  let saveTimer = null;
  let batchDepth = 0;
  let persistPending = false;

  const isPlainObject = value => {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  };

  const defaults = () => ({
    meta: {
      version: VERSION,
      booted: false,
      updatedAt: Date.now()
    },
    user: null,
    wallet: {
      balance: 0,
      currency: "USD",
      transactions: []
    },
    market: {
      prices: {},
      favorites: [],
      lastSync: 0
    },
    mining: {
      active: false,
      subscription: null,
      hashrate: 0,
      reward: 0
    },
    casino: {
      games: {},
      history: []
    },
    airdrop: {
      reward: 0,
      claimed: false
    },
    ui: {
      view: "wallet",
      theme: "dark",
      sidebar: false,
      loading: false,
      mobile: false
    },
    system: {
      online: typeof navigator === "undefined" ? true : navigator.onLine !== false,
      ws: false,
      latency: 0
    }
  });

  function merge(target, source) {
    if (!isPlainObject(source)) return target;

    for (const key of Object.keys(source)) {
      // Avoid prototype-pollution keys from stale/corrupt local storage.
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        continue;
      }

      const incoming = source[key];
      if (isPlainObject(incoming)) {
        const current = isPlainObject(target[key]) ? target[key] : {};
        target[key] = merge(current, incoming);
      } else if (Array.isArray(incoming)) {
        target[key] = incoming;
      } else {
        target[key] = incoming;
      }
    }
    return target;
  }

  function readStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn("[BLOXIO STATE] Storage read unavailable", error);
      return null;
    }
  }

  function hydrate() {
    const base = defaults();
    const raw = readStorage();
    if (!raw) return base;

    try {
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        console.warn("[BLOXIO STATE] Ignoring invalid stored state shape");
        return base;
      }
      const restored = merge(base, parsed);
      if (!isPlainObject(restored.meta)) restored.meta = {};
      restored.meta.version = VERSION;
      if (typeof restored.meta.booted !== "boolean") restored.meta.booted = false;
      return restored;
    } catch (error) {
      console.warn("[BLOXIO STATE] Invalid stored state; using defaults", error);
      return base;
    }
  }

  let data = hydrate();

  function get(path) {
    if (path === undefined || path === null || path === "") return data;
    if (typeof path !== "string") return undefined;
    return path.split(".").reduce((value, key) => value?.[key], data);
  }

  function persist() {
    if (batchDepth > 0) {
      persistPending = true;
      return;
    }

    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.warn("[BLOXIO STATE] Storage write failed", error);
      }
    }, 150);
  }

  function runMiddleware(path, value, oldValue) {
    middleware.slice().forEach(fn => {
      try {
        fn({ path, value, old: oldValue, state: data });
      } catch (error) {
        console.error("[BLOXIO STATE] Middleware error", error);
      }
    });
  }

  function notify(path, value, oldValue) {
    listeners.forEach((callbacks, subscribedPath) => {
      const matches =
        subscribedPath === "*" ||
        path === "*" ||
        path === subscribedPath ||
        path.startsWith(`${subscribedPath}.`);

      if (!matches) return;

      callbacks.forEach(callback => {
        try {
          callback(value, oldValue, path);
        } catch (error) {
          console.error("[BLOXIO STATE] Listener error", error);
        }
      });
    });
  }

  function set(path, value) {
    if (typeof path !== "string" || !path.trim()) return false;

    const keys = path.split(".");
    if (keys.some(key =>
      !key || key === "__proto__" || key === "prototype" || key === "constructor"
    )) return false;

    let target = data;
    for (let index = 0; index < keys.length - 1; index++) {
      const key = keys[index];
      if (!isPlainObject(target[key])) target[key] = {};
      target = target[key];
    }

    const lastKey = keys[keys.length - 1];
    const oldValue = target[lastKey];
    if (Object.is(oldValue, value)) return false;

    target[lastKey] = value;
    if (isPlainObject(data.meta)) data.meta.updatedAt = Date.now();

    runMiddleware(path, value, oldValue);
    notify(path, value, oldValue);
    persist();
    return true;
  }

  function update(path, updater) {
    if (typeof updater !== "function") return false;
    return set(path, updater(get(path)));
  }

  function batch(callback) {
    if (typeof callback !== "function") return false;
    batchDepth++;
    try {
      callback();
      return true;
    } catch (error) {
      console.error("[BLOXIO STATE] Batch failed", error);
      return false;
    } finally {
      batchDepth--;
      if (batchDepth === 0 && persistPending) {
        persistPending = false;
        persist();
      }
    }
  }

  function subscribe(path, callback) {
    if (typeof path !== "string" || typeof callback !== "function") {
      return () => {};
    }
    if (!listeners.has(path)) listeners.set(path, new Set());
    listeners.get(path).add(callback);

    return () => {
      listeners.get(path)?.delete(callback);
      if (listeners.get(path)?.size === 0) listeners.delete(path);
    };
  }

  function use(fn) {
    if (typeof fn !== "function") return () => {};
    middleware.push(fn);
    return () => {
      const index = middleware.indexOf(fn);
      if (index >= 0) middleware.splice(index, 1);
    };
  }

  function reset() {
    const previous = data;
    data = defaults();
    notify("*", data, previous);
    persist();
    return data;
  }

  function cloneState(value) {
    if (typeof window.structuredClone === "function") {
      try { return window.structuredClone(value); } catch {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;
    const previous = data;
    data = hydrate();
    notify("*", data, previous);
  });

  window.addEventListener("online", () => set("system.online", true));
  window.addEventListener("offline", () => set("system.online", false));

  data.meta.booted = true;

  return {
    __BLOXIO_STATE_V6__: true,
    VERSION,
    get,
    set,
    update,
    batch,
    subscribe,
    reset,
    use,
    persist,
    hydrate() {
      const previous = data;
      data = hydrate();
      notify("*", data, previous);
      return data;
    },
    dump() {
      return cloneState(data);
    }
  };
})();
