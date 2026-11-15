
"use strict";

/* =========================================================
   BLOXIO LANGUAGE ENGINE V3
   ---------------------------------------------------------
   Supported:
   EN AR FR ES DE RU TR ZH JA

   Features:
   - Dynamic locale loading
   - Latest-request-wins language switching
   - Successful dictionary caching
   - Nested dictionary lookup
   - Safe dictionary path access
   - RTL / LTR management
   - Dynamic DOM translation
   - Language menu management
   - BXTranslator V3.1 compatibility
========================================================= */

window.BXLanguage = (() => {

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const VERSION = "3.0.0";

    const STORAGE_KEY = "bx_language";

    const DEFAULT_LANG = "EN";

    const SUPPORTED = Object.freeze([
        "EN",
        "AR",
        "FR",
        "ES",
        "DE",
        "RU",
        "TR",
        "ZH",
        "JA"
    ]);

    const RTL_LANGS = Object.freeze([
        "AR"
    ]);

    const LOCALE_PATH = "/locales/";

    const TRANSLATION_ATTRIBUTES = [
        "data-lang-key",
        "data-lang-html",
        "data-lang-placeholder",
        "data-lang-title",
        "data-lang-value",
        "data-lang-aria",
        "data-lang-alt"
    ];

    const TRANSLATION_SELECTOR =
        TRANSLATION_ATTRIBUTES
            .map(attribute => `[${attribute}]`)
            .join(",");

    const BLOCKED_PATH_KEYS = new Set([
        "__proto__",
        "prototype",
        "constructor"
    ]);

    /* =====================================================
       STATE
    ===================================================== */

    let current = DEFAULT_LANG;

    let dictionary = {};

    let loaded = false;

    let requestId = 0;

    let initPromise = null;

    const dictionaryCache = new Map();

    /* =====================================================
       LANGUAGE HELPERS
    ===================================================== */

    function normalize(lang) {

        const value = String(
            lang || DEFAULT_LANG
        ).trim().toUpperCase();

        return value.replace(/[^A-Z]/g, "");
    }

    function isSupported(lang) {

        return SUPPORTED.includes(
            normalize(lang)
        );
    }

    function isRTL(lang) {

        return RTL_LANGS.includes(
            normalize(lang)
        );
    }

    function getCurrent() {
        return current;
    }

    function getSupported() {
        return [...SUPPORTED];
    }

    function getDictionary() {
        return dictionary;
    }

    function ready() {
        return loaded;
    }

    /* =====================================================
       STORAGE
    ===================================================== */

    function getSaved() {

        try {

            const saved = normalize(
                localStorage.getItem(STORAGE_KEY)
            );

            return isSupported(saved)
                ? saved
                : null;

        } catch (error) {

            console.warn(
                "[BXLanguage] Storage unavailable:",
                error
            );

            return null;
        }
    }

    function saveLanguage(lang) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                lang
            );

            return true;

        } catch (error) {

            console.warn(
                "[BXLanguage] Could not save language:",
                error
            );

            return false;
        }
    }

    /* =====================================================
       DICTIONARY VALIDATION
    ===================================================== */

    function isValidDictionary(data) {

        return (
            data !== null &&
            typeof data === "object" &&
            !Array.isArray(data)
        );
    }

    /* =====================================================
       NESTED DICTIONARY LOOKUP
       Example:
       get("wallet.deposit.success")
    ===================================================== */

    function get(path, fallback) {

        if (
            path === undefined ||
            path === null ||
            path === ""
        ) {
            return fallback ?? "";
        }

        const keys = String(path).split(".");

        // Prevent prototype-related property access.
        if (
            keys.some(key =>
                BLOCKED_PATH_KEYS.has(key)
            )
        ) {
            return fallback ?? path;
        }

        let value = dictionary;

        for (const key of keys) {

            if (
                value === null ||
                typeof value !== "object" ||
                !Object.prototype.hasOwnProperty.call(
                    value,
                    key
                )
            ) {

                return fallback !== undefined
                    ? fallback
                    : path;
            }

            value = value[key];
        }

        if (
            value === undefined ||
            value === null ||
            typeof value === "object"
        ) {

            return fallback !== undefined
                ? fallback
                : path;
        }

        return String(value);
    }

    /* =====================================================
       TRANSLATION INTERPOLATION
       Example:
       format("Hello {name}", { name: "Bloxio" })
    ===================================================== */

    function format(template, values = {}) {

        if (
            template === undefined ||
            template === null
        ) {
            return "";
        }

        return String(template).replace(
            /\{([a-zA-Z0-9_.-]+)\}/g,
            (match, key) => {

                if (
                    !Object.prototype.hasOwnProperty.call(
                        values,
                        key
                    )
                ) {
                    return match;
                }

                const value = values[key];

                return value === null ||
                    value === undefined
                    ? ""
                    : String(value);
            }
        );
    }

    function translate(key, fallback, values) {

        const result = get(key, fallback);

        return values
            ? format(result, values)
            : result;
    }

    /* =====================================================
       DOCUMENT DIRECTION
    ===================================================== */

    function applyDirection(lang) {

        const normalized = normalize(lang);

        const rtl = isRTL(normalized);

        const root = document.documentElement;

        if (!root) {
            return;
        }

        root.lang = normalized.toLowerCase();

        root.dir = rtl ? "rtl" : "ltr";

        root.classList.toggle("rtl", rtl);

        root.classList.toggle("ltr", !rtl);

        if (document.body) {

            document.body.dir = rtl
                ? "rtl"
                : "ltr";

            document.body.classList.toggle(
                "rtl",
                rtl
            );

            document.body.classList.toggle(
                "ltr",
                !rtl
            );
        }

        window.dispatchEvent(
            new CustomEvent("bx:direction-change", {
                detail: {
                    lang: normalized,
                    direction: rtl ? "rtl" : "ltr"
                }
            })
        );
    }

    /* =====================================================
       TRANSLATE NODE
    ===================================================== */

    function translateNode(node) {

        if (
            !node ||
            node.nodeType !== 1
        ) {
            return false;
        }

        const mappings = [
            ["langKey", "text"],
            ["langHtml", "html"],
            ["langPlaceholder", "placeholder"],
            ["langTitle", "title"],
            ["langValue", "value"],
            ["langAria", "aria-label"],
            ["langAlt", "alt"]
        ];

        let translated = false;

        for (const [dataKey, type] of mappings) {

            const key = node.dataset[dataKey];

            if (!key) {
                continue;
            }

            const value = get(key);

            // Preserve fallback content when key is missing.
            if (value === key) {
                continue;
            }

            switch (type) {

                case "text":

                    node.textContent = value;

                    translated = true;

                    break;

                case "html":

                    node.innerHTML = value;

                    translated = true;

                    break;

                case "placeholder":

                case "title":

                case "aria-label":

                case "alt":

                    node.setAttribute(
                        type,
                        value
                    );

                    translated = true;

                    break;

                case "value":

                    if ("value" in node) {

                        node.value = value;

                        translated = true;
                    }

                    break;
            }
        }

        return translated;
    }

    /* =====================================================
       TRANSLATE PAGE
    ===================================================== */

    function translatePage(root = document) {

        if (!root) {
            return false;
        }

        let elements = [];

        try {

            if (
                root.nodeType === 1 &&
                root.matches?.(TRANSLATION_SELECTOR)
            ) {
                elements.push(root);
            }

            if (typeof root.querySelectorAll === "function") {

                elements = elements.concat(
                    Array.from(
                        root.querySelectorAll(
                            TRANSLATION_SELECTOR
                        )
                    )
                );
            }

        } catch (error) {

            console.error(
                "[BXLanguage] Invalid translation root:",
                error
            );

            return false;
        }

        elements.forEach(translateNode);

        updateLocaleDisplay();

        updateLanguageButtons();

        return true;
    }

    /* =====================================================
       LOCALE DISPLAY
    ===================================================== */

    function updateLocaleDisplay() {

        const currentLocale =
            document.getElementById("currentLocale");

        if (currentLocale) {

            currentLocale.textContent = current;
        }

        const trigger =
            document.getElementById("localeTrigger");

        if (trigger) {

            trigger.setAttribute(
                "aria-label",
                `Language: ${current}`
            );
        }
    }

    /* =====================================================
       LANGUAGE BUTTON STATES
    ===================================================== */

    function updateLanguageButtons() {

        document.querySelectorAll("[data-lang]")
            .forEach(button => {

                const buttonLang = normalize(
                    button.dataset.lang
                );

                const active =
                    buttonLang === current;

                button.classList.toggle(
                    "active",
                    active
                );

                button.setAttribute(
                    "aria-pressed",
                    active ? "true" : "false"
                );
            });
    }

    /* =====================================================
       LOAD LOCALE
       Latest request wins.
       A stale response cannot overwrite a newer choice.
    ===================================================== */

    async function loadLocale(lang) {

        lang = normalize(lang);

        if (!isSupported(lang)) {

            console.error(
                "[BXLanguage] Unsupported language:",
                lang
            );

            return false;
        }

        const id = ++requestId;

        try {

            let data = dictionaryCache.get(lang);

            // Load only if not cached.
            if (!data) {

                const url =
                    `${LOCALE_PATH}${lang.toLowerCase()}.json`;

                const response = await fetch(url, {

                    method: "GET",

                    cache: "no-cache",

                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {

                    throw new Error(
                        `Locale HTTP ${response.status}: ${url}`
                    );
                }

                data = await response.json();

                if (!isValidDictionary(data)) {

                    throw new Error(
                        `Invalid locale dictionary: ${lang}`
                    );
                }

                // Cache only valid dictionaries.
                dictionaryCache.set(lang, data);
            }

            // Ignore outdated requests.
            if (id !== requestId) {
                return false;
            }

            // Commit language only after successful loading.
            dictionary = data;

            current = lang;

            loaded = true;

            saveLanguage(lang);

            applyDirection(lang);

            translatePage(document);

            window.dispatchEvent(
                new CustomEvent("bx:language-change", {

                    detail: {
                        lang: current,
                        dictionary,
                        version: VERSION
                    }
                })
            );

            console.log(
                `[BXLanguage] Loaded ${lang}`
            );

            return true;

        } catch (error) {

            // Do not report stale requests as active failures.
            if (id !== requestId) {
                return false;
            }

            console.error(
                `[BXLanguage] Failed to load ${lang}:`,
                error
            );

            return false;
        }
    }

    /* =====================================================
       SET LANGUAGE
    ===================================================== */

    async function set(lang) {

        lang = normalize(lang);

        if (!isSupported(lang)) {

            console.error(
                "[BXLanguage] Unsupported language:",
                lang
            );

            return false;
        }

        if (
            lang === current &&
            loaded
        ) {

            translatePage(document);

            closeMenu();

            return true;
        }

        const success = await loadLocale(lang);

        if (success) {
            closeMenu();
        }

        return success;
    }

    /* =====================================================
       LOCALE MENU
    ===================================================== */

    function openMenu() {

        const trigger =
            document.getElementById("localeTrigger");

        const menu =
            document.getElementById("localeMenu");

        if (trigger) {

            trigger.setAttribute(
                "aria-expanded",
                "true"
            );
        }

        if (menu) {

            menu.classList.add("open");

            menu.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    }

    function closeMenu() {

        const trigger =
            document.getElementById("localeTrigger");

        const menu =
            document.getElementById("localeMenu");

        if (trigger) {

            trigger.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        if (menu) {

            menu.classList.remove("open");

            menu.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    }

    function toggleMenu() {

        const trigger =
            document.getElementById("localeTrigger");

        if (
            trigger?.getAttribute("aria-expanded") === "true"
        ) {

            closeMenu();

        } else {

            openMenu();
        }
    }

    /* =====================================================
       EVENT DELEGATION
    ===================================================== */

    function bindEvents() {

        const root = document.documentElement;

        if (
            root.dataset.languageEventsBound === "true"
        ) {
            return;
        }

        root.dataset.languageEventsBound = "true";

        /* ---------------------------------------------
           CLICK EVENTS
        --------------------------------------------- */

        document.addEventListener(
            "click",
            async event => {

                const target = event.target;

                if (!target || !target.closest) {
                    return;
                }

                const languageButton =
                    target.closest("[data-lang]");

                if (languageButton) {

                    event.preventDefault();

                    const lang =
                        languageButton.dataset.lang;

                    const success = await set(lang);

                    if (!success) {

                        console.error(
                            "[BXLanguage] Activation failed:",
                            lang
                        );
                    }

                    return;
                }

                const trigger =
                    target.closest("#localeTrigger");

                if (trigger) {

                    event.preventDefault();

                    toggleMenu();

                    return;
                }

                if (!target.closest(".locale-box")) {

                    closeMenu();
                }
            }
        );

        /* ---------------------------------------------
           KEYBOARD EVENTS
        --------------------------------------------- */

        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    closeMenu();
                }
            }
        );
    }

    /* =====================================================
       INITIALIZATION
    ===================================================== */

    async function init() {

        // Prevent duplicate initialization.
        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {

            bindEvents();

            const saved = getSaved();

            let browserLang = DEFAULT_LANG;

            try {

                browserLang = normalize(
                    navigator.language.slice(0, 2)
                );

            } catch {
                browserLang = DEFAULT_LANG;
            }

            const preferred =
                saved ||
                (
                    isSupported(browserLang)
                        ? browserLang
                        : DEFAULT_LANG
                );

            let success = await loadLocale(preferred);

            // Fallback to English if preferred language fails.
            if (
                !success &&
                preferred !== DEFAULT_LANG
            ) {

                success = await loadLocale(
                    DEFAULT_LANG
                );
            }

            if (!success) {

                console.error(
                    "[BXLanguage] No locale dictionary available."
                );

                return false;
            }

            console.log(
                `[BXLanguage] V${VERSION} ready: ${current}`
            );

            return true;

        })();

        try {

            return await initPromise;

        } finally {

            // Allow explicit retry after a failed initialization.
            if (!loaded) {
                initPromise = null;
            }
        }
    }

    /* =====================================================
       CACHE MANAGEMENT
    ===================================================== */

    function clearCache(lang) {

        if (lang) {

            const normalized = normalize(lang);

            if (!isSupported(normalized)) {
                return false;
            }

            dictionaryCache.delete(normalized);

            return true;
        }

        dictionaryCache.clear();

        return true;
    }

    function getCacheStatus() {

        return {
            current,
            loaded,
            cached: Array.from(
                dictionaryCache.keys()
            ),
            supported: [...SUPPORTED]
        };
    }

    /* =====================================================
       PUBLIC API
       Existing API preserved.
    ===================================================== */

    return {

        version: VERSION,

        init,

        set,

        loadLocale,

        get,

        translate,

        format,

        getCurrent,

        getDictionary,

        translatePage,

        translateNode,

        ready,

        supported: SUPPORTED,

        rtl: RTL_LANGS,

        isSupported,

        isRTL,

        normalize,

        applyDirection,

        openMenu,

        closeMenu,

        toggleMenu,

        clearCache,

        getCacheStatus

    };

})();

/* =========================================================
   AUTO INITIALIZATION
========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => window.BXLanguage.init(),
        { once: true }
    );

} else {

    window.BXLanguage.init();

}
