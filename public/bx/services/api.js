
/* =========================================================
   BLOXIO API ENGINE V8
   Secure Network Layer
   Guest First • Auth Aware • Retry • Cache
   Compatible with Bloxio AUTH / Wallet / Market / Casino
========================================================= */

"use strict";

(function () {

    if (window.API?.__BLOXIO_API_V8__) return;

    /* =====================================================
       CONFIG
    ===================================================== */

    const CONFIG = Object.freeze({

        BASE:
            location.hostname === "localhost"
                ? "http://localhost:3000/api"
                : location.origin + "/api",

        TIMEOUT: 12000,

        RETRIES: 3,

        BACKOFF: 500,

        CACHE: 20000,

        QUEUE: 4,

        MAX_CACHE: 150,

        MAX_QUEUE: 250

    });

    /* =====================================================
       STATE
    ===================================================== */

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
        unauthorized: 0,
        cancelled: 0

    };

    /* =====================================================
       EVENT BUS
    ===================================================== */

    function emit(event, payload = {}) {

        const handlers = listeners.get(event);

        if (!handlers) return;

        [...handlers].forEach(fn => {

            try {

                fn(payload);

            } catch (error) {

                console.warn(
                    "[BLOXIO API EVENT]",
                    error
                );

            }

        });

    }

    function on(event, fn) {

        if (
            typeof event !== "string" ||
            typeof fn !== "function"
        ) {
            return () => {};
        }

        if (!listeners.has(event)) {

            listeners.set(event, new Set());

        }

        listeners.get(event).add(fn);

        // Return unsubscribe function.
        return () => {

            listeners.get(event)?.delete(fn);

        };

    }

    /* =====================================================
       TOKEN MANAGEMENT
    ===================================================== */

    function token() {

        try {

            return (
                localStorage.getItem("token") ||
                localStorage.getItem("accessToken") ||
                null
            );

        } catch {

            return null;

        }

    }

    function refreshToken() {

        try {

            return localStorage.getItem("refreshToken");

        } catch {

            return null;

        }

    }

    function clearToken() {

        try {

            localStorage.removeItem("token");

            localStorage.removeItem("accessToken");

            localStorage.removeItem("refreshToken");

            localStorage.removeItem("user");

        } catch (error) {

            console.warn(
                "[BLOXIO TOKEN]",
                error
            );

        }

    }

    function setToken(value) {

        if (!value) {

            clearToken();

            clearCache();

            return;

        }

        try {

            localStorage.setItem("token", value);

            localStorage.setItem("accessToken", value);

            loggedOut = false;

            clearCache();

        } catch (error) {

            throw new Error(
                "Unable to save authentication token"
            );

        }

    }

    /* =====================================================
       AUTH ROUTES
    ===================================================== */

    function normalizePath(url) {

        return String(url || "")
            .split("?")[0]
            .replace(/\/+$/, "");

    }

    function isPublicAuthRoute(url) {

        const path = normalizePath(url);

        return [

            "/auth/login",
            "/auth/register",
            "/auth/refresh"

        ].includes(path);

    }

    function requiresAuth(url, options = {}) {

        if (options.auth === false) {

            return false;

        }

        if (isPublicAuthRoute(url)) {

            return false;

        }

        return true;

    }

    /* =====================================================
       HEADERS
    ===================================================== */

    function headers(extra = {}, authenticated = true) {

        const result = {

            Accept: "application/json",

            "Content-Type": "application/json",

            ...extra

        };

        const currentToken =
            authenticated ? token() : null;

        if (currentToken) {

            result.Authorization =
                `Bearer ${currentToken}`;

        } else {

            delete result.Authorization;

        }

        return result;

    }

    /* =====================================================
       URL BUILDER
    ===================================================== */

    function buildURL(url) {

        const path = String(url || "").trim();

        if (!path) {

            throw new Error("API URL is required");

        }

        if (/^https?:\/\//i.test(path)) {

            throw new Error(
                "External API URLs are not allowed"
            );

        }

        if (path.startsWith("//")) {

            throw new Error(
                "Protocol-relative URLs are not allowed"
            );

        }

        return (
            CONFIG.BASE.replace(/\/+$/, "") +
            "/" +
            path.replace(/^\/+/, "")
        );

    }

    /* =====================================================
       REQUEST QUEUE
    ===================================================== */

    function enqueue(fn) {

        return new Promise((resolve, reject) => {

            if (queue.length >= CONFIG.MAX_QUEUE) {

                reject(
                    new Error("API queue is full")
                );

                return;

            }

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

    /* =====================================================
       CACHE
    ===================================================== */

    function cacheKey(url, options, currentToken) {

        return JSON.stringify({

            url,

            method: options.method || "GET",

            body: options.body || null,

            token: currentToken || null

        });

    }

    function cached(key) {

        const item = cache.get(key);

        if (!item) return null;

        if (Date.now() >= item.expire) {

            cache.delete(key);

            return null;

        }

        metrics.cached++;

        return item.value;

    }

    function saveCache(key, value) {

        if (cache.size >= CONFIG.MAX_CACHE) {

            const firstKey =
                cache.keys().next().value;

            if (firstKey) {
                cache.delete(firstKey);
            }

        }

        cache.set(key, {

            value,

            expire: Date.now() + CONFIG.CACHE

        });

    }

    function clearCache() {

        cache.clear();

    }

    function invalidateCache(url) {

        if (!url) {

            clearCache();

            return;

        }

        const target = String(url);

        for (const key of cache.keys()) {

            if (key.includes(target)) {

                cache.delete(key);

            }

        }

    }

    function canCache(method, authenticated, options) {

        if (method !== "GET") return false;

        if (authenticated) return false;

        if (options.cache === false) return false;

        if (options.noStore === true) return false;

        return true;

    }

    /* =====================================================
       RESPONSE HELPERS
    ===================================================== */

    function errorResult(error, status = 0, extra = {}) {

        return {

            error,

            status,

            ...extra

        };

    }

    function isErrorResponse(result) {

        return Boolean(
            result &&
            typeof result === "object" &&
            result.error
        );

    }

    /* =====================================================
       REQUEST
    ===================================================== */

    async function request(url, options = {}) {

        const method = String(
            options.method || "GET"
        ).toUpperCase();

        const authenticated =
            requiresAuth(url, options);

        const currentToken =
            authenticated ? token() : null;

        const requestOptions = {

            ...options,

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

        // Prevent duplicate requests with identical context.
        if (pending.has(key)) {

            return pending.get(key);

        }

        const promise = enqueue(() => {

            return attempt(
                url,
                requestOptions
            );

        });

        pending.set(key, promise);

        try {

            const response = await promise;

            if (
                useCache &&
                !isErrorResponse(response) &&
                response !== undefined
            ) {

                saveCache(key, response);

            }

            return response;

        } finally {

            if (pending.get(key) === promise) {

                pending.delete(key);

            }

        }

    }

    /* =====================================================
       RETRY POLICY
    ===================================================== */

    function shouldRetry(result) {

        if (!isErrorResponse(result)) {

            return false;

        }

        const status = result.status || 0;

        if ([

            400,
            401,
            403,
            404,
            409,
            422

        ].includes(status)) {

            return false;

        }

        return (

            result.network === true ||

            status === 408 ||

            status === 429 ||

            status >= 500

        );

    }

    /* =====================================================
       RETRY ENGINE
    ===================================================== */

    async function attempt(url, options) {

        let tries = 0;

        while (true) {

            metrics.requests++;

            const result = await raw(
                url,
                options
            );

            if (!isErrorResponse(result)) {

                metrics.success++;

                return result.data;

            }

            if (
                !shouldRetry(result) ||
                tries >= CONFIG.RETRIES
            ) {

                metrics.failed++;

                return result;

            }

            tries++;

            metrics.retries++;

            await wait(
                CONFIG.BACKOFF * tries
            );

        }

    }

    /* =====================================================
       RAW FETCH
    ===================================================== */

    async function raw(url, options) {

        const controller = new AbortController();

        controllers.add(controller);

        let timer = null;

        const requestToken =
            options.authenticated ? token() : null;

        try {

            timer = setTimeout(() => {

                controller.abort();

            }, CONFIG.TIMEOUT);

            const response = await fetch(
                buildURL(url),
                {

                    method: options.method,

                    headers: headers(
                        options.headers,
                        options.authenticated
                    ),

                    credentials: "include",

                    signal: controller.signal,

                    body:
                        options.body === undefined
                            ? undefined
                            : options.body

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

                        data = await response.text();

                    } catch {

                        data = null;

                    }

                }

            }

            /* ---------------------------------------------
               AUTHENTICATION EXPIRATION
            --------------------------------------------- */

            if (response.status === 401) {

                metrics.unauthorized++;

                // Only expire a real authenticated session.
                // Failed login and guest requests must not
                // clear an existing session.
                const hasSession =
                    Boolean(requestToken);

                if (
                    options.authenticated &&
                    hasSession
                ) {

                    clearToken();

                    clearCache();

                    loggedOut = true;

                    emit("auth:logout", {

                        status: 401,

                        url,

                        expired: true

                    });

                }

                emit("api:error", {

                    url,

                    status: 401,

                    data

                });

                return errorResult(

                    data?.error ||
                    data?.message ||
                    "unauthorized",

                    401

                );

            }

            /* ---------------------------------------------
               OTHER HTTP ERRORS
            --------------------------------------------- */

            if (!response.ok) {

                const error = {

                    url,

                    status: response.status,

                    data

                };

                emit("api:error", error);

                return errorResult(

                    data?.error ||
                    data?.message ||
                    "request_failed",

                    response.status

                );

            }

            /* ---------------------------------------------
               SUCCESS
            --------------------------------------------- */

            if (token()) {

                loggedOut = false;

            }

            return {

                data,

                status: response.status

            };

        } catch (error) {

            metrics.network++;

            if (error.name === "AbortError") {

                return errorResult(
                    "timeout",
                    0,
                    {
                        network: true
                    }
                );

            }

            return errorResult(
                "network",
                0,
                {
                    network: true,
                    message: error.message
                }
            );

        } finally {

            if (timer) {

                clearTimeout(timer);

            }

            controllers.delete(controller);

        }

    }

    /* =====================================================
       UTILITIES
    ===================================================== */

    function wait(ms) {

        return new Promise(resolve => {

            setTimeout(resolve, ms);

        });

    }

    /* =====================================================
       HTTP METHODS
    ===================================================== */

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

    /* =====================================================
       API MODULES
       Paths preserved from V7
    ===================================================== */

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

    /* =====================================================
       SYNC
    ===================================================== */

    async function syncAll() {

        const names = [

            "wallet",
            "mining",
            "market",
            "airdrop"

        ];

        const calls = [

            wallet,
            mining,
            market,
            airdrop

        ];

        const results = await Promise.allSettled(

            calls.map(fn => fn())

        );

        const output = {};

        results.forEach((result, index) => {

            output[names[index]] =

                result.status === "fulfilled"

                    ? result.value

                    : errorResult(
                        "sync_failed",
                        0
                    );

        });

        emit("api:sync", output);

        return output;

    }

    /* =====================================================
       CANCEL REQUESTS
    ===================================================== */

    function cancelAll() {

        controllers.forEach(controller => {

            try {

                controller.abort();

            } catch {}

        });

        controllers.clear();

        while (queue.length > 0) {

            const job = queue.shift();

            metrics.cancelled++;

            job.resolve(
                errorResult(
                    "request_cancelled",
                    0
                )
            );

        }

        clearCache();

    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    function logout() {

        clearToken();

        clearCache();

        loggedOut = true;

        cancelAll();

        emit("auth:logout", {

            manual: true,

            expired: false

        });

    }

    /* =====================================================
       HEALTH / DEBUG
    ===================================================== */

    function getState() {

        return {

            base: CONFIG.BASE,

            authenticated: Boolean(token()),

            loggedOut,

            active,

            queued: queue.length,

            pending: pending.size,

            cache: cache.size,

            controllers: controllers.size,

            metrics: {
                ...metrics
            }

        };

    }

    /* =====================================================
       EXPORT
    ===================================================== */

    window.API = {

        __BLOXIO_API_V8__: true,

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
        invalidateCache,

        setToken,
        logout,

        token,
        refreshToken,

        getState,

        metrics,

        config: CONFIG

    };

    console.log(
        "[BLOXIO API]",
        "API Engine V8 initialized",
        CONFIG.BASE
    );

})();
