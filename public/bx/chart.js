
/* =========================================================
   BLOXIO CHART ENGINE V9
   public/bx/chart.js

   Market: BX/USDT
   Data Source: Bloxio Backend
   Library: Lightweight Charts v4 / v5

   Features:
   - Native Bloxio historical candles
   - Bloxio live candle events
   - BX/USDT default pair
   - 45 USDT reference price (display only)
   - v4 / v5 series compatibility
   - Hidden container detection
   - Automatic resize and recovery
   - Timeframe switching
   - Volume histogram
   - Safe initialization and destruction
========================================================= */

"use strict";

window.BXChart = (function () {

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
    containerId: "marketChart",
    tooltipId: "marketTooltip",
    statusId: "marketChartStatus",

    pair: "BX_USDT",
    referencePrice: 45,

    historyLimit: 300,
    historyTimeout: 15000,

    endpoint: "/market/candles",

    defaultTimeframe: "1m",

    timeframes: [
        "1m", "5m", "15m",
        "1h", "4h", "1d", "1w"
    ],

    colors: {
        background: "#07111F",
        text: "#D6E0F5",
        grid: "rgba(255,255,255,.04)",
        border: "rgba(255,255,255,.08)",

        up: "#00FFC2",
        down: "#FF4D6D",

        volumeUp: "rgba(0,255,194,.35)",
        volumeDown: "rgba(255,77,109,.35)"
    }
};

const CHART_CONFIG = {
    layout: {
        background: {
            color: CONFIG.colors.background
        },

        textColor: CONFIG.colors.text,
        fontSize: 12,
        fontFamily: "Inter, Arial, sans-serif"
    },

    grid: {
        vertLines: {
            color: CONFIG.colors.grid
        },

        horzLines: {
            color: CONFIG.colors.grid
        }
    },

    crosshair: {
        mode: 1
    },

    rightPriceScale: {
        borderColor: CONFIG.colors.border,
        scaleMargins: {
            top: 0.08,
            bottom: 0.25
        }
    },

    timeScale: {
        borderColor: CONFIG.colors.border,
        timeVisible: true,
        secondsVisible: false
    },

    handleScroll: true,
    handleScale: true
};

/* =========================================================
   STATE
========================================================= */

let chart = null;

let candleSeries = null;
let volumeSeries = null;

let resizeObserver = null;
let mutationObserver = null;
let visibilityObserver = null;

let historyController = null;
let historyTimeout = null;

let currentPair = CONFIG.pair;
let currentTimeframe = CONFIG.defaultTimeframe;

let initialized = false;
let destroyed = false;
let chartReady = false;
let loading = false;

let generation = 0;
let lastCandleTime = 0;

let candles = [];
let volumeData = [];

let resizeHandler = null;
let visibilityHandler = null;
let marketCandlesHandler = null;
let marketMessageHandler = null;

let pendingLiveCandle = null;

/* =========================================================
   HELPERS
========================================================= */

function getContainer() {
    return document.getElementById(
        CONFIG.containerId
    );
}

function getLibrary() {
    return window.LightweightCharts || null;
}

function safeNumber(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

function normalizePair(pair) {
    const value = String(
        pair || CONFIG.pair
    ).toUpperCase().trim();

    if (
        value === "BX/USDT" ||
        value === "BXUSDT" ||
        value === "BX_USDT"
    ) {
        return CONFIG.pair;
    }

    return value.replace("/", "_");
}

function getChartHeight() {
    if (window.innerWidth < 480) return 280;
    if (window.innerWidth < 768) return 320;
    if (window.innerWidth < 1200) return 380;

    return 460;
}

function isVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
    );
}

function setStatus(message, type = "info") {
    const element = document.getElementById(
        CONFIG.statusId
    );

    if (!element) {
        console.info("[BXChart]", message);
        return;
    }

    element.textContent = message;
    element.dataset.type = type;
    element.classList.remove("hidden");
}

function clearStatus() {
    const element = document.getElementById(
        CONFIG.statusId
    );

    if (element) {
        element.classList.add("hidden");
    }
}

/* =========================================================
   API
========================================================= */

