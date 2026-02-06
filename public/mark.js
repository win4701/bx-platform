/* =================================================
   MARKET — FULL ENGINE (BX EXCHANGE)
================================================= */

/* ================= CONFIG ================= */

const BX_USDT_PRICE = 12;
const FEE_RATE = 0.001; // 0.1%

const FALLBACK_PRICES = {
  USDT: 1,
  ETH: 3000,
  BNB: 300,
  BTC: 60000,
  SOL: 100,
  TON: 2.5
};

const MARKET_PRICES = { ...FALLBACK_PRICES };

let priceTimer = null;
let depthWS = null;

/* ================= STATE ================= */

const MARKET = {
  pair: "BX/USDT",
  side: "buy",
  price: BX_USDT_PRICE,
  lockedPrice: null,

  chart: null,
  candleSeries: null,
  emaSeries: null,
  vwapSeries: null,

  depthChart: null,
  bidSeries: null,
  askSeries: null,

  candles: [],
  initialized: false
};

let WALLET = { BX: 0, USDT: 0 };

/* ================= PRICE ENGINE ================= */

async function fetchRealPrices() {
  const symbols = ["ETHUSDT", "BNBUSDT", "BTCUSDT", "SOLUSDT", "TONUSDT"];
  for (const s of symbols) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${s}`
      );
      const data = await res.json();
      MARKET_PRICES[s.replace("USDT", "")] = parseFloat(data.price);
    } catch {}
  }
}

function startPriceFeed() {
  fetchRealPrices();
  if (priceTimer) clearInterval(priceTimer);
  priceTimer = setInterval(fetchRealPrices, 30000);
}

function stopPriceFeed() {
  if (priceTimer) clearInterval(priceTimer);
  priceTimer = null;
}

function getPairPrice(pair) {
  const [, quote] = pair.split("/");
  if (quote === "USDT") return BX_USDT_PRICE;
  return +(BX_USDT_PRICE / (MARKET_PRICES[quote] || 1)).toFixed(8);
}

/* ================= UI ================= */

function updatePriceUI() {
  const price = getPairPrice(MARKET.pair);
  MARKET.price = price;

  const quote = MARKET.pair.split("/")[1];
  const priceEl = document.getElementById("marketPrice");
  const approxEl = document.getElementById("marketApprox");

  if (priceEl) priceEl.textContent = `${price} ${quote}`;
  if (approxEl)
    approxEl.textContent = `≈ ${(price * (MARKET_PRICES[quote] || 1)).toFixed(2)} USDT`;
}

function updatePairUI() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === MARKET.pair);
  });

  const pairEl = document.getElementById("marketPair");
  if (pairEl) pairEl.textContent = MARKET.pair.replace("/", " / ");
}

function updateWalletUI() {
  document.getElementById("walletBX").textContent = WALLET.BX.toFixed(4);
  document.getElementById("walletUSDT").textContent = WALLET.USDT.toFixed(2);
}

/* ================= PAIRS ================= */

function bindPairs() {
  document.querySelectorAll("[data-pair]").forEach(btn => {
    btn.onclick = () => {
      MARKET.pair = btn.dataset.pair;
      updatePairUI();
      updatePriceUI();
      loadStaticChart();
      connectDepthWS();
    };
  });
}

/* ================= CHART ================= */

function initChart() {
  const el = document.getElementById("marketChart");
  if (!el || MARKET.chart) return;

  MARKET.chart = LightweightCharts.createChart(el, {
    height: 300,
    layout: { background: { color: "#020617" }, textColor: "#94a3b8" }
  });

  MARKET.candleSeries = MARKET.chart.addCandlestickSeries();
  MARKET.emaSeries = MARKET.chart.addLineSeries({ color: "#facc15" });
  MARKET.vwapSeries = MARKET.chart.addLineSeries({ color: "#38bdf8" });
}

function loadStaticChart() {
  const now = Math.floor(Date.now() / 1000);
  MARKET.candles = [];

  for (let i = 30; i >= 0; i--) {
    MARKET.candles.push({
      time: now - i * 60,
      open: MARKET.price,
      high: MARKET.price * 1.01,
      low: MARKET.price * 0.99,
      close: MARKET.price,
      volume: Math.random() * 50 + 10
    });
  }

  MARKET.candleSeries.setData(MARKET.candles);
  MARKET.emaSeries.setData(calcEMA(MARKET.candles));
  MARKET.vwapSeries.setData(calcVWAP(MARKET.candles));
}

function calcEMA(data, p = 20) {
  let k = 2 / (p + 1);
  let ema = data[0].close;
  return data.map(c => {
    ema = c.close * k + ema * (1 - k);
    return { time: c.time, value: ema };
  });
}

function calcVWAP(data) {
  let pv = 0, vol = 0;
  return data.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * c.volume;
    vol += c.volume;
    return { time: c.time, value: pv / vol };
  });
}

/* ================= DEPTH WS ================= */

function connectDepthWS() {
  disconnectDepthWS();

  const quote = MARKET.pair.split("/")[1];
  const MAP = {
    USDT: "ethusdt",
    ETH: "ethusdt",
    BNB: "bnbusdt",
    BTC: "btcusdt",
    SOL: "solusdt",
    TON: "tonusdt"
  };

  depthWS = new WebSocket(
    `wss://stream.binance.com:9443/ws/${MAP[quote]}@depth20@100ms`
  );

  depthWS.onmessage = e => {
    const d = JSON.parse(e.data);
    updateOrderBook(d);
    updateDepthChart(d);
  };
}

