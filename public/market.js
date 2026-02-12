(function () {
"use strict";

/* ================= CONFIG ================= */

const CONFIG = {
  symbol: "btcusdt",
  depthRows: 15
};

/* ================= STATE ================= */

const STATE = {
  price: 0,
  bestBid: 0,
  bestAsk: 0,
  spread: 0,
  side: "BUY",
  wallet: { BX: 0, USDT: 1000 },
  positions: [],
  orderBook: { bids: [], asks: [] }
};

/* ================= DOM ================= */

const el = {
  price: document.getElementById("livePrice"),
  spread: document.getElementById("spreadValue"),
  bids: document.getElementById("bids"),
  asks: document.getElementById("asks"),
  buyTab: document.getElementById("buyTab"),
  sellTab: document.getElementById("sellTab"),
  tradeBtn: document.getElementById("tradeActionBtn"),
  amountInput: document.getElementById("amountInput"),
  walletBX: document.getElementById("walletBX"),
  walletUSDT: document.getElementById("walletUSDT"),
  positions: document.getElementById("positionsTable"),
  pnl: document.getElementById("pnlValue"),
  chart: document.getElementById("marketChart")
};

/* ================= INIT ================= */

function init() {
  bindUI();
  connectDepth();
  connectTrades();
  updateWallet();
}

/* ================= BINANCE DEPTH ================= */

function connectDepth() {
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${CONFIG.symbol}@depth20@100ms`
  );

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    STATE.orderBook.bids = data.bids.slice(0, CONFIG.depthRows);
    STATE.orderBook.asks = data.asks.slice(0, CONFIG.depthRows);

    if (!STATE.orderBook.bids.length || !STATE.orderBook.asks.length) return;

    STATE.bestBid = parseFloat(STATE.orderBook.bids[0][0]);
    STATE.bestAsk = parseFloat(STATE.orderBook.asks[0][0]);

    STATE.price = (STATE.bestBid + STATE.bestAsk) / 2;
    STATE.spread = STATE.bestAsk - STATE.bestBid;

    render();
  };
}

/* ================= BINANCE TRADES ================= */

function connectTrades() {
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${CONFIG.symbol}@trade`
  );

  ws.onmessage = (msg) => {
    const trade = JSON.parse(msg.data);
    STATE.price = parseFloat(trade.p);
    renderPrice();
    renderPnL();
    drawChart();
  };
}

/* ================= RENDER ================= */

function render() {
  renderPrice();
  renderBook();
  renderPnL();
  drawChart();
}

function renderPrice() {
  if (el.price) el.price.textContent = STATE.price.toFixed(6);
  if (el.spread) el.spread.textContent = STATE.spread.toFixed(6);
}

function renderBook() {
  if (!el.bids || !el.asks) return;

  el.bids.innerHTML = "";
  el.asks.innerHTML = "";

  STATE.orderBook.bids.forEach(b => {
    const row = document.createElement("div");
    row.className = "book-row bid";
    row.textContent = parseFloat(b[0]).toFixed(6);
    row.onclick = () => fillPrice(parseFloat(b[0]));
    el.bids.appendChild(row);
  });

  STATE.orderBook.asks.forEach(a => {
    const row = document.createElement("div");
    row.className = "book-row ask";
    row.textContent = parseFloat(a[0]).toFixed(6);
    row.onclick = () => fillPrice(parseFloat(a[0]));
    el.asks.appendChild(row);
  });
}

/* ================= EXECUTION ================= */

function executeTrade() {
  const qty = parseFloat(el.amountInput?.value);
  if (!qty || qty <= 0) return;

  const execPrice =
    STATE.side === "BUY" ? STATE.bestAsk : STATE.bestBid;

  const cost = qty * execPrice;
  const slippage = Math.abs(execPrice - STATE.price);

  if (STATE.side === "BUY") {
    if (STATE.wallet.USDT < cost) return alert("Insufficient USDT");
    STATE.wallet.USDT -= cost;
    STATE.wallet.BX += qty;
    STATE.positions.push({ side: "BUY", qty, entry: execPrice });
  } else {
    if (STATE.wallet.BX < qty) return alert("Insufficient BX");
    STATE.wallet.BX -= qty;
    STATE.wallet.USDT += cost;
  }

  console.log("Slippage:", slippage.toFixed(6));
  updateWallet();
  renderPositions();
}

function fillPrice(price) {
  if (el.amountInput) el.amountInput.focus();
}

/* ================= POSITIONS ================= */

function renderPositions() {
  if (!el.positions) return;

  el.positions.innerHTML = "";

  STATE.positions.forEach(p => {
    const row = document.createElement("div");
    row.className = "position-row";
    row.innerHTML = `
      <span>${p.side}</span>
      <span>${p.qty}</span>
      <span>${p.entry.toFixed(4)}</span>
    `;
    el.positions.appendChild(row);
  });
}

function renderPnL() {
  if (!el.pnl) return;

  let total = 0;
  STATE.positions.forEach(p => {
    total += (STATE.price - p.entry) * p.qty;
  });

  el.pnl.textContent = total.toFixed(4);
}

/* ================= WALLET ================= */

function updateWallet() {
  if (el.walletBX) el.walletBX.textContent = STATE.wallet.BX.toFixed(4);
  if (el.walletUSDT) el.walletUSDT.textContent = STATE.wallet.USDT.toFixed(2);
}

/* ================= CHART ================= */

let chartData = [];

function drawChart() {
  if (!el.chart) return;

  const ctx = el.chart.getContext("2d");
  el.chart.width = el.chart.clientWidth;
  el.chart.height = el.chart.clientHeight;

  chartData.push(STATE.price);
  if (chartData.length > 100) chartData.shift();

  ctx.clearRect(0, 0, el.chart.width, el.chart.height);

  if (chartData.length < 2) return;

  const min = Math.min(...chartData);
  const max = Math.max(...chartData);
  const range = max - min || 1;

  ctx.beginPath();
  ctx.strokeStyle = "#16c784";
  ctx.lineWidth = 2;

  chartData.forEach((p, i) => {
    const x = (i / chartData.length) * el.chart.width;
    const y =
      el.chart.height -
      ((p - min) / range) * el.chart.height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

/* ================= UI ================= */

function bindUI() {
  el.buyTab?.addEventListener("click", () => {
    STATE.side = "BUY";
    if (el.tradeBtn) el.tradeBtn.textContent = "Buy BX";
  });

  el.sellTab?.addEventListener("click", () => {
    STATE.side = "SELL";
    if (el.tradeBtn) el.tradeBtn.textContent = "Sell BX";
  });

  el.tradeBtn?.addEventListener("click", executeTrade);
}

/* ================= START ================= */

init();

})();