async function fetchCandles() {
    if (!window.API || typeof window.API.get !== "function") {
        throw new Error("API Engine unavailable");
    }

    if (historyController) {
        historyController.abort();
    }

    const controller = new AbortController();

    historyController = controller;

    const requestGeneration = generation;

    const timeout = setTimeout(() => {
        controller.abort();
    }, CONFIG.historyTimeout);

    const params = new URLSearchParams({
        pair: currentPair,
        timeframe: currentTimeframe,
        limit: String(CONFIG.historyLimit)
    });

    try {
        const response = await window.API.get(
            CONFIG.endpoint + "?" + params.toString(),
            {
                auth: false,
                cache: false,
                signal: controller.signal
            }
        );

        if (controller.signal.aborted) {
            return;
        }

        if (
            destroyed ||
            requestGeneration !== generation
        ) {
            return;
        }

        if (!response || response.error) {
            throw new Error(
                response?.error?.message ||
                response?.error ||
                "Candle request failed"
            );
        }

        let data = response.data ?? response;

        if (data.data !== undefined) {
            data = data.data;
        }

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data.candles)) {
            return data.candles;
        }

        if (Array.isArray(data.rows)) {
            return data.rows;
        }

        throw new Error(
            "Unsupported candle response format"
        );

    } finally {
        clearTimeout(timeout);

        if (historyController === controller) {
            historyController = null;
        }
    }
}

/* =========================================================
   CANDLE NORMALIZATION
========================================================= */

function normalizeCandle(item) {
    if (!item) return null;

    let time;
    let open;
    let high;
    let low;
    let close;
    let volume;

    if (Array.isArray(item)) {
        // [time, open, high, low, close, volume]
        time = item[0];
        open = item[1];
        high = item[2];
        low = item[3];
        close = item[4];
        volume = item[5];

    } else {
        time =
            item.time ??
            item.timestamp ??
            item.openTime ??
            item.startTime;

        open = item.open ?? item.o;
        high = item.high ?? item.h;
        low = item.low ?? item.l;
        close = item.close ?? item.c;

        volume =
            item.volume ??
            item.baseVolume ??
            item.quantity ??
            item.v ??
            0;
    }

    time = Number(time);

    if (!Number.isFinite(time) || time <= 0) {
        return null;
    }

    // Convert milliseconds to Unix seconds.
    if (time > 100000000000) {
        time = Math.floor(time / 1000);
    } else {
        time = Math.floor(time);
    }

    open = safeNumber(open);
    high = safeNumber(high);
    low = safeNumber(low);
    close = safeNumber(close);
    volume = safeNumber(volume);

    if (
        open <= 0 ||
        high <= 0 ||
        low <= 0 ||
        close <= 0 ||
        high < low
    ) {
        return null;
    }

    return {
        candle: {
            time,
            open,
            high,
            low,
            close
        },

        volume: {
            time,
            value: Math.max(0, volume),

            color: close >= open
                ? CONFIG.colors.volumeUp
                : CONFIG.colors.volumeDown
        }
    };
}

/* =========================================================
   LIBRARY COMPATIBILITY
========================================================= */

function addCandles(library) {
    if (
        typeof chart.addCandlestickSeries === "function"
    ) {
        return chart.addCandlestickSeries({
            upColor: CONFIG.colors.up,
            downColor: CONFIG.colors.down,
            borderVisible: false,
            wickUpColor: CONFIG.colors.up,
            wickDownColor: CONFIG.colors.down
        });
    }

    if (
        typeof chart.addSeries === "function" &&
        library.CandlestickSeries
    ) {
        return chart.addSeries(
            library.CandlestickSeries,
            {
                upColor: CONFIG.colors.up,
                downColor: CONFIG.colors.down,
                borderVisible: false,
                wickUpColor: CONFIG.colors.up,
                wickDownColor: CONFIG.colors.down
            }
        );
    }

    throw new Error(
        "Candlestick series unavailable"
    );
}

function addVolume(library) {
    const options = {
        priceScaleId: "volume",
        priceFormat: {
            type: "volume"
        },
        lastValueVisible: false,
        priceLineVisible: false
    };

    let series = null;

    if (
        typeof chart.addHistogramSeries === "function"
    ) {
        series = chart.addHistogramSeries(options);

    } else if (
        typeof chart.addSeries === "function" &&
        library.HistogramSeries
    ) {
        series = chart.addSeries(
            library.HistogramSeries,
            options
        );
    }

    if (series && series.priceScale) {
        series.priceScale().applyOptions({
            scaleMargins: {
                top: 0.82,
                bottom: 0
            },
            borderVisible: false
        });
    }

    return series;
}

/* =========================================================
   CREATE CHART
========================================================= */

