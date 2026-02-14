/* =========================================================
   BX MARKET ENGINE — FINAL HTML MATCH VERSION
   Works ONLY with provided market.html structure
   No fake DOM
   No extra elements
========================================================= */

const ROWS = 15;
const BASE_ASSET = "BX";

let currentQuote = "USDT";
let marketPrice = 38.00;
let bids = [];
let asks = [];
let tradeSide = "buy";

/* ===============================
   DOM
================================= */
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

/* ===============================
   Wallet Simulation
================================= */
let wallet = {
  BX: 0,
  USDT: 1000
};

/* ===============================
   INIT
================================= */
function init() {
  updateWalletUI();
  generateOrderBook();
  renderOrderBook();
  updatePriceUI();
  bindEvents();
  startTicker();
  resizeCanvas();
  drawChart();
}

document.addEventListener("DOMContentLoaded", init);

/* ===============================
   PAIR SWITCH
================================= */
function switchPair(quote) {
  currentQuote = quote;
  quoteAssetEl.textContent = quote;

  pairButtons.forEach(btn => btn.classList.remove("active"));
  document.querySelector(`[data-quote="${quote}"]`).classList.add("active");

  generateOrderBook();
  renderOrderBook();
}

/* ===============================
   ORDERBOOK GENERATION
================================= */
function generateOrderBook() {
  bids = [];
  asks = [];

  for (let i = 0; i < ROWS; i++) {
    bids.push((marketPrice - i * 0.02).toFixed(6));
    asks.push((marketPrice + i * 0.02).toFixed(6));
  }
}

function renderOrderBook() {
  bidsEl.innerHTML = "";
  asksEl.innerHTML = "";
  priceLadderEl.innerHTML = "";

  for (let i = 0; i < ROWS; i++) {
    const bidRow = document.createElement("div");
    bidRow.textContent = bids[i];
    bidsEl.appendChild(bidRow);

    const askRow = document.createElement("div");
    askRow.textContent = asks[i];
    asksEl.appendChild(askRow);

    const priceRow = document.createElement("div");
    priceRow.textContent = i === 0 ? marketPrice.toFixed(6) : "";
    priceLadderEl.appendChild(priceRow);
  }

  updateSpread();
}

/* ===============================
   PRICE + SPREAD
================================= */
function updateSpread() {
  const bestBid = parseFloat(bids[0]);
  const bestAsk = parseFloat(asks[0]);
  const spread = bestAsk - bestBid;
  spreadEl.textContent = spread.toFixed(6);
}

function updatePriceUI() {
  marketPriceEl.textContent = marketPrice.toFixed(6);
  marketApproxEl.textContent = `≈ ${marketPrice.toFixed(2)} ${currentQuote}`;
}

/* ===============================
   TRADE LOGIC
================================= */
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

/* ===============================
   WALLET UI
================================= */
function updateWalletUI() {
  walletBXEl.textContent = wallet.BX.toFixed(4);
  walletUSDTEl.textContent = wallet.USDT.toFixed(2);
}

/* ===============================
   TABS
================================= */
function setTradeSide(side) {
  tradeSide = side;

  if (side === "buy") {
    tradeBox.classList.add("buy");
    tradeBox.classList.remove("sell");
    buyTab.classList.add("active");
    sellTab.classList.remove("active");
    actionBtn.textContent = "Buy BX";
    actionBtn.classList.add("buy");
    actionBtn.classList.remove("sell");
  } else {
    tradeBox.classList.add("sell");
    tradeBox.classList.remove("buy");
    sellTab.classList.add("active");
    buyTab.classList.remove("active");
    actionBtn.textContent = "Sell BX";
    actionBtn.classList.add("sell");
    actionBtn.classList.remove("buy");
  }
}

/* ===============================
   EVENTS
================================= */
function bindEvents() {
  pairButtons.forEach(btn =>
    btn.addEventListener("click", () =>
      switchPair(btn.dataset.quote)
    )
  );

  buyTab.addEventListener("click", () => setTradeSide("buy"));
  sellTab.addEventListener("click", () => setTradeSide("sell"));

  actionBtn.addEventListener("click", executeTrade);

  document.querySelectorAll(".percent-row button").forEach(btn => {
    btn.addEventListener("click", () => {
      const percent = parseInt(btn.dataset.percent);
      const amount = (wallet.USDT / marketPrice) * (percent / 100);
      orderAmount.value = amount.toFixed(4);
    });
  });
}

/* ===============================
   TICKER SIMULATION
================================= */
function startTicker() {
  setInterval(() => {
    marketPrice += (Math.random() - 0.5) * 0.05;
    generateOrderBook();
    renderOrderBook();
    updatePriceUI();
    drawChart();
  }, 1500);
}

/* ===============================
   CHART
================================= */
function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 200;
}

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#21c87a";
  ctx.beginPath();

  for (let i = 0; i < canvas.width; i++) {
    const y =
      canvas.height / 2 +
      Math.sin(i * 0.02 + marketPrice) * 20;
    ctx.lineTo(i, y);
  }

  ctx.stroke();
}
