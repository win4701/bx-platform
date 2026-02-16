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
  connectTicker();
  resizeCanvas();
}

/* ================= BINANCE TICKER ================= */

let socket;

function connectTicker() {
  if (socket) socket.close();

  const symbol = quoteMap[currentQuote];
  if (!symbol) return;

  socket = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@ticker`
  );

  socket.onmessage = e => {
    const data = JSON.parse(e.data);
    quotePriceUSDT = parseFloat(data.c);
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
  drawChart();
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
   BX INSTITUTIONAL CHART ENGINE – SAFE MODE
   v3.1 PRO Compatible – No Breaking
====================================================== */

const chartCanvas = document.getElementById("bxChart");
const ctx = chartCanvas.getContext("2d");

let chartData = [];
let maxPoints = 120;

function resizeChart() {
  chartCanvas.width = chartCanvas.offsetWidth;
  chartCanvas.height = chartCanvas.offsetHeight;
}

window.addEventListener("resize", resizeChart);
resizeChart();

/* ===== PUSH NEW PRICE ===== */

function pushPrice(price) {
  if (!price) return;

  chartData.push(price);

  if (chartData.length > maxPoints) {
    chartData.shift();
  }

  drawChart();
}

/* ===== DRAW FUNCTION ===== */

function drawChart() {
  const w = chartCanvas.width;
  const h = chartCanvas.height;

  ctx.clearRect(0, 0, w, h);

  if (chartData.length < 2) return;

  const max = Math.max(...chartData);
  const min = Math.min(...chartData);
  const range = max - min || 1;

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#35d49a";

  chartData.forEach((price, i) => {
    const x = (i / (maxPoints - 1)) * w;
    const y = h - ((price - min) / range) * h;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  /* ===== FILL AREA ===== */
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = "rgba(53,212,154,0.08)";
  ctx.fill();
}

/* ======================================================
   AUTO CONNECT WITH YOUR EXISTING PRICE ENGINE
====================================================== */

/* إذا عندك currentPrice يتم تحديثه من Binance */
setInterval(() => {
  if (typeof currentPrice !== "undefined") {
    pushPrice(currentPrice);
  }
}, 1000);
