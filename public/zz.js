/*=========================================================
   MARKET — FINAL STABLE (SAFE / NO BREAK)
=========================================================*/

const MARKET = {
  pair: "BX/USDT",
  side: "buy",

  price: 0,
  prevPrice: 0,

  chart: null,
  candleSeries: null,
  volumeSeries: null,

  trades: [],

  timer: null,
  initialized: false
};

/* =========================
   INIT
========================= */
function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;

  bindMarketPairs();
  bindTradeTabs();
  initMarketChart();
  updatePairLabel();

  console.log("[Market] initialized");
}

/* =========================
   PAIRS
========================= */
function bindMarketPairs() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.onclick = () => {
      const pair = btn.dataset.pair;
      if (!pair || pair === MARKET.pair) return;

      MARKET.pair = pair;
      updatePairLabel();
      reloadMarket();
    };
  });
}

function updatePairLabel() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });

  const label = document.getElementById("marketPair");
  if (label) label.textContent = MARKET.pair.replace("/", " / ");
}

/* =========================
   PRICE + CANDLE
========================= */
async function fetchMarketPrice() {
  const data = await safeFetch(`/market/quote?pair=${MARKET.pair}`);
  if (!data || typeof data.price !== "number") return;

  MARKET.prevPrice = MARKET.price;
  MARKET.price = data.price;

  updatePriceUI();
  updateLiveCandle(MARKET.price);
}

/* =========================
   PRICE UI
========================= */
function updatePriceUI() {
  const el = document.getElementById("marketPrice");
  if (!el) return;

  el.textContent = MARKET.price.toFixed(6);
  el.classList.remove("up", "down");

  if (MARKET.prevPrice) {
    el.classList.add(
      MARKET.price > MARKET.prevPrice ? "up" : "down"
    );
  }
}

/* =========================
   CHART
========================= */
function initMarketChart() {
  const el = document.getElementById("marketChart");
  if (!el || MARKET.chart) return;

  MARKET.chart = LightweightCharts.createChart(el, {
    height: 300,
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
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
    borderVisible: false
  });

  MARKET.volumeSeries = MARKET.chart.addHistogramSeries({
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: { top: 0.75, bottom: 0 }
  });
}

/* =========================
   CANDLE UPDATE
========================= */
function updateLiveCandle(price) {
  if (!MARKET.candleSeries) return;

  const t = Math.floor(Date.now() / 1000);

  MARKET.candleSeries.update({
    time: t,
    open: MARKET.prevPrice || price,
    high: Math.max(MARKET.prevPrice || price, price),
    low: Math.min(MARKET.prevPrice || price, price),
    close: price
  });
}

/* =========================
   VOLUME (BX TRADES)
========================= */
function pushTrade(trade) {
  MARKET.trades.unshift(trade);
  MARKET.trades.splice(20);

  updateVolume(trade);
}

function updateVolume(trade) {
  if (!MARKET.volumeSeries) return;

  MARKET.volumeSeries.update({
    time: Math.floor(trade.time || Date.now() / 1000),
    value: trade.amount,
    color:
      trade.side === "buy"
        ? "rgba(34,197,94,0.8)"
        : "rgba(239,68,68,0.8)"
  });
}

/* =========================
   BUY / SELL UI
========================= */
function bindTradeTabs() {
  document.getElementById("buyTab")
    ?.addEventListener("click", () => setSide("buy"));

  document.getElementById("sellTab")
    ?.addEventListener("click", () => setSide("sell"));
}

function setSide(side) {
  MARKET.side = side;

  document.getElementById("buyTab")
    ?.classList.toggle("active", side === "buy");

  document.getElementById("sellTab")
    ?.classList.toggle("active", side === "sell");

  const btn = document.getElementById("actionBtn");
  if (btn) {
    btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
    btn.className = `action-btn ${side}`;
  }
}

/* =========================
   LIFECYCLE (SAFE)
========================= */
function startMarket() {
  if (MARKET.timer) return;
  fetchMarketPrice();
  MARKET.timer = setInterval(fetchMarketPrice, 2000);
}

function stopMarket() {
  if (MARKET.timer) {
    clearInterval(MARKET.timer);
    MARKET.timer = null;
  }
}

async function reloadMarket() {
  stopMarket();

  MARKET.price = 0;
  MARKET.prevPrice = 0;

  const el = document.getElementById("marketPrice");
  if (el) el.textContent = "--";

  fetchMarketPrice();
  startMarket();
}