function createChart() {
    const container = getContainer();

    const library = getLibrary();

    if (!container) {
        setStatus("Chart container not found", "error");
        return false;
    }

    if (
        !library ||
        typeof library.createChart !== "function"
    ) {
        setStatus(
            "Chart library unavailable",
            "error"
        );

        console.error(
            "[BXChart] LightweightCharts library unavailable"
        );

        return false;
    }

    if (!isVisible(container)) {
        return false;
    }

    if (chart && chartReady) {
        return true;
    }

    try {
        chart = library.createChart(
            container,
            {
                ...CHART_CONFIG,

                width: Math.max(
                    1,
                    Math.floor(container.clientWidth)
                ),

                height: getChartHeight()
            }
        );

        candleSeries = addCandles(library);
        volumeSeries = addVolume(library);

        chartReady = Boolean(candleSeries);

        if (!chartReady) {
            throw new Error(
                "Chart series creation failed"
            );
        }

        resizeChart();

        console.log(
            "[BXChart] Chart created for",
            currentPair
        );

        return true;

    } catch (error) {
        console.error(
            "[BXChart] CREATE_ERROR",
            error
        );

        removeChart();

        setStatus(
            "Unable to initialize chart",
            "error"
        );

        return false;
    }
}

/* =========================================================
   REMOVE
========================================================= */

function removeChart() {
    if (chart) {
        try {
            chart.remove();
        } catch (error) {
            console.warn(error);
        }
    }

    chart = null;
    candleSeries = null;
    volumeSeries = null;

    chartReady = false;
}

/* =========================================================
   RESIZE
========================================================= */

function resizeChart() {
    if (!chart || !chartReady) return;

    const container = getContainer();

    if (!container || !isVisible(container)) {
        return;
    }

    const width = Math.floor(
        container.clientWidth
    );

    if (width <= 0) return;

    try {
        chart.applyOptions({
            width,
            height: getChartHeight()
        });
    } catch (error) {
        console.warn(
            "[BXChart] RESIZE_ERROR",
            error
        );
    }
}

/* =========================================================
   APPLY DATA
========================================================= */

function applyCandles(input, options = {}) {
    if (!chartReady || !candleSeries) {
        pendingLiveCandle = input;
        return false;
    }

    if (!Array.isArray(input)) {
        return false;
    }

    const normalized = input
        .map(normalizeCandle)
        .filter(Boolean)
        .sort((a, b) =>
            a.candle.time - b.candle.time
        );

    // Remove duplicate timestamps.
    const unique = new Map();

    normalized.forEach(item => {
        unique.set(item.candle.time, item);
    });

    const rows = [...unique.values()];

    if (!rows.length) {
        candles = [];
        volumeData = [];

        candleSeries.setData([]);
        volumeSeries?.setData([]);

        setStatus(
            "No historical market candles available",
            "empty"
        );

        return false;
    }

    candles = rows.map(item => item.candle);

    volumeData = rows.map(item => item.volume);

    try {
        candleSeries.setData(candles);

        if (volumeSeries) {
            volumeSeries.setData(volumeData);
        }

        lastCandleTime =
            candles[candles.length - 1].time;

        if (options.fit !== false) {
            chart.timeScale().fitContent();
        }

        const last = candles[candles.length - 1];

        updateTooltip(
            last.close,
            last.high,
            last.low
        );

        clearStatus();

        if (pendingLiveCandle) {
            const pending = pendingLiveCandle;
            pendingLiveCandle = null;
            updateLiveCandle(pending);
        }

        return true;

    } catch (error) {
        console.error(
            "[BXChart] APPLY_DATA_ERROR",
            error
        );

        setStatus(
            "Unable to render market candles",
            "error"
        );

        return false;
    }
}

/* =========================================================
   HISTORY
========================================================= */

async function loadHistory() {
    if (destroyed || loading) return;

    if (!createChart()) {
        return;
    }

    loading = true;

    setStatus(
        "Loading BX/USDT chart...",
        "loading"
    );

    const requestGeneration = generation;

    try {
        const data = await fetchCandles();

        if (
            destroyed ||
            requestGeneration !== generation
        ) {
            return;
        }

        if (!Array.isArray(data)) {
            throw new Error("Invalid candle data");
        }

        applyCandles(data);

        console.log(
            "[BXChart] Bloxio candles loaded:",
            candles.length
        );

    } catch (error) {
        if (error.name !== "AbortError") {
            console.error(
                "[BXChart] HISTORY_ERROR",
                error
            );

            setStatus(
                "Bloxio market data unavailable",
                "error"
            );
        }

    } finally {
        loading = false;
    }
}

/* =========================================================
   LIVE CANDLE
========================================================= */

