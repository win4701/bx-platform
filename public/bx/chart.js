
/* =========================================================
   BLOXIO CHART ENGINE V8
   public/bx/chart.js

   Features:
   - Lightweight Charts v4 / v5 compatibility
   - Historical Binance candles
   - Live Binance WebSocket
   - Hidden container detection
   - Automatic resize
   - Automatic reconnect
   - Symbol normalization
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

  historyLimit: 300,

  reconnectDelay: 2000,
  maxReconnectDelay: 30000,

  historyTimeout: 12000,

  defaultSymbol: "BTCUSDT",
  defaultTimeframe: "1m",

  socketBase: "wss://stream.binance.com:9443/ws",

  historyBase: "https://api.binance.com/api/v3/klines",

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

const TIMEFRAME_MAP = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w"
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
    borderColor: CONFIG.colors.border
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

let socket = null;

let resizeObserver = null;
let mutationObserver = null;
let visibilityObserver = null;

let reconnectTimer = null;
let reconnectAttempts = 0;

let historyController = null;

let currentSymbol = CONFIG.defaultSymbol;
let currentTimeframe = CONFIG.defaultTimeframe;

let initialized = false;
let destroyed = false;
let connecting = false;

let lastCandleTime = 0;
let chartReady = false;

let generation = 0;

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

function isVisible(element) {

  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  const style = getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function normalizeSymbol(symbol) {

  let value = String(
    symbol || CONFIG.defaultSymbol
  )
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!value) {
    return CONFIG.defaultSymbol;
  }

  if (
    !/(USDT|USDC|BUSD|BTC|ETH|BNB)$/.test(value)
  ) {
    value += "USDT";
  }

  return value;
}

function getChartHeight() {

  if (window.innerWidth < 480) {
    return 260;
  }

  if (window.innerWidth < 768) {
    return 320;
  }

  if (window.innerWidth < 1200) {
    return 380;
  }

  return 460;
}

function safeNumber(value) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/* =========================================================
   SERIES COMPATIBILITY
   Lightweight Charts v4 / v5
========================================================= */

function addCandles(library) {

  if (typeof chart.addCandlestickSeries === "function") {

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
    "Candlestick series is not supported"
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

  let series;

  if (typeof chart.addHistogramSeries === "function") {

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

  if (series) {

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
    return false;
  }

  if (!library || typeof library.createChart !== "function") {

    console.error(
      "[BXChart] LightweightCharts library unavailable"
    );

    return false;
  }

  if (!isVisible(container)) {
    return false;
  }

  if (chart) {
    return true;
  }

  try {

    chart = library.createChart(
      container,
      {
        ...CHART_CONFIG,
        width: Math.floor(container.clientWidth),
        height: getChartHeight()
      }
    );

    candleSeries = addCandles(library);

    volumeSeries = addVolume(library);

    if (!candleSeries) {
      throw new Error("Candle series creation failed");
    }

    chartReady = true;

    resizeChart();

    console.log("[BXChart] Chart created");

    return true;

  } catch (error) {

    console.error(
      "[BXChart] CREATE_ERROR",
      error
    );

    removeChart();

    return false;
  }
}

/* =========================================================
   REMOVE CHART
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

  if (!chart) {
    return;
  }

  const container = getContainer();

  if (!container || !isVisible(container)) {
    return;
  }

  const width = Math.floor(
    container.clientWidth
  );

  if (width <= 0) {
    return;
  }

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
   VISIBILITY
========================================================= */

function onVisibilityChange() {

  if (destroyed) {
    return;
  }

  const container = getContainer();

  if (!container) {
    return;
  }

  if (!isVisible(container)) {
    return;
  }

  if (!chart) {

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

        if (entries.some(entry => entry.isIntersecting)) {
          onVisibilityChange();
        }

      }
    );

    visibilityObserver.observe(container);

  }

  window.addEventListener(
    "resize",
    resizeChart
  );

}

/* =========================================================
   HISTORICAL DATA
========================================================= */

