
"use strict";

/* =========================================================
   BLOXIO TRANSLATOR V3.1
   ---------------------------------------------------------
   Core:
   - BXLanguage compatibility
   - Dynamic DOM translation
   - Translation attribute observation
   - Runtime text bindings
   - Locale-aware formatters
   - Safe observer lifecycle
   Supported: EN AR FR ES DE RU TR ZH JA
========================================================= */

window.BXTranslator = (() => {

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const VERSION = "3.1.0";

    const SUPPORTED_LOCALES = [
        "EN", "AR", "FR", "ES", "DE", "RU", "TR", "ZH", "JA"
    ];

    const TRANSLATION_ATTRIBUTES = [
        "data-lang-key",
        "data-lang-html",
        "data-lang-placeholder",
        "data-lang-title",
        "data-lang-value",
        "data-lang-aria",
        "data-lang-alt"
    ];

    const TRANSLATION_SELECTOR = TRANSLATION_ATTRIBUTES
        .map(attribute => `[${attribute}]`)
        .join(",");

    /* =====================================================
       STATE
    ===================================================== */

    let observer = null;
    let initialized = false;
    let languageChangeHandler = null;
    let pendingNodes = new Set();
    let scheduled = false;

    // Elements registered through bindText().
    const textBindings = new Map();

    /* =====================================================
       LANGUAGE ENGINE
    ===================================================== */

    function language() {
        return window.BXLanguage || null;
    }

    function getCurrentLanguage() {
        const engine = language();

        if (!engine || typeof engine.getCurrent !== "function") {
            return "EN";
        }

        try {
            const current = String(
                engine.getCurrent() || "EN"
            ).toUpperCase();

            return SUPPORTED_LOCALES.includes(current)
                ? current
                : "EN";

        } catch (error) {
            console.warn(
                "[BXTranslator] Cannot read current language:",
                error
            );

            return "EN";
        }
    }

    function locale() {
        return getCurrentLanguage().toLowerCase();
    }

    function text(key, fallback) {
        const engine = language();

        if (engine && typeof engine.get === "function") {
            try {
                return engine.get(key, fallback);
            } catch (error) {
                console.warn(
                    "[BXTranslator] Translation lookup failed:",
                    key,
                    error
                );
            }
        }

        return fallback !== undefined && fallback !== null
            ? fallback
            : key;
    }

    /* =====================================================
       CORE TRANSLATION
    ===================================================== */

    function translate(root = document) {
        const engine = language();

        if (!engine || typeof engine.translatePage !== "function") {
            return false;
        }

        try {
            engine.translatePage(root || document);
            return true;

        } catch (error) {
            console.error(
                "[BXTranslator] Translation failed:",
                error
            );

            return false;
        }
    }

    function translateNode(node) {
        const engine = language();

        if (
            !engine ||
            typeof engine.translateNode !== "function" ||
            !node ||
            node.nodeType !== 1
        ) {
            return false;
        }

        try {
            engine.translateNode(node);
            return true;

        } catch (error) {
            console.error(
                "[BXTranslator] Node translation failed:",
                error
            );

            return false;
        }
    }

    function containsTranslationKeys(element) {
        if (!element || element.nodeType !== 1) {
            return false;
        }

        if (element.matches(TRANSLATION_SELECTOR)) {
            return true;
        }

        return Boolean(
            element.querySelector(TRANSLATION_SELECTOR)
        );
    }

    /* =====================================================
       DYNAMIC DOM TRANSLATION
    ===================================================== */

    function queueNode(node) {
        if (!node || node.nodeType !== 1) {
            return;
        }

        if (!containsTranslationKeys(node)) {
            return;
        }

        pendingNodes.add(node);

        if (scheduled) {
            return;
        }

        scheduled = true;

        queueMicrotask(flushPendingNodes);
    }

    function flushPendingNodes() {
        scheduled = false;

        if (!pendingNodes.size) {
            return;
        }

        const nodes = Array.from(pendingNodes);

        pendingNodes.clear();

        nodes.forEach(node => {

            // Ignore elements removed before the queue was flushed.
            if (!node.isConnected) {
                return;
            }

            translate(node);

        });
    }

    function handleMutations(records) {

        for (const record of records) {

            if (record.type === "childList") {

                record.addedNodes.forEach(node => {
                    queueNode(node);
                });

                continue;
            }

            if (record.type === "attributes") {

                if (
                    TRANSLATION_ATTRIBUTES.includes(
                        record.attributeName
                    )
                ) {
                    translateNode(record.target);
                }
            }
        }
    }

    /* =====================================================
       MUTATION OBSERVER
    ===================================================== */

    function observe() {

        if (observer) {
            return true;
        }

        if (!document.body) {
            return false;
        }

        if (typeof MutationObserver === "undefined") {
            console.warn(
                "[BXTranslator] MutationObserver unavailable."
            );

            return false;
        }

        observer = new MutationObserver(handleMutations);

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: TRANSLATION_ATTRIBUTES
        });

        return true;
    }

    function disconnectObserver() {

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        pendingNodes.clear();
        scheduled = false;
    }

    /* =====================================================
       DYNAMIC TEXT BINDING
       -----------------------------------------------------
       bindText(element, key, fallback)
       Automatically updates when language changes.
    ===================================================== */

    function applyTextBinding(element, binding) {

        if (!element || !binding) {
            return false;
        }

        const translated = text(
            binding.key,
            binding.fallback
        );

        if (
            translated === undefined ||
            translated === null
        ) {
            return false;
        }

        element.textContent = String(translated);

        return true;
    }

    function bindText(element, key, fallback = "") {

        if (!element || !key) {
            return false;
        }

        const binding = {
            key: String(key),
            fallback: String(fallback)
        };

        textBindings.set(element, binding);

        return applyTextBinding(element, binding);
    }

    function unbindText(element) {

        if (!element) {
            return false;
        }

        return textBindings.delete(element);
    }

    function refreshBindings() {

        for (const [element, binding] of textBindings) {

            if (!element.isConnected) {
                textBindings.delete(element);
                continue;
            }

            applyTextBinding(element, binding);
        }
    }

    function setText(element, key, fallback = "") {

        return bindText(element, key, fallback);
    }

    /* =====================================================
       FORMATTER HELPERS
    ===================================================== */

    function validNumber(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : null;
    }

    function formatterLocale() {

        const current = locale();

        try {
            // Validate locale support.
            new Intl.NumberFormat(current);

            return current;

        } catch {
            return "en";
        }
    }

    /* =====================================================
       CURRENCY FORMATTER
       BXTranslator.currency(1250, "USD")
       BXTranslator.currency(1250, "EUR", {
           maximumFractionDigits: 4
       })
    ===================================================== */

    function currency(amount, code = "USD", options = {}) {

        const value = validNumber(amount);

        if (value === null) {
            return String(amount ?? "");
        }

        try {
            return new Intl.NumberFormat(
                formatterLocale(),
                {
                    style: "currency",
                    currency: code,
                    ...options
                }
            ).format(value);

        } catch (error) {

            console.warn(
                "[BXTranslator] Currency formatting failed:",
                error
            );

            return String(amount);
        }
    }

    /* =====================================================
       NUMBER FORMATTER
    ===================================================== */

    function number(value, options = {}) {

        const parsed = validNumber(value);

        if (parsed === null) {
            return String(value ?? "");
        }

        try {
            return new Intl.NumberFormat(
                formatterLocale(),
                options
            ).format(parsed);

        } catch {
            return String(value);
        }
    }

    /* =====================================================
       PERCENT FORMATTER
       Input: 0.125 -> 12.50%
    ===================================================== */

    function percent(value, options = {}) {

        const parsed = validNumber(value);

        if (parsed === null) {
            return String(value ?? "");
        }

        try {
            return new Intl.NumberFormat(
                formatterLocale(),
                {
                    style: "percent",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    ...options
                }
            ).format(parsed);

        } catch {
            return String(value);
        }
    }

    /* =====================================================
       DATE FORMATTER
    ===================================================== */

    function date(value, options = {}) {

        const parsed = value instanceof Date
            ? value
            : new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            return String(value ?? "");
        }

        try {
            return new Intl.DateTimeFormat(
                formatterLocale(),
                {
                    dateStyle: "medium",
                    timeStyle: "short",
                    ...options
                }
            ).format(parsed);

        } catch {
            return String(value);
        }
    }

    /* =====================================================
       RELATIVE TIME FORMATTER
       Example: -2 days, 3 hours
    ===================================================== */

    function relativeTime(value, unit = "day", options = {}) {

        const parsed = validNumber(value);

        if (
            parsed === null ||
            typeof Intl.RelativeTimeFormat !== "function"
        ) {
            return String(value ?? "");
        }

        try {
            return new Intl.RelativeTimeFormat(
                formatterLocale(),
                {
                    numeric: "auto",
                    ...options
                }
            ).format(parsed, unit);

        } catch {
            return String(value);
        }
    }

    /* =====================================================
       LANGUAGE CHANGE HANDLER
    ===================================================== */

    function handleLanguageChange() {

        // Translate all static DOM language markers.
        translate(document);

        // Refresh JavaScript-bound text.
        refreshBindings();

    }

    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function init() {

        if (initialized) {
            observe();
            translate(document);
            refreshBindings();

            return true;
        }

        if (!document.body) {

            document.addEventListener(
                "DOMContentLoaded",
                init,
                { once: true }
            );

            return false;
        }

        initialized = true;

        // Initial page translation.
        translate(document);

        // Observe dynamic content.
        observe();

        // Register language event once.
        languageChangeHandler = handleLanguageChange;

        window.addEventListener(
            "bx:language-change",
            languageChangeHandler
        );

        console.log(
            `[BXTranslator] V${VERSION} initialized`
        );

        return true;
    }

    /* =====================================================
       DESTROY
    ===================================================== */

    function destroy() {

        disconnectObserver();

        if (languageChangeHandler) {

            window.removeEventListener(
                "bx:language-change",
                languageChangeHandler
            );

            languageChangeHandler = null;
        }

        textBindings.clear();

        initialized = false;

        console.log("[BXTranslator] Destroyed");
    }

    /* =====================================================
       PUBLIC API
    ===================================================== */

    return {

        version: VERSION,

        init,
        destroy,

        language: getCurrentLanguage,
        locale,

        translate,
        translateNode,
        refresh: translate,

        observe,
        disconnectObserver,

        text,
        setText,
        bindText,
        unbindText,
        refreshBindings,

        currency,
        number,
        percent,
        date,
        relativeTime

    };

})();

/* =========================================================
   AUTO INITIALIZATION
========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => window.BXTranslator.init(),
        { once: true }
    );

} else {

    window.BXTranslator.init();

}
