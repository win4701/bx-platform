
// =====================================================
// BLOXIO CORE ENGINE V4.1
// NON-BLOCKING APPLICATION BOOT SYSTEM
// =====================================================

"use strict";

/* =====================================================
   CONFIG
===================================================== */

const CONFIG = Object.freeze({

    API: "https://api.bloxio.online",

    WS: "https://api.bloxio.online",

    VERSION: "4.1.0",

    BOOT_TIMEOUT: 12000,

    MODULE_TIMEOUT: 10000,

    TELEGRAM_TIMEOUT: 10000,

    MAX_ERRORS: 100,

    DEBUG: true

});


/* =====================================================
   GLOBAL APP
===================================================== */

window.APP = window.APP || {};

const APP = window.APP;

APP.version = CONFIG.VERSION;
APP.ready = false;
APP.booting = false;
APP.online = navigator.onLine;
APP.user = APP.user || null;
APP.modules = APP.modules || {};
APP.services = APP.services || {};
APP.errors = Array.isArray(APP.errors) ? APP.errors : [];
APP.startedAt = null;
APP.readyAt = null;


/* =====================================================
   INTERNAL STATE
===================================================== */

const CORE = {

    bootPromise: null,

    booted: false,

    destroyed: false,

    listeners: [],

    moduleStatus: new Map(),

    timeoutId: null,

    bootId: 0,

    recoveryReady: false,

    wsListenersReady: false,

    moduleTasks: null

};


/* =====================================================
   DOM
===================================================== */

const DOM = {

    loader: () =>
        document.getElementById("globalLoader"),

    loaderFill: () =>
        document.getElementById("loaderProgress"),

    app: () =>
        document.getElementById("app")

};


/* =====================================================
   LOGGER
===================================================== */

function log(...args) {

    if (CONFIG.DEBUG) {
        console.log("[BX CORE]", ...args);
    }

}

function warn(...args) {

    console.warn("[BX CORE]", ...args);

}

function error(...args) {

    console.error("[BX CORE]", ...args);

    if (APP.errors.length >= CONFIG.MAX_ERRORS) {
        APP.errors.shift();
    }

    APP.errors.push({

        message: args.map(value => {

            if (value instanceof Error) {
                return value.message;
            }

            return String(value);

        }).join(" "),

        timestamp: Date.now()

    });

}


/* =====================================================
   UTILITIES
===================================================== */

function isFunction(value) {

    return typeof value === "function";

}

function safeCall(fn, ...args) {

    if (!isFunction(fn)) return undefined;

    try {

        return fn(...args);

    } catch (e) {

        error("SAFE CALL", e);

        return undefined;

    }

}

function withTimeout(promise, ms, label = "Operation") {

    let timeoutId;

    const timeout = new Promise((_, reject) => {

        timeoutId = setTimeout(() => {

            reject(
                new Error(`${label} timeout after ${ms}ms`)
            );

        }, ms);

    });

    return Promise.race([
        Promise.resolve(promise),
        timeout
    ]).finally(() => {

        clearTimeout(timeoutId);

    });

}

function getToken() {

    try {

        return localStorage.getItem("token") || "";

    } catch {

        return "";

    }

}

function saveToken(token) {

    if (!token || typeof token !== "string") {
        return false;
    }

    try {

        localStorage.setItem("token", token);

        APP.token = token;

        return true;

    } catch (e) {

        error("TOKEN SAVE", e);

        return false;

    }

}


/* =====================================================
   EVENT LISTENER MANAGEMENT
===================================================== */

function trackListener(target, event, callback, options) {

    if (!target?.addEventListener) return;

    target.addEventListener(
        event,
        callback,
        options
    );

    CORE.listeners.push({

        target,
        event,
        callback,
        options

    });

}

function removeListeners() {

    CORE.listeners.forEach(item => {

        item.target.removeEventListener(
            item.event,
            item.callback,
            item.options
        );

    });

    CORE.listeners.length = 0;

}


/* =====================================================
   LOADER
===================================================== */

function setProgress(value) {

    const progress = Math.max(
        0,
        Math.min(100, Number(value) || 0)
    );

    const el = DOM.loaderFill();

    if (!el) return;

    el.style.width = `${progress}%`;

    el.setAttribute(
        "aria-valuenow",
        String(progress)
    );

}