async function loadHistory() {

  if (destroyed) {
    return;
  }

  if (!chart && !createChart()) {
    return;
  }

  if (historyController) {
    historyController.abort();
  }

  const controller = new AbortController();

  historyController = controller;

  const requestGeneration = generation;

  const url =
    CONFIG.historyBase +
    "?symbol=" + encodeURIComponent(currentSymbol) +
    "&interval=" + encodeURIComponent(currentTimeframe) +
    "&limit=" + CONFIG.historyLimit;

  const timeout = setTimeout(() => {
    controller.abort();
  }, CONFIG.historyTimeout);

  try {

    const response = await fetch(
      url,
      {
        method: "GET",
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(
        "History HTTP " + response.status
      );
    }

    const data = await response.json();

    if (
      destroyed ||
      requestGeneration !== generation ||
      !Array.isArray(data)
    ) {
      return;
    }

    const candles = [];
    const volumes = [];

    data.forEach(item => {

      const time = Math.floor(
        Number(item[0]) / 1000
      );

      const open = safeNumber(item[1]);
      const high = safeNumber(item[2]);
      const low = safeNumber(item[3]);
      const close = safeNumber(item[4]);
      const volume = safeNumber(item[5]);

      if (
        !time ||
        !open ||
        !high ||
        !low ||
        !close
      ) {
        return;
      }

      candles.push({
        time,
        open,
        high,
        low,
        close
      });

      volumes.push({
        time,
        value: volume,
        color: close >= open
          ? CONFIG.colors.volumeUp
          : CONFIG.colors.volumeDown
      });

    });

    if (!candleSeries) {
      return;
    }

    candleSeries.setData(candles);

    if (volumeSeries) {
      volumeSeries.setData(volumes);
    }

    lastCandleTime = candles.length
      ? candles[candles.length - 1].time
      : 0;

    chart.timeScale().fitContent();

    if (candles.length) {

      const last = candles[candles.length - 1];

      updateTooltip(
        last.close,
        last.high,
        last.low
      );

    }

    console.log(
      "[BXChart] Historical candles loaded:",
      candles.length
    );

  } catch (error) {

    if (error.name !== "AbortError") {

      console.error(
        "[BXChart] HISTORY_ERROR",
        error
      );

    }

  } finally {

    clearTimeout(timeout);

    if (historyController === controller) {
      historyController = null;
    }

  }
}

/* =========================================================
   WEBSOCKET
========================================================= */

function socketURL() {

  return (
    CONFIG.socketBase +
    "/" +
    currentSymbol.toLowerCase() +
    "@kline_" +
    currentTimeframe
  );
}

function connectKline() {

  if (destroyed || connecting) {
    return;
  }

  disconnectSocket();

  if (!chart || !candleSeries) {
    return;
  }

  connecting = true;

  try {

    socket = new WebSocket(
      socketURL()
    );

    socket.onopen = () => {

      connecting = false;
      reconnectAttempts = 0;

      console.log(
        "[BXChart] WebSocket connected:",
        currentSymbol,
        currentTimeframe
      );

    };

    socket.onmessage = event => {

      try {

        const data = JSON.parse(event.data);

        if (!data.k) {
          return;
        }

        updateCandle(data.k);

      } catch (error) {

        console.warn(
          "[BXChart] MESSAGE_ERROR",
          error
        );

      }

    };

    socket.onerror = error => {

      console.warn(
        "[BXChart] SOCKET_ERROR",
        error
      );

    };

    socket.onclose = () => {

      connecting = false;
      socket = null;

      scheduleReconnect();

    };

  } catch (error) {

    connecting = false;

    console.error(
      "[BXChart] SOCKET_CONNECT_ERROR",
      error
    );

    scheduleReconnect();

  }
}

function disconnectSocket() {

  if (socket) {

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    try {
      socket.close();
    } catch (error) {
      console.warn(error);
    }

    socket = null;
  }

  connecting = false;

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function scheduleReconnect() {

  if (destroyed || !initialized) {
    return;
  }

  clearTimeout(reconnectTimer);

  const delay = Math.min(
    CONFIG.reconnectDelay *
      Math.pow(2, reconnectAttempts),
    CONFIG.maxReconnectDelay
  );

  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {

    if (!destroyed && chart) {
      connectKline();
    }

  }, delay);

}

/* =========================================================
   CANDLE UPDATE
========================================================= */

function updateCandle(kline) {

  if (!candleSeries || !chartReady) {
    return;
  }

  const time = Math.floor(
    Number(kline.t) / 1000
  );

  if (!time) {
    return;
  }

  const open = safeNumber(kline.o);
  const high = safeNumber(kline.h);
  const low = safeNumber(kline.l);
  const close = safeNumber(kline.c);
  const volume = safeNumber(kline.v);

  if (
    !open ||
    !high ||
    !low ||
    !close
  ) {
    return;
  }

  const candle = {
    time,
    open,
    high,
    low,
    close
  };

  try {

    candleSeries.update(candle);

    if (volumeSeries) {

      volumeSeries.update({
        time,
        value: volume,
        color: close >= open
          ? CONFIG.colors.volumeUp
          : CONFIG.colors.volumeDown
      });

    }

    lastCandleTime = time;

    updateTooltip(
      close,
      high,
      low
    );

  } catch (error) {

    console.warn(
      "[BXChart] CANDLE_UPDATE_ERROR",
      error
    );

  }
}

/* =========================================================
   TOOLTIP
========================================================= */

function updateTooltip(price, high, low) {

  const tooltip = document.getElementById(
    CONFIG.tooltipId
  );

  if (!tooltip) {
    return;
  }

  const precision = price < 1 ? 8 : 4;

  tooltip.innerHTML =
    '<div class="tooltip-price">' +
      price.toFixed(precision) +
    '</div>' +
    '<div class="tooltip-high">H ' +
      high.toFixed(precision) +
    '</div>' +
    '<div class="tooltip-low">L ' +
      low.toFixed(precision) +
    '</div>';

}

/* =========================================================
   PAIR
========================================================= */

function setPair(symbol) {

  const normalized = normalizeSymbol(symbol);

  if (normalized === currentSymbol) {
    return;
  }

  currentSymbol = normalized;

  generation++;

  if (historyController) {
    historyController.abort();
    historyController = null;
  }

  disconnectSocket();

  if (chart) {
    loadHistory();
    connectKline();
  }

  console.log(
    "[BXChart] Pair changed:",
    currentSymbol
  );
}

/* =========================================================
   TIMEFRAME
========================================================= */

function setTimeframe(timeframe) {

  if (!TIMEFRAME_MAP[timeframe]) {
    console.warn(
      "[BXChart] Unsupported timeframe:",
      timeframe
    );
    return;
  }

  if (timeframe === currentTimeframe) {
    return;
  }

  currentTimeframe = timeframe;

  generation++;

  if (historyController) {
    historyController.abort();
    historyController = null;
  }

  disconnectSocket();

  if (chart) {
    loadHistory();
    connectKline();
  }

  console.log(
    "[BXChart] Timeframe changed:",
    currentTimeframe
  );
}

/* =========================================================
   CLEAR
========================================================= */

function clearChart() {

  if (historyController) {
    historyController.abort();
    historyController = null;
  }

  generation++;

  if (candleSeries) {
    candleSeries.setData([]);
  }

  if (volumeSeries) {
    volumeSeries.setData([]);
  }

  lastCandleTime = 0;

}

/* =========================================================
   RESET
========================================================= */

function reset() {

  clearChart();

  disconnectSocket();

  removeChart();

  if (!destroyed) {

    requestAnimationFrame(() => {

      if (createChart()) {
        loadHistory();
        connectKline();
      }

    });

  }
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

  setupObservers();

  if (createChart()) {

    loadHistory();

    connectKline();

  }

  console.log(
    "[BXChart] V8 INITIALIZED"
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

  disconnectSocket();

  if (historyController) {
    historyController.abort();
    historyController = null;
  }

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

  window.removeEventListener(
    "resize",
    resizeChart
  );

  removeChart();

  console.log(
    "[BXChart] DESTROYED"
  );
}

/* =========================================================
   PUBLIC API
========================================================= */

return {

  init,

  destroy,

  setPair,

  setTimeframe,

  clearChart,

  reset,

  resize: resizeChart,

  loadHistory,

  getState() {

    return {
      symbol: currentSymbol,
      timeframe: currentTimeframe,
      connected: !!socket &&
        socket.readyState === WebSocket.OPEN,
      chartReady,
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
