/**
 * ============================================================================
 * BLOXIO — CHART.GAMES.JS
 * Unified Casino Game Universe & Chart Registry
 * Version: 2.1.0
 * ============================================================================
 *
 * PURPOSE
 * - One source of truth for the BLOXIO casino game catalog.
 * - Keeps game identity, provider, category, image, currencies and limits.
 * - Defines a dedicated chart profile for each game.
 * - Exposes helpers to query, order, filter and feed game chart data.
 *
 * This file is the game-world module only.
 * It does not contain UI pages, HTML, CSS, dashboard, wallet, betting engine,
 * game outcome generator, RTP/payout math, or theme engine.
 *
 * IMPORTANT
 * The supplied games.js describes catalog metadata only. For Arcade and Slots,
 * actual result fields and chart semantics must be mapped to the relevant
 * provider's documented API. This registry does not invent rules, RTP or payouts.
 * Chart data must come from authoritative, server-verified round records.
 * ============================================================================
 */

const BLOXIO_GAME_CATALOG = [
    {
        "id": "crash",
        "name": "Crash",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/crash.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "multiplier-series",
            "title": "Multiplier chart",
            "series": "multiplier",
            "valueField": "x",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "dice",
        "name": "Dice",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/dice.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "numeric-distribution",
            "title": "Roll distribution",
            "series": "result",
            "valueField": "value",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "limbo",
        "name": "Limbo",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/limbo.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "multiplier-series",
            "title": "Multiplier chart",
            "series": "multiplier",
            "valueField": "x",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "mines",
        "name": "Mines",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/mines.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "board-events",
            "title": "Board event map",
            "series": "cell",
            "valueField": "state",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "hilo",
        "name": "HiLo",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/hilo.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "card-rank-sequence",
            "title": "Card rank history",
            "series": "rank",
            "valueField": "rank",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "coinflip",
        "name": "Coin Flip",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/coinflip.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "binary-outcomes",
            "title": "Heads / tails history",
            "series": "outcome",
            "valueField": "side",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "plinko",
        "name": "Plinko",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/plinko.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "landing-distribution",
            "title": "Landing slot distribution",
            "series": "slot",
            "valueField": "index",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "wheel",
        "name": "Wheel",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/wheel.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "wheel-segments",
            "title": "Wheel segment history",
            "series": "segment",
            "valueField": "id",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "keno",
        "name": "Keno",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/keno.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "original",
        "chart": {
            "type": "drawn-numbers",
            "title": "Drawn number history",
            "series": "number",
            "valueField": "value",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "blackjack",
        "name": "Blackjack",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/blackjack.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "card",
        "chart": {
            "type": "hand-outcomes",
            "title": "Hand outcome history",
            "series": "outcome",
            "valueField": "result",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "baccarat",
        "name": "Baccarat",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/baccarat.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "card",
        "chart": {
            "type": "table-outcomes",
            "title": "Player / Banker / Tie history",
            "series": "outcome",
            "valueField": "result",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "roulette",
        "name": "Roulette",
        "provider": "Bloxio Originals",
        "image": "/assets/images/casino/roulette.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "roulette",
        "chart": {
            "type": "roulette-results",
            "title": "Roulette number history",
            "series": "number",
            "valueField": "value",
            "dataMode": "round-result",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "airboss",
        "name": "Air Boss",
        "provider": "Bloxio Arcade",
        "image": "/assets/images/casino/airboss.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "arcade",
        "chart": {
            "type": "provider-rounds",
            "title": "Provider round history",
            "series": "result",
            "valueField": "value",
            "dataMode": "provider-defined",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "birds-party",
        "name": "Birds Party",
        "provider": "Bloxio Arcade",
        "image": "/assets/images/casino/birdsparty.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "arcade",
        "chart": {
            "type": "provider-rounds",
            "title": "Provider round history",
            "series": "result",
            "valueField": "value",
            "dataMode": "provider-defined",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "tower-rush",
        "name": "Tower Rush",
        "provider": "Bloxio Arcade",
        "image": "/assets/images/casino/tower.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "arcade",
        "chart": {
            "type": "provider-rounds",
            "title": "Provider round history",
            "series": "result",
            "valueField": "value",
            "dataMode": "provider-defined",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "chicken-road",
        "name": "Chicken Road",
        "provider": "Bloxio Arcade",
        "image": "/assets/images/casino/chicken.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "arcade",
        "chart": {
            "type": "provider-rounds",
            "title": "Provider round history",
            "series": "result",
            "valueField": "value",
            "dataMode": "provider-defined",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "bananafarm",
        "name": "Banana Farm",
        "provider": "Bloxio Slots",
        "image": "/assets/images/casino/bananafarm.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "slot",
        "chart": {
            "type": "provider-slot-rounds",
            "title": "Slot round history",
            "series": "result",
            "valueField": "value",
            "dataMode": "provider-defined",
            "requiresAuthoritativeRoundData": true
        }
    },
    {
        "id": "fruitparty",
        "name": "Fruit Party",
        "provider": "Bloxio Slots",
        "image": "/assets/images/casino/fruitparty.webp",
        "currency": [
            "BX",
            "XBC",
            "STR",
            "MEME",
            "USDC",
            "XUSD"
        ],
        "status": "active",
        "category": "slot",
        "chart": {
            "type": "provider-slot-rounds",
            "title": "Slot round history",
            "series": "result",
            "valueField": "value",
            "dataMode": "provider-defined",
            "requiresAuthoritativeRoundData": true
        }
    }
];

const BLOXIO_GAME_HOME_ORDER = [
    "crash",
    "mines",
    "plinko",
    "tower-rush",
    "chicken-road",
    "dice",
    "limbo",
    "roulette",
    "wheel",
    "keno",
    "hilo",
    "blackjack",
    "baccarat",
    "coinflip",
    "airboss",
    "birds-party",
    "bananafarm",
    "fruitparty"
];

const BLOXIO_GAME_CATEGORIES = [
    {
        "id": "all",
        "name": "All Games"
    },
    {
        "id": "original",
        "name": "Originals"
    },
    {
        "id": "arcade",
        "name": "Arcade"
    },
    {
        "id": "slot",
        "name": "Slots"
    },
    {
        "id": "card",
        "name": "Cards"
    },
    {
        "id": "roulette",
        "name": "Roulette"
    }
];

// Platform currency registry. STR and MEME are enabled as selectable currency
// codes; their stake limits must be configured before wager validation succeeds.
const BLOXIO_GAME_CURRENCIES = ["BX", "XBC", "STR", "MEME", "USDC", "XUSD"];

const BLOXIO_CURRENCY_CONFIG = {
    BX:   { code: "BX",   enabled: true, min: 0.1,  max: 1000 },
    XBC:  { code: "XBC",  enabled: true, min: 10,   max: 500000 },
    STR:  { code: "STR",  enabled: true, min: null, max: null },
    MEME: { code: "MEME", enabled: true, min: null, max: null },
    USDC: { code: "USDC", enabled: true, min: null, max: null },
    XUSD: { code: "XUSD", enabled: true, min: null, max: null }
};

const BLOXIO_GAME_LIMITS = {
    BX: { min: 0.1, max: 1000 },
    XBC: { min: 10, max: 500000 }
};

/**
 * Chart profile registry.
 * Each profile declares the visualization family and expected result field.
 * It is a data adapter contract, not a claim that all provider payloads use
 * these fields. Normalize provider responses before passing records here.
 */
const BLOXIO_CHART_PROFILES = {
    "multiplier-series": {
        renderer: "line",
        xField: "roundId",
        yField: "multiplier",
        format: "multiplier",
        description: "Sequential multiplier results by round."
    },
    "numeric-distribution": {
        renderer: "histogram",
        xField: "bucket",
        yField: "count",
        format: "numeric",
        description: "Distribution of recorded numeric outcomes."
    },
    "board-events": {
        renderer: "grid",
        xField: "cellIndex",
        yField: "state",
        format: "board-state",
        description: "Recorded board-cell events. Board dimensions and rules are game-configured."
    },
    "card-rank-sequence": {
        renderer: "sequence",
        xField: "roundId",
        yField: "rank",
        format: "card-rank",
        description: "Recorded card rank sequence."
    },
    "binary-outcomes": {
        renderer: "outcome-split",
        xField: "outcome",
        yField: "count",
        format: "categorical",
        description: "Frequency of the recorded binary outcomes."
    },
    "landing-distribution": {
        renderer: "histogram",
        xField: "slot",
        yField: "count",
        format: "slot-index",
        description: "Recorded landing-slot distribution."
    },
    "wheel-segments": {
        renderer: "segment-frequency",
        xField: "segmentId",
        yField: "count",
        format: "categorical",
        description: "Frequency of recorded wheel segments."
    },
    "drawn-numbers": {
        renderer: "number-frequency",
        xField: "number",
        yField: "count",
        format: "integer",
        description: "Frequency of numbers in recorded draws."
    },
    "hand-outcomes": {
        renderer: "outcome-split",
        xField: "outcome",
        yField: "count",
        format: "categorical",
        description: "Recorded hand outcomes; game rules and settlement remain external."
    },
    "table-outcomes": {
        renderer: "outcome-split",
        xField: "outcome",
        yField: "count",
        format: "categorical",
        description: "Recorded table outcomes such as provider-reported result labels."
    },
    "roulette-results": {
        renderer: "roulette-frequency",
        xField: "number",
        yField: "count",
        format: "roulette-number",
        wheel: "provider-configured",
        description: "Frequency of recorded roulette numbers; wheel variant must be configured."
    },
    "provider-rounds": {
        renderer: "provider-result-sequence",
        xField: "roundId",
        yField: "result",
        format: "provider-defined",
        description: "Generic round sequence until the provider result schema is integrated."
    },
    "provider-slot-rounds": {
        renderer: "provider-symbol-results",
        xField: "roundId",
        yField: "result",
        format: "provider-defined",
        description: "Slot result sequence; reels, paylines, symbols and paytable are provider-defined."
    }
};

/**
 * Build a normalized round record for chart ingestion.
 * This function validates the envelope, not the game rules or outcome fairness.
 */
function createChartRecord({
    gameId,
    roundId,
    timestamp = Date.now(),
    currency = null,
    result,
    value,
    metadata = {}
}) {
    const game = getBloxioGame(gameId);
    if (!game) throw new Error(`Unknown BLOXIO game: ${gameId}`);
    if (roundId === undefined || roundId === null || String(roundId).trim() === "") {
        throw new Error("roundId is required");
    }
    if (result === undefined && value === undefined) {
        throw new Error("result or value is required");
    }
    const normalizedTimestamp = Number(timestamp);
    if (!Number.isFinite(normalizedTimestamp) || normalizedTimestamp <= 0) {
        throw new Error("timestamp must be a positive finite number");
    }
    const normalizedCurrency = currency ? String(currency).trim().toUpperCase() : null;
    if (normalizedCurrency) {
        if (!BLOXIO_CURRENCY_CONFIG[normalizedCurrency]?.enabled) {
            throw new Error(`Unsupported or disabled currency: ${normalizedCurrency}`);
        }
        if (!game.currency.includes(normalizedCurrency)) {
            throw new Error(`Currency ${normalizedCurrency} is not enabled for ${gameId}`);
        }
    }
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        throw new Error("metadata must be an object");
    }
    return Object.freeze({
        gameId,
        roundId: String(roundId),
        timestamp: normalizedTimestamp,
        currency: normalizedCurrency,
        result: result === undefined ? value : result,
        metadata: { ...metadata }
    });
}

function getBloxioGame(gameId) {
    return BLOXIO_GAME_CATALOG.find(game => game.id === gameId) || null;
}

function getBloxioGames({ category = "all", status = null, provider = null } = {}) {
    return BLOXIO_GAME_HOME_ORDER
        .map(id => getBloxioGame(id))
        .filter(Boolean)
        .filter(game => category === "all" || game.category === category)
        .filter(game => status === null || game.status === status)
        .filter(game => provider === null || game.provider === provider);
}

function getBloxioChartProfile(gameId) {
    const game = getBloxioGame(gameId);
    if (!game) return null;
    return {
        gameId: game.id,
        gameName: game.name,
        ...game.chart,
        profile: BLOXIO_CHART_PROFILES[game.chart.type] || null
    };
}

function getBloxioHomeGames() {
    return BLOXIO_GAME_HOME_ORDER.map(getBloxioGame).filter(Boolean);
}

function getBloxioCategory(categoryId) {
    return BLOXIO_GAME_CATEGORIES.find(category => category.id === categoryId) || null;
}

/**
 * Register another platform currency at runtime.
 * min/max are required so stake validation never guesses limits.
 */
function registerBloxioCurrency({ code, min, max, enabled = true, name = code } = {}) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,16}$/.test(normalizedCode)) {
        throw new Error("Currency code must be 2-16 letters/numbers/_/-");
    }
    if (BLOXIO_CURRENCY_CONFIG[normalizedCode]) {
        throw new Error(`Currency already exists: ${normalizedCode}`);
    }
    const hasLimits = min !== undefined && max !== undefined &&
        Number.isFinite(Number(min)) && Number.isFinite(Number(max)) &&
        Number(min) > 0 && Number(max) >= Number(min);

    BLOXIO_CURRENCY_CONFIG[normalizedCode] = {
        code: normalizedCode,
        name,
        enabled: Boolean(enabled),
        min: hasLimits ? Number(min) : null,
        max: hasLimits ? Number(max) : null
    };
    BLOXIO_GAME_CURRENCIES.push(normalizedCode);
    if (hasLimits) BLOXIO_GAME_LIMITS[normalizedCode] = {
        min: Number(min),
        max: Number(max)
    };
    return BLOXIO_CURRENCY_CONFIG[normalizedCode];
}

/**
 * Configure or update stake limits for an existing currency such as STR/MEME.
 */
function configureBloxioCurrencyLimits(code, min, max) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!BLOXIO_CURRENCY_CONFIG[normalizedCode]) {
        throw new Error(`Unknown currency: ${normalizedCode}`);
    }
    const minimum = Number(min);
    const maximum = Number(max);
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) ||
        minimum <= 0 || maximum < minimum) {
        throw new Error("Currency limits must be positive numbers and max must be >= min");
    }
    BLOXIO_CURRENCY_CONFIG[normalizedCode].min = minimum;
    BLOXIO_CURRENCY_CONFIG[normalizedCode].max = maximum;
    BLOXIO_GAME_LIMITS[normalizedCode] = { min: minimum, max: maximum };
    return BLOXIO_GAME_LIMITS[normalizedCode];
}

