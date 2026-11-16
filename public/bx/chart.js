/*!
 * BLOXIO MARKET CHART ADAPTER V2
 * Backend-only historical/live candle adapter for BloxioChart.
 * Preserves the existing window.BXChart API.
 */
(function (root) {
    "use strict";

    const state = {
        chart: null,
        initialized: false,
        pair: "BX_USDT",
        timeframe: "1m",
        pendingCandles: null,
        lastTime: 0,
        generation: 0
    };

    const $ = id => document.getElementById(id);

    function normalizePair(value) {
        const raw = String(value || "BX_USDT").toUpperCase().trim();
        if (raw.includes("/")) return raw.replace("/", "_");
        return raw;
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
        } else if (typeof item === "object") {
            time = item.time ?? item.timestamp ?? item.openTime ??
                item.startTime ?? item.date ?? item.t;
            open = item.open ?? item.o;
            high = item.high ?? item.h;
            low = item.low ?? item.l;
            close = item.close ?? item.c;
            volume = item.volume ?? item.baseVolume ??
                item.quantity ?? item.v ?? 0;
        } else {
            return null;
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
            candle.close <= 0 || candle.high < candle.low ||
            candle.high < Math.max(candle.open, candle.close) ||
            candle.low > Math.min(candle.open, candle.close)) {
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
            setStatus("BloxioChart engine not loaded. Check /vendor/chart.bloxio.js", "error");
            return false;
        }

        if (state.chart) return true;

        try {
            state.chart = root.BloxioChart.create(container, {
                symbol: displayPair(state.pair),
                interval: state.timeframe,
                currency: state.pair.split("_")[1] || "USDT",
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
                const pending = state.pendingCandles;
                state.pendingCandles = null;
                applyCandles(pending);
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
            state.pendingCandles = null;
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
        if (!candle) return false;

        if (!create()) {
            state.pendingCandles = [candle];
            return false;
        }

        if (state.lastTime && candle.time < state.lastTime) return false;

        try {
            state.chart.update(candle);
            state.lastTime = Math.max(state.lastTime, candle.time);
            updateTooltip(candle);
            clearStatus();
            return true;
        } catch (error) {
            console.warn("[BXChart] live update rejected; history refresh required", error);
            setStatus("Live candle update rejected; waiting for refreshed history", "warning");
            return false;
        }
    }

    function eventDetail(event) {
        const detail = event?.detail || {};
        const nested = detail.data && typeof detail.data === "object"
            ? { ...detail, ...detail.data }
            : detail;
        return nested;
    }

    function onHistoricalEvent(event) {
        const detail = eventDetail(event);
        if (normalizePair(detail.pair || detail.symbol || state.pair) !== state.pair) return;
        if (detail.timeframe && String(detail.timeframe).toLowerCase() !== state.timeframe) return;
        const candles = detail.candles || detail.rows || detail.history;
        if (Array.isArray(candles)) applyCandles(candles);
    }

    function onLiveEvent(event) {
        const detail = eventDetail(event);
        if (normalizePair(detail.pair || detail.symbol || state.pair) !== state.pair) return;
        if (detail.timeframe && String(detail.timeframe).toLowerCase() !== state.timeframe) return;
        updateLive(detail.candle || detail.kline || detail.data?.candle || detail);
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
        const next = normalizePair(pair);
        if (next === state.pair) return true;

        state.pair = next;
        state.generation++;
        state.lastTime = 0;
        state.pendingCandles = null;

        if (state.chart) {
            state.chart.setSymbol(displayPair(state.pair), state.timeframe);
            state.chart.setData([]);
        }

        return true;
    }

    function setTimeframe(timeframe) {
        const next = String(timeframe || "1m").toLowerCase();
        if (next === state.timeframe) return true;

        state.timeframe = next;
        state.generation++;
        state.lastTime = 0;
        state.pendingCandles = null;

        if (state.chart) {
            state.chart.setSymbol(displayPair(state.pair), state.timeframe);
            state.chart.setData([]);
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
        state.pendingCandles = null;
        state.generation++;
    }

    root.BXChart = {
        init,
        destroy,
        setPair,
        setTimeframe,
        applyCandles,
        updateLiveCandle: updateLive,
        loadHistory: () => state.pendingCandles && applyCandles(state.pendingCandles),
        resize,
        reset: () => {
            state.chart?.setData([]);
            state.lastTime = 0;
            state.pendingCandles = null;
        },
        getState: () => ({
            pair: state.pair,
            timeframe: state.timeframe,
            chartReady: !!state.chart,
            initialized: state.initialized,
            candleCount: state.chart?.getData?.().length || 0,
            lastCandleTime: state.lastTime,
            generation: state.generation
        })
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})(window);
