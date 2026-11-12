
"use strict";

/* =========================================================
   BLOXIO TRANSLATOR V2
   Works with BXLanguage
========================================================= */

window.BXTranslator = (() => {

    let observer = null;
    let initialized = false;

    function language() {
        return window.BXLanguage || null;
    }

    function text(key, fallback) {
        const engine = language();

        return engine
            ? engine.get(key, fallback)
            : fallback ?? key;
    }

    /* -----------------------------------------------------
       TRANSLATE
    ----------------------------------------------------- */

    function translate(root = document) {
        const engine = language();

        if (!engine) return;

        engine.translatePage(root);
    }

    function translateNode(node) {
        const engine = language();

        if (!engine) return;

        engine.translateNode(node);
    }

    /* -----------------------------------------------------
       OBSERVER
    ----------------------------------------------------- */

    function observe() {
        if (observer || !document.body) return;

        observer = new MutationObserver(records => {

            records.forEach(record => {

                record.addedNodes.forEach(node => {

                    if (node.nodeType !== 1) return;

                    translate(node);

                });

            });

        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /* -----------------------------------------------------
       FORMATTERS
    ----------------------------------------------------- */

    function locale() {
        const engine = language();

        return engine
            ? engine.getCurrent().toLowerCase()
            : "en";
    }

    function currency(amount, code = "USD") {
        try {
            return new Intl.NumberFormat(locale(), {
                style: "currency",
                currency: code
            }).format(Number(amount));
        } catch {
            return String(amount);
        }
    }

    function number(value, options = {}) {
        try {
            return new Intl.NumberFormat(
                locale(),
                options
            ).format(Number(value));
        } catch {
            return String(value);
        }
    }

    function percent(value) {
        try {
            return new Intl.NumberFormat(locale(), {
                style: "percent",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(value));
        } catch {
            return String(value);
        }
    }

    function date(value) {
        try {
            return new Intl.DateTimeFormat(locale(), {
                dateStyle: "medium",
                timeStyle: "short"
            }).format(new Date(value));
        } catch {
            return String(value);
        }
    }

    /* -----------------------------------------------------
       INIT
    ----------------------------------------------------- */

    function init() {
        if (initialized) return;

        initialized = true;

        translate();
        observe();

        window.addEventListener(
            "bx:language-change",
            () => translate()
        );

        console.log("[BXTranslator] Ready");
    }

    return {
        init,
        translate,
        translateNode,
        refresh: translate,
        text,
        currency,
        number,
        percent,
        date,
        locale
    };

})();

document.addEventListener("DOMContentLoaded", () => {
    window.BXTranslator.init();
}, { once: true });