/**
 * Add a game without editing this file's internal arrays.
 * A chart profile type must already exist or be supplied in chartProfile.
 */
function registerBloxioGame(game, { addToHome = true } = {}) {
    if (!game || !game.id || !game.name || !game.category || !game.provider || !game.chart?.type) {
        throw new Error("Game requires id, name, provider, category and chart.type");
    }
    const id = String(game.id).trim().toLowerCase();
    if (getBloxioGame(id)) throw new Error(`Game already exists: ${id}`);
    if (!BLOXIO_GAME_CATEGORIES.some(item => item.id === game.category)) {
        throw new Error(`Unknown game category: ${game.category}`);
    }
    const currencies = Array.isArray(game.currency) ? game.currency : ["BX", "XBC"];
    for (const code of currencies) {
        if (!BLOXIO_CURRENCY_CONFIG[code]) {
            throw new Error(`Unsupported currency "${code}". Register it first.`);
        }
    }
    const entry = {
        ...game,
        id,
        currency: [...currencies],
        status: game.status || "active",
        chart: { ...game.chart }
    };
    BLOXIO_GAME_CATALOG.push(entry);
    if (addToHome && !BLOXIO_GAME_HOME_ORDER.includes(id)) {
        BLOXIO_GAME_HOME_ORDER.push(id);
    }
    return entry;
}

function registerBloxioCategory(category) {
    if (!category?.id || !category?.name) {
        throw new Error("Category requires id and name");
    }
    const id = String(category.id).trim().toLowerCase();
    if (BLOXIO_GAME_CATEGORIES.some(item => item.id === id)) {
        throw new Error(`Category already exists: ${id}`);
    }
    const entry = { id, name: String(category.name) };
    BLOXIO_GAME_CATEGORIES.push(entry);
    return entry;
}

function registerBloxioChartProfile(type, profile) {
    const id = String(type || "").trim();
    if (!id || !profile || typeof profile !== "object") {
        throw new Error("Chart profile type and profile object are required");
    }
    BLOXIO_CHART_PROFILES[id] = { ...profile };
    return BLOXIO_CHART_PROFILES[id];
}

function validateBloxioStake(currency, amount) {
    const config = BLOXIO_CURRENCY_CONFIG[currency];
    if (!config || !config.enabled) return { valid: false, reason: "UNSUPPORTED_CURRENCY" };
    const limits = BLOXIO_GAME_LIMITS[currency];
    if (!limits) return { valid: false, reason: "CURRENCY_LIMITS_NOT_CONFIGURED", currency };
    const value = Number(amount);
    if (!Number.isFinite(value)) return { valid: false, reason: "INVALID_AMOUNT" };
    if (value < limits.min) return { valid: false, reason: "BELOW_MINIMUM", min: limits.min };
    if (value > limits.max) return { valid: false, reason: "ABOVE_MAXIMUM", max: limits.max };
    return { valid: true, currency, amount: value };
}

/**
 * Group already-normalized records by game.
 * Does not infer, predict, or alter game results.
 */
function groupBloxioChartRecords(records = []) {
    const grouped = Object.fromEntries(BLOXIO_GAME_CATALOG.map(game => [game.id, []]));
    for (const record of records) {
        if (!record || !grouped[record.gameId]) continue;
        grouped[record.gameId].push(record);
    }
    for (const list of Object.values(grouped)) {
        list.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    }
    return grouped;
}


/**
 * ============================================================================
 * BLOXIO CHART ENGINE — data store, analytics and native Canvas renderer
 * ============================================================================
 * Rendering is dependency-free and draws directly into an HTMLCanvasElement.
 * Feed it authoritative, normalized round records from your backend.
 * It does not generate outcomes, predict wins, calculate RTP or settle bets.
 */

const BLOXIO_CHART_THEME = Object.freeze({
    background: "#051411",
    panel: "#0A261F",
    grid: "rgba(140,163,157,0.18)",
    text: "#F4F7F5",
    muted: "#8CA39D",
    gold: "#D4AF37",
    green: "#00E59A",
    red: "#FF4D4D"
});

const BLOXIO_CHART_RANGES = Object.freeze([10, 50, 100, 500, 1000]);

function getBloxioPath(object, path) {
    return String(path || "").split(".").filter(Boolean)
        .reduce((value, key) => value == null ? undefined : value[key], object);
}

function getBloxioNumericValue(record, paths) {
    for (const path of paths) {
        const value = getBloxioPath(record, path);
        if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) {
            return Number(value);
        }
    }
    return null;
}

