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
  PRO_CHART.init();
  this.bindControls();
}

/* ================= BINANCE TICKER ================= */

let ws = null;

function connectBinance(symbol = "btcusdt") {

  if (ws) {
    ws.onmessage = null;
    ws.close();
    ws = null;
  }

  ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`
  );

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const price = parseFloat(msg.c);
    if (!price) return;

    quotePriceUSDT = price;
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

  PRO_CHART.update(marketPrice);
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

      pairButtons.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      currentQuote = btn.dataset.quote;
      quoteAssetEl.textContent = currentQuote;

      connectBinance(quoteMap[currentQuote]);

      PRO_CHART.reset(marketPrice);
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

const PRO_CHART = {
  canvas: null,
  ctx: null,
  tooltip: null,
  viewMax: null,
  viewMin: null,

  candles: [],
  ema: [],
  vwap: [],

  timeframe: 5000, // Default timeframe (in ms)
  maxCandles: 150, // Max candles that can be shown
  current: null,
  visibleCount: 60, // Number of candles visible on the chart
  minVisible: 20,   // Minimum candles visible
  maxVisible: 150,  // Maximum candles visible

  init() {
    this.canvas = document.getElementById("bxChart");
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    this.tooltip = document.getElementById("chartTooltip");

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.bindTimeframes();
    this.bindMouse();
    this.bindControls(); // Bind zoom and reset controls
    this.reset(38); // Set default price on initialization

    requestAnimationFrame(() => this.render());
  },

  // Reset the chart and prepare for new data
  reset(price) {
    this.candles = [];
    this.ema = [];
    this.vwap = [];
    this.current = null;
    this.viewMax = null;
    this.viewMin = null;
    this.bootstrap(price);
  },

  resize() {
    const p = this.canvas.parentElement;
    this.canvas.width = p.clientWidth;
    this.canvas.height = p.clientHeight;
  },

  // Initialize first candle
  bootstrap(price) {
    this.current = {
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 1,
      time: Date.now()
    };
    this.candles.push(this.current);
  },

  // Update the chart with new price data
  update(price) {
    if (!price || price <= 0) return;

    if (!this.current) {
      this.bootstrap(price);
      return;
    }

    const now = Date.now();

    if (now - this.current.time > this.timeframe) {
      this.current = {
        open: this.current.close,
        high: price,
        low: price,
        close: price,
        volume: 1,
        time: now
      };

      this.candles.push(this.current);

      if (this.candles.length > this.maxCandles)
        this.candles.shift();
    } else {
      this.current.high = Math.max(this.current.high, price);
      this.current.low = Math.min(this.current.low, price);
      this.current.close = price;
      this.current.volume++;
    }

    this.calcEMA(14);
    this.calcVWAP();
  },

  // Calculate the Exponential Moving Average (EMA)
  calcEMA(period) {
    if (this.candles.length < period) return;

    const k = 2 / (period + 1);
    this.ema = [];
    let emaPrev = this.candles[0].close;

    for (let i = 0; i < this.candles.length; i++) {
      if (i === 0) {
        this.ema.push(emaPrev);
      } else {
        const val = this.candles[i].close * k + emaPrev * (1 - k);
        this.ema.push(val);
        emaPrev = val;
      }
    }
  },

  // Calculate the Volume-Weighted Average Price (VWAP)
  calcVWAP() {
    let pv = 0;
    let vol = 0;
    this.vwap = [];

    for (let c of this.candles) {
      const typical = (c.high + c.low + c.close) / 3;
      pv += typical * c.volume;
      vol += c.volume;
      this.vwap.push(vol ? pv / vol : typical);
    }
  },

  // Render the chart with current data
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const visible = this.candles.slice(-this.visibleCount);

    if (visible.length < 2) {
      requestAnimationFrame(() => this.render());
      return;
    }

    const highs = visible.map(c => c.high);
    const lows = visible.map(c => c.low);

    let max = Math.max(...highs);
    let min = Math.min(...lows);

    if (Math.abs(max - min) < 0.0000001) {
      max += 0.0001;
      min -= 0.0001;
    }

    const padding = (max - min) * 0.1;
    max += padding;
    min -= padding;

    if (!this.viewMax) {
      this.viewMax = max;
      this.viewMin = min;
    }

    this.viewMax += (max - this.viewMax) * 0.1;
    this.viewMin += (min - this.viewMin) * 0.1;

    const scaleY = p =>
      h - ((p - this.viewMin) / (this.viewMax - this.viewMin)) * (h - 40);

    const candleWidth = w / this.maxVisible;

    // Drawing candles
    this.candles.forEach((c, i) => {
      const x = i * candleWidth + candleWidth / 2;
      const openY = scaleY(c.open);
      const closeY = scaleY(c.close);
      const highY = scaleY(c.high);
      const lowY = scaleY(c.low);
      const up = c.close >= c.open;

      ctx.strokeStyle = up ? "#21c87a" : "#ff4d4f";
      ctx.fillStyle = up ? "#21c87a" : "#ff4d4f";

      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      ctx.fillRect(
        x - candleWidth * 0.3,
        Math.min(openY, closeY),
        candleWidth * 0.6,
        Math.max(1, Math.abs(openY - closeY))
      );
    });

    // EMA and VWAP lines
    if (this.ema.length) {
      ctx.beginPath();
      ctx.strokeStyle = "#f4c430";
      this.ema.forEach((v, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = scaleY(v);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }

    if (this.vwap.length) {
      ctx.beginPath();
      ctx.strokeStyle = "#a855f7";
      this.vwap.forEach((v, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = scaleY(v);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }

    requestAnimationFrame(() => this.render());
  },

  // Timeframe and Zoom controls
  bindTimeframes() {
    document.querySelectorAll(".tf-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".tf-btn")
          .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");
        const days = parseInt(btn.dataset.days);
        this.visibleCount = Math.min(this.maxVisible, days * 24);
      };
    });
  },

  bindControls() {
    const zoomIn = document.getElementById("zoomIn");
    const zoomOut = document.getElementById("zoomOut");
    const reset = document.getElementById("resetView");

    zoomIn.onclick = () => {
      this.visibleCount = Math.max(this.minVisible, this.visibleCount - 10);
    };

    zoomOut.onclick = () => {
      this.visibleCount = Math.min(this.maxVisible, this.visibleCount + 10);
    };

    reset.onclick = () => {
      this.visibleCount = 60;
    };
  },

  bindMouse() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.floor((x / this.canvas.width) * this.candles.length);
      const c = this.candles[idx];
      if (!c) return;

      this.tooltip.style.display = "block";
      this.tooltip.style.left = e.clientX + "px";
      this.tooltip.style.top = e.clientY + "px";

      this.tooltip.innerHTML =
        `O: ${c.open.toFixed(4)}<br>
         H: ${c.high.toFixed(4)}<br>
         L: ${c.low.toFixed(4)}<br>
         C: ${c.close.toFixed(4)}`;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.tooltip.style.display = "none";
    });
  }
};
