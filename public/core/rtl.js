
"use strict";

/* BLOXIO RTL ENGINE */
window.BXRTL = (() => {
  const RTL_LANGS = ["AR"];

  function normalize(lang) {
    return String(lang || "EN").toUpperCase();
  }

  function isRTL(lang) {
    return RTL_LANGS.includes(normalize(lang));
  }

  function current() {
    return BXLanguage?.getCurrent?.() || "EN";
  }

  function apply(lang = current()) {
    lang = normalize(lang);
    const rtl = isRTL(lang);

    document.documentElement.lang = lang.toLowerCase();
    document.documentElement.dir = rtl ? "rtl" : "ltr";

    if (document.body) {
      document.body.classList.toggle("rtl", rtl);
      document.body.classList.toggle("ltr", !rtl);
    }

    document.querySelectorAll("[data-auto-align]").forEach(node => {
      node.style.textAlign = rtl ? "right" : "left";
    });

    document.querySelectorAll("[data-rtl-flip]").forEach(node => {
      node.style.transform = rtl ? "scaleX(-1)" : "scaleX(1)";
    });

    document.querySelectorAll("[data-auto-flex]").forEach(node => {
      node.style.flexDirection = rtl ? "row-reverse" : "row";
    });

    document.querySelectorAll("[data-auto-grid]").forEach(node => {
      node.style.direction = rtl ? "rtl" : "ltr";
    });

    document.querySelectorAll("input, textarea").forEach(node => {
      node.dir = rtl ? "rtl" : "ltr";
    });

    document.querySelectorAll("table").forEach(node => {
      node.dir = rtl ? "rtl" : "ltr";
    });

    window.dispatchEvent(new CustomEvent("bx:rtl-change", {
      detail: { lang, rtl }
    }));
  }

  function init() {
    window.addEventListener("bx:language-change", event => {
      apply(event.detail?.lang || current());
    });

    apply();
    console.log("[BX] RTL ready");
  }

  return {
    init,
    apply,
    isRTL,
    current,
    languages: RTL_LANGS
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  BXRTL.init();
});
