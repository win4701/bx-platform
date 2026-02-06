const MARKET = {
  pair: "BX/USDT",
  side: "buy",

  price: 0,
  prevPrice: 0,

  chart: null,
  candleSeries: null,
  volumeSeries: null,

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

  console.log("[Market] ready");
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
   PRICE FETCH
========================= */
async function fetchMarketPrice() {
  const data = await safeFetch(`/market/quote?pair=${MARKET.pair}`);
  if (!data || typeof data.price !== "number") return;

  MARKET.prevPrice = MARKET.price;
  MARKET.price = data.price;

  updatePriceUI();
  updateLiveCandle();
  updateVolume();
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

/* ================= exchange ================= */

const EXCHANGE_WS = "wss://YOUR-FLY-APP.fly.dev/ws/exchange";

function connectExchange() {
  MARKET.ws = new WebSocket(EXCHANGE_WS);

  MARKET.ws.onmessage = e => {
    const msg = JSON.parse(e.data);

    if (msg.book) renderOrderBook(msg.book);
    if (msg.trades) renderTrades(msg.trades);
  };
}

function submitLimitOrder(amount, price) {
  MARKET.ws.send(JSON.stringify({
    type: "order",
    uid: USER.uid,           
    pair: MARKET.pair,
    side: MARKET.side,
    price,
    amount
  }));
}

/* =============== CHART ========================= */

function initMarketChart() {
  const el = document.getElementById("marketChart");
  if (!el) return;

  if (MARKET.chart) {
    MARKET.chart.resize(el.clientWidth, 300);
    return;
  }

  MARKET.chart = LightweightCharts.createChart(el, {
    width: el.clientWidth,
    height: 300,
    layout: {
      background: { color: "#020617" },
      textColor: "#94a3b8"
    },
    grid: {
      vertLines: { color: "#0f172a" },
      horzLines: { color: "#0f172a" }
    }
  });

  MARKET.candleSeries = MARKET.chart.addCandlestickSeries({
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderVisible: false
  });

  MARKET.volumeSeries = MARKET.chart.addHistogramSeries({
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: { top: 0.75, bottom: 0 }
  });
}

/* ============= CANDLE + VOLUME ================ */

function updateLiveCandle() {
  if (!MARKET.candleSeries) return;

  const t = Math.floor(Date.now() / 1000);
  const open = MARKET.prevPrice || MARKET.price;

  MARKET.candleSeries.update({
    time: t,
    open,
    high: Math.max(open, MARKET.price),
    low: Math.min(open, MARKET.price),
    close: MARKET.price
  });
}

function updateVolume() {
  if (!MARKET.volumeSeries) return;

  MARKET.volumeSeries.update({
    time: Math.floor(Date.now() / 1000),
    value: Math.random() * 100 + 10, // demo volume
    color:
      MARKET.price >= MARKET.prevPrice
        ? "rgba(34,197,94,.8)"
        : "rgba(239,68,68,.8)"
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

  const box = document.getElementById("tradeBox");
  if (box) {
    box.classList.toggle("buy", side === "buy");
    box.classList.toggle("sell", side === "sell");
  }

  const btn = document.getElementById("actionBtn");
  if (btn) {
    btn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
    btn.className = `action-btn ${side}`;
  }
}

/* =========================
   LIFECYCLE
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

function reloadMarket() {
  stopMarket();
  MARKET.price = 0;
  MARKET.prevPrice = 0;

  const el = document.getElementById("marketPrice");
  if (el) el.textContent = "--";

  startMarket();
}

/* =========================
   VIEW BINDING (CRITICAL)
========================= */
document.addEventListener("view:change", (e) => {
  if (e.detail === "market") {
    initMarket();
    startMarket();
    setTimeout(() => {
      if (MARKET.chart) {
        MARKET.chart.applyOptions({
          width: document.getElementById("marketChart").clientWidth
        });
      }
    }, 60);
  } else {
    stopMarket();
  }
});