function removeLoader() {

    const loader = DOM.loader();

    if (!loader) return;

    loader.classList.add("hidden");

    setTimeout(() => {

        loader.remove();

    }, 450);

}


/* =====================================================
   APP LOCK / UNLOCK
===================================================== */

function lockApp() {

    document.body.classList.add("loading");

    document.body.classList.remove("app-ready");

}

function unlockApp() {

    document.body.classList.remove("loading");

    document.body.classList.remove("app-preload");

    document.body.classList.remove("auth-lock");

    document.body.classList.add("app-ready");

    DOM.app()?.classList.remove("app-hidden");

}


/* =====================================================
   NETWORK WATCHER
===================================================== */

function networkWatcher() {

    if (APP.services.networkWatcher) {
        APP.online = navigator.onLine;
        return;
    }

    trackListener(
        window,
        "online",
        () => {

            APP.online = true;

            log("NETWORK ONLINE");

            window.dispatchEvent(
                new CustomEvent("bloxio:online")
            );

        }
    );

    trackListener(
        window,
        "offline",
        () => {

            APP.online = false;

            warn("NETWORK OFFLINE");

            window.dispatchEvent(
                new CustomEvent("bloxio:offline")
            );

        }
    );

    APP.services.networkWatcher = true;

}


/* =====================================================
   MODULE STATUS
===================================================== */

function setModuleStatus(name, status, details = null) {

    const data = {

        name,
        status,
        details,
        timestamp: Date.now()

    };

    CORE.moduleStatus.set(name, data);

    APP.modules[name] = data;

    log("MODULE", name, status);

}

function getModuleStatus(name) {

    return CORE.moduleStatus.get(name) || {

        name,
        status: "not_started"

    };

}


/* =====================================================
   SAFE MODULE RUNNER
===================================================== */

async function runModule(name, initializer, options = {}) {

    const timeout = options.timeout || CONFIG.MODULE_TIMEOUT;

    if (!isFunction(initializer)) {

        setModuleStatus(
            name,
            "unavailable"
        );

        return false;

    }

    setModuleStatus(
        name,
        "loading"
    );

    try {

        const result = await withTimeout(

            Promise.resolve().then(initializer),

            timeout,

            name

        );

        if (result === false) {

            setModuleStatus(
                name,
                "unavailable"
            );

            return false;

        }

        setModuleStatus(
            name,
            "ready"
        );

        return true;

    } catch (e) {

        setModuleStatus(
            name,
            "failed",
            e.message
        );

        error(`MODULE ${name}`, e);

        return false;

    }

}


/* =====================================================
   TELEGRAM
===================================================== */

async function initTelegram() {

    const tg = window.Telegram?.WebApp;

    if (!tg) {

        log("NO TELEGRAM WEBAPP");

        return false;

    }

    try {

        tg.ready();

        tg.expand();

        safeCall(
            tg.setHeaderColor?.bind(tg),
            "#05080e"
        );

        safeCall(
            tg.setBackgroundColor?.bind(tg),
            "#05080e"
        );

        const user = tg.initDataUnsafe?.user;

        if (!user) {

            warn("TELEGRAM USER NOT FOUND");

            return false;

        }

        APP.user = user;

        APP.services.telegram = {

            available: true,

            userId: user.id

        };

        log("TELEGRAM USER", user.id);

        /*
           Preserve the original backend request format.
           Do not change this contract without updating
           the backend endpoint as well.
        */

        try {

            const response = await withTimeout(

                fetch(
                    CONFIG.API + "/auth/telegram",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type": "application/json"

                        },

                        body: JSON.stringify({

                            telegram_id: user.id,

                            username: user.username

                        })

                    }
                ),

                CONFIG.TELEGRAM_TIMEOUT,

                "TELEGRAM AUTH"

            );

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }

            const data = await response.json();

            if (data?.token) {

                saveToken(data.token);

                APP.services.auth = {

                    authenticated: true,

                    provider: "telegram"

                };

                log("TELEGRAM AUTH SUCCESS");

                window.dispatchEvent(
                    new CustomEvent("bloxio:authenticated", {
                        detail: {
                            user: APP.user
                        }
                    })
                );

            } else {

                warn("TELEGRAM TOKEN NOT RETURNED");

            }

        } catch (e) {

            warn("TELEGRAM AUTOLOGIN FAILED", e);

            APP.services.auth = {

                authenticated: false,

                provider: "telegram"

            };

        }

        return true;

    } catch (e) {

        error("TELEGRAM INIT", e);

        return false;

    }

}


