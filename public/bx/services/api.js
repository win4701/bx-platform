
/* =========================================================
   BLOXIO API ENGINE V7
   SECURE NETWORK LAYER
   Compatible with routes.js V8
========================================================= */

"use strict";

(function () {

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

  BASE:
    location.hostname === "localhost"
      ? "http://localhost:3000/api"
      : location.origin + "/api",

  TIMEOUT: 12000,

  RETRIES: 3,

  BACKOFF: 500,

  CACHE: 20000,

  QUEUE: 4

};

/* =========================================================
   STATE
========================================================= */

const cache = new Map();

const pending = new Map();

const listeners = new Map();

const controllers = new Set();

const queue = [];

let active = 0;

let loggedOut = false;

const metrics = {

  success: 0,

  failed: 0,

  network: 0,

  cached: 0,

  requests: 0,

  retries: 0,

  unauthorized: 0

};

/* =========================================================
   EVENT BUS
========================================================= */

function emit(event, payload) {

  (listeners.get(event) || []).forEach(fn => {

    try {

      fn(payload);

    } catch (error) {

      console.warn("[BLOXIO API EVENT]", error);

    }

  });

}

function on(event, fn) {

  if (typeof fn !== "function") {
    return;
  }

  if (!listeners.has(event)) {

    listeners.set(event, []);

  }

  listeners.get(event).push(fn);

}

/* =========================================================
   TOKEN
========================================================= */

function token() {

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    null
  );

}

function clearToken() {

  localStorage.removeItem("token");

  localStorage.removeItem("accessToken");

  localStorage.removeItem("refreshToken");

}

/* =========================================================
   AUTH ROUTES
========================================================= */

function isPublicAuthRoute(url) {

  const path = String(url).split("?")[0];

  return [

    "/auth/login",

    "/auth/register",

    "/auth/refresh"

  ].includes(path);

}

/* =========================================================
   HEADERS
========================================================= */

function headers(extra = {}, authenticated = true) {

  const result = {

    Accept: "application/json",

    "Content-Type": "application/json",

    ...extra

  };

  const currentToken = authenticated
    ? token()
    : null;

  if (currentToken) {

    result.Authorization =
      `Bearer ${currentToken}`;

  }

  return result;

}

/* =========================================================
   URL
========================================================= */

function buildURL(url) {

  const path = String(url || "");

  if (/^https?:\/\//i.test(path)) {

    throw new Error(
      "External API URLs are not allowed"
    );

  }

  return (
    CONFIG.BASE.replace(/\/+$/, "") +
    "/" +
    path.replace(/^\/+/, "")
  );

}

/* =========================================================
   REQUEST QUEUE
========================================================= */

function enqueue(fn) {

  return new Promise((resolve, reject) => {

    queue.push({

      fn,

      resolve,

      reject

    });

    pump();

  });

}

function pump() {

  while (
    active < CONFIG.QUEUE &&
    queue.length > 0
  ) {

    const job = queue.shift();

    active++;

    Promise.resolve()

      .then(job.fn)

      .then(job.resolve)

      .catch(job.reject)

      .finally(() => {

        active--;

        pump();

      });

  }

}

/* =========================================================
   CACHE
========================================================= */

function cacheKey(url, opt, currentToken) {

  return JSON.stringify({

    url,

    method: opt.method || "GET",

    body: opt.body || null,

    token: currentToken || null

  });

}

function cached(key) {

  const item = cache.get(key);

  if (!item) {

    return null;

  }

  if (Date.now() > item.expire) {

    cache.delete(key);

    return null;

  }

  metrics.cached++;

  return item.value;

}

function clearCache() {

  cache.clear();

}

/* =========================================================
   CACHE POLICY
========================================================= */

function canCache(method, authenticated, opt) {

  if (method !== "GET") {

    return false;

  }

  // Never cache authenticated responses.
  if (authenticated) {

    return false;

  }

  return opt.cache !== false;

}

/* =========================================================
   REQUEST
========================================================= */

async function request(url, opt = {}) {

  const method = (
    opt.method || "GET"
  ).toUpperCase();

  const publicAuth = isPublicAuthRoute(url);

  const authenticated =
    opt.auth === false
      ? false
      : !publicAuth;

  const currentToken = authenticated
    ? token()
    : null;

  const requestOptions = {

    ...opt,

    method,

    authenticated

  };

  const useCache = canCache(
    method,
    authenticated,
    requestOptions
  );

  const key = cacheKey(
    url,
    requestOptions,
    currentToken
  );

  if (useCache) {

    const hit = cached(key);

    if (hit !== null) {

      return hit;

    }

  }

  // Avoid sharing requests across different tokens.
  if (pending.has(key)) {

    return pending.get(key);

  }

  const promise = enqueue(() => {

    return attempt(url, requestOptions);

  });

  pending.set(key, promise);

  try {

    const response = await promise;

    if (
      useCache &&
      response &&
      !response.error
    ) {

      cache.set(key, {

        value: response,

        expire:
          Date.now() + CONFIG.CACHE

      });

    }

    return response;

  } finally {

    pending.delete(key);

  }

}

/* =========================================================
   RETRY POLICY
========================================================= */

function shouldRetry(result) {

  if (!result || !result.error) {

    return false;

  }

  if (
    result.status === 401 ||
    result.status === 403 ||
    result.status === 404 ||
    result.status === 400 ||
    result.status === 422
  ) {

    return false;

  }

  return (

    result.network === true ||

    result.status === 408 ||

    result.status === 429 ||

    result.status >= 500

  );

}

