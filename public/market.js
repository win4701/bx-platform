/* =========================================================
   BX MARKET v3.1 PRO FINAL
   Compatible 100% with provided market.html
========================================================= */

const ROWS = 15;
const BX_USDT_REFERENCE = 38;

let currentQuote = "USDT";
let marketPrice = BX_USDT_REFERENCE;
let bids = [];
let asks = [];
let tradeSide = "buy";
let quotePriceUSDT = 1;

const quoteMap = {
  USDT: "btcusdt",
  USDC: "btcusdt",
  BTC: "btcusdt",
  ETH: "ethusdt",
  BNB: "bnbusdt",
  SOL: "solusdt",
  AVAX: "avaxusdt",
  LTC: "ltcusdt",
  ZEC: "zecusdt",
  TON: "tonusdt"
};

/* ================= DOM ================= */

const quoteAssetEl = document.getElementById("quoteAsset");
const marketPriceEl = document.getElementById("marketPrice");
const marketApproxEl = document.getElementById("marketApprox");

const walletBXEl = document.getElementById("walletBX");
const walletUSDTEl = document.getElementById("walletUSDT");

const buyTab = document.getElementById("buyTab");
const sellTab = document.getElementById("sellTab");
const tradeBox = document.getElementById("tradeBox");
const actionBtn = document.getElementById("actionBtn");

const orderAmount = document.getElementById("orderAmount");
const execPriceEl = document.getElementById("execPrice");
const slippageEl = document.getElementById("slippage");
const spreadEl = document.getElementById("spread");

const bidsEl = document.getElementById("bids");
const asksEl = document.getElementById("asks");
const priceLadderEl = document.getElementById("priceLadder");

const pairButtons = document.querySelectorAll(".pair-btn");

/* ================= WALLET ================= */

let wallet = { BX: 0, USDT: 0 };

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", init);

function init() {
  updateWalletUI();
  bindEvents();
  connectBinance();
  resizeCanvas();
  drawChart();
}

/* ================= BINANCE TICKER ================= */