function summarizeBloxioRecords(records = []) {
    const values = records
        .map(record => getBloxioNumericValue(record, ["result.multiplier", "result.value", "result.number", "result", "value"]))
        .filter(value => value !== null);
    if (!values.length) {
        return { count: records.length, numericCount: 0, min: null, max: null, average: null, median: null, latest: null };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return {
        count: records.length,
        numericCount: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
        latest: values[values.length - 1]
    };
}


function getBloxioOutcomeLabel(record) {
    const result = record?.result;
    if (result && typeof result === "object") {
        return result.outcome ?? result.side ?? result.result ?? result.label ?? result.value ?? "unknown";
    }
    return result ?? "unknown";
}

function analyzeBloxioGame(gameId, records = []) {
    const game = getBloxioGame(gameId);
    if (!game) throw new Error(`Unknown BLOXIO game: ${gameId}`);
    const result = records.map(record => record.result);
    const numeric = records.map(record => getBloxioNumericValue(record, [
        "result.multiplier", "result.value", "result.rank", "result.number", "result", "value"
    ])).filter(value => value !== null);
    const countLabels = values => {
        const counts = new Map();
        values.forEach(value => {
            const label = String(value ?? "unknown");
            counts.set(label, (counts.get(label) || 0) + 1);
        });
        return [...counts.entries()].map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    };

    const base = {
        gameId,
        rounds: records.length,
        numericRounds: numeric.length,
        average: numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null,
        highest: numeric.length ? Math.max(...numeric) : null,
        lowest: numeric.length ? Math.min(...numeric) : null
    };

    switch (gameId) {
        case "crash":
        case "limbo": {
            const multipliers = records.map(record =>
                getBloxioNumericValue(record, ["result.multiplier", "result.value", "result", "value"])
            ).filter(value => value !== null);
            return {
                ...base,
                metric: "multiplier",
                latestMultiplier: multipliers.length ? multipliers[multipliers.length - 1] : null,
                medianMultiplier: summarizeBloxioRecords(records).median
            };
        }
        case "dice":
            return { ...base, metric: "roll-value", distribution: countLabels(numeric) };
        case "mines": {
            const states = [];
            let eventCount = 0;
            records.forEach(record => {
                const events = Array.isArray(record.result?.events) ? record.result.events :
                    Array.isArray(record.result?.cells) ? record.result.cells : [];
                events.forEach(event => {
                    eventCount += 1;
                    states.push(event.state ?? event.result ?? "unknown");
                });
            });
            return { ...base, metric: "cell-events", cellEvents: eventCount, stateCounts: countLabels(states) };
        }
        case "hilo":
            return { ...base, metric: "card-rank", rankDistribution: countLabels(numeric) };
        case "coinflip": {
            const outcomes = records.map(getBloxioOutcomeLabel);
            let longestStreak = 0, currentStreak = 0, previous = null;
            outcomes.forEach(outcome => {
                if (outcome === previous) currentStreak += 1;
                else currentStreak = 1;
                longestStreak = Math.max(longestStreak, currentStreak);
                previous = outcome;
            });
            return {
                ...base, metric: "binary-outcome",
                outcomeCounts: countLabels(outcomes),
                currentStreak: previous === null ? 0 : currentStreak,
                currentStreakOutcome: previous,
                longestStreak
            };
        }
        case "plinko":
            return { ...base, metric: "landing-slot", slotCounts: countLabels(records.map(record =>
                record.result?.slot ?? record.result?.index ?? record.result
            )) };
        case "wheel":
            return { ...base, metric: "wheel-segment", segmentCounts: countLabels(records.map(record =>
                record.result?.segmentId ?? record.result?.id ?? record.result?.segment
            )) };
        case "keno":
            return { ...base, metric: "drawn-number", numberCounts: countLabels(records.flatMap(record =>
                Array.isArray(record.result?.numbers) ? record.result.numbers :
                [record.result?.number ?? record.result?.value ?? record.result]
            )) };
        case "roulette":
            return { ...base, metric: "roulette-number", numberCounts: countLabels(records.map(record =>
                record.result?.number ?? record.result?.value ?? record.result
            )) };
        case "blackjack":
        case "baccarat":
            return { ...base, metric: "table-outcome", outcomeCounts: countLabels(records.map(getBloxioOutcomeLabel)) };
        default:
            return {
                ...base,
                metric: "provider-result",
                outcomeCounts: countLabels(records.map(getBloxioOutcomeLabel))
            };
    }
}

function buildBloxioChartDataset(gameId, records = [], options = {}) {
    const game = getBloxioGame(gameId);
    if (!game) throw new Error(`Unknown BLOXIO game: ${gameId}`);
    const limit = Math.max(1, Number(options.limit) || 100);
    const selected = records
        .filter(record => record.gameId === gameId)
        .filter(record => !options.currency || record.currency === String(options.currency).toUpperCase())
        .filter(record => options.from == null || Number(record.timestamp) >= Number(options.from))
        .filter(record => options.to == null || Number(record.timestamp) <= Number(options.to))
        .slice()
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
        .slice(-limit);
    const type = game.chart.type;
    const profile = BLOXIO_CHART_PROFILES[type] || {};
    const resultOf = record => record.result;

    if (["multiplier-series", "card-rank-sequence", "provider-rounds", "provider-slot-rounds"].includes(type)) {
        const points = selected.map((record, index) => {
            const result = resultOf(record);
            const value = getBloxioNumericValue(record, [
                game.chart.valueField,
                "result.multiplier", "result.value", "result.rank", "result",
                profile.yField, "value"
            ]);
            return value === null ? null : {
                x: index + 1,
                y: value,
                roundId: record.roundId,
                timestamp: record.timestamp,
                label: String(record.roundId)
            };
        }).filter(Boolean);
        return {
            gameId, type, title: game.chart.title, points, records: selected,
            stats: summarizeBloxioRecords(selected),
            insights: analyzeBloxioGame(gameId, selected),
            currency: options.currency || null
        };
    }

    const countBy = (items, keyFn) => {
        const counts = new Map();
        for (const item of items) {
            const key = keyFn(item);
            if (key === undefined || key === null || key === "") continue;
            const label = String(key);
            counts.set(label, (counts.get(label) || 0) + 1);
        }
        return [...counts.entries()].map(([label, count]) => ({ label, count }));
    };

    let categories = [];
    if (type === "binary-outcomes" || type === "hand-outcomes" || type === "table-outcomes") {
        categories = countBy(selected, record => {
            const result = resultOf(record);
            return result?.outcome ?? result?.result ?? result?.side ?? result;
        });
    } else if (type === "numeric-distribution") {
        const values = selected.map(record => getBloxioNumericValue(record, ["result.value", "result", "value"])).filter(v => v !== null);
        const bucketCount = Math.max(4, Math.min(20, Number(options.buckets) || 10));
        if (values.length) {
            const min = Math.min(...values), max = Math.max(...values);
            const width = max === min ? 1 : (max - min) / bucketCount;
            const bins = Array.from({ length: bucketCount }, (_, index) => ({
                label: (min + index * width).toFixed(2),
                count: 0
            }));
            values.forEach(value => {
                const index = Math.min(bucketCount - 1, Math.floor((value - min) / width));
                bins[index].count += 1;
            });
            categories = bins;
        }
    } else if (type === "landing-distribution") {
        categories = countBy(selected, record => record.result?.slot ?? record.result?.index ?? record.result);
    } else if (type === "wheel-segments") {
        categories = countBy(selected, record => record.result?.segmentId ?? record.result?.id ?? record.result?.segment);
    } else if (type === "drawn-numbers" || type === "roulette-results") {
        categories = countBy(selected, record => record.result?.number ?? record.result?.value ?? record.result);
        categories.sort((a, b) => Number(a.label) - Number(b.label));
    } else if (type === "board-events") {
        const cellCounts = new Map();
        selected.forEach(record => {
            const events = Array.isArray(record.result?.events) ? record.result.events :
                Array.isArray(record.result?.cells) ? record.result.cells : [];
            events.forEach(event => {
                const index = event.cellIndex ?? event.index;
                if (index === undefined) return;
                const state = String(event.state ?? event.result ?? "unknown");
                const key = String(index);
                const item = cellCounts.get(key) || { label: key, count: 0, states: {} };
                item.count += 1;
                item.states[state] = (item.states[state] || 0) + 1;
                cellCounts.set(key, item);
            });
        });
        categories = [...cellCounts.values()].sort((a, b) => Number(a.label) - Number(b.label));
    }
    const dataset = {
        gameId, type, title: game.chart.title, categories, records: selected,
        stats: summarizeBloxioRecords(selected),
        insights: analyzeBloxioGame(gameId, selected),
        currency: options.currency || null
    };
    if (type === "board-events") {
        dataset.cells = categories.map(item => ({
            cellIndex: Number(item.label),
            totalEvents: item.count,
            states: { ...item.states }
        }));
    }
    return dataset;
}

class BloxioChartStore {
    constructor({ maxRecords = 10000 } = {}) {
        this.maxRecords = Math.max(100, Number(maxRecords) || 10000);
        this.records = [];
        this.listeners = new Set();
        this.roundIds = new Set();
        this.metrics = { accepted: 0, duplicates: 0, rejected: 0, evicted: 0 };
    }

    _notify(record) {
        this.listeners.forEach(listener => {
            try { listener(record, this); } catch (error) {
                // A consumer callback must not interrupt ingestion or other listeners.
                if (typeof console !== "undefined" && console.error) {
                    console.error("[BloxioChartStore] subscriber error", error);
                }
            }
        });
    }

    ingest(input) {
        let record;
        try {
            record = createChartRecord(input || {});
        } catch (error) {
            this.metrics.rejected += 1;
            throw error;
        }
        const uniqueKey = `${record.gameId}:${record.roundId}`;
        if (this.roundIds.has(uniqueKey)) {
            this.metrics.duplicates += 1;
            return { accepted: false, reason: "DUPLICATE_ROUND" };
        }
        this.records.push(record);
        this.roundIds.add(uniqueKey);
        this.metrics.accepted += 1;

        while (this.records.length > this.maxRecords) {
            const removed = this.records.shift();
            this.roundIds.delete(`${removed.gameId}:${removed.roundId}`);
            this.metrics.evicted += 1;
        }
        this._notify(record);
        return { accepted: true, record };
    }

    ingestMany(records = []) {
        if (!Array.isArray(records)) throw new Error("ingestMany expects an array");
        return records.map(record => this.ingest(record));
    }

    query({
        gameId = null, currency = null, from = null, to = null,
        limit = 500, offset = 0, order = "asc", after = null, before = null
    } = {}) {
        const normalizedCurrency = currency ? String(currency).toUpperCase() : null;
        const direction = order === "desc" ? "desc" : "asc";
        let result = this.records.filter(record => {
            if (gameId && record.gameId !== gameId) return false;
            if (normalizedCurrency && record.currency !== normalizedCurrency) return false;
            if (from !== null && record.timestamp < Number(from)) return false;
            if (to !== null && record.timestamp > Number(to)) return false;
            if (after !== null && record.timestamp <= Number(after)) return false;
            if (before !== null && record.timestamp >= Number(before)) return false;
            return true;
        }).sort((a, b) => {
            const delta = a.timestamp - b.timestamp || a.roundId.localeCompare(b.roundId);
            return direction === "desc" ? -delta : delta;
        });
        const safeOffset = Math.max(0, Number(offset) || 0);
        const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
        return result.slice(safeOffset, safeOffset + safeLimit);
    }

    queryPage({ limit = 100, cursor = null, ...filters } = {}) {
        const all = this.query({ ...filters, limit: 5000, order: "asc" });
        let startIndex = 0;
        if (cursor) {
            startIndex = all.findIndex(record =>
                record.timestamp > Number(cursor.timestamp) ||
                (record.timestamp === Number(cursor.timestamp) &&
                 record.roundId.localeCompare(String(cursor.roundId)) > 0)
            );
            if (startIndex < 0) startIndex = all.length;
        }
        const safeStart = Math.max(0, startIndex);
        const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
        const items = all.slice(safeStart, safeStart + safeLimit);
        const hasMore = safeStart + safeLimit < all.length;
        const last = items[items.length - 1];
        return {
            items,
            hasMore,
            nextCursor: hasMore && last
                ? { timestamp: last.timestamp, roundId: last.roundId }
                : null
        };
    }

    subscribe(listener) {
        if (typeof listener !== "function") throw new Error("Listener must be a function");
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    exportSnapshot({ gameId = null } = {}) {
        const records = gameId ? this.records.filter(record => record.gameId === gameId) : this.records;
        return {
            schemaVersion: 1,
            exportedAt: Date.now(),
            records: records.map(record => ({
                ...record,
                result: record.result,
                metadata: { ...record.metadata }
            }))
        };
    }

    importSnapshot(snapshot, { replace = false } = {}) {
        if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.records)) {
            throw new Error("Invalid Bloxio chart snapshot");
        }
        if (replace) {
            this.records = [];
            this.roundIds.clear();
        }
        const results = this.ingestMany(snapshot.records);
        return {
            imported: results.filter(item => item.accepted).length,
            duplicates: results.filter(item => item.reason === "DUPLICATE_ROUND").length,
            total: this.records.length
        };
    }

    clear({ gameId = null } = {}) {
        if (!gameId) {
            this.records = [];
            this.roundIds.clear();
        } else {
            this.records = this.records.filter(record => record.gameId !== gameId);
            this.roundIds = new Set(this.records.map(record => `${record.gameId}:${record.roundId}`));
        }
        this._notify(null);
    }

    get size() { return this.records.length; }
    get stats() { return { ...this.metrics, stored: this.records.length, maxRecords: this.maxRecords }; }
}