/* =========================================================
   RETRY
========================================================= */

async function attempt(url, opt) {

  let tries = 0;

  while (true) {

    metrics.requests++;

    const result = await raw(url, opt);

    if (!result.error) {

      metrics.success++;

      return result.data;

    }

    if (
      !shouldRetry(result) ||
      tries >= CONFIG.RETRIES
    ) {

      metrics.failed++;

      return {

        error: result.error,

        status: result.status || 0

      };

    }

    tries++;

    metrics.retries++;

    await wait(
      CONFIG.BACKOFF * tries
    );

  }

}

/* =========================================================
   RAW FETCH
========================================================= */

async function raw(url, opt) {

  const controller = new AbortController();

  controllers.add(controller);

  let timer;

  try {

    timer = setTimeout(() => {

      controller.abort();

    }, CONFIG.TIMEOUT);

    const response = await fetch(
      buildURL(url),
      {

        method: opt.method,

        headers: headers(
          opt.headers,
          opt.authenticated
        ),

        credentials: "include",

        signal: controller.signal,

        body:
          opt.body === undefined
            ? undefined
            : opt.body

      }
    );

    let data = null;

    const contentType =
      response.headers.get("content-type") || "";

    if (response.status !== 204) {

      if (
        contentType.includes("application/json")
      ) {

        try {

          data = await response.json();

        } catch {

          data = null;

        }

      } else {

        try {

          const text = await response.text();

          data = text || null;

        } catch {

          data = null;

        }

      }

    }

    if (response.status === 401) {

      metrics.unauthorized++;

      clearToken();

      clearCache();

      loggedOut = true;

      emit("auth:logout", {

        status: 401,

        url

      });

      return {

        error: "unauthorized",

        status: 401

      };

    }

    if (!response.ok) {

      emit("api:error", {

        url,

        status: response.status,

        data

      });

      return {

        error:
          data?.error ||
          data?.message ||
          "request_failed",

        status: response.status

      };

    }

    if (loggedOut && token()) {

      loggedOut = false;

    }

    return {

      data,

      status: response.status

    };

  } catch (error) {

    metrics.network++;

    if (error.name === "AbortError") {

      return {

        error: "timeout",

        network: true

      };

    }

    return {

      error: "network",

      network: true

    };

  } finally {

    clearTimeout(timer);

    controllers.delete(controller);

  }

}

/* =========================================================
   UTILITIES
========================================================= */

function wait(ms) {

  return new Promise(resolve => {

    setTimeout(resolve, ms);

  });

}

/* =========================================================
   HTTP METHODS
========================================================= */

function get(url, options = {}) {

  return request(url, {

    ...options,

    method: "GET"

  });

}

function post(url, body = {}, options = {}) {

  return request(url, {

    ...options,

    method: "POST",

    body: JSON.stringify(body)

  });

}

function put(url, body = {}, options = {}) {

  return request(url, {

    ...options,

    method: "PUT",

    body: JSON.stringify(body)

  });

}

function patch(url, body = {}, options = {}) {

  return request(url, {

    ...options,

    method: "PATCH",

    body: JSON.stringify(body)

  });

}

function del(url, options = {}) {

  return request(url, {

    ...options,

    method: "DELETE"

  });

}

/* =========================================================
   API MODULES
========================================================= */

function wallet() {

  return get("/wallet");

}

function market() {

  return get("/market", {

    auth: false

  });

}

function mining() {

  return get("/mining/status");

}

function casino() {

  return get("/casino", {

    auth: false

  });

}

function airdrop() {

  return get("/airdrop/status");

}

/* =========================================================
   SYNC
========================================================= */

async function syncAll() {

  const results = await Promise.allSettled([

    wallet(),

    mining(),

    market(),

    airdrop()

  ]);

  const names = [

    "wallet",

    "mining",

    "market",

    "airdrop"

  ];

  const output = {};

  results.forEach((result, index) => {

    output[names[index]] =
      result.status === "fulfilled"
        ? result.value
        : {

            error: "sync_failed"

          };

  });

  emit("api:sync", output);

  return output;

}

/* =========================================================
   CANCEL
========================================================= */

function cancelAll() {

  controllers.forEach(controller => {

    controller.abort();

  });

  controllers.clear();

  // Reject queued jobs instead of leaving promises pending.
  while (queue.length > 0) {

    const job = queue.shift();

    job.resolve({

      error: "request_cancelled"

    });

  }

  clearCache();

  pending.clear();

}

/* =========================================================
   AUTH STATE
========================================================= */

function setToken(value) {

  if (!value) {

    clearToken();

    clearCache();

    return;

  }

  localStorage.setItem("token", value);

  // Keep compatibility with both frontend token names.
  localStorage.setItem("accessToken", value);

  loggedOut = false;

  clearCache();

}

function logout() {

  clearToken();

  clearCache();

  cancelAll();

  loggedOut = true;

  emit("auth:logout", {

    manual: true

  });

}

/* =========================================================
   EXPORT
========================================================= */

window.API = {

  get,

  post,

  put,

  patch,

  delete: del,

  wallet,

  market,

  mining,

  casino,

  airdrop,

  syncAll,

  on,

  emit,

  cancelAll,

  clearCache,

  setToken,

  logout,

  metrics,

  config: CONFIG

};

})();
