/* ============================================================
   BLOXIO ICON MANAGER
   One central icon resolver for the whole website.

   Public asset layout (public/ is the web root):
     /assets/images/coins/
     /assets/images/commodities/
     /assets/images/companies/
     /assets/images/exchanges/
     /assets/images/games/
     /assets/images/casino/
     /assets/images/flags/
     /assets/images/payments/
     /assets/images/branding/

   External sources are optional. Always provide a local fallback
   for important trading, payment and identity assets.
============================================================ */
(function (global) {
  "use strict";

  const ROOT = "/assets/images";
  const SIMPLE_ICONS = "https://cdn.simpleicons.org";
  const GAME_CDN = "https://cdn.jsdelivr.net/gh/Nieobie/game-icon-pack@1.4/svg";
  const FLAG_CDN = "https://flagcdn.com";

  const COMMODITY_ALIASES = Object.freeze({
    XAU: "gold",
    XAG: "silver",
    XPT: "platinum",
    XPD: "palladium",
    NG: "natural-gas"
  });

  const COMMODITIES = new Set([
    "XAU", "XAG", "XPT", "XPD", "COPPER", "OIL", "BRENT", "NG"
  ]);

  // Useful Simple Icons slugs. Add/edit entries here, not in page scripts.
  const BRAND_SLUGS = Object.freeze({
    meta: "meta",
    facebook: "facebook",
    instagram: "instagram",
    whatsapp: "whatsapp",
    telegram: "telegram",
    discord: "discord",
    youtube: "youtube",
    x: "x",
    tiktok: "tiktok",
    google: "google",
    apple: "apple",
    microsoft: "microsoft",
    amazon: "amazon",
    nvidia: "nvidia",
    tesla: "tesla",
    netflix: "netflix",
    spotify: "spotify",
    paypal: "paypal",
    visa: "visa",
    mastercard: "mastercard",
    binance: "binance",
    coinbase: "coinbase",
    kraken: "kraken",
    bybit: "bybit",
    bitget: "bitget",
    okx: "okx",
    kucoin: "kucoin",
    ethereum: "ethereum",
    bitcoin: "bitcoin",
    solana: "solana",
    t: "tether"
  });

  const TABLER_NAMES = new Set([
    "home", "wallet", "chart-line", "chart-bar", "chart-candlestick",
    "settings", "user", "users", "bell", "search", "menu", "x",
    "check", "plus", "minus", "arrow-up", "arrow-down", "arrow-left",
    "arrow-right", "chevron-down", "chevron-up", "chevron-left",
    "chevron-right", "logout", "login", "lock", "unlock", "shield-check",
    "credit-card", "coins", "coin", "currency-dollar", "building-bank",
    "history", "refresh", "filter", "sort-ascending", "sort-descending",
    "copy", "external-link", "help", "info-circle", "alert-triangle",
    "circle-check", "circle-x", "clock", "calendar", "globe",
    "device-mobile", "device-desktop", "gift", "trophy", "gamepad-2",
    "dice-5", "cards", "crown", "flame", "rocket", "star", "eye",
    "eye-off", "mail", "phone", "message-circle", "headset",
    "download", "upload", "cloud", "server", "database", "code",
    "terminal", "menu-2", "dots", "dots-vertical"
  ]);

  const COUNTRY_CODES = Object.freeze({
    Algeria: "dz", UnitedStates: "us", UnitedKingdom: "gb",
    France: "fr", Germany: "de", Spain: "es", Italy: "it",
    Portugal: "pt", Netherlands: "nl", Belgium: "be",
    Turkey: "tr", SaudiArabia: "sa", UnitedArabEmirates: "ae",
    Qatar: "qa", Kuwait: "kw", Egypt: "eg", Morocco: "ma",
    Tunisia: "tn", Libya: "ly", Canada: "ca", Australia: "au",
    Japan: "jp", China: "cn", SouthKorea: "kr", India: "in",
    Brazil: "br", Argentina: "ar", Switzerland: "ch",
    Sweden: "se", Norway: "no", Denmark: "dk", Russia: "ru",
    Ukraine: "ua", Nigeria: "ng", SouthAfrica: "za"
  });

  function clean(value) {
    return String(value ?? "").trim();
  }

  function slug(value) {
    const result = clean(value).toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    return result || "";
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function local(folder, file, extension) {
    const name = slug(file);
    return name ? `${ROOT}/${folder}/${name}.${extension || "png"}` : "";
  }

  function simpleIcon(name, hexColor) {
    const key = BRAND_SLUGS[clean(name).toLowerCase()] || slug(name);
    if (!key) return "";
    const color = clean(hexColor).replace(/^#/, "");
    return color && /^[0-9a-f]{6}$/i.test(color)
      ? `${SIMPLE_ICONS}/${key}/${color}`
      : `${SIMPLE_ICONS}/${key}`;
  }

  function commodityFile(symbol) {
    const code = upper(symbol);
    return COMMODITY_ALIASES[code] || code.toLowerCase();
  }

  function token(symbol, options) {
    const opts = options || {};
    const code = upper(symbol);
    if (!code) return "";
    const file = opts.file || code.toLowerCase();
    const localPath = local("coins", file, opts.extension || "png");
    return opts.remote === true
      ? (simpleIcon(opts.simpleIcon || code) || localPath)
      : localPath;
  }

  function commodity(symbol) {
    const code = upper(symbol);
    return local("commodities", commodityFile(code), "png");
  }

  function company(name, options) {
    const opts = options || {};
    const key = slug(name);
    if (!key) return "";
    const localPath = local("companies", key, "png");
    return opts.cdn === true
      ? (simpleIcon(opts.simpleIcon || key) || localPath)
      : localPath;
  }

  function exchange(name, options) {
    const opts = options || {};
    const key = slug(name);
    if (!key) return "";
    const localPath = local("exchanges", key, "png");
    return opts.cdn === true
      ? (simpleIcon(opts.simpleIcon || key) || localPath)
      : localPath;
  }

  function game(name) {
    const key = slug(name);
    return key ? `${GAME_CDN}/${key}.svg` : "";
  }

  function casino(name) {
    const key = slug(name);
    return key ? local("casino", key, "svg") : "";
  }

  function flag(countryOrCode, options) {
    const opts = options || {};
    const raw = clean(countryOrCode);
    const compact = raw.replace(/[\s_-]/g, "");
    const code = /^[a-z]{2}$/i.test(raw)
      ? raw.toLowerCase()
      : (COUNTRY_CODES[compact] || "");
    if (!code) return "";
    const size = [20, 40, 80, 160].includes(Number(opts.width))
      ? Number(opts.width)
      : 40;
    return opts.cdn === false
      ? local("flags", code, "svg")
      : `${FLAG_CDN}/w${size}/${code}.png`;
  }

  function payment(name, options) {
    const opts = options || {};
    const key = slug(name);
    if (!key) return "";
    const localPath = local("payments", key, "png");
    return opts.cdn === true
      ? (simpleIcon(opts.simpleIcon || key) || localPath)
      : localPath;
  }

  function tabler(name) {
    const key = slug(name);
    return `ti ti-${TABLER_NAMES.has(key) ? key : "help"}`;
  }

  function icon(type, name, options) {
    const opts = options || {};
    switch (clean(type).toLowerCase()) {
      case "token":
      case "crypto": return token(name, opts);
      case "commodity": return commodity(name);
      case "company":
      case "brand": return company(name, opts);
      case "exchange": return exchange(name, opts);
      case "game": return game(name);
      case "casino": return casino(name);
      case "flag":
      case "country": return flag(name, opts);
      case "payment": return payment(name, opts);
      case "simple":
      case "simpleicon": return simpleIcon(name, opts.color);
      default: return "";
    }
  }

  // Build a safe image element with an optional fallback URL.
  function image(type, name, options) {
    const opts = options || {};
    const src = icon(type, name, opts);
    const fallback = clean(opts.fallback);
    const alt = clean(opts.alt || name);
    const img = document.createElement("img");
    img.alt = alt;
    img.loading = opts.loading || "lazy";
    img.decoding = "async";
    if (opts.className) img.className = opts.className;
    if (opts.width) img.width = Number(opts.width);
    if (opts.height) img.height = Number(opts.height);

    let attemptedFallback = false;
    img.onerror = function () {
      if (!attemptedFallback && fallback) {
        attemptedFallback = true;
        img.src = fallback;
      } else {
        img.hidden = true;
        if (typeof opts.onError === "function") opts.onError(img);
      }
    };
    if (src) img.src = src;
    else img.hidden = true;
    return img;
  }

  const API = Object.freeze({
    version: "1.0.0",
    root: ROOT,
    simpleIcon,
    tabler,
    token,
    commodity,
    company,
    exchange,
    game,
    casino,
    flag,
    payment,
    icon,
    image,
    isCommodity: symbol => COMMODITIES.has(upper(symbol)),
    brands: BRAND_SLUGS,
    countries: COUNTRY_CODES,
    tablerStylesheet:
      "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.49.0/dist/tabler-icons.min.css"
  });

  global.BLOXIO_ICONS = API;
  global.ICON_CDN = API; // Backward compatibility with earlier pages.
})(window);