function exportBloxioChartCSV(records = []) {
    if (!Array.isArray(records)) throw new Error("CSV export expects an array of records");
    const columns = ["gameId", "roundId", "timestamp", "currency", "result", "metadata"];
    const escapeCell = value => {
        const text = value == null ? "" :
            (typeof value === "object" ? JSON.stringify(value) : String(value));
        return `"${text.replace(/"/g, '""')}"`;
    };
    return [
        columns.join(","),
        ...records.map(record => columns.map(column => escapeCell(record[column])).join(","))
    ].join("\r\n");
}

/**
 * Responsive chart presets for phones, tablets and desktop screens.
 * Width is measured from the chart container; users can override any value
 * through renderChart(..., { responsive:false, width, height, ... }).
 */
function getBloxioResponsiveChartLayout(width, options = {}) {
    const safeWidth = Math.max(240, Number(width) || 640);
    const device = safeWidth < 520 ? "mobile" : safeWidth < 900 ? "tablet" : "desktop";
    const presets = {
        mobile: {
            height: 238,
            padding: { top: 32, right: 10, bottom: 34, left: 38 },
            titleFont: 11,
            labelFont: 9,
            pointRadius: 2,
            barGap: 5,
            maxBars: 10,
            minPlotHeight: 90,
            touchTarget: 44,
            compactLabels: true,
            legendPosition: "bottom",
            tooltipMode: "tap",
            horizontalScroll: false
        },
        tablet: {
            height: 280,
            padding: { top: 34, right: 14, bottom: 38, left: 44 },
            titleFont: 12,
            labelFont: 10,
            pointRadius: 2.5,
            barGap: 7,
            maxBars: 18,
            minPlotHeight: 110,
            touchTarget: 44,
            compactLabels: false,
            legendPosition: "bottom",
            tooltipMode: "tap-or-hover",
            horizontalScroll: false
        },
        desktop: {
            height: 320,
            padding: { top: 36, right: 18, bottom: 42, left: 50 },
            titleFont: 13,
            labelFont: 10,
            pointRadius: 3,
            barGap: 9,
            maxBars: 40,
            minPlotHeight: 130,
            touchTarget: 36,
            compactLabels: false,
            legendPosition: "right",
            tooltipMode: "hover",
            horizontalScroll: false
        }
    };
    const preset = presets[device];
    return {
        device,
        height: Number(options.height) || preset.height,
        padding: options.padding || preset.padding,
        titleFont: Number(options.titleFont) || preset.titleFont,
        labelFont: Number(options.labelFont) || preset.labelFont,
        pointRadius: Number(options.pointRadius) || preset.pointRadius,
        barGap: Number(options.barGap) || preset.barGap,
        maxBars: Number(options.maxBars) || preset.maxBars,
        minPlotHeight: preset.minPlotHeight,
        touchTarget: Number(options.touchTarget) || preset.touchTarget,
        compactLabels: options.compactLabels ?? preset.compactLabels,
        legendPosition: options.legendPosition || preset.legendPosition,
        tooltipMode: options.tooltipMode || preset.tooltipMode,
        horizontalScroll: options.horizontalScroll ?? preset.horizontalScroll,
        safeAreaPadding: safeWidth < 520 ? 8 : 0,
        device
    };
}

