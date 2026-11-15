/*!
 * BLOXIO MARKET CHART ADAPTER
 * Connects the standalone BloxioChart renderer to the existing MARKET API/events.
 * Historical and live prices are sourced from the Bloxio backend only.
 */
(function (root) {
    "use strict";

    const state = {
        chart: null,
        initialized: false,
        pair: "BX_USDT",
        timeframe: "1m",
        pendingCandles: null,
        lastTime: 0
    };

    const $ = id => document.getElementById(id);

    function normalizePair(value) {
        return String(value || "BX_USDT").toUpperCase().trim()
            .replace("/", "_");
    }

    function displayPair(value) {
        return normalizePair(value).replace("_", "/");
    }

    function setStatus(message, type) {
        const node = $("marketChartStatus");
        if (node) {
            node.textContent = message;
            node.dataset.type = type || "info";
            node.classList.remove("hidden");
        }
        console.info("[BXChart]", message);
    }

    function clearStatus() {
        const node = $("marketChartStatus");
        if (node) node.classList.add("hidden");
    }

    function normalizeTime(value) {
        let time = typeof value === "string" && !/^\d+$/.test(value)
            ? Math.floor(Date.parse(value) / 1000)
            : Number(value);

        if (!Number.isFinite(time) || time <= 0) return 0;
        if (time > 100000000000) time = Math.floor(time / 1000);
        return Math.floor(time);
    }

    function normalizeOne(item) {
        if (!item) return null;

        let time, open, high, low, close, volume;

        if (Array.isArray(item)) {
            [time, open, high, low, close, volume = 0] = item;
        } else {
            time = item.time ?? item.timestamp ?? item.openTime ??
                item.startTime ?? item.date;
            open = item.open ?? item.o;
            high = item.high ?? item.h;
            low = item.low ?? item.l;
            close = item.close ?? item.c;
            volume = item.volume ?? item.baseVolume ??
                item.quantity ?? item.v ?? 0;
        }

        const candle = {
            time: normalizeTime(time),
            open: Number(open),
            high: Number(high),
            low: Number(low),
            close: Number(close),
            volume: Math.max(0, Number(volume) || 0)
        };

        if (!candle.time ||
            ![candle.open, candle.high, candle.low, candle.close].every(Number.isFinite) ||
            candle.open <= 0 || candle.high <= 0 || candle.low <= 0 ||
            candle.close <= 0 || candle.high < candle.low) {
            return null;
        }

        return candle;
    }

    function normalizeRows(input) {
        if (!Array.isArray(input)) return [];
        const byTime = new Map();

        input.forEach(item => {
            const candle = normalizeOne(item);
            if (candle) byTime.set(candle.time, candle);
        });

        return Array.from(byTime.values())
            .sort((a, b) => a.time - b.time);
    }

    function create() {
        const container = $("marketChart");
        if (!container) {
            setStatus("Chart container #marketChart not found", "error");
            return false;
        }

        if (!root.BloxioChart || typeof root.BloxioChart.create !== "function") {
            setStatus("BloxioChart engine not loaded. Check /bx/chart.bloxio.js", "error");
            return false;
        }

        if (state.chart) return true;

        try {
            state.chart = root.BloxioChart.create(container, {
                symbol: displayPair(state.pair),
                interval: state.timeframe,
                currency: "USDT",
                height: 420,
                minHeight: 260,
                background: "#061A17",
                panelBackground: "#0B2B24",
                text: "#F4F7F5",
                muted: "#A3B8B0",
                grid: "rgba(212,175,55,.09)",
                border: "rgba(212,175,55,.18)",
                up: "#27D69A",
                down: "#FF6472",
                accent: "#D4AF37",
                crosshair: "rgba(212,175,55,.65)",
                precision: 8,
                minMove: 0.00000001,
                showVolume: true,
                showGrid: true,
                showWatermark: true,
                watermark: "BLOXIO",
                showHeader: true,
                showToolbar: true,
                showLastPrice: true,
                showCrosshair: true,
                showLegend: true,
                autoFit: true,
                maxVisibleBars: 240,
                chartType: "candles"
            });

            if (state.pendingCandles) {
                applyCandles(state.pendingCandles);
            } else {
                setStatus("Waiting for Bloxio market candles...", "loading");
            }

            return true;
        } catch (error) {
            console.error("[BXChart] initialization failed", error);
            setStatus("Unable to initialize Bloxio chart: " + error.message, "error");
            state.chart = null;
            return false;
        }
    }

    function applyCandles(input) {
        const rows = normalizeRows(input);
        state.pendingCandles = Array.isArray(input) ? input : [];

        if (!rows.length) {
            if (state.chart) state.chart.setData([]);
            state.lastTime = 0;
            setStatus("No candle history returned by Bloxio API", "empty");
            return false;
        }

        if (!create()) return false;

        try {
            state.chart.setData(rows);
            state.lastTime = rows[rows.length - 1].time;
            clearStatus();
            updateTooltip(rows[rows.length - 1]);
            return true;
        } catch (error) {
            console.error("[BXChart] invalid historical candles", error);
            setStatus("Bloxio candle data could not be rendered: " + error.message, "error");
            return false;
        }
    }

    function updateTooltip(candle) {
        const node = $("marketTooltip");
        if (!node || !candle) return;
        const digits = candle.close < 1 ? 8 : 4;
        node.textContent = "O " + candle.open.toFixed(digits) +
            "  H " + candle.high.toFixed(digits) +
            "  L " + candle.low.toFixed(digits) +
            "  C " + candle.close.toFixed(digits);
        node.classList.remove("hidden");
    }

    function updateLive(input) {
        const candle = normalizeOne(input);
        if (!candle) return;

        if (!create()) {
            state.pendingCandles = [candle];
            return;
        }

        if (state.lastTime && candle.time < state.lastTime) return;

        try {
            state.chart.update(candle);
            state.lastTime = candle.time;
            updateTooltip(candle);
            clearStatus();
        } catch (error) {
            // An out-of-order correction is safer as a history replacement.
            console.warn("[BXChart] live update rejected; waiting for refreshed history", error);
        }
    }

    function onHistoricalEvent(event) {
        const detail = event.detail || {};
        if (normalizePair(detail.pair || state.pair) !== state.pair) return;
        if (detail.timeframe && detail.timeframe !== state.timeframe) return;
        if (Array.isArray(detail.candles)) applyCandles(detail.candles);
    }

    function onLiveEvent(event) {
        const detail = event.detail || {};
        if (normalizePair(detail.pair || state.pair) !== state.pair) return;
        if (detail.timeframe && detail.timeframe !== state.timeframe) return;
        updateLive(detail.candle || detail.kline || detail);
    }

    function init() {
        if (state.initialized) {
            create();
            state.chart?.resize?.();
            return true;
        }

        state.initialized = true;
        document.addEventListener("bloxio:market-candles", onHistoricalEvent);
        document.addEventListener("bloxio:market-candle", onLiveEvent);
        document.addEventListener("market:candle", onLiveEvent);
        document.addEventListener("market:kline", onLiveEvent);

        create();
        return true;
    }

    function setPair(pair) {
        state.pair = normalizePair(pair);
        state.lastTime = 0;
        state.pendingCandles = null;

        if (state.chart) {
            state.chart.setSymbol(displayPair(state.pair), state.timeframe);
            state.chart.setData([]);
        }
        return true;
    }

    function setTimeframe(timeframe) {
        state.timeframe = String(timeframe || "1m").toLowerCase();
        if (state.chart) {
            state.chart.setSymbol(displayPair(state.pair), state.timeframe);
        }
        return true;
    }

    function resize() {
        state.chart?.resize?.();
    }

    function destroy() {
        document.removeEventListener("bloxio:market-candles", onHistoricalEvent);
        document.removeEventListener("bloxio:market-candle", onLiveEvent);
        document.removeEventListener("market:candle", onLiveEvent);
        document.removeEventListener("market:kline", onLiveEvent);
        state.chart?.destroy?.();
        state.chart = null;
        state.initialized = false;
        state.lastTime = 0;
    }

    root.BXChart = {
        init, destroy, setPair, setTimeframe,
        applyCandles, updateLiveCandle: updateLive,
        loadHistory: () => state.pendingCandles && applyCandles(state.pendingCandles),
        resize, reset: () => { state.chart?.setData([]); state.lastTime = 0; },
        getState: () => ({
            pair: state.pair,
            timeframe: state.timeframe,
            chartReady: !!state.chart,
            initialized: state.initialized,
            candleCount: state.chart?.getData?.().length || 0,
            lastCandleTime: state.lastTime
        })
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})(window);
