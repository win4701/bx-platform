/* BLOXIO CENTRAL ICON MANAGER
 * Single source of truth for remote token, company and country icons.
 * Classic-script compatible: exposes window.getIcon and window.BLOXIO_ICONS.
 */
(function (global) {
  "use strict";

  const FALLBACK = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#181A20"/><path d="M32 13 48 22v20L32 51 16 42V22z" fill="none" stroke="#D4AF37" stroke-width="3"/><path d="M24 32h16" stroke="#D4AF37" stroke-width="3" stroke-linecap="round"/></svg>'
  );

  const ICON_SOURCES = Object.freeze({
    crypto: symbol => `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${encodeURIComponent(String(symbol).toLowerCase())}.png`,
    company: slug => `https://cdn.simpleicons.org/${encodeURIComponent(String(slug).toLowerCase())}`,
    fiat: countryCode => `https://flagcdn.com/${encodeURIComponent(String(countryCode).toLowerCase())}.svg`,
    sports: slug => `https://cdn.simpleicons.org/${encodeURIComponent(String(slug).toLowerCase())}`
  });

  function getIcon(type, symbol) {
    const source = ICON_SOURCES[String(type || "").toLowerCase()];
    const value = String(symbol || "").trim();
    if (!source || !value) return FALLBACK;
    return source(value);
  }

  const aliases = Object.freeze({
    BTC: "btc", ETH: "eth", SOL: "sol", BNB: "bnb",
    TON: "ton", LTC: "ltc", BCH: "bch", XLM: "xlm",
    ZEC: "zec", AAVE: "aave", AVAX: "avax", DOT: "dot",
    LINK: "link", DASH: "dash", XMR: "xmr",
    BX: "bx", EUBX: "eubx"
  });

  const commodityFallback = Object.freeze({
    XAU: "gold", XAG: "silver", XPT: "platinum",
    XPD: "palladium", COPPER: "copper", OIL: "oil",
    BRENT: "oil", NG: "natural-gas"
  });

  const api = Object.freeze({
    getIcon,
    token(symbol) {
      const code = String(symbol || "").toUpperCase();
      return getIcon("crypto", aliases[code] || code.toLowerCase());
    },
    company: slug => getIcon("company", slug),
    fiat: countryCode => getIcon("fiat", countryCode),
    sports: slug => getIcon("sports", slug),
    commodity(symbol) {
      // Commodity tickers are not guaranteed to exist in crypto icon catalogs.
      // Use the central crypto source when available; the onerror fallback is visual.
      const code = String(symbol || "").toLowerCase();
      return getIcon("crypto", commodityFallback[String(symbol || "").toUpperCase()] || code);
    },
    fallback: FALLBACK
  });

  global.getIcon = getIcon;
  global.BLOXIO_ICONS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = { getIcon, ICON_SOURCES, BLOXIO_ICONS: api };
})(typeof window !== "undefined" ? window : globalThis);