/* =====================================================
   WEBSOCKET
   Compatible with ws.js V7 API
===================================================== */

function initWS() {

    const WS = window.WS;

    if (!WS) {

        warn("WS MODULE MISSING");

        return false;

    }

    try {

        /*
           ws.js already performs automatic connection.
           connect() is safe to call because its adapter
           checks whether a socket already exists.
        */

        const result = WS.connect?.();

        if (result === false) {

            warn("WS CONNECTION NOT STARTED");

            return false;

        }

        if (!CORE.wsListenersReady) {

            WS.on?.("connected", () => {

                APP.services.websocket = {

                    available: true,

                    connected: true

                };

                log("WS CONNECTED");

                WS.subscribe?.("wallet");

                WS.subscribe?.("market");

                WS.subscribe?.("casino");

            });

            WS.on?.("disconnected", data => {

                if (APP.services.websocket) {
                    APP.services.websocket.connected = false;
                }

                warn(
                    "WS DISCONNECTED",
                    data?.reason || ""
                );

            });

            WS.on?.("connect_error", e => {

                if (APP.services.websocket) {
                    APP.services.websocket.connected = false;
                }

                warn(
                    "WS CONNECT ERROR",
                    e?.message || e
                );

            });

            CORE.wsListenersReady = true;

        }

        APP.services.websocket = {

            available: true,

            connected: Boolean(WS.connected)

        };

        /*
           If the socket connected before Core initialized,
           subscribe now instead of waiting for another event.
        */

        if (WS.connected) {

            WS.subscribe?.("wallet");

            WS.subscribe?.("market");

            WS.subscribe?.("casino");

        }

        return true;

    } catch (e) {

        error("WS INIT", e);

        return false;

    }

}


/* =====================================================
   WALLET
===================================================== */

async function initWallet() {

    return runModule(
        "wallet",
        async () => {

            if (!window.WALLET?.init) {
                return false;
            }

            return window.WALLET.init();

        }
    );

}


/* =====================================================
   MARKET
===================================================== */

async function initMarket() {

    return runModule(
        "market",
        async () => {

            if (!isFunction(window.initMarket)) {
                return false;
            }

            return window.initMarket();

        }
    );

}


/* =====================================================
   CASINO
===================================================== */

async function initCasino() {

    return runModule(
        "casino",
        async () => {

            const casino = window.CASINO;

            if (!casino) {
                return false;
            }

            if (isFunction(casino.init)) {
                return casino.init();
            }

            if (isFunction(casino.start)) {
                return casino.start();
            }

            return false;

        }
    );

}


/* =====================================================
   MINING
===================================================== */

async function initMining() {

    return runModule(
        "mining",
        async () => {

            if (!isFunction(window.renderMining)) {
                return false;
            }

            return window.renderMining();

        }
    );

}


/* =====================================================
   AIRDROP
===================================================== */

async function initAirdrop() {

    return runModule(
        "airdrop",
        async () => {

            if (!isFunction(window.initAirdrop)) {
                return false;
            }

            return window.initAirdrop();

        }
    );

}


/* =====================================================
   MODULE STARTUP
===================================================== */

async function initOptionalModules() {

    const modules = [

        ["wallet", initWallet],

        ["market", initMarket],

        ["casino", initCasino],

        ["mining", initMining],

        ["airdrop", initAirdrop]

    ];

    const results = await Promise.allSettled(

        modules.map(([name, initializer]) => {

            return Promise.resolve().then(initializer);

        })

    );

    results.forEach((result, index) => {

        const name = modules[index][0];

        if (result.status === "rejected") {

            setModuleStatus(
                name,
                "failed",
                result.reason?.message || "Unknown error"
            );

            error(
                `MODULE ${name}`,
                result.reason
            );

        }

    });

    window.dispatchEvent(
        new CustomEvent("bloxio:modules-ready", {
            detail: getHealth()
        })
    );

    return results;

}


/* =====================================================
   HEALTH
===================================================== */