function renderBloxioChart(canvas, dataset, options = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
        throw new Error("renderBloxioChart requires an HTMLCanvasElement");
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable");

    const theme = { ...BLOXIO_CHART_THEME, ...(options.theme || {}) };
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const width = Math.max(240, Number(options.width) || rect?.width || canvas.width || 640);
    const responsive = options.responsive !== false;
    const layout = getBloxioResponsiveChartLayout(width, options);
    const measuredHeight = Number(options.height) || (rect?.height > 160 ? rect.height : 0) ||
        (responsive ? layout.height : (canvas.height || 320));
    const height = Math.max(180, measuredHeight);
    const dpr = Math.max(1, Math.min(3, Number(options.devicePixelRatio) || (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    const padding = layout.padding;
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const points = dataset?.points || [];
    const categories = dataset?.categories || [];
    const title = options.title || dataset?.title || "Game chart";

    ctx.fillStyle = theme.text;
    ctx.font = `600 ${layout.titleFont}px system-ui, sans-serif`;
    ctx.fillText(String(title), padding.left > 42 ? 16 : 10, 21);

    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + plotH * i / 4;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
    }
    ctx.fillStyle = theme.muted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(`${dataset?.records?.length || 0} rounds`, width - padding.right - 64, 21);

    const drawEmpty = message => {
        ctx.fillStyle = theme.muted;
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(message, width / 2, padding.top + plotH / 2);
        ctx.textAlign = "left";
    };

    if (points.length) {
        const ys = points.map(point => Number(point.y)).filter(Number.isFinite);
        if (!ys.length) drawEmpty("No numeric chart values in this range");
        else {
            let min = Math.min(...ys), max = Math.max(...ys);
            if (min === max) { min -= 1; max += 1; }
            const xAt = index => padding.left + (points.length === 1 ? plotW / 2 : index * plotW / (points.length - 1));
            const yAt = value => padding.top + plotH - ((value - min) / (max - min)) * plotH;
            ctx.strokeStyle = theme.green;
            ctx.lineWidth = 2;
            ctx.beginPath();
            points.forEach((point, index) => {
                const x = xAt(index), y = yAt(Number(point.y));
                if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            points.forEach((point, index) => {
                ctx.beginPath();
                ctx.fillStyle = theme.gold;
                ctx.arc(xAt(index), yAt(Number(point.y)), layout.pointRadius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = theme.muted;
            ctx.font = `${layout.labelFont}px system-ui, sans-serif`;
            ctx.fillText(max.toFixed(2), 7, padding.top + 4);
            ctx.fillText(min.toFixed(2), 7, padding.top + plotH);
        }
    } else if (dataset?.cells?.length) {
        const cells = dataset.cells;
        const columns = Math.max(1, Number(options.columns) || Math.ceil(Math.sqrt(cells.length)));
        const rows = Math.ceil(cells.length / columns);
        const gap = 5;
        const tileW = Math.max(8, (plotW - gap * (columns - 1)) / columns);
        const tileH = Math.max(8, (plotH - gap * (rows - 1)) / rows);
        const maxEvents = Math.max(1, ...cells.map(cell => cell.totalEvents));
        cells.forEach((cell, index) => {
            const col = index % columns, row = Math.floor(index / columns);
            const x = padding.left + col * (tileW + gap);
            const y = padding.top + row * (tileH + gap);
            const states = cell.states || {};
            const mineCount = Object.entries(states).filter(([state]) => /mine|bomb|hit|loss/i.test(state))
                .reduce((sum, [, count]) => sum + Number(count), 0);
            const safeCount = Object.entries(states).filter(([state]) => /safe|diamond|gem|cashout/i.test(state))
                .reduce((sum, [, count]) => sum + Number(count), 0);
            const intensity = Math.min(1, cell.totalEvents / maxEvents);
            ctx.fillStyle = mineCount > safeCount
                ? `rgba(255,77,77,${0.18 + intensity * 0.72})`
                : `rgba(0,229,154,${0.14 + intensity * 0.66})`;
            ctx.fillRect(x, y, tileW, tileH);
            ctx.strokeStyle = theme.grid;
            ctx.strokeRect(x, y, tileW, tileH);
            ctx.fillStyle = theme.text;
            ctx.font = "10px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(cell.cellIndex), x + tileW / 2, y + tileH / 2 + 3);
        });
        ctx.textAlign = "left";
    } else if (categories.length) {
        const visible = categories.slice(0, Math.min(layout.maxBars, Math.max(1, Math.floor(plotW / (layout.barGap + 22)))));
        const max = Math.max(1, ...visible.map(item => Number(item.count) || 0));
        const slotW = plotW / visible.length;
        const barW = Math.max(3, slotW * 0.62);
        visible.forEach((item, index) => {
            const value = Number(item.count) || 0;
            const barH = (value / max) * (plotH - 8);
            const x = padding.left + index * slotW + (slotW - barW) / 2;
            const y = padding.top + plotH - barH;
            ctx.fillStyle = theme.green;
            ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = theme.muted;
            ctx.font = "9px system-ui, sans-serif";
            ctx.textAlign = "center";
            const label = String(item.label);
            ctx.fillText(label.length > 7 ? `${label.slice(0, 6)}…` : label, x + barW / 2, height - 17);
        });
        ctx.textAlign = "left";
    } else {
        drawEmpty("Waiting for verified round data");
    }

    return { width, height, rendered: points.length + categories.length, stats: dataset?.stats || null };
}


/**
 * WebSocket protocol expected by the Bloxio chart stream:
 * Client -> { type:"subscribe", games:["crash"], currencies:["BX"] }
 * Client -> { type:"auth", token:"..." }                 (optional)
 * Client -> { type:"ping", at:1710000000000 }            (optional heartbeat)
 * Server -> { type:"round", data:{gameId,roundId,timestamp,currency,result} }
 * Server -> { type:"rounds", data:[ ...round records... ] }
 * Server -> { type:"pong" }                              (optional heartbeat)
 * Server -> { type:"error", message:"..." }
 *
 * Send only server-verified round results. Browser WebSocket cannot set custom
 * HTTP headers; use a first-message auth frame or secure same-site cookies.
 */

/**
 * Attach the server-side WebSocket endpoint to an existing Node HTTP server.
 *
 * The caller supplies `WebSocketServer` from the `ws` package, keeping this
 * browser-compatible module free from a hard dependency on Node-only packages.
 *
 * SECURITY:
 * - Authentication is required by default.
 * - Clients may subscribe and ping, but may NEVER publish round results.
 * - Only trusted server code calls publishRound().
 * - authorizeSubscription can enforce per-user game/currency permissions.
 *
 * Example:
 *   import { WebSocketServer } from "ws";
 *   import { attachBloxioChartWebSocket } from "./chart.games.js";
 *   const chartHub = attachBloxioChartWebSocket({
 *     server: httpServer, WebSocketServer,
 *     authenticate: async token => verifySessionToken(token),
 *   });
 */
function attachBloxioChartWebSocket({
    server,
    WebSocketServer,
    path = "/ws/charts",
    authenticate,
    authorizeSubscription = async () => true,
    verifyRound = async () => true,
    loadHistory = async () => [],
    maxHistory = 500,
    requireAuth = true,
    maxPayload = 64 * 1024,
    authTimeoutMs = 8000,
    heartbeatIntervalMs = 30000,
    logger = console
} = {}) {
    if (!server || typeof server.on !== "function") {
        throw new Error("A Node HTTP server is required");
    }
    if (typeof WebSocketServer !== "function") {
        throw new Error('Pass WebSocketServer from the "ws" package');
    }
    if (requireAuth && typeof authenticate !== "function") {
        throw new Error("authenticate(token, request) is required when requireAuth is enabled");
    }

    const wss = new WebSocketServer({ noServer: true, maxPayload });
    const clients = new Map();
    let closed = false;

    const send = (socket, payload) => {
        if (socket.readyState === 1) socket.send(JSON.stringify(payload));
    };

    const reject = (socket, code, message) => {
        send(socket, { type: "error", code, message });
        try { socket.close(1008, message.slice(0, 120)); } catch {}
    };

    const onUpgrade = (request, socket, head) => {
        let pathname;
        try {
            pathname = new URL(request.url || "/", "http://localhost").pathname;
        } catch {
            socket.destroy();
            return;
        }
        if (pathname !== path) return; // Allow other Express/WebSocket routes to handle this upgrade.
        wss.handleUpgrade(request, socket, head, ws => {
            wss.emit("connection", ws, request);
        });
    };

    wss.on("connection", (socket, request) => {
        const client = {
            user: null,
            authenticated: !requireAuth,
            subscriptions: { games: new Set(), currencies: new Set() },
            alive: true,
            request
        };
        clients.set(socket, client);

        if (client.authenticated) {
            send(socket, { type: "ready", authenticated: false });
        } else {
            send(socket, { type: "auth_required" });
        }

        const authTimer = requireAuth && authTimeoutMs > 0
            ? setTimeout(() => {
                if (!client.authenticated) reject(socket, "AUTH_TIMEOUT", "Authentication timeout");
            }, authTimeoutMs)
            : null;

        socket.on("pong", () => { client.alive = true; });

        socket.on("message", async raw => {
            let message;
            try {
                message = JSON.parse(raw.toString());
            } catch {
                reject(socket, "INVALID_JSON", "Message must be valid JSON");
                return;
            }
            if (!message || typeof message !== "object" || Array.isArray(message)) {
                reject(socket, "INVALID_MESSAGE", "Message must be a JSON object");
                return;
            }

            try {
                if (message.type === "auth") {
                    if (!requireAuth) {
                        client.authenticated = true;
                        send(socket, { type: "authenticated" });
                        return;
                    }
                    if (client.authenticated) {
                        reject(socket, "ALREADY_AUTHENTICATED", "Connection is already authenticated");
                        return;
                    }
                    if (typeof message.token !== "string" || !message.token.trim()) {
                        reject(socket, "INVALID_TOKEN", "A valid authentication token is required");
                        return;
                    }
                    const user = await authenticate(message.token, request);
                    if (!user) {
                        reject(socket, "UNAUTHORIZED", "Authentication failed");
                        return;
                    }
                    client.user = user;
                    client.authenticated = true;
                    if (authTimer) clearTimeout(authTimer);
                    send(socket, { type: "authenticated", userId: user.id ?? null });
                    return;
                }

                if (message.type === "ping") {
                    send(socket, { type: "pong", at: Date.now() });
                    return;
                }

                if (!client.authenticated) {
                    reject(socket, "AUTH_REQUIRED", "Authenticate before subscribing");
                    return;
                }

                if (message.type === "subscribe") {
                    const games = Array.isArray(message.games) ? message.games : [];
                    const currencies = Array.isArray(message.currencies)
                        ? message.currencies.map(code => String(code).toUpperCase())
                        : [];

                    if (games.length > 50 || currencies.length > 20) {
                        reject(socket, "SUBSCRIPTION_LIMIT", "Too many subscription filters");
                        return;
                    }
                    for (const gameId of games) {
                        if (!getBloxioGame(gameId)) {
                            reject(socket, "UNKNOWN_GAME", `Unknown game: ${gameId}`);
                            return;
                        }
                    }
                    for (const currency of currencies) {
                        if (!BLOXIO_CURRENCY_CONFIG[currency] || !BLOXIO_CURRENCY_CONFIG[currency].enabled) {
                            reject(socket, "UNKNOWN_CURRENCY", `Unsupported currency: ${currency}`);
                            return;
                        }
                    }

                    const allowed = await authorizeSubscription({
                        user: client.user,
                        games: [...games],
                        currencies,
                        request
                    });
                    if (!allowed) {
                        reject(socket, "SUBSCRIPTION_FORBIDDEN", "Subscription is not permitted");
                        return;
                    }

                    client.subscriptions = {
                        games: new Set(games),
                        currencies: new Set(currencies)
                    };
                    send(socket, {
                        type: "subscribed",
                        data: { games: [...client.subscriptions.games], currencies: [...client.subscriptions.currencies] }
                    });
                    const history = await loadHistory({
                        user: client.user,
                        games: [...client.subscriptions.games],
                        currencies: [...client.subscriptions.currencies],
                        limit: Math.max(1, Math.min(2000, Number(maxHistory) || 500)),
                        request
                    });
                    if (Array.isArray(history) && history.length) {
                        send(socket, {
                            type: "rounds",
                            data: history.slice(-Math.max(1, Math.min(2000, Number(maxHistory) || 500)))
                        });
                    }
                    return;
                }

                if (message.type === "round" || message.type === "rounds" ||
                    message.type === "round.result" || message.type === "history") {
                    reject(socket, "CLIENT_PUBLISH_FORBIDDEN", "Clients cannot publish chart results");
                    return;
                }

                reject(socket, "UNKNOWN_MESSAGE", "Unsupported chart stream message");
            } catch (error) {
                try { logger?.error?.("[BloxioChartWS]", error); } catch {}
                reject(socket, "SERVER_ERROR", "Chart stream request failed");
            }
        });

        socket.on("close", () => {
            if (authTimer) clearTimeout(authTimer);
            clients.delete(socket);
        });

        socket.on("error", error => {
            try { logger?.warn?.("[BloxioChartWS] socket error", error); } catch {}
        });
    });

    server.on("upgrade", onUpgrade);

    const heartbeat = heartbeatIntervalMs > 0 ? setInterval(() => {
        for (const [socket, client] of clients) {
            if (socket.readyState !== 1) {
                clients.delete(socket);
                continue;
            }
            if (!client.alive) {
                clients.delete(socket);
                try { socket.terminate(); } catch {}
                continue;
            }
            client.alive = false;
            try { socket.ping(); } catch {}
        }
    }, heartbeatIntervalMs) : null;
    if (heartbeat && typeof heartbeat.unref === "function") heartbeat.unref();

    const publishRound = async rawRecord => {
        if (closed) throw new Error("Bloxio chart WebSocket hub is closed");
        const record = createChartRecord(rawRecord || {});
        const game = getBloxioGame(record.gameId);
        if (record.currency && !game.currency.includes(record.currency)) {
            throw new Error(`Currency ${record.currency} is not enabled for ${record.gameId}`);
        }
        if (record.currency && !BLOXIO_CURRENCY_CONFIG[record.currency]?.enabled) {
            throw new Error(`Currency ${record.currency} is disabled`);
        }
        const verified = await verifyRound(record);
        if (verified !== true) throw new Error("Round failed server verification");

        const payload = JSON.stringify({ type: "round", data: record });
        let delivered = 0;
        for (const [socket, client] of clients) {
            if (!client.authenticated || socket.readyState !== 1) continue;
            if (client.subscriptions.games.size && !client.subscriptions.games.has(record.gameId)) continue;
            if (client.subscriptions.currencies.size &&
                (!record.currency || !client.subscriptions.currencies.has(record.currency))) continue;
            socket.send(payload);
            delivered += 1;
        }
        return { record, delivered };
    };

    const publishRounds = async records => {
        if (!Array.isArray(records)) throw new Error("publishRounds expects an array");
        const results = [];
        for (const record of records) results.push(await publishRound(record));
        return results;
    };

    const close = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        server.off?.("upgrade", onUpgrade);
        for (const socket of clients.keys()) {
            try { socket.close(1001, "Chart server shutting down"); } catch {}
        }
        clients.clear();
        await new Promise(resolve => {
            try { wss.close(() => resolve()); } catch { resolve(); }
        });
    };

    return Object.freeze({
        wss,
        publishRound,
        publishRounds,
        get clientCount() { return clients.size; },
        close
    });
}


class BloxioChartStream {
    constructor({
        url,
        engine,
        WebSocketImpl = typeof WebSocket !== "undefined" ? WebSocket : null,
        token = null,
        games = [],
        currencies = [],
        reconnect = true,
        reconnectBaseMs = 500,
        reconnectMaxMs = 15000,
        heartbeatMs = 25000,
        maxQueue = 250,
        onStatus = () => {},
        onError = () => {},
        onRecord = () => {}
    } = {}) {
        if (!url) throw new Error("WebSocket URL is required");
        if (!engine || typeof engine.ingest !== "function") throw new Error("A chart engine is required");
        if (!WebSocketImpl) throw new Error("WebSocket is unavailable; provide WebSocketImpl");
        this.url = url;
        this.engine = engine;
        this.WebSocketImpl = WebSocketImpl;
        this.token = token;
        this.games = [...new Set(games)];
        this.currencies = [...new Set(currencies.map(code => String(code).toUpperCase()))];
        this.shouldReconnect = Boolean(reconnect);
        this.reconnectBaseMs = Math.max(100, Number(reconnectBaseMs) || 500);
        this.reconnectMaxMs = Math.max(this.reconnectBaseMs, Number(reconnectMaxMs) || 15000);
        this.heartbeatMs = Math.max(0, Number(heartbeatMs) || 0);
        this.maxQueue = Math.max(1, Number(maxQueue) || 250);
        this.onStatus = onStatus;
        this.onError = onError;
        this.onRecord = onRecord;
        this.socket = null;
        this.state = "idle";
        this.attempt = 0;
        this.queue = [];
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.manualClose = false;
        this.connectPromise = null;
    }

    _status(state, detail = {}) {
        this.state = state;
        try { this.onStatus({ state, attempt: this.attempt, ...detail }); } catch {}
    }

    _send(payload) {
        if (!this.socket || this.socket.readyState !== 1) {
            if (this.queue.length >= this.maxQueue) this.queue.shift();
            this.queue.push(payload);
            return false;
        }
        this.socket.send(JSON.stringify(payload));
        return true;
    }

    _flushQueue() {
        while (this.queue.length && this.socket?.readyState === 1) {
            this.socket.send(JSON.stringify(this.queue.shift()));
        }
    }

    _sendSubscription() {
        this._send({
            type: "subscribe",
            games: this.games,
            currencies: this.currencies
        });
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        if (!this.heartbeatMs) return;
        this.heartbeatTimer = setInterval(() => {
            if (this.socket?.readyState === 1) {
                this._send({ type: "ping", at: Date.now() });
            }
        }, this.heartbeatMs);
    }

    _stopHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
    }

    _scheduleReconnect() {
        if (!this.shouldReconnect || this.manualClose || this.reconnectTimer) return;
        const exponential = Math.min(this.reconnectMaxMs, this.reconnectBaseMs * (2 ** Math.min(this.attempt, 8)));
        const delay = Math.round(exponential * (0.8 + Math.random() * 0.4));
        this._status("reconnecting", { delay });
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(error => this._reportError(error));
        }, delay);
    }

    _reportError(error) {
        try { this.onError(error instanceof Error ? error : new Error(String(error))); } catch {}
    }

    _handleRecord(raw) {
        try {
            const record = createChartRecord({
                gameId: raw.gameId,
                roundId: raw.roundId,
                timestamp: raw.timestamp ?? Date.now(),
                currency: raw.currency ?? null,
                result: raw.result,
                value: raw.value,
                metadata: raw.metadata || {}
            });
            const outcome = this.engine.ingest(record);
            if (outcome.accepted) {
                try { this.onRecord(record, outcome); } catch {}
            }
            return outcome;
        } catch (error) {
            this._reportError(error);
            return { accepted: false, reason: "INVALID_RECORD", error };
        }
    }

    _handleMessage(event) {
        let message;
        try {
            const payload = event?.data ?? event;
            message = typeof payload === "string" ? JSON.parse(payload) : payload;
        } catch (error) {
            this._reportError(new Error(`Invalid WebSocket JSON: ${error.message}`));
            return;
        }
        if (!message || typeof message !== "object") return;

        switch (message.type) {
            case "round":
            case "round.result":
                this._handleRecord(message.data || message.record || message);
                break;
            case "rounds":
            case "history": {
                const records = message.data || message.records || [];
                if (!Array.isArray(records)) {
                    this._reportError(new Error("WebSocket rounds payload must be an array"));
                    break;
                }
                records.forEach(record => this._handleRecord(record));
                break;
            }
            case "pong":
                break;
            case "subscribed":
                this._status("connected", { subscription: message.data || null });
                break;
            case "error":
                this._reportError(new Error(message.message || "Chart stream server error"));
                break;
            default:
                // Unknown message types are ignored for forward compatibility.
                break;
        }
    }

    connect() {
        if (this.socket?.readyState === 1) return Promise.resolve(this);
        if (this.connectPromise) return this.connectPromise;
        this.manualClose = false;
        this._status("connecting");
        this.connectPromise = new Promise((resolve, reject) => {
            let settled = false;
            let socket;
            try {
                socket = new this.WebSocketImpl(this.url);
                this.socket = socket;
            } catch (error) {
                this.connectPromise = null;
                this._reportError(error);
                this._scheduleReconnect();
                reject(error);
                return;
            }

            socket.onopen = () => {
                this.attempt = 0;
                if (this.token) this._send({ type: "auth", token: this.token });
                this._sendSubscription();
                this._flushQueue();
                this._startHeartbeat();
                this._status("connected");
                if (!settled) { settled = true; resolve(this); }
                this.connectPromise = null;
            };
            socket.onmessage = event => this._handleMessage(event);
            socket.onerror = event => {
                const error = new Error("Bloxio chart WebSocket connection error");
                this._reportError(error);
                if (!settled) { settled = true; reject(error); }
            };
            socket.onclose = event => {
                this._stopHeartbeat();
                if (this.socket === socket) this.socket = null;
                this.attempt += 1;
                this.connectPromise = null;
                this._status("disconnected", { code: event?.code, reason: event?.reason || "" });
                if (!settled) {
                    settled = true;
                    reject(new Error("Bloxio chart WebSocket closed before connecting"));
                }
                this._scheduleReconnect();
            };
        });
        return this.connectPromise;
    }

    subscribe({ games = this.games, currencies = this.currencies } = {}) {
        this.games = [...new Set(games)];
        this.currencies = [...new Set(currencies.map(code => String(code).toUpperCase()))];
        this._sendSubscription();
        return this;
    }

    close({ reconnect = false } = {}) {
        this.manualClose = !reconnect;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this._stopHeartbeat();
        if (this.socket) {
            const socket = this.socket;
            this.socket = null;
            socket.onclose = null;
            socket.close(1000, "Client closed chart stream");
        }
        this._status("closed");
        if (reconnect) {
            this.manualClose = false;
            this._scheduleReconnect();
        }
        return this;
    }
}

function createBloxioChartStream(options) {
    return new BloxioChartStream(options);
}


function createBloxioChartEngine(options = {}) {
    const store = new BloxioChartStore(options);
    const mounted = new Map();

    const refresh = (gameId, renderOptions = {}) => {
        const target = mounted.get(gameId);
        if (!target) return null;
        const mergedOptions = { ...target.options, ...renderOptions };
        const records = store.query({
            gameId,
            currency: mergedOptions.currency || null,
            from: mergedOptions.from ?? null,
            to: mergedOptions.to ?? null,
            limit: mergedOptions.limit || 100
        });
        const dataset = buildBloxioChartDataset(gameId, records, mergedOptions);
        return renderBloxioChart(target.canvas, dataset, { ...target.options, ...renderOptions });
    };

    const unsubscribe = store.subscribe(record => {
        if (record) refresh(record.gameId);
        else mounted.forEach((_, gameId) => refresh(gameId));
    });

    return Object.freeze({
        store,
        ingest: record => store.ingest(record),
        ingestMany: records => store.ingestMany(records),
        query: filters => store.query(filters),
        queryPage: filters => store.queryPage(filters),
        exportSnapshot: filters => store.exportSnapshot(filters),
        importSnapshot: (snapshot, importOptions) => store.importSnapshot(snapshot, importOptions),
        exportCSV: filters => exportBloxioChartCSV(store.query(filters)),
        getStoreStats: () => store.stats,
        dataset: (gameId, chartOptions = {}) => buildBloxioChartDataset(
            gameId,
            store.query({
                gameId,
                currency: chartOptions.currency || null,
                from: chartOptions.from ?? null,
                to: chartOptions.to ?? null,
                limit: chartOptions.limit || 500
            }),
            chartOptions
        ),
        mount(gameId, canvas, chartOptions = {}) {
            if (!getBloxioGame(gameId)) throw new Error(`Unknown BLOXIO game: ${gameId}`);
            const previous = mounted.get(gameId);
            previous?.observer?.disconnect?.();
            const target = { canvas, options: { limit: 100, responsive: true, ...chartOptions }, observer: null };
            mounted.set(gameId, target);
            const ResizeObserverImpl = typeof ResizeObserver !== "undefined" ? ResizeObserver : null;
            const container = canvas.parentElement || canvas;
            if (ResizeObserverImpl && chartOptions.observeResize !== false) {
                target.observer = new ResizeObserverImpl(() => refresh(gameId));
                target.observer.observe(container);
            }
            return refresh(gameId);
        },
        refresh,
        unmount(gameId) {
            const target = mounted.get(gameId);
            target?.observer?.disconnect?.();
            mounted.delete(gameId);
        },
        connectStream(streamOptions = {}) {
            const stream = createBloxioChartStream({ ...streamOptions, engine: this });
            stream.connect().catch(() => {});
            return stream;
        },
        destroy() {
            mounted.forEach(target => target.observer?.disconnect?.());
            mounted.clear();
            unsubscribe();
            store.clear();
        }
    });
}


/**
 * Advanced, source-faithful analytics for verified round records.
 * No win/loss, RTP or payout is inferred unless the record explicitly contains it.
 */
function analyzeBloxioChartMetrics(records = [], options = {}) {
    if (!Array.isArray(records)) throw new Error("analyzeBloxioChartMetrics expects an array");
    const sorted = [...records].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const numeric = sorted.map(record => getBloxioNumericValue(record, [
        "result.multiplier", "result.value", "result.number", "result.rank", "result", "value"
    ])).filter(Number.isFinite);
    const sortedValues = [...numeric].sort((a, b) => a - b);
    const percentile = p => {
        if (!sortedValues.length) return null;
        const index = (sortedValues.length - 1) * p;
        const low = Math.floor(index), high = Math.ceil(index);
        return sortedValues[low] + (sortedValues[high] - sortedValues[low]) * (index - low);
    };
    const mean = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
    const variance = mean === null ? null :
        numeric.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / numeric.length;
    const outcomes = new Map();
    for (const record of sorted) {
        const label = String(getBloxioOutcomeLabel(record));
        outcomes.set(label, (outcomes.get(label) || 0) + 1);
    }
    const bucketMs = Math.max(60_000, Number(options.bucketMs) || 60 * 60 * 1000);
    const buckets = new Map();
    for (const record of sorted) {
        const timestamp = Number(record.timestamp);
        if (!Number.isFinite(timestamp)) continue;
        const start = Math.floor(timestamp / bucketMs) * bucketMs;
        const bucket = buckets.get(start) || { from: start, to: start + bucketMs, rounds: 0, numericCount: 0, sum: 0, min: null, max: null };
        bucket.rounds += 1;
        const value = getBloxioNumericValue(record, [
            "result.multiplier", "result.value", "result.number", "result.rank", "result", "value"
        ]);
        if (value !== null) {
            bucket.numericCount += 1;
            bucket.sum += value;
            bucket.min = bucket.min === null ? value : Math.min(bucket.min, value);
            bucket.max = bucket.max === null ? value : Math.max(bucket.max, value);
        }
        buckets.set(start, bucket);
    }
    const timeline = [...buckets.values()].sort((a, b) => a.from - b.from).map(bucket => ({
        ...bucket,
        average: bucket.numericCount ? bucket.sum / bucket.numericCount : null
    }));
    const currencyCounts = {};
    for (const record of sorted) {
        const currency = String(record.currency || "UNKNOWN").toUpperCase();
        currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
    }
    const latestWindowSize = Math.max(1, Math.min(sorted.length, Number(options.latestWindow) || 25));
    const latest = sorted.slice(-latestWindowSize);
    const latestNumeric = latest.map(record => getBloxioNumericValue(record, [
        "result.multiplier", "result.value", "result.number", "result.rank", "result", "value"
    ])).filter(Number.isFinite);
    const latestAverage = latestNumeric.length
        ? latestNumeric.reduce((sum, value) => sum + value, 0) / latestNumeric.length : null;
    const previous = sorted.slice(Math.max(0, sorted.length - latestWindowSize * 2), Math.max(0, sorted.length - latestWindowSize));
    const previousNumeric = previous.map(record => getBloxioNumericValue(record, [
        "result.multiplier", "result.value", "result.number", "result.rank", "result", "value"
    ])).filter(Number.isFinite);
    const previousAverage = previousNumeric.length
        ? previousNumeric.reduce((sum, value) => sum + value, 0) / previousNumeric.length : null;

    return {
        rounds: sorted.length,
        numericRounds: numeric.length,
        numericCoverage: sorted.length ? numeric.length / sorted.length : 0,
        average: mean,
        median: percentile(0.5),
        percentile25: percentile(0.25),
        percentile75: percentile(0.75),
        percentile90: percentile(0.9),
        minimum: sortedValues.length ? sortedValues[0] : null,
        maximum: sortedValues.length ? sortedValues[sortedValues.length - 1] : null,
        standardDeviation: variance === null ? null : Math.sqrt(variance),
        latestWindow: { size: latestWindowSize, numericRounds: latestNumeric.length, average: latestAverage },
        previousWindow: { size: previous.length, numericRounds: previousNumeric.length, average: previousAverage },
        trend: latestAverage === null || previousAverage === null ? "insufficient-data" :
            latestAverage > previousAverage ? "up" : latestAverage < previousAverage ? "down" : "flat",
        outcomeCounts: [...outcomes.entries()].map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count),
        currencyCounts,
        timeline,
        dataQuality: {
            missingTimestamps: sorted.filter(record => !Number.isFinite(Number(record.timestamp))).length,
            missingRoundIds: sorted.filter(record => !record.roundId).length,
            nonNumericRounds: sorted.length - numeric.length
        }
    };
}

function createBloxioMobileChartOptions(width, options = {}) {
    const layout = getBloxioResponsiveChartLayout(width, options);
    return {
        ...layout,
        responsive: true,
        interaction: layout.device === "mobile" ? "touch" : "pointer",
        minControlSize: layout.touchTarget,
        reduceMotion: options.reduceMotion ?? true,
        preserveAspectRatio: false,
        overflow: "hidden",
        useCompactMetadata: layout.device === "mobile"
    };
}

const BloxioGames = Object.freeze({
    version: "2.1.0",
    catalog: BLOXIO_GAME_CATALOG,
    homeOrder: BLOXIO_GAME_HOME_ORDER,
    categories: BLOXIO_GAME_CATEGORIES,
    currencies: BLOXIO_GAME_CURRENCIES,
    currencyConfig: BLOXIO_CURRENCY_CONFIG,
    limits: BLOXIO_GAME_LIMITS,
    chartProfiles: BLOXIO_CHART_PROFILES,
    getGame: getBloxioGame,
    getGames: getBloxioGames,
    getHomeGames: getBloxioHomeGames,
    getCategory: getBloxioCategory,
    getChartProfile: getBloxioChartProfile,
    createChartRecord,
    groupChartRecords: groupBloxioChartRecords,
    validateStake: validateBloxioStake,
    registerCurrency: registerBloxioCurrency,
    configureCurrencyLimits: configureBloxioCurrencyLimits,
    registerGame: registerBloxioGame,
    registerCategory: registerBloxioCategory,
    registerChartProfile: registerBloxioChartProfile,
    ChartStore: BloxioChartStore,
    createChartEngine: createBloxioChartEngine,
    buildChartDataset: buildBloxioChartDataset,
    renderChart: renderBloxioChart,
    getResponsiveChartLayout: getBloxioResponsiveChartLayout,
    createMobileChartOptions: createBloxioMobileChartOptions,
    analyzeChartMetrics: analyzeBloxioChartMetrics,
    createExpressChartRouter: createBloxioExpressChartRouter,
    createPostgresChartAdapter: createBloxioPostgresChartAdapter,
    summarizeRecords: summarizeBloxioRecords,
    exportCSV: exportBloxioChartCSV,
    analyzeGame: analyzeBloxioGame,
    ChartStream: BloxioChartStream,
    createChartStream: createBloxioChartStream,
    attachChartWebSocket: attachBloxioChartWebSocket,
    chartTheme: BLOXIO_CHART_THEME,
    chartRanges: BLOXIO_CHART_RANGES
});

// Browser global + ES module exports.
if (typeof window !== "undefined") window.BloxioGames = BloxioGames;

/**
 * Express REST adapter for real, server-owned round history.
 *
 * The application supplies authenticate() and loadHistory() so this module
 * remains database-agnostic. There is deliberately no public write endpoint:
 * round results must be verified and inserted by trusted game-server code.
 *
 * Routes:
 *   GET /games/:gameId/rounds
 *   GET /games/:gameId/analytics
 */
function createBloxioExpressChartRouter({
    express,
    authenticate,
    loadHistory,
    authorizeGame = async () => true,
    defaultLimit = 100,
    maxLimit = 1000,
    analyticsLimit = 5000,
    logger = console
} = {}) {
    if (!express || typeof express.Router !== "function") {
        throw new Error("Pass Express from require('express') or import express");
    }
    if (typeof authenticate !== "function") {
        throw new Error("authenticate(req) is required");
    }
    if (typeof loadHistory !== "function") {
        throw new Error("loadHistory(filters) database adapter is required");
    }

    const router = express.Router();
    const clampInt = (value, fallback, max) => {
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) ? Math.max(1, Math.min(max, number)) : fallback;
    };
    const parseTime = value => {
        if (value === undefined || value === null || value === "") return null;
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) {
            const error = new Error("from/to must be valid Unix timestamps in milliseconds");
            error.status = 400;
            throw error;
        }
        return number;
    };
    const sendError = (res, status, code, message) =>
        res.status(status).json({ ok: false, error: { code, message } });

    const handle = mode => async (req, res) => {
        res.set?.("Cache-Control", "no-store");
        try {
            const user = await authenticate(req);
            if (!user) return sendError(res, 401, "UNAUTHORIZED", "Authentication required");

            const gameId = String(req.params.gameId || "").trim().toLowerCase();
            const game = getBloxioGame(gameId);
            if (!game) return sendError(res, 404, "UNKNOWN_GAME", "Game was not found");

            const allowed = await authorizeGame({ user, game, request: req });
            if (!allowed) return sendError(res, 403, "FORBIDDEN", "You cannot access this game's chart data");

            const currency = req.query.currency
                ? String(req.query.currency).trim().toUpperCase() : null;
            if (currency && (!BLOXIO_CURRENCY_CONFIG[currency]?.enabled ||
                !game.currency.includes(currency))) {
                return sendError(res, 400, "INVALID_CURRENCY", "Currency is not enabled for this game");
            }

            const from = parseTime(req.query.from);
            const to = parseTime(req.query.to);
            if (from !== null && to !== null && from > to) {
                return sendError(res, 400, "INVALID_RANGE", "'from' must be earlier than or equal to 'to'");
            }

            const limit = mode === "analytics"
                ? clampInt(req.query.limit, analyticsLimit, analyticsLimit)
                : clampInt(req.query.limit, defaultLimit, maxLimit);
            const cursor = req.query.cursor ? String(req.query.cursor) : null;
            const result = await loadHistory({
                user, gameId, currency, from, to, limit,
                cursor: mode === "rounds" ? cursor : null,
                request: req
            });

            const rawRecords = Array.isArray(result) ? result :
                Array.isArray(result?.items) ? result.items : null;
            if (!rawRecords) {
                return sendError(res, 502, "INVALID_DATA_SOURCE", "loadHistory must return an array or { items }");
            }

            // Normalize and validate every database record against the catalog.
            const records = rawRecords.map(record => createChartRecord(record));
            if (mode === "analytics") {
                const metrics = analyzeBloxioChartMetrics(records, {
                    bucketMs: Number(req.query.bucketMs) || undefined,
                    latestWindow: Number(req.query.latestWindow) || undefined
                });
                return res.json({
                    ok: true,
                    game: { id: game.id, name: game.name },
                    filters: { currency, from, to },
                    metrics,
                    generatedAt: Date.now()
                });
            }

            return res.json({
                ok: true,
                game: { id: game.id, name: game.name },
                items: records,
                nextCursor: Array.isArray(result) ? null : (result.nextCursor ?? null),
                hasMore: Array.isArray(result) ? false : Boolean(result.hasMore)
            });
        } catch (error) {
            if (error.status) return sendError(res, error.status, "INVALID_QUERY", error.message);
            try { logger?.error?.("[BloxioExpressChart]", error); } catch {}
            return sendError(res, 500, "CHART_DATA_ERROR", "Unable to load chart data");
        }
    };

    router.get("/games/:gameId/rounds", handle("rounds"));
    router.get("/games/:gameId/analytics", handle("analytics"));
    return router;
}


