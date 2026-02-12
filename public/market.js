/* =========================================================
   MARKET ENGINE v2.7 FINAL STABLE
   BX Anchor = 38 USDT / USDC
   Scoped – Clean – No CSS Break
========================================================= */

(function () {
  "use strict";

  /* ================= CONFIG ================= */

  const BX_REFERENCE = 38;
  const ROWS = 15;
  const SPREAD_PCT = 0.002;

  /* ================= STATE ================= */

  const STATE = {
    quote: "USDT",
    coinUsdt: 1,
    price: BX_REFERENCE,
    mid: BX_REFERENCE,
    spread: 0,
    depth: { bids: [], asks: [] },
    wsTrade: null,
    wsCandle: null,
    rows: { bids: [], asks: [] }
  };

  /* ================= INIT ================= */

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initPairs();
    buildOrderBook();
    initChart();
    connectTradeStream();
  }

  /* ================= PAIRS ================= */

  function initPairs() {
    document.querySelectorAll(".pair-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        document.querySelectorAll(".pair-btn")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        STATE.quote = btn.dataset.pair;
        await fetchCoinPrice();
        calculatePrice();
        renderPrice();
        buildSyntheticBook();
        reconnectStreams();
      });
    });
  }

  /* ================= PRICE ENGINE ================= */

  async function fetchCoinPrice() {
    if (STATE.quote === "USDT" || STATE.quote === "USDC") {
      STATE.coinUsdt = 1;
      return;
    }

    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${STATE.quote}USDT`
    );
    const data = await res.json();
    STATE.coinUsdt = parseFloat(data.price);
  }

  function calculatePrice() {
    if (STATE.quote === "USDT" || STATE.quote === "USDC") {
      STATE.price = BX_REFERENCE;
    } else {
      STATE.price = BX_REFERENCE / STATE.coinUsdt;
    }

    STATE.mid = STATE.price;
  }

  function renderPrice() {
    const priceEl = document.querySelector(".live-price");
    if (priceEl) priceEl.textContent = STATE.price.toFixed(6);

    const pairLabel = document.querySelector(".pair-label");
    if (pairLabel) pairLabel.textContent = `BX / ${STATE.quote}`;
  }

  /* ================= TRADE STREAM ================= */

  function connectTradeStream() {
    if (STATE.wsTrade) STATE.wsTrade.close();

    if (STATE.quote === "USDT" || STATE.quote === "USDC") return;

    STATE.wsTrade = new WebSocket(
      `wss://stream.binance.com:9443/ws/${STATE.quote.toLowerCase()}usdt@trade`
    );

    STATE.wsTrade.onmessage = e => {
      const data = JSON.parse(e.data);
      STATE.coinUsdt = parseFloat(data.p);
      calculatePrice();
      renderPrice();
      buildSyntheticBook();
      updateMidLine();
    };
  }

  function reconnectStreams() {
    connectTradeStream();
    loadInitialCandles();
  }

  /* ================= ORDER BOOK ================= */

  function buildOrderBook() {
    const bids = document.querySelector(".bids");
    const asks = document.querySelector(".asks");

    bids.innerHTML = "";
    asks.innerHTML = "";

    for (let i = 0; i < ROWS; i++) {
      const b = document.createElement("div");
      b.className = "book-row bid-row";
      bids.appendChild(b);
      STATE.rows.bids.push(b);

      const a = document.createElement("div");
      a.className = "book-row ask-row";
      asks.appendChild(a);
      STATE.rows.asks.push(a);
    }

    buildSyntheticBook();
  }

  function buildSyntheticBook() {
    for (let i = 0; i < ROWS; i++) {
      const step = STATE.price * SPREAD_PCT * (i + 1);

      const bid = STATE.price - step;
      const ask = STATE.price + step;

      STATE.rows.bids[i].textContent = bid.toFixed(6);
      STATE.rows.asks[i].textContent = ask.toFixed(6);
    }

    STATE.spread = (STATE.price * SPREAD_PCT * 2);
    const spreadEl = document.querySelector(".spread-value");
    if (spreadEl) spreadEl.textContent = STATE.spread.toFixed(6);
  }

  /* ================= CHART ================= */

  let chart, candleSeries, emaSeries, vwapSeries, midLine;
  let candleData = [];

  function initChart() {
    const container = document.getElementById("chart");
    if (!container) return;

    chart = LightweightCharts.createChart(container, {
      layout: {
        background: { color: "#0b0f14" },
        textColor: "#ccc"
      },
      grid: {
        vertLines: { color: "#111" },
        horzLines: { color: "#111" }
      }
    });

    candleSeries = chart.addCandlestickSeries();
    emaSeries = chart.addLineSeries({ color: "#f1c40f" });
    vwapSeries = chart.addLineSeries({ color: "#9b59b6" });
    midLine = chart.addLineSeries({ color: "#00ffff" });

    loadInitialCandles();
  }

  async function loadInitialCandles() {
    const symbol = STATE.quote === "USDT"
      ? "BTCUSDT"
      : STATE.quote + "USDT";

    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=200`
    );
    const data = await res.json();

    candleData = data.map(c => ({
      time: c[0] / 1000,
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));

    candleSeries.setData(candleData);
    updateIndicators();
    initCandleStream(symbol);
  }

  function initCandleStream(symbol) {
    if (STATE.wsCandle) STATE.wsCandle.close();

    STATE.wsCandle = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_1m`
    );

    STATE.wsCandle.onmessage = e => {
      const msg = JSON.parse(e.data);
      const k = msg.k;

      const candle = {
        time: k.t / 1000,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v)
      };

      const last = candleData[candleData.length - 1];

      if (candle.time === last.time) {
        candleData[candleData.length - 1] = candle;
      } else {
        candleData.push(candle);
      }

      candleSeries.update(candle);
      updateIndicators();
    };
  }

  function updateIndicators() {
    if (!candleData.length) return;

    const ema = calculateEMA(candleData, 20);
    emaSeries.setData(ema);

    const vwap = calculateVWAP(candleData);
    vwapSeries.setData(vwap);

    updateMidLine();
  }

  function updateMidLine() {
    if (!midLine || !candleData.length) return;

    midLine.setData(
      candleData.map(c => ({
        time: c.time,
        value: STATE.price
      }))
    );
  }

  function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0].close;
    return data.map(c => {
      ema = c.close * k + ema * (1 - k);
      return { time: c.time, value: ema };
    });
  }

  function calculateVWAP(data) {
    let pv = 0, vol = 0;
    return data.map(c => {
      pv += c.close * c.volume;
      vol += c.volume;
      return { time: c.time, value: pv / vol };
    });
  }

})();