function getHealth() {

    const modules = {};

    CORE.moduleStatus.forEach((value, key) => {

        modules[key] = value.status;

    });

    return {

        version: APP.version,

        ready: APP.ready,

        booting: APP.booting,

        online: APP.online,

        websocket: Boolean(window.WS?.connected),

        telegram: Boolean(APP.services.telegram?.available),

        authenticated: Boolean(
            APP.services.auth?.authenticated
        ),

        modules,

        errors: APP.errors.length,

        uptime: APP.startedAt
            ? Date.now() - APP.startedAt
            : 0

    };

}


/* =====================================================
   FINISH BOOT
===================================================== */

function finishBoot(reason = "complete") {

    if (APP.ready) return;

    clearTimeout(CORE.timeoutId);

    APP.ready = true;

    APP.booting = false;

    APP.readyAt = Date.now();

    CORE.booted = true;

    setProgress(100);

    unlockApp();

    removeLoader();

    APP.services.boot = {

        status: "ready",

        reason,

        completedAt: APP.readyAt

    };

    log("CORE READY", getHealth());

    window.dispatchEvent(
        new CustomEvent("bloxio:ready", {
            detail: getHealth()
        })
    );

}


/* =====================================================
   BOOT
===================================================== */

async function boot() {

    if (CORE.bootPromise) {
        return CORE.bootPromise;
    }

    if (CORE.destroyed) {
        return false;
    }

    CORE.bootPromise = (async () => {

        APP.ready = false;

        APP.booting = true;

        APP.startedAt = Date.now();

        CORE.bootId++;

        lockApp();

        log("BOOT START", CONFIG.VERSION);

        try {

            setProgress(10);

            // Network listeners are installed only once.
            networkWatcher();

            setProgress(25);

            /*
               Do not wait for the network connection.
               ws.js has its own automatic connection logic.
            */

            initWS();

            setProgress(40);

            /*
               Open the application shell immediately.
               Module startup must not block the interface.
            */

            finishBoot("shell_ready");

            /*
               Telegram runs independently.
               A slow authentication request must not
               prevent other application modules from starting.
            */

            APP.services.telegramTask = initTelegram().catch(e => {

                error("TELEGRAM BACKGROUND", e);

                return false;

            });

            /*
               Start modules in parallel.
               Each module has its own timeout and error boundary.
            */

            CORE.moduleTasks = initOptionalModules();

            CORE.moduleTasks.catch(e => {

                error("MODULE STARTUP", e);

            });

            return true;

        } catch (e) {

            error("BOOT FAILURE", e);

            finishBoot("error");

            return false;

        }

    })();

    return CORE.bootPromise;

}


/* =====================================================
   RECOVERY
===================================================== */

function setupRecovery() {

    if (CORE.recoveryReady) return;

    trackListener(
        window,
        "error",
        e => {

            error(
                "RUNTIME",
                e.error || e.message
            );

        }
    );

    trackListener(
        window,
        "unhandledrejection",
        e => {

            error(
                "PROMISE",
                e.reason
            );

        }
    );

    CORE.recoveryReady = true;

}


/* =====================================================
   PUBLIC API
===================================================== */

const BloxioCore = {

    version: CONFIG.VERSION,

    boot,

    init: boot,

    getHealth,

    getModuleStatus,

    setProgress,

    lock: lockApp,

    unlock: unlockApp,

    initWS,

    initTelegram,

    initWallet,

    initMarket,

    initCasino,

    initMining,

    initAirdrop,

    get ready() {
        return APP.ready;
    },

    get online() {
        return APP.online;
    },

    get user() {
        return APP.user;
    },

    get errors() {
        return APP.errors;
    },

    get modules() {
        return APP.modules;
    },

    async restart() {

        if (CORE.destroyed) {
            return false;
        }

        APP.ready = false;

        APP.booting = false;

        CORE.bootPromise = null;

        CORE.booted = false;

        return boot();

    },

    destroy() {

        if (CORE.destroyed) return;

        CORE.destroyed = true;

        clearTimeout(CORE.timeoutId);

        removeListeners();

        APP.ready = false;

        APP.booting = false;

        /*
           Do not disconnect window.WS here.
           It may be shared by other application modules.
        */

        log("CORE DESTROYED");

    }

};


/* =====================================================
   GLOBAL EXPORTS
===================================================== */

window.BloxioCore = BloxioCore;

window.APP = APP;

window.getBloxioHealth = getHealth;


/* =====================================================
   INITIALIZATION
===================================================== */

setupRecovery();

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        boot,
        { once: true }
    );

} else {

    boot();

}