/**
 * PostgreSQL adapter for the existing casino_sessions table in schema.sql.
 *
 * Pass query from backend/database/index.js. The query is parameterized and
 * selects no password, seed, wallet, bet or payout fields.
 *
 * The schema has no dedicated currency column. Currency is read only from
 * casino_sessions.result->>'currency' when the game server stored it there.
 */
function createBloxioPostgresChartAdapter({
    query,
    scopeToUser = false,
    logger = console
} = {}) {
    if (typeof query !== "function") {
        throw new Error("Pass the query function exported by backend/database");
    }

    return async function loadBloxioPostgresChartHistory({
        user,
        gameId,
        currency = null,
        from = null,
        to = null,
        limit = 100,
        cursor = null
    } = {}) {
        const params = [gameId];
        const where = ["LOWER(game) = $1"];

        if (scopeToUser) {
            if (!user?.id) {
                const error = new Error("Authenticated user id is required for scoped chart history");
                error.status = 401;
                throw error;
            }
            params.push(user.id);
            where.push(`user_id = $${params.length}`);
        }

        if (currency) {
            params.push(currency);
            where.push(`UPPER(COALESCE(result->>'currency', '')) = $${params.length}`);
        }
        if (from !== null) {
            params.push(new Date(from));
            where.push(`created_at >= $${params.length}`);
        }
        if (to !== null) {
            params.push(new Date(to));
            where.push(`created_at <= $${params.length}`);
        }
        if (cursor !== null && cursor !== "") {
            if (!/^\d+$/.test(String(cursor))) {
                const error = new Error("cursor must be a numeric casino_sessions id");
                error.status = 400;
                throw error;
            }
            params.push(String(cursor));
            where.push(`id < $${params.length}`);
        }

        const safeLimit = Math.max(1, Math.min(5000, Number.parseInt(limit, 10) || 100));
        params.push(safeLimit + 1);

        // Only chart-safe fields are selected. Seed material and financial
        // bet/payout details are intentionally excluded from public chart data.
        const sql = `
            SELECT
                id,
                game,
                multiplier,
                result,
                created_at
            FROM casino_sessions
            WHERE ${where.join(" AND ")}
            ORDER BY id DESC
            LIMIT $${params.length}
        `;

        const dbResult = await query(sql, params);
        const rows = Array.isArray(dbResult) ? dbResult : dbResult?.rows;
        if (!Array.isArray(rows)) {
            throw new Error("Database query must return pg result.rows or an array");
        }

        const hasMore = rows.length > safeLimit;
        const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;
        const items = pageRows.map(row => {
            const resultObject = row.result && typeof row.result === "object" &&
                !Array.isArray(row.result) ? { ...row.result } : { value: row.result };
            if (row.multiplier !== null && row.multiplier !== undefined) {
                resultObject.multiplier = Number(row.multiplier);
            }
            const timestamp = row.created_at instanceof Date
                ? row.created_at.getTime()
                : new Date(row.created_at).getTime();

            return {
                gameId: String(row.game).toLowerCase(),
                roundId: String(row.id),
                timestamp,
                currency: resultObject.currency
                    ? String(resultObject.currency).toUpperCase() : null,
                result: resultObject,
                metadata: {}
            };
        });

        return {
            items,
            hasMore,
            nextCursor: hasMore && pageRows.length
                ? String(pageRows[pageRows.length - 1].id) : null
        };
    };
}


