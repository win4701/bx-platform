/* ================= MARKET PAIRS ================= */

function bindMarketPairs() {
  document.querySelectorAll("#pairScroll button").forEach(btn => {
    btn.onclick = () => {
      const pair = btn.dataset.pair;
      if (!pair || pair === MARKET.pair) return;

      MARKET.pair = pair;
      highlightActivePair();
      refreshMarket();
    };
  });
}

function bindPairSelector() {
  const selector = $("pairSelector");
  if (!selector) return;

  selector.onclick = () => {
    const i = MARKET_PAIRS.indexOf(MARKET.pair);
    MARKET.pair = MARKET_PAIRS[(i + 1) % MARKET_PAIRS.length];
    highlightActivePair();
    refreshMarket();
  };
}

function bindTradeTabs() {
  $("buyTab")?.addEventListener("click", () => setTradeSide("buy"));
  $("sellTab")?.addEventListener("click", () => setTradeSide("sell"));
}

function highlightActivePair() {
  document.querySelectorAll("#pairScroll button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });
}

/* ================= MARKET PRICE (SSOT) ================= */

async function updateMarketPrice() {
  try {
    const asset = MARKET.pair.split("/")[1].toLowerCase();

    const res = await fetch(API_BASE + "/market/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset,
        side: MARKET.side,
        amount: 1
      })
    });

    const data = await res.json();
    if (typeof data.price === "number") {
      MARKET.price = data.price;
    }
  } catch {
    console.warn("Market price fetch failed");
  }
}

/* ================= CHART ENGINE ================= */

let chart, candleSeries, volumeSeries;

function initChart() {
  const el = document.getElementById("marketChart");
  if (!el || chart) return;

  chart = LightweightCharts.createChart(el, {
    layout: {
      background: { color: "#020617" },
      textColor: "#94a3b8"
    },
    grid: {
      vertLines: { color: "#0f172a" },
      horzLines: { color: "#0f172a" }
    },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor: "#1e293b" },
    timeScale: { borderColor: "#1e293b", timeVisible: true }
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: "#02c076",
    downColor: "#f84960",
    borderUpColor: "#02c076",
    borderDownColor: "#f84960",
    wickUpColor: "#02c076",
    wickDownColor: "#f84960"
  });

  volumeSeries = chart.addHistogramSeries({
    color: "#334155",
    priceFormat: { type: "volume" },
    priceScaleId: ""
  });
}

/* ================= CHART DATA ================= */

function updateLastPriceMarker() {
  if (!candleSeries || !MARKET.price) return;

  candleSeries.setMarkers([{
    time: Math.floor(Date.now() / 1000),
    position: "inBar",
    color: MARKET.side === "buy" ? "#02c076" : "#f84960",
    shape: "circle",
    text: MARKET.price.toFixed(4)
  }]);
}

/* ================= DEPTH CHART ================= */

function initDepthChart() {
  const chart = LightweightCharts.createChart(
    document.getElementById("depthChart"),
    {
      layout: { background: { color: "#020617" }, textColor: "#64748b" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } }
    }
  );

  MARKET.depthSeries = chart.addHistogramSeries({
    color: "#38bdf8"
  });
}

async function loadDepth() {
  if (!bidSeries || !askSeries) return;

  const res = await fetch(`/market/depth?pair=${MARKET.pair}`);
  const d = await res.json();

  bidSeries.setData(d.bids.map(b => ({ time: b[0], value: b[1] })));
  askSeries.setData(d.asks.map(a => ({ time: a[0], value: a[1] })));
}

/* ================= BUY & SELL ================= */

function setTradeSide(side) {
  MARKET.side = side;

  $("buyTab")?.classList.toggle("active", side === "buy");
  $("sellTab")?.classList.toggle("active", side === "sell");

  renderTradeAction();
  updateMarketPrice(); 
}

/* ================= RENDER ================= */

function renderMarket() {
  renderMarketPair();
  renderMarketPrice();
  renderTradeAction();
}

function renderMarketPair() {
  const el = $("marketPair");
  if (el) el.textContent = MARKET.pair.replace("/", " / ");
}

function renderMarketPrice() {
  const el = $("marketPrice");
  if (el) el.textContent = MARKET.price.toFixed(4);
}

function renderTradeAction() {
  const btn = $("actionBtn");
  if (!btn) return;

  btn.textContent = MARKET.side === "buy" ? "Buy BX" : "Sell BX";
  btn.className = `action-btn ${MARKET.side}`;
}
   
/* ================= INIT / LOOP ================= */

function refreshMarket() {
  updateMarketPrice();
  loadChartData();
  loadDepth();
  renderMarket();
}

function initMarket() {
  bindMarketPairs();
  bindPairSelector();
  initChart();
  initDepthChart();
  refreshMarket();

  if (MARKET.timer) return;

  MARKET.timer = setInterval(() => {
    if (APP.view === "market") {
      refreshMarket();
      updateLastPriceMarker();
    }
  }, 1500);
}

function stopMarket() {
  clearInterval(MARKET.timer);
  MARKET.timer = null;
}
