/*/================= MARKET BINDINGS ================= */

function bindMarketPairs() {
  const buttons = document.querySelectorAll("#pairScroll button");

  buttons.forEach(btn => {
    btn.onclick = () => {
      const pair = btn.dataset.pair;
      if (!pair || pair === MARKET.pair) return;

      MARKET.pair = pair;
      highlightActivePair();
      renderMarket();
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
    renderMarket();
  };
}

function highlightActivePair() {
  document.querySelectorAll("#pairScroll button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });
}

/* ================= MARKET PRICE (SSOT) ================= */

async function updateMarketPrice() {
  try {
    // BX/USDT → asset = usdt
    const asset = MARKET.pair.split("/")[1].toLowerCase();

    const res = await fetch("/market/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset,        // usdt / bnb / eth / ton ...
        side: MARKET.side, // buy | sell
        amount: 1     // price per 1 BX
      })
    });

    const data = await res.json();

    if (!data || typeof data.price !== "number") return;

    MARKET.price = data.price;
  } catch (e) {
    console.warn("Quote fetch failed");
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
/* ================= MARKET ================= */

function initMarket() {
   bindPairSelector(); 
   bindMarketPairs();

  if (MARKET.timer) return;

  MARKET.timer = setInterval(() => {
    if (APP.view === "market") {
      updateMarketPrice();
      renderMarket();
    }
  }, 1500);

  log.info("Market initialized");
}

function stopMarket() {
  clearInterval(MARKET.timer);
  MARKET.timer = null;
}

/* ================= CHART MARKET ================= */

async function loadChartData() {
  const res = await fetch("/market/ohlc", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ pair: MARKET.pair })
  });

  const data = await res.json();

  candleSeries.setData(data.map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close
  })));

  volumeSeries.setData(data.map(c => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? "#02c076" : "#f84960"
  })));
}

function updateLastPriceMarker() {
  if (!candleSeries || !MARKET.price) return;

  candleSeries.setMarkers([{
    time: Math.floor(Date.now()/1000),
    position: "inBar",
    color: MARKET.side === "buy" ? "#02c076" : "#f84960",
    shape: "circle",
    text: MARKET.price.toFixed(4)
  }]);
}

/*================= depthChart
================= */
let depthChart, bidSeries, askSeries;

function initDepthChart() {
  const el = document.getElementById("depthChart");
  if (!el || depthChart) return;

  depthChart = LightweightCharts.createChart(el, {
    layout:{ background:{color:"#020617"}, textColor:"#64748b" },
    rightPriceScale:{ visible:false },
    timeScale:{ visible:false },
    grid:{ vertLines:{visible:false}, horzLines:{visible:false} }
  });

  bidSeries = depthChart.addAreaSeries({
    topColor: "rgba(2,192,118,.4)",
    bottomColor: "rgba(2,192,118,.05)",
    lineColor: "#02c076"
  });

  askSeries = depthChart.addAreaSeries({
    topColor: "rgba(248,73,96,.4)",
    bottomColor: "rgba(248,73,96,.05)",
    lineColor: "#f84960"
  });
}

async function loadDepth() {
  const res = await fetch(`/market/depth?pair=${MARKET.pair}`);
  const d = await res.json();

  bidSeries.setData(d.bids.map(b => ({ time: b[0], value: b[1] })));
  askSeries.setData(d.asks.map(a => ({ time: a[0], value: a[1] })));
}


/*================= initMarketCharts================= */

function initMarketCharts() {
  initChart();
  initDepthChart();
  loadChartData();
  loadDepth();
}
/*================= BUY & SELL 
================= */

function setTradeSide(side) {
  MARKET.side = side;

  const buyTab = $("buyTab");
  const sellTab = $("sellTab");
  const box = document.querySelector(".trade-box");
  const actionBtn = $("actionBtn");

  buyTab?.classList.toggle("active", side === "buy");
  sellTab?.classList.toggle("active", side === "sell");

  if (box) {
    box.classList.remove("buy", "sell");
    box.classList.add(side);
  }

  if (actionBtn) {
    if (side === "buy") {
      actionBtn.textContent = "Buy BX";
      actionBtn.classList.remove("sell");
      actionBtn.classList.add("buy");
    } else {
      actionBtn.textContent = "Sell BX";
      actionBtn.classList.remove("buy");
      actionBtn.classList.add("sell");
    }
  }
}

/* ================= RENDER MARKET ================= */

function renderMarket() {
  renderMarketPair();
  renderMarketPrice();
  renderTradeAction();
  updateChart();

  log.info("Market rendered", {
    pair: MARKET.pair,
    price: MARKET.price,
    side: MARKET.side
  });
}

function renderMarketPair() {
  const el = $("marketPair");
  if (!el) return;

  el.textContent = MARKET.pair.replace("/", " / ");
}

function renderMarketPrice() {
  const el = $("marketPrice");
  if (!el) return;

  el.textContent = Number(MARKET.price).toFixed(4);
}

function renderTradeAction() {
  const btn = $("actionBtn");
  if (!btn) return;

  const side = MARKET.side || "buy";

  btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
  btn.classList.remove("buy", "sell");
  btn.classList.add(side);
}