export {
    BLOXIO_GAME_CATALOG,
    BLOXIO_GAME_HOME_ORDER,
    BLOXIO_GAME_CATEGORIES,
    BLOXIO_GAME_CURRENCIES,
    BLOXIO_CURRENCY_CONFIG,
    BLOXIO_GAME_LIMITS,
    BLOXIO_CHART_PROFILES,
    BloxioGames,
    getBloxioGame,
    getBloxioGames,
    getBloxioHomeGames,
    getBloxioCategory,
    getBloxioChartProfile,
    createChartRecord,
    groupBloxioChartRecords,
    validateBloxioStake,
    registerBloxioCurrency,
    configureBloxioCurrencyLimits,
    registerBloxioGame,
    registerBloxioCategory,
    registerBloxioChartProfile,
    BLOXIO_CHART_THEME,
    BLOXIO_CHART_RANGES,
    BloxioChartStore,
    createBloxioChartEngine,
    buildBloxioChartDataset,
    renderBloxioChart,
    getBloxioResponsiveChartLayout,
    createBloxioMobileChartOptions,
    analyzeBloxioChartMetrics,
    createBloxioExpressChartRouter,
    createBloxioPostgresChartAdapter,
    summarizeBloxioRecords,
    exportBloxioChartCSV,
    analyzeBloxioGame,
    BloxioChartStream,
    createBloxioChartStream,
    attachBloxioChartWebSocket
};

export default BloxioGames;
