/*=========================================================
   PART 4 — MARKET + CASINO (General Update)
=================================*/

const MARKET = {
  pair: "BX/USDT",
  side: "buy",
  price: 0,
  prevPrice: 0,

  chart: null,
  candleSeries: null,

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
   PRICE (UI SAFE UPDATE)
========================= */
async function fetchMarketPrice() {
  const data = await safeFetch(`/market/quote?pair=${MARKET.pair}`);
  if (!data || typeof data.price !== "number") return;

  MARKET.prevPrice = MARKET.price;
  MARKET.price = data.price;

  const el = document.getElementById("marketPrice");
  if (el) {
    el.textContent = MARKET.price.toFixed(6);
    el.classList.remove("up", "down");

    if (MARKET.prevPrice) {
      el.classList.add(
        MARKET.price > MARKET.prevPrice ? "up" : "down"
      );
    }
  }

  updateLiveCandle(MARKET.price);
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
}

/* =========================
   CANDLE UPDATE (SAFE)
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
   BUY / SELL (UI ONLY – SAFE)
========================= */
function bindTradeTabs() {
  document.getElementById("buyTab")?.addEventListener("click", () => setSide("buy"));
  document.getElementById("sellTab")?.addEventListener("click", () => setSide("sell"));
}

function setSide(side) {
  MARKET.side = side;

  document.getElementById("buyTab")?.classList.toggle("active", side === "buy");
  document.getElementById("sellTab")?.classList.toggle("active", side === "sell");

  const btn = document.getElementById("actionBtn");
  if (btn) {
    btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
    btn.className = `action-btn ${side}`;
  }
}

/* =========================
   LIFECYCLE (NO BREAK)
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
      