function updateLiveCandle(input) {
    if (destroyed) return;

    const normalized = normalizeCandle(input);

    if (!normalized) return;

    if (!chartReady || !candleSeries) {
        pendingLiveCandle = input;
        return;
    }

    const candle = normalized.candle;
    const volume = normalized.volume;

    if (
        lastCandleTime &&
        candle.time < lastCandleTime
    ) {
        return;
    }

    try {
        candleSeries.update(candle);

        if (volumeSeries) {
            volumeSeries.update(volume);
        }

        lastCandleTime = candle.time;

        const index = candles.findIndex(
            item => item.time === candle.time
        );

        if (index >= 0) {
            candles[index] = candle;
            volumeData[index] = volume;

        } else {
            candles.push(candle);
            volumeData.push(volume);
        }

        updateTooltip(
            candle.close,
            candle.high,
            candle.low
        );

        clearStatus();

    } catch (error) {
        console.warn(
            "[BXChart] LIVE_UPDATE_ERROR",
            error
        );
    }
}

/* =========================================================
   MARKET EVENTS
========================================================= */

function handleMarketCandles(event) {
    const detail = event.detail || {};

    const pair = normalizePair(detail.pair);

    if (pair !== currentPair) return;

    if (
        detail.timeframe &&
        detail.timeframe !== currentTimeframe
    ) {
        return;
    }

    if (Array.isArray(detail.candles)) {
        applyCandles(detail.candles);
    }
}

function handleMarketMessage(event) {
    const detail = event.detail || {};

    const pair = normalizePair(
        detail.pair || currentPair
    );

    if (pair !== currentPair) return;

    if (detail.candle) {
        updateLiveCandle(detail.candle);
        return;
    }

    if (detail.kline) {
        updateLiveCandle(detail.kline);
    }
}

/* =========================================================
   WEBSOCKET ADAPTER
========================================================= */

function bindWebSocket() {
    if (!window.WS?.on) return;

    const events = [
        "market:candle",
        "market:kline",
        "market:update"
    ];

    events.forEach(name => {
        const handler = payload => {
            if (!payload) return;

            const pair = normalizePair(
                payload.pair || currentPair
            );

            if (pair !== currentPair) return;

            if (payload.timeframe &&
                payload.timeframe !== currentTimeframe) {
                return;
            }

            if (payload.candle) {
                updateLiveCandle(payload.candle);
            } else if (payload.kline) {
                updateLiveCandle(payload.kline);
            }
        };

        window.WS.on(name, handler);

        wsListeners.push({
            name,
            handler
        });
    });
}

let wsListeners = [];

/* =========================================================
   TOOLTIP
========================================================= */

function updateTooltip(price, high, low) {
    const tooltip = document.getElementById(
        CONFIG.tooltipId
    );

    if (!tooltip) return;

    const digits = price < 1 ? 8 : 4;

    const priceElement = document.createElement("div");
    priceElement.className = "tooltip-price";
    priceElement.textContent = price.toFixed(digits);

    const highElement = document.createElement("div");
    highElement.className = "tooltip-high";
    highElement.textContent = "H " + high.toFixed(digits);

    const lowElement = document.createElement("div");
    lowElement.className = "tooltip-low";
    lowElement.textContent = "L " + low.toFixed(digits);

    tooltip.replaceChildren(
        priceElement,
        highElement,
        lowElement
    );
}

/* =========================================================
   PAIR
========================================================= */

function setPair(pair) {
    const normalized = normalizePair(pair);

    if (normalized === currentPair) {
        return;
    }

    currentPair = normalized;

    generation++;

    cancelHistory();

    candles = [];
    volumeData = [];

    lastCandleTime = 0;

    pendingLiveCandle = null;

    if (chartReady) {
        candleSeries.setData([]);
        volumeSeries?.setData([]);
    }

    loadHistory();

    console.log(
        "[BXChart] Pair changed:",
        currentPair
    );
}

/* =========================================================
   TIMEFRAME
========================================================= */

function setTimeframe(timeframe) {
    if (!CONFIG.timeframes.includes(timeframe)) {
        console.warn(
            "[BXChart] Invalid timeframe:",
            timeframe
        );

        return;
    }

    if (timeframe === currentTimeframe) {
        return;
    }

    currentTimeframe = timeframe;

    generation++;

    cancelHistory();

    candles = [];
    volumeData = [];

    lastCandleTime = 0;

    pendingLiveCandle = null;

    if (chartReady) {
        candleSeries.setData([]);
        volumeSeries?.setData([]);
    }

    loadHistory();

    console.log(
        "[BXChart] Timeframe changed:",
        timeframe
    );
}

/* =========================================================
   CANCEL HISTORY
========================================================= */

function cancelHistory() {
    if (historyController) {
        historyController.abort();
        historyController = null;
    }

    clearTimeout(historyTimeout);
}

/* =========================================================
   VISIBILITY
========================================================= */

