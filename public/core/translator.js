
"use strict";

/* BLOXIO TRANSLATOR */
window.BXTranslator = (() => {
  let observer = null;

  function text(key) {
    return window.BXLanguage
      ? BXLanguage.get(key)
      : key;
  }

  function translateNode(node) {
    if (!node || node.nodeType !== 1) return;

    const map = [
      ["langKey", value => node.textContent = value],
      ["langHtml", value => node.textContent = value],
      ["langPlaceholder", value => node.setAttribute("placeholder", value)],
      ["langTitle", value => node.setAttribute("title", value)],
      ["langValue", value => node.value = value],
      ["langAria", value => node.setAttribute("aria-label", value)],
      ["langAlt", value => node.setAttribute("alt", value)]
    ];

    for (const [key, apply] of map) {
      const translationKey = node.dataset[key];
      if (!translationKey) continue;

      const value = text(translationKey);
      if (value !== translationKey) apply(value);
    }
  }

  function translate(root = document) {
    const selector = [
      "[data-lang-key]",
      "[data-lang-html]",
      "[data-lang-placeholder]",
      "[data-lang-title]",
      "[data-lang-value]",
      "[data-lang-aria]",
      "[data-lang-alt]"
    ].join(",");

    if (root.nodeType === 1 && root.matches?.(selector)) {
      translateNode(root);
    }

    root.querySelectorAll?.(selector).forEach(translateNode);
  }

  function observe() {
    if (observer || !document.body) return;

    observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) translate(node);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function locale() {
    return BXLanguage?.getCurrent?.() || "EN";
  }

  function currency(amount, code = "USD") {
    try {
      return new Intl.NumberFormat(locale(), {
        style: "currency",
        currency: code
      }).format(Number(amount));
    } catch {
      return amount;
    }
  }

  function number(value) {
    try {
      return new Intl.NumberFormat(locale()).format(Number(value));
    } catch {
      return value;
    }
  }

  function percent(value) {
    try {
      return new Intl.NumberFormat(locale(), {
        style: "percent",
        minimumFractionDigits: 2
      }).format(Number(value));
    } catch {
      return value;
    }
  }

  function date(value) {
    try {
      return new Intl.DateTimeFormat(locale(), {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function init() {
    translate();
    observe();

    window.addEventListener("bx:language-change", () => {
      translate();
    });

    console.log("[BX] Translator ready");
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
    date
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  BXTranslator.init();
});
