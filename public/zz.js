/*=========================================================
   PART 4 — MARKET + CASINO (General Update)
=================================*/

  pair: "BX/USDT",
  side: "buy",
  price: 12,

  chart: null,
  candleSeries: null,

  depthChart: null,
  bidSeries: null,
  askSeries: null,

  timer: null,
  initialized: false
};

/* ================= PAIRS ================= */

function bindMarketPairs() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.onclick = () => {
      const pair = btn.dataset.pair;
      if (!pair || pair === MARKET.pair) return;

      MARKET.pair = pair;
      highlightActivePair();
      reloadMarket();
    };
  });
}

function highlightActivePair() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });

  const pairLabel = document.getElementById("marketPair");
  if (pairLabel) pairLabel.textContent = MARKET.pair.replace("/", " / ");
}

/* ================= PRICE (SSOT) ================= */

async function fetchMarketPrice() {
  const data = await safeFetch(`/market/quote?pair=${MARKET.pair}`);
  if (!data || typeof data.price !== "number") return;

  MARKET.price = data.price;

  const priceEl = document.getElementById("marketPrice");
  if (priceEl) priceEl.textContent = MARKET.price.toFixed(6);
}

/* ================= CHART ================= */

function initMarketChart() {
  const el = document.getElementById("marketChart");
  if (!el || MARKET.chart) return;

  MARKET.chart = LightweightCharts.createChart(el, {
    layout: {
      background: { color: "#020617" },
      textColor: "#94a3b8"
    },
    grid: {
      vertLines: { color: "#0f172a" },
      horzLines: { color: "#0f172a" }
    },
    rightPriceScale: { borderColor: "#1e293b" },
    timeScale: { borderColor: "#1e293b", timeVisible: true }
  });

  MARKET.candleSeries = MARKET.chart.addCandlestickSeries({
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderVisible: false,
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444"
  });
}

async function loadCandles() {
  if (!MARKET.candleSeries) return;

  const data = await safeFetch(`/market/candles?pair=${MARKET.pair}`);
  if (!Array.isArray(data)) return;

  MARKET.candleSeries.setData(data);
}

/* ================= BUY / SELL ================= */

function bindTradeTabs() {
  document.getElementById("buyTab")?.addEventListener("click", () => setSide("buy"));
  document.getElementById("sellTab")?.addEventListener("click", () => setSide("sell"));
}

function setSide(side) {
  MARKET.side = side;

  document.getElementById("buyTab")?.classList.toggle("active", side === "buy");
  document.getElementById("sellTab")?.classList.toggle("active", side === "sell");

  const btn = document.getElementById("actionBtn");
  if (!btn) return;

  btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
  btn.className = `action-btn ${side}`;
}

/* ================= DEPTH ================= */

function initDepthChart() {
  const el = document.getElementById("depthChart");
  if (!el || MARKET.depthChart) return;

  MARKET.depthChart = LightweightCharts.createChart(el, {
    layout: { background: { color: "#020617" }, textColor: "#64748b" },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } }
  });

  MARKET.bidSeries = MARKET.depthChart.addHistogramSeries({
    color: "#22c55e",
    priceFormat: { type: "volume" }
  });

  MARKET.askSeries = MARKET.depthChart.addHistogramSeries({
    color: "#ef4444",
    priceFormat: { type: "volume" }
  });
}

async function loadDepth() {
  if (!MARKET.bidSeries || !MARKET.askSeries) return;

  const data = await safeFetch(`/market/depth?pair=${MARKET.pair}`);
  if (!data) return;

  MARKET.bidSeries.setData(data.bids.map(b => ({ time: b[0], value: b[1] })));
  MARKET.askSeries.setData(data.asks.map(a => ({ time: a[0], value: a[1] })));
}

/* ================= RELOAD ================= */

async function reloadMarket() {
  await fetchMarketPrice();
  await loadCandles();
  await loadDepth();
}

/* ================= INIT ================= */

function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;

  bindMarketPairs();
  bindTradeTabs();

  initMarketChart();
  initDepthChart();

  highlightActivePair();
  reloadMarket();

  MARKET.timer = setInterval(() => {
    if (APP.view === "market") {
      fetchMarketPrice();
    }
  }, 2000);

  console.log("Market initialized ✔");
      }
      