function onVisibilityChange() {
    if (destroyed) return;

    const container = getContainer();

    if (!container || !isVisible(container)) {
        return;
    }

    if (!chartReady) {
        if (createChart()) {
            loadHistory();
        }

        return;
    }

    resizeChart();
}

function setupObservers() {
    const container = getContainer();

    if (!container) {
        setStatus(
            "Chart container not found",
            "error"
        );

        return;
    }

    if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(() => {
            onVisibilityChange();
        });

        resizeObserver.observe(container);
    }

    if ("MutationObserver" in window) {
        mutationObserver = new MutationObserver(() => {
            requestAnimationFrame(
                onVisibilityChange
            );
        });

        let node = container;

        while (node && node !== document.body) {
            mutationObserver.observe(node, {
                attributes: true,
                attributeFilter: [
                    "class",
                    "style",
                    "hidden"
                ]
            });

            node = node.parentElement;
        }
    }

    if ("IntersectionObserver" in window) {
        visibilityObserver = new IntersectionObserver(
            entries => {
                if (
                    entries.some(entry => entry.isIntersecting)
                ) {
                    onVisibilityChange();
                }
            }
        );

        visibilityObserver.observe(container);
    }
}

/* =========================================================
   CLEAR
========================================================= */

function clearChart() {
    generation++;

    cancelHistory();

    candles = [];
    volumeData = [];

    lastCandleTime = 0;

    pendingLiveCandle = null;

    if (candleSeries) {
        candleSeries.setData([]);
    }

    if (volumeSeries) {
        volumeSeries.setData([]);
    }

}

/* =========================================================
   RESET
========================================================= */

function reset() {
    clearChart();

    removeChart();

    requestAnimationFrame(() => {
        if (!destroyed && createChart()) {
            loadHistory();
        }
    });
}

/* =========================================================
   INIT
========================================================= */

function init() {
    if (initialized && !destroyed) {
        onVisibilityChange();
        return true;
    }

    initialized = true;
    destroyed = false;

    currentPair = CONFIG.pair;

    setupObservers();

    resizeHandler = resizeChart;

    visibilityHandler = onVisibilityChange;

    marketCandlesHandler = handleMarketCandles;

    marketMessageHandler = handleMarketMessage;

    window.addEventListener(
        "resize",
        resizeHandler
    );

    document.addEventListener(
        "visibilitychange",
        visibilityHandler
    );

    document.addEventListener(
        "bloxio:market-candles",
        marketCandlesHandler
    );

    document.addEventListener(
        "bloxio:market-candle",
        marketMessageHandler
    );

    bindWebSocket();

    if (createChart()) {
        loadHistory();
    } else {
        // The market view may be hidden at page startup.
        // Observers will create the chart when it becomes visible.
        setStatus(
            "Waiting for market view...",
            "loading"
        );
    }

    console.log(
        "[BXChart] V9 READY - BX/USDT"
    );

    return true;
}

/* =========================================================
   DESTROY
========================================================= */

function destroy() {
    destroyed = true;
    initialized = false;

    generation++;

    cancelHistory();

    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }

    if (visibilityObserver) {
        visibilityObserver.disconnect();
        visibilityObserver = null;
    }

    if (resizeHandler) {
        window.removeEventListener(
            "resize",
            resizeHandler
        );
    }

    if (visibilityHandler) {
        document.removeEventListener(
            "visibilitychange",
            visibilityHandler
        );
    }

    if (marketCandlesHandler) {
        document.removeEventListener(
            "bloxio:market-candles",
            marketCandlesHandler
        );
    }

    if (marketMessageHandler) {
        document.removeEventListener(
            "bloxio:market-candle",
            marketMessageHandler
        );
    }

    if (window.WS?.off) {
        wsListeners.forEach(({ name, handler }) => {
            window.WS.off(name, handler);
        });
    }

    wsListeners = [];

    removeChart();

    console.log("[BXChart] DESTROYED");
}

/* =========================================================
   PUBLIC API
========================================================= */

return {
    init,
    destroy,

    setPair,
    setTimeframe,

    loadHistory,
    applyCandles,
    updateLiveCandle,

    clearChart,
    reset,
    resize: resizeChart,

    getState() {
        return {
            pair: currentPair,
            timeframe: currentTimeframe,

            referencePrice: CONFIG.referencePrice,

            chartReady,
            initialized,
            loading,

            candleCount: candles.length,
            lastCandleTime
        };
    }
};

})();

/* =========================================================
   AUTO INIT
========================================================= */

function initializeBXChart() {
    if (
        window.BXChart &&
        typeof window.BXChart.init === "function"
    ) {
        window.BXChart.init();
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeBXChart,
        { once: true }
    );
} else {
    initializeBXChart();
}
