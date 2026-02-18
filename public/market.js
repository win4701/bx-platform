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

  marketPrice = BX_USDT_REFERENCE;
  BX_CHART.init();

  const now = Date.now();

  for (let i = 0; i < 120; i++) {
  BX_CHART.history.push({
    open: marketPrice,
    high: marketPrice,
    low: marketPrice,
    close: marketPrice,
    volume: 1,
    time: now - (120 - i) * 60000
  });
}

BX_CHART.rebuild();
}

/* ================= BINANCE TICKER ================= */

let ws = null;

function connectBinance(symbol = "btcusdt") {

  if (ws) ws.close();

  ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`
  );

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    quotePriceUSDT = parseFloat(msg.c);

    computeBXPrice();
  };

  ws.onerror = () => {
    console.log("Binance WS error");
  };
}

function computeBXPrice() {

  if (!quotePriceUSDT || quotePriceUSDT <= 0) return;

  if (currentQuote === "USDT" || currentQuote === "USDC") {
    marketPrice = BX_USDT_REFERENCE;
  } else {
    marketPrice = BX_USDT_REFERENCE / quotePriceUSDT;
  }

  updatePriceUI();
  generateOrderBook();
  renderOrderBook();

  BX_CHART.updateTick(marketPrice, 1);
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

      connectBinance(quoteMap[currentQuote]);

       BX_CHART.history = [];
       BX_CHART.candles = [];
       BX_CHART.viewMin = null;
       BX_CHART.viewMax = null;
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
====================================================== */

const BX_CHART = {

  canvas: null,
  ctx: null,

  width: 0,
  height: 0,

  history: [],        // raw minute data
  candles: [],        // visible aggregated
  indicators: {},

  timeframeDays: 1,
  maxVisible: 80,

  viewMin: null,
  viewMax: null,

  zoom: 1,
  offset: 0,

  init() {

    this.canvas = document.getElementById("bxChart");
    this.ctx = this.canvas.getContext("2d");

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.bindInteraction();
    requestAnimationFrame(() => this.render());
  },

  resize() {
    const p = this.canvas.parentElement;
    this.width = this.canvas.width = p.clientWidth;
    this.height = this.canvas.height = p.clientHeight;
  },

  /* ================= DATA ENGINE ================= */

  updateTick(price, volume = 1, time = Date.now()) {

  this.history.push({
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
    time
  });

  if (this.history.length > 2000)
    this.history.shift();
  }
  /* ================= TIMEFRAME ENGINE ================= */

  setTimeframe(days) {
    this.timeframeDays = days;
    this.rebuild();
  },

  rebuild() {

    const minutesPerDay = 1440;
    const group = this.timeframeDays * minutesPerDay;

    const result = [];

    for (let i = 0; i < this.history.length; i += group) {

      const slice = this.history.slice(i, i + group);
      if (!slice.length) continue;

      result.push({
        open: slice[0].open,
        close: slice[slice.length - 1].close,
        high: Math.max(...slice.map(c => c.high)),
        low: Math.min(...slice.map(c => c.low)),
        volume: slice.reduce((a, b) => a + b.volume, 0),
        time: slice[0].time
      });
    }

    this.candles = result.slice(-this.maxVisible);
    this.calculateIndicators();
  },

  /* ================= INDICATORS ================= */

  calculateIndicators() {
    this.indicators.ema = this.calcEMA(14);
    this.indicators.vwap = this.calcVWAP();
  },

  calcEMA(period) {

    const k = 2 / (period + 1);
    const ema = [];

    let prev = this.candles[0]?.close || 0;

    for (let i = 0; i < this.candles.length; i++) {

      const val =
        i === 0
          ? prev
          : this.candles[i].close * k +
            prev * (1 - k);

      ema.push(val);
      prev = val;
    }

    return ema;
  },

  calcVWAP() {

    let pv = 0;
    let vol = 0;
    const vwap = [];

    for (let c of this.candles) {

      const typical =
        (c.high + c.low + c.close) / 3;

      pv += typical * c.volume;
      vol += c.volume;

      vwap.push(vol ? pv / vol : typical);
    }

    return vwap;
  },

  /* ================= SCALE ENGINE ================= */

  computeScale() {

    const highs = this.candles.map(c => c.high);
    const lows  = this.candles.map(c => c.low);

    let max = Math.max(...highs);
    let min = Math.min(...lows);

    const padding = (max - min) * 0.1;

    max += padding;
    min -= padding;

    if (!this.viewMax) {
      this.viewMax = max;
      this.viewMin = min;
    }

    this.viewMax += (max - this.viewMax) * 0.1;
    this.viewMin += (min - this.viewMin) * 0.1;
  },

  /* ================= RENDER ENGINE ================= */

  render() {

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
     
    if (this.candles.length !== this.history.length) {
      this.rebuild();
    }

    if (!this.candles.length) {
      requestAnimationFrame(() => this.render());
      return;
    }

    this.computeScale();

    this.drawGrid();
    this.drawCandles();
    this.drawIndicators();
    this.drawPriceScale();
    this.drawTimeScale();

    requestAnimationFrame(() => this.render());
  },

  scaleY(p) {
    return this.height -
      ((p - this.viewMin) /
      (this.viewMax - this.viewMin)) *
      (this.height - 40);
  },

  drawGrid() {

    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";

    const rows = 6;
    const cols = 6;

    for (let i = 0; i <= rows; i++) {
      const y = (this.height / rows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    for (let i = 0; i <= cols; i++) {
      const x = (this.width / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
  },

  drawCandles() {

    const ctx = this.ctx;
    const cw = this.width / this.candles.length;

    this.candles.forEach((c, i) => {

      const x = i * cw + cw / 2;

      const openY  = this.scaleY(c.open);
      const closeY = this.scaleY(c.close);
      const highY  = this.scaleY(c.high);
      const lowY   = this.scaleY(c.low);

      const up = c.close >= c.open;

      ctx.strokeStyle = up ? "#00c896" : "#ff4d4f";
      ctx.fillStyle   = up ? "#00c896" : "#ff4d4f";

      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      ctx.fillRect(
        x - cw * 0.3,
        Math.min(openY, closeY),
        cw * 0.6,
        Math.max(1, Math.abs(openY - closeY))
      );
    });
  },

  drawIndicators() {

    const ctx = this.ctx;
    const cw = this.width / this.candles.length;

    ctx.strokeStyle = "#f4c430";
    ctx.beginPath();

    this.indicators.ema.forEach((v, i) => {
      const x = i * cw + cw / 2;
      const y = this.scaleY(v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });

    ctx.stroke();
  },

  drawPriceScale() {

    const ctx = this.ctx;
    ctx.fillStyle = "#888";
    ctx.font = "11px Arial";

    const steps = 6;

    for (let i = 0; i <= steps; i++) {

      const price =
        this.viewMin +
        ((this.viewMax - this.viewMin) / steps) * i;

      const y =
        this.height -
        (this.height / steps) * i;

      ctx.fillText(
        price.toFixed(4),
        this.width - 60,
        y
      );
    }
  },

  drawTimeScale() {

    const ctx = this.ctx;
    ctx.fillStyle = "#666";
    ctx.font = "10px Arial";

    const step =
      Math.floor(this.candles.length / 6);

    for (let i = 0; i < this.candles.length; i += step) {

      const x =
        (i / this.candles.length) *
        this.width;

      const date =
        new Date(this.candles[i].time);

      ctx.fillText(
        date.toLocaleDateString(),
        x,
        this.height - 5
      );
    }
  },

  /* ================= INTERACTION ================= */

  bindInteraction() {

    this.canvas.addEventListener("wheel", e => {

      e.preventDefault();

      this.zoom += e.deltaY > 0 ? 0.1 : -0.1;
      this.zoom = Math.max(0.5, Math.min(3, this.zoom));
    });
  }
};
