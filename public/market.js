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

const canvas = document.getElementById("bxChart");
const ctx = canvas.getContext("2d");

/* ================= WALLET ================= */

let wallet = { BX: 0, USDT: 1000 };

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", init);

function init() {
  updateWalletUI();
  bindEvents();
  connectTicker();
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
  updateChart();
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

/* ===============================
   CHART (CANVAS CLEAN)
================================= */

const canvas = document.getElementById("bxChart");
const ctx = canvas.getContext("2d");
let priceHistory = [];

function updateChart(price) {
  priceHistory.push(price);
  if (priceHistory.length > 100) priceHistory.shift();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#00ff88";
  ctx.beginPath();

  priceHistory.forEach((p, i) => {
    const x = (i / 100) * canvas.width;
    const y =
      canvas.height -
      ((p - Math.min(...priceHistory)) /
        (Math.max(...priceHistory) -
          Math.min(...priceHistory) || 1)) *
        canvas.height;

    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}
