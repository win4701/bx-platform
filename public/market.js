/* ===============================
   BX MARKET v3.1 STABLE
   HTML MATCHED 100%
================================= */

const ROWS = 15;
const BASE = "BX";
let currentQuote = "USDT";
let marketPrice = 38.00;
let symbol = "btcusdt"; // مصدر تسعير مرجعي

/* ===============================
   DOM
================================= */

const marketPriceEl = document.getElementById("marketPrice");
const marketApproxEl = document.getElementById("marketApprox");
const quoteAssetEl = document.getElementById("quoteAsset");

const walletBXEl = document.getElementById("walletBX");
const walletUSDTEl = document.getElementById("walletUSDT");

const bidsEl = document.getElementById("bids");
const asksEl = document.getElementById("asks");
const priceLadderEl = document.getElementById("priceLadder");

const buyTab = document.getElementById("buyTab");
const sellTab = document.getElementById("sellTab");
const tradeBox = document.getElementById("tradeBox");
const actionBtn = document.getElementById("actionBtn");

const orderAmountInput = document.getElementById("orderAmount");
const execPriceEl = document.getElementById("execPrice");
const slippageEl = document.getElementById("slippage");
const spreadEl = document.getElementById("spread");

const percentBtns = document.querySelectorAll(".percent-row button");
const pairBtns = document.querySelectorAll(".pair-btn");

/* ===============================
   STATE
================================= */

let bestBid = 0;
let bestAsk = 0;
let midPrice = 0;

let wallet = {
  BX: 0,
  USDT: 0
};

let position = {
  size: 0,
  avg: 0
};

/* ===============================
   BINANCE DEPTH WS
================================= */

let depthSocket;

function connectDepth() {
  if (depthSocket) depthSocket.close();

  depthSocket = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@depth20@100ms`
  );

  depthSocket.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    const bids = data.bids.slice(0, 15);
    const asks = data.asks.slice(0, 15);

    bestBid = parseFloat(bids[0][0]);
    bestAsk = parseFloat(asks[0][0]);
    midPrice = (bestBid + bestAsk) / 2;

    renderOrderBook(bids, asks);
    updateSpread();
    updateChart(midPrice);
    updatePnL();
  };
}

/* ===============================
   ORDER BOOK
================================= */

function renderOrderBook(bids, asks) {
  bidsEl.innerHTML = "";
  asksEl.innerHTML = "";
  priceLadderEl.innerHTML = "";

  for (let i = 0; i < 15; i++) {
    const bid = bids[i] ? parseFloat(bids[i][0]) : 0;
    const ask = asks[i] ? parseFloat(asks[i][0]) : 0;

    bidsEl.innerHTML += `<div class="row bid">${bid.toFixed(6)}</div>`;
    asksEl.innerHTML += `<div class="row ask">${ask.toFixed(6)}</div>`;
    priceLadderEl.innerHTML += `<div class="row mid">${midPrice.toFixed(6)}</div>`;
  }

  marketPriceEl.textContent = midPrice.toFixed(6);
}

/* ===============================
   SPREAD
================================= */

function updateSpread() {
  const spread = bestAsk - bestBid;
  spreadEl.textContent = spread.toFixed(6);
}

/* ===============================
   TRADE
================================= */

function calculateExecution(side, amount) {
  const price = side === "buy" ? bestAsk : bestBid;
  execPriceEl.textContent = price.toFixed(6);

  const slip =
    ((price - midPrice) / midPrice) * 100;

  slippageEl.textContent = slip.toFixed(4);
  return price;
}

actionBtn.onclick = () => {
  const amount = parseFloat(orderAmountInput.value);
  if (!amount) return;

  const side = tradeBox.classList.contains("buy") ? "buy" : "sell";
  const price = calculateExecution(side, amount);

  if (side === "buy") {
    const cost = amount * price;
    if (wallet.USDT >= cost) {
      wallet.USDT -= cost;
      wallet.BX += amount;
      updatePosition(amount, price);
    }
  } else {
    if (wallet.BX >= amount) {
      wallet.BX -= amount;
      wallet.USDT += amount * price;
      updatePosition(-amount, price);
    }
  }

  updateWallet();
};

function updateWallet() {
  walletBXEl.textContent = wallet.BX.toFixed(4);
  walletUSDTEl.textContent = wallet.USDT.toFixed(2);
}

/* ===============================
   POSITION
================================= */

function updatePosition(sizeChange, price) {
  if (position.size + sizeChange === 0) {
    position.size = 0;
    position.avg = 0;
    return;
  }

  position.avg =
    (position.size * position.avg + sizeChange * price) /
    (position.size + sizeChange);

  position.size += sizeChange;
}

function updatePnL() {
  if (!position.size) return;

  const pnl = (midPrice - position.avg) * position.size;
  marketApproxEl.textContent = `PnL: ${pnl.toFixed(2)} USDT`;
}

/* ===============================
   BUY / SELL TOGGLE
================================= */

buyTab.onclick = () => {
  tradeBox.classList.add("buy");
  tradeBox.classList.remove("sell");
  buyTab.classList.add("active");
  sellTab.classList.remove("active");
  actionBtn.textContent = "Buy BX";
};

sellTab.onclick = () => {
  tradeBox.classList.add("sell");
  tradeBox.classList.remove("buy");
  sellTab.classList.add("active");
  buyTab.classList.remove("active");
  actionBtn.textContent = "Sell BX";
};

/* ===============================
   PERCENT BUTTONS
================================= */

percentBtns.forEach(btn => {
  btn.onclick = () => {
    const percent = parseFloat(btn.dataset.percent);
    const max = wallet.USDT / bestAsk;
    orderAmountInput.value = ((max * percent) / 100).toFixed(4);
  };
});

/* ===============================
   PAIRS
================================= */

pairBtns.forEach(btn => {
  btn.onclick = () => {
    pairBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentQuote = btn.dataset.quote;
    quoteAssetEl.textContent = currentQuote;

    symbol = getSymbol(currentQuote);
    connectDepth();
  };
});

function getSymbol(quote) {
  const map = {
    USDT: "btcusdt",
    USDC: "ethusdt",
    BTC: "bnbusdt",
    ETH: "ethusdt",
    BNB: "bnbusdt",
    SOL: "solusdt",
    AVAX: "avaxusdt",
    LTC: "ltcusdt",
    ZEC: "zecusdt",
    TON: "tonusdt"
  };

  return map[quote] || "btcusdt";
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

/* ===============================
   INIT
================================= */

updateWallet();
connectDepth();
