
"use strict";

/* =========================================================
   BLOXIO LANGUAGE ENGINE V2
   Supported: EN AR FR ES DE RU TR ZH JA
========================================================= */

window.BXLanguage = (() => {

    const STORAGE_KEY = "bx_language";
    const DEFAULT_LANG = "EN";

    const SUPPORTED = [
        "EN", "AR", "FR", "ES", "DE",
        "RU", "TR", "ZH", "JA"
    ];

    const RTL_LANGS = ["AR"];

    let current = DEFAULT_LANG;
    let dictionary = {};
    let loaded = false;
    let loading = null;
    let requestId = 0;

    const normalize = lang =>
        String(lang || DEFAULT_LANG).trim().toUpperCase();

    const isSupported = lang =>
        SUPPORTED.includes(normalize(lang));

    const isRTL = lang =>
        RTL_LANGS.includes(normalize(lang));

    /* -----------------------------------------------------
       STORAGE
    ----------------------------------------------------- */

    function getSaved() {
        try {
            const saved = normalize(
                localStorage.getItem(STORAGE_KEY)
            );

            return isSupported(saved) ? saved : null;

        } catch {
            return null;
        }
    }

    /* -----------------------------------------------------
       DICTIONARY
    ----------------------------------------------------- */

    function get(path, fallback) {
        if (!path) return "";

        const value = String(path).split(".").reduce(
            (object, key) =>
                object == null ? undefined : object[key],
            dictionary
        );

        if (value === undefined || value === null) {
            return fallback !== undefined ? fallback : path;
        }

        return typeof value === "object"
            ? fallback ?? path
            : String(value);
    }

    /* -----------------------------------------------------
       DIRECTION
    ----------------------------------------------------- */

    function applyDirection(lang) {
        const rtl = isRTL(lang);

        document.documentElement.lang =
            lang.toLowerCase();

        document.documentElement.dir =
            rtl ? "rtl" : "ltr";

        document.documentElement.classList.toggle(
            "rtl",
            rtl
        );

        document.documentElement.classList.toggle(
            "ltr",
            !rtl
        );

        document.body?.classList.toggle("rtl", rtl);
        document.body?.classList.toggle("ltr", !rtl);
    }

    /* -----------------------------------------------------
       TRANSLATE NODE
    ----------------------------------------------------- */

    function translateNode(node) {
        if (!node || node.nodeType !== 1) return;

        const mappings = [
            ["langKey", "text"],
            ["langHtml", "html"],
            ["langPlaceholder", "placeholder"],
            ["langTitle", "title"],
            ["langValue", "value"],
            ["langAria", "aria-label"],
            ["langAlt", "alt"]
        ];

        mappings.forEach(([dataKey, type]) => {
            const key = node.dataset[dataKey];

            if (!key) return;

            const value = get(key);

            if (value === key) return;

            switch (type) {
                case "text":
                    node.textContent = value;
                    break;

                case "html":
                    node.innerHTML = value;
                    break;

                case "placeholder":
                case "title":
                case "aria-label":
                case "alt":
                    node.setAttribute(type, value);
                    break;

                case "value":
                    node.value = value;
                    break;
            }
        });
    }

    /* -----------------------------------------------------
       TRANSLATE PAGE
    ----------------------------------------------------- */

    function translatePage(root = document) {

        const selector = [
            "[data-lang-key]",
            "[data-lang-html]",
            "[data-lang-placeholder]",
            "[data-lang-title]",
            "[data-lang-value]",
            "[data-lang-aria]",
            "[data-lang-alt]"
        ].join(",");

        if (
            root.nodeType === 1 &&
            root.matches?.(selector)
        ) {
            translateNode(root);
        }

        root.querySelectorAll?.(selector)
            .forEach(translateNode);

        const currentLocale =
            document.getElementById("currentLocale");

        if (currentLocale) {
            currentLocale.textContent = current;
        }

        document.querySelectorAll("[data-lang]")
            .forEach(button => {
                const active =
                    normalize(button.dataset.lang) === current;

                button.classList.toggle("active", active);

                button.setAttribute(
                    "aria-pressed",
                    active ? "true" : "false"
                );
            });
    }

    /* -----------------------------------------------------
       LOAD LOCALE
    ----------------------------------------------------- */

    async function loadLocale(lang) {

        lang = normalize(lang);

        if (!isSupported(lang)) {
            console.error("[BXLanguage] Unsupported:", lang);
            return false;
        }

        const id = ++requestId;

        if (loading) {
            await loading;
        }

        const task = (async () => {

            try {
                const url =
                    `/locales/${lang.toLowerCase()}.json`;

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

                const data = await response.json();

                if (
                    !data ||
                    typeof data !== "object" ||
                    Array.isArray(data)
                ) {
                    throw new Error(
                        `Invalid dictionary: ${lang}`
                    );
                }

                if (id !== requestId) {
                    return false;
                }

                dictionary = data;
                current = lang;
                loaded = true;

                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        lang
                    );
                } catch {}

                applyDirection(lang);
                translatePage();

                window.dispatchEvent(
                    new CustomEvent("bx:language-change", {
                        detail: {
                            lang,
                            dictionary
                        }
                    })
                );

                console.log(
                    `[BXLanguage] Loaded ${lang}`
                );

                return true;

            } catch (error) {

                console.error(
                    `[BXLanguage] Failed ${lang}`,
                    error
                );

                return false;
            }

        })();

        loading = task;

        try {
            return await task;
        } finally {
            if (loading === task) {
                loading = null;
            }
        }
    }

    /* -----------------------------------------------------
       SET LANGUAGE
    ----------------------------------------------------- */

    async function set(lang) {
        lang = normalize(lang);

        if (!isSupported(lang)) return false;

        if (lang === current && loaded) {
            translatePage();
            closeMenu();
            return true;
        }

        const success = await loadLocale(lang);

        if (success) {
            closeMenu();
        }

        return success;
    }

    /* -----------------------------------------------------
       LOCALE MENU
    ----------------------------------------------------- */

    function openMenu() {
        const trigger = document.getElementById(
            "localeTrigger"
        );

        const menu = document.getElementById(
            "localeMenu"
        );

        if (!trigger || !menu) return;

        trigger.setAttribute("aria-expanded", "true");
        menu.classList.add("open");
    }

    function closeMenu() {
        const trigger = document.getElementById(
            "localeTrigger"
        );

        const menu = document.getElementById(
            "localeMenu"
        );

        if (!trigger || !menu) return;

        trigger.setAttribute("aria-expanded", "false");
        menu.classList.remove("open");
    }

    function toggleMenu() {
        const trigger = document.getElementById(
            "localeTrigger"
        );

        if (
            trigger?.getAttribute("aria-expanded") === "true"
        ) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /* -----------------------------------------------------
       EVENT DELEGATION
    ----------------------------------------------------- */

    function bindEvents() {

        if (document.documentElement.dataset.languageEventsBound) {
            return;
        }

        document.documentElement.dataset.languageEventsBound =
            "true";

        document.addEventListener("click", async event => {

            const languageButton =
                event.target.closest("[data-lang]");

            if (languageButton) {
                event.preventDefault();

                const lang = languageButton.dataset.lang;

                const success = await set(lang);

                if (!success) {
                    console.error(
                        "[BXLanguage] Could not activate",
                        lang
                    );
                }

                return;
            }

            const trigger =
                event.target.closest("#localeTrigger");

            if (trigger) {
                event.preventDefault();
                toggleMenu();
                return;
            }

            if (!event.target.closest(".locale-box")) {
                closeMenu();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeMenu();
            }
        });
    }

    /* -----------------------------------------------------
       INIT
    ----------------------------------------------------- */

    async function init() {

        bindEvents();

        const saved = getSaved();

        let browserLang = DEFAULT_LANG;

        try {
            browserLang = normalize(
                navigator.language.slice(0, 2)
            );
        } catch {}

        const preferred =
            saved ||
            (
                isSupported(browserLang)
                    ? browserLang
                    : DEFAULT_LANG
            );

        let success = await loadLocale(preferred);

        if (!success && preferred !== DEFAULT_LANG) {
            success = await loadLocale(DEFAULT_LANG);
        }

        if (!success) {
            console.error(
                "[BXLanguage] No locale dictionary could be loaded"
            );

            return false;
        }

        console.log(
            `[BXLanguage] Ready: ${current}`
        );

        return true;
    }

    return {
        init,
        set,
        loadLocale,
        get,
        getCurrent: () => current,
        getDictionary: () => dictionary,
        translatePage,
        translateNode,
        ready: () => loaded,
        supported: SUPPORTED,
        rtl: RTL_LANGS,
        openMenu,
        closeMenu
    };

})();

document.addEventListener("DOMContentLoaded", () => {
    window.BXLanguage.init();
}, { once: true });