function disconnectDepthWS() {
  if (depthWS) depthWS.close();
  depthWS = null;
}

/* ================= ORDER BOOK ================= */

function updateOrderBook(d) {
  const bidsEl = document.getElementById("bids");
  const asksEl = document.getElementById("asks");
  if (!bidsEl || !asksEl) return;

  bidsEl.innerHTML = "";
  asksEl.innerHTML = "";

  d.bids.slice(0, 10).forEach(([p, q]) => {
    bidsEl.innerHTML += `<div class="row buy">${(MARKET.price / p).toFixed(6)} • ${q}</div>`;
  });

  d.asks.slice(0, 10).forEach(([p, q]) => {
    asksEl.innerHTML += `<div class="row sell">${(MARKET.price / p).toFixed(6)} • ${q}</div>`;
  });
}

/* ================= DEPTH CHART ================= */

function initDepthChart() {
  const el = document.getElementById("depthChart");
  if (!el || MARKET.depthChart) return;

  MARKET.depthChart = LightweightCharts.createChart(el, { height: 180 });
  MARKET.bidSeries = MARKET.depthChart.addAreaSeries({ lineColor: "#22c55e" });
  MARKET.askSeries = MARKET.depthChart.addAreaSeries({ lineColor: "#ef4444" });
}

function updateDepthChart(d) {
  let bc = 0, ac = 0;
  MARKET.bidSeries.setData(
    d.bids.slice(0, 10).map(([p, q]) => ({
      time: (MARKET.price / p),
      value: (bc += parseFloat(q))
    }))
  );
  MARKET.askSeries.setData(
    d.asks.slice(0, 10).map(([p, q]) => ({
      time: (MARKET.price / p),
      value: (ac += parseFloat(q))
    }))
  );
}

/* ================= WALLET ================= */

async function loadWallet() {
  const res = await fetch("/api/wallet", {
    headers: { Authorization: `Bearer ${USER.jwt}` }
  });
  WALLET = await res.json();
  updateWalletUI();
}

/* ================= ORDERS ================= */

function submitLimitOrder() {
  const amount = parseFloat(document.getElementById("orderAmount").value);
  if (!amount || amount <= 0) return alert("Invalid amount");

  const lockedPrice = MARKET.price;
  const quote = MARKET.pair.split("/")[1];
  const total = amount * lockedPrice;
  const fee = total * FEE_RATE;

  if (MARKET.side === "buy") {
    if (WALLET.USDT < total + fee) return alert("Insufficient USDT");
    WALLET.USDT -= total + fee;
    WALLET.BX += amount;
  } else {
    if (WALLET.BX < amount) return alert("Insufficient BX");
    WALLET.BX -= amount;
    WALLET.USDT += total - fee;
  }

  updateWalletUI();
  alert("Order executed ✔️");
}

/* ================= INIT ================= */

function initMarket() {
  if (MARKET.initialized) return;
  MARKET.initialized = true;

  bindPairs();
  initChart();
  initDepthChart();
  updatePairUI();
  updatePriceUI();
  loadStaticChart();
}

/* ================= LIFECYCLE ================= */

document.addEventListener("view:change", e => {
  if (e.detail === "market") {
    initMarket();
    startPriceFeed();
    connectDepthWS();
    loadWallet();
  } else {
    stopPriceFeed();
    disconnectDepthWS();
  }
});
