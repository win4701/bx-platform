
"use strict";

/* BLOXIO LANGUAGE ENGINE */
window.BXLanguage = (() => {
  const STORAGE_KEY = "bx_language";
  const DEFAULT_LANG = "EN";
  const SUPPORTED = ["EN", "AR", "FR", "ES", "DE", "RU", "TR", "ZH", "JA"];
  const RTL_LANGS = ["AR"];

  let current = DEFAULT_LANG;
  let dictionary = {};
  let loaded = false;
  let loading = null;

  const normalize = lang => String(lang || DEFAULT_LANG).toUpperCase();
  const isSupported = lang => SUPPORTED.includes(normalize(lang));
  const isRTL = lang => RTL_LANGS.includes(normalize(lang));

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getSaved() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return isSupported(saved) ? normalize(saved) : null;
    } catch {
      return null;
    }
  }

  function get(path) {
    if (!path) return "";
    const value = String(path).split(".").reduce(
      (obj, key) => obj == null ? undefined : obj[key],
      dictionary
    );
    return value === undefined || value === null ? path : value;
  }

  function applyDirection(lang) {
    const rtl = isRTL(lang);
    document.documentElement.lang = lang.toLowerCase();
    document.documentElement.dir = rtl ? "rtl" : "ltr";

    if (document.body) {
      document.body.classList.toggle("rtl", rtl);
      document.body.classList.toggle("ltr", !rtl);
    }
  }

  function translatePage(root = document) {
    const selectors = [
      "[data-lang-key]",
      "[data-lang-html]",
      "[data-lang-placeholder]",
      "[data-lang-title]",
      "[data-lang-value]",
      "[data-lang-aria]",
      "[data-lang-alt]"
    ].join(",");

    if (root.nodeType === 1 && root.matches?.(selectors)) {
      translateNode(root);
    }

    root.querySelectorAll?.(selectors).forEach(translateNode);

    const currentLocale = document.getElementById("currentLocale");
    if (currentLocale) currentLocale.textContent = current;
  }

  function translateNode(node) {
    if (!node || node.nodeType !== 1) return;

    const mappings = [
      ["langKey", value => node.textContent = value],
      ["langHtml", value => node.textContent = value],
      ["langPlaceholder", value => node.setAttribute("placeholder", value)],
      ["langTitle", value => node.setAttribute("title", value)],
      ["langValue", value => node.value = value],
      ["langAria", value => node.setAttribute("aria-label", value)],
      ["langAlt", value => node.setAttribute("alt", value)]
    ];

    for (const [dataKey, apply] of mappings) {
      const key = node.dataset[dataKey];
      if (!key) continue;
      const value = get(key);
      if (value !== key) apply(value);
    }
  }

  async function loadLocale(lang) {
    lang = normalize(lang);
    if (!isSupported(lang)) return false;

    if (loading) await loading;

    loading = (async () => {
      try {
        const response = await fetch(
          `/locales/${lang.toLowerCase()}.json`,
          { cache: "no-cache" }
        );

        if (!response.ok) {
          throw new Error(`Cannot load ${lang}: ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error(`Invalid dictionary: ${lang}`);
        }

        dictionary = data;
        current = lang;
        loaded = true;

        try {
          localStorage.setItem(STORAGE_KEY, lang);
        } catch {}

        applyDirection(lang);
        translatePage();

        emit("bx:language-change", { lang, dictionary });
        return true;
      } catch (error) {
        console.error("[BXLanguage]", error);
        return false;
      }
    })();

    const result = await loading;
    loading = null;
    return result;
  }

  async function set(lang) {
    lang = normalize(lang);
    if (!isSupported(lang)) return false;

    if (lang === current && loaded) {
      translatePage();
      return true;
    }

    return loadLocale(lang);
  }

  function bindLanguageButtons() {
    document.querySelectorAll("[data-lang]").forEach(button => {
      if (button.dataset.languageBound === "true") return;

      button.dataset.languageBound = "true";
      button.addEventListener("click", async () => {
        const success = await set(button.dataset.lang);

        if (success) {
          document.querySelectorAll("[data-lang]").forEach(item => {
            item.setAttribute(
              "aria-pressed",
              normalize(item.dataset.lang) === current ? "true" : "false"
            );
          });

          const menu = document.getElementById("localeMenu");
          const trigger = document.getElementById("localeTrigger");

          if (menu && trigger) {
            trigger.setAttribute("aria-expanded", "false");
          }
        }
      });
    });
  }

  function bindLocaleMenu() {
    const trigger = document.getElementById("localeTrigger");
    const menu = document.getElementById("localeMenu");

    if (!trigger || !menu || trigger.dataset.menuBound === "true") return;

    trigger.dataset.menuBound = "true";

    trigger.addEventListener("click", () => {
      const open = trigger.getAttribute("aria-expanded") !== "true";
      trigger.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".locale-box")) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  async function init() {
    const saved = getSaved();

    let browserLang = "EN";
    try {
      browserLang = normalize(
        (navigator.language || "en").slice(0, 2)
      );
    } catch {}

    const preferred = saved ||
      (isSupported(browserLang) ? browserLang : DEFAULT_LANG);

    const success = await loadLocale(preferred);

    if (!success && preferred !== DEFAULT_LANG) {
      await loadLocale(DEFAULT_LANG);
    }

    bindLanguageButtons();
    bindLocaleMenu();

    console.log(`[BX] Language ready: ${current}`);
  }

  return {
    init,
    set,
    loadLocale,
    get,
    getCurrent: () => current,
    getDictionary: () => dictionary,
    translatePage,
    ready: () => loaded,
    supported: SUPPORTED,
    rtl: RTL_LANGS
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  BXLanguage.init();
});