function connectBinance(symbol = "btcusdt") {

  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@kline_1m`
  );


  ws.onmessage = (event) => {

    const msg = JSON.parse(event.data);
    const k = msg.k;

    const candle = {
      x: new Date(k.t),
      o: parseFloat(k.o),
      h: parseFloat(k.h),
      l: parseFloat(k.l),
      c: parseFloat(k.c)
      parseFloat(data.c);
      computeBXPrice();
  };
}

function computeBXPrice() {
  if (currentQuote === "USDT" || currentQuote === "USDC") {
    marketPrice = BX_USDT_REFERENCE;
  } else {
    marketPrice = BX_USDT_REFERENCE / quotePriceUSDT;
  }

  generateOrderBook();
  renderOrderBook();
  updatePriceUI();
}

/* ================= ORDERBOOK ================= */

function generateOrderBook() {
  bids = [];
  asks = [];

  for (let i = ROWS; i > 0; i--) {
    bids.push((marketPrice - i * marketPrice * 0.0005).toFixed(6));
  }

  for (let i = 1; i <= ROWS; i++) {
    asks.push((marketPrice + i * marketPrice * 0.0005).toFixed(6));
  }
}

function renderOrderBook() {
  bidsEl.innerHTML = "";
  asksEl.innerHTML = "";
  priceLadderEl.innerHTML = "";

  bids.forEach(p => {
    const div = document.createElement("div");
    div.className = "ob-row bid";
    div.textContent = p;
    bidsEl.appendChild(div);
  });

  const mid = document.createElement("div");
  mid.className = "ob-row mid";
  mid.textContent = marketPrice.toFixed(6);
  priceLadderEl.appendChild(mid);

  asks.forEach(p => {
    const div = document.createElement("div");
    div.className = "ob-row ask";
    div.textContent = p;
    asksEl.appendChild(div);
  });

  updateSpread();
}

function updateSpread() {
  const spread = parseFloat(asks[0]) - parseFloat(bids[0]);
  spreadEl.textContent = spread.toFixed(6);
}

/* ================= PRICE ================= */

function updatePriceUI() {
  marketPriceEl.textContent = marketPrice.toFixed(6);
  marketApproxEl.textContent =
    `≈ ${marketPrice.toFixed(2)} ${currentQuote}`;
}

/* ================= TRADE ================= */

function executeTrade() {
  const amount = parseFloat(orderAmount.value);
  if (!amount || amount <= 0) return;

  const bestAsk = parseFloat(asks[0]);
  const bestBid = parseFloat(bids[0]);
  let execPrice;

  if (tradeSide === "buy") {
    execPrice = bestAsk;
    const cost = amount * execPrice;
    if (wallet.USDT >= cost) {
      wallet.USDT -= cost;
      wallet.BX += amount;
    }
  } else {
    execPrice = bestBid;
    if (wallet.BX >= amount) {
      wallet.BX -= amount;
      wallet.USDT += amount * execPrice;
    }
  }

  execPriceEl.textContent = execPrice.toFixed(6);

  const slippage =
    tradeSide === "buy"
      ? ((execPrice - marketPrice) / marketPrice) * 100
      : ((marketPrice - execPrice) / marketPrice) * 100;

  slippageEl.textContent = slippage.toFixed(3);

  updateWalletUI();
}

function updateWalletUI() {
  walletBXEl.textContent = wallet.BX.toFixed(4);
  walletUSDTEl.textContent = wallet.USDT.toFixed(2);
}

/* ================= TOGGLE ================= */

function setTradeSide(side) {
  tradeSide = side;

  tradeBox.classList.toggle("buy", side === "buy");
  tradeBox.classList.toggle("sell", side === "sell");

  buyTab.classList.toggle("active", side === "buy");
  sellTab.classList.toggle("active", side === "sell");

  actionBtn.textContent =
    side === "buy" ? "Buy BX" : "Sell BX";
}

/* ================= EVENTS ================= */

function bindEvents() {
  pairButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      pairButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentQuote = btn.dataset.quote;
      quoteAssetEl.textContent = currentQuote;

      connectTicker();
    });
  });

  buyTab.onclick = () => setTradeSide("buy");
  sellTab.onclick = () => setTradeSide("sell");
  actionBtn.onclick = executeTrade;

  document.querySelectorAll(".percent-row button")
    .forEach(btn => {
      btn.onclick = () => {
        const percent = parseInt(btn.dataset.percent);
        const max = wallet.USDT / marketPrice;
        orderAmount.value =
          ((max * percent) / 100).toFixed(4);
      };
    });
}

/* ======================================================
   BX INSTITUTIONAL CHART ENGINE v4
   Candlestick + EMA + VWAP + Gradient
   Safe for v3.1 Pro
====================================================== */

const canvas = document.getElementById("bxChart");
const ctx = canvas.getContext("2d");

let candles = [];
let maxCandles = 80;
let currentCandle = null;
let intervalMs = 5000; // 5s candle

let emaPeriod = 14;
let emaData = [];
let vwapData = [];

function resizeChart() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resizeChart);
resizeChart();

/* ===============================
   CANDLE BUILDER
=================================*/

function updateCandle(price) {
  const now = Date.now();

  if (!currentCandle) {
    currentCandle = {
      time: now,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 1
    };
    return;
  }

  if (now - currentCandle.time < intervalMs) {
    currentCandle.high = Math.max(currentCandle.high, price);
    currentCandle.low = Math.min(currentCandle.low, price);
    currentCandle.close = price;
    currentCandle.volume += 1;
  } else {
    candles.push(currentCandle);
    if (candles.length > maxCandles) candles.shift();
    currentCandle = null;
  }

  calculateIndicators();
  drawChart();
}

/* ===============================
   EMA
=================================*/

function calculateEMA(data, period) {
  let k = 2 / (period + 1);
  let ema = [];
  data.forEach((val, i) => {
    if (i === 0) ema.push(val.close);
    else ema.push(val.close * k + ema[i - 1] * (1 - k));
  });
  return ema;
}

/* ===============================
   VWAP
=================================*/

function calculateVWAP(data) {
  let cumulativePV = 0;
  let cumulativeVol = 0;
  let result = [];

  data.forEach(c => {
    let typical = (c.high + c.low + c.close) / 3;
    cumulativePV += typical * c.volume;
    cumulativeVol += c.volume;
    result.push(cumulativePV / cumulativeVol);
  });

  return result;
}

function calculateIndicators() {
  if (candles.length < 2) return;
  emaData = calculateEMA(candles, emaPeriod);
  vwapData = calculateVWAP(candles);
}

/* ===============================
   DRAW ENGINE
=================================*/

function drawChart() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (candles.length === 0) return;

  const prices = candles.flatMap(c => [c.high, c.low]);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || 1;

  const candleWidth = w / maxCandles;

  candles.forEach((c, i) => {
    const x = i * candleWidth + candleWidth / 2;

    const openY = h - ((c.open - min) / range) * h;
    const closeY = h - ((c.close - min) / range) * h;
    const highY = h - ((c.high - min) / range) * h;
    const lowY = h - ((c.low - min) / range) * h;

    const isBull = c.close >= c.open;

    /* Wick */
    ctx.strokeStyle = isBull ? "#2dd36f" : "#ff4d4f";
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    /* Body */
    ctx.fillStyle = isBull ? "#2dd36f" : "#ff4d4f";
    ctx.fillRect(
      x - candleWidth / 4,
      Math.min(openY, closeY),
      candleWidth / 2,
      Math.abs(closeY - openY) || 1
    );
  });

  /* EMA */
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffb703";

  emaData.forEach((val, i) => {
    const x = i * candleWidth + candleWidth / 2;
    const y = h - ((val - min) / range) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  /* VWAP */
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#3a86ff";

  vwapData.forEach((val, i) => {
    const x = i * candleWidth + candleWidth / 2;
    const y = h - ((val - min) / range) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* ===============================
   CONNECT TO PRICE ENGINE
=================================*/

setInterval(() => {
  if (typeof currentPrice !== "undefined") {
    updateCandle(currentPrice);
  }
}, 1000);
