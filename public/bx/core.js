
// =====================================================
// BLOXIO CORE ENGINE V4
// CENTRAL APPLICATION BOOT & LIFECYCLE ENGINE
// =====================================================

"use strict";

/* =====================================================
   CONFIG
===================================================== */

const CONFIG = Object.freeze({

    API: "https://api.bloxio.online",

    WS: "https://api.bloxio.online",

    VERSION: "4.0.0",

    BOOT_TIMEOUT: 12000,

    MODULE_TIMEOUT: 8000,

    TELEGRAM_TIMEOUT: 10000,

    RETRY_DELAY: 2000,

    MAX_ERRORS: 100,

    DEBUG: true

});


/* =====================================================
   GLOBAL APP STATE
===================================================== */

window.APP = window.APP || {};

const APP = window.APP;

APP.version = CONFIG.VERSION;

APP.ready = false;

APP.booting = false;

APP.online = navigator.onLine;

APP.user = APP.user || null;

APP.token = APP.token || null;

APP.modules = APP.modules || {};

APP.services = APP.services || {};

APP.errors = Array.isArray(APP.errors)
    ? APP.errors
    : [];

APP.startedAt = null;

APP.readyAt = null;

APP.destroyed = false;


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

    progress: 0,

    telegramReady: false,

    wsReady: false,

    bootId: 0

};


/* =====================================================
   DOM REFERENCES
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

    if (!CONFIG.DEBUG) return;

    console.log("[BX CORE]", ...args);

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

function delay(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });

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
   EVENT TRACKING
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

    CORE.progress = progress;

    const el = DOM.loaderFill();

    if (el) {

        el.style.width = `${progress}%`;

        el.setAttribute(
            "aria-valuenow",
            String(progress)
        );

    }

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
   MODULE INITIALIZER
===================================================== */

async function runModule(name, initializer, options = {}) {

    const {

        timeout = CONFIG.MODULE_TIMEOUT,

        optional = true

    } = options;

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

        setModuleStatus(
            name,
            "ready"
        );

        return result !== false;

    } catch (e) {

        setModuleStatus(
            name,
            "failed",
            e.message
        );

        error(`MODULE ${name}`, e);

        if (!optional) {
            throw e;
        }

        return false;

    }

}


/* =====================================================
   NETWORK WATCHER
===================================================== */

function networkWatcher() {

    if (APP.services.networkWatcher) {
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
   TELEGRAM WEB APP
===================================================== */

async function initTelegram() {

    const tg = window.Telegram?.WebApp;

    if (!tg) {

        log("TELEGRAM NOT AVAILABLE");

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

        CORE.telegramReady = true;

        log("TELEGRAM USER", user.id);

        /*
           Do not trust initDataUnsafe as server authentication.
           The backend must validate Telegram initData.
        */

        const initData = tg.initData;

        if (!initData) {

            warn("TELEGRAM INIT DATA MISSING");

            return true;

        }

        try {

            const response = await withTimeout(

                fetch(
                    `${CONFIG.API}/auth/telegram`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type": "application/json"

                        },

                        body: JSON.stringify({

                            initData

                        })

                    }
                ),

                CONFIG.TELEGRAM_TIMEOUT,

                "TELEGRAM AUTH"

            );

            if (!response.ok) {

                throw new Error(
                    `Telegram auth HTTP ${response.status}`
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

            } else {

                warn("TELEGRAM TOKEN NOT RETURNED");

            }

        } catch (e) {

            warn("TELEGRAM AUTH FAILED", e);

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
   Compatible with window.WS from ws.js V7
===================================================== */

function initWS() {

    const WS = window.WS;

    if (!WS) {

        warn("WS MODULE MISSING");

        return false;

    }

    try {

        const result = WS.connect?.();

        if (result === false) {

            warn("WS CONNECTION NOT STARTED");

            return false;

        }

        CORE.wsReady = true;

        APP.services.websocket = {

            available: true,

            connected: Boolean(WS.connected)

        };

        /*
           The adapter uses Socket.IO.
           Subscribe only after connection.
        */

        if (!APP.services.wsConnectionListener) {

            WS.on?.("connected", () => {

                APP.services.websocket.connected = true;

                log("WS CONNECTED");

            });

            WS.on?.("disconnected", () => {

                APP.services.websocket.connected = false;

                warn("WS DISCONNECTED");

            });

            WS.on?.("connect_error", e => {

                APP.services.websocket.connected = false;

                warn("WS CONNECT ERROR", e?.message);

            });

            APP.services.wsConnectionListener = true;

        }

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

            const wallet = window.WALLET;

            if (!wallet?.init) {
                return false;
            }

            return wallet.init();

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
   OPTIONAL MODULE REGISTRY
===================================================== */

async function initOptionalModules() {

    const modules = [

        ["wallet", initWallet],

        ["market", initMarket],

        ["casino", initCasino],

        ["mining", initMining],

        ["airdrop", initAirdrop]

    ];

    for (const [name, initializer] of modules) {

        await initializer();

    }

}


/* =====================================================
   APP HEALTH
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

        telegram: CORE.telegramReady,

        modules,

        errors: APP.errors.length,

        uptime: APP.startedAt
            ? Date.now() - APP.startedAt
            : 0

    };

}


/* =====================================================
   BOOT COMPLETION
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
   BOOT PROCESS
===================================================== */

async function boot() {

    if (CORE.bootPromise) {
        return CORE.bootPromise;
    }

    if (CORE.destroyed) {
        return false;
    }

    CORE.bootPromise = (async () => {

        APP.booting = true;

        APP.ready = false;

        APP.startedAt = Date.now();

        CORE.bootId++;

        const currentBoot = CORE.bootId;

        lockApp();

        log("BOOT START", CONFIG.VERSION);

        /*
           Failsafe:
           The interface must not remain locked forever.
        */

        CORE.timeoutId = setTimeout(() => {

            warn("BOOT TIMEOUT");

            finishBoot("timeout");

        }, CONFIG.BOOT_TIMEOUT);

        try {

            setProgress(5);

            networkWatcher();

            setProgress(15);

            await initTelegram();

            if (currentBoot !== CORE.bootId) {
                return false;
            }

            setProgress(30);

            initWS();

            setProgress(40);

            await initOptionalModules();

            if (currentBoot !== CORE.bootId) {
                return false;
            }

            setProgress(90);

            finishBoot("complete");

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

        safeCall(
            window.WS?.disconnect?.bind(window.WS)
        );

        APP.ready = false;

        APP.booting = false;

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
