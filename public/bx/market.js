/* =========================================================
   BX MARKET v4.0 REAL FIXED
   Mobile Safe + Working Chart + OrderBook + Trading
========================================================= */

const ROWS = 15;
const BX_USDT_REFERENCE = 45;

let currentQuote = "USDT";
let marketPrice = BX_USDT_REFERENCE;
let bids = [];
let asks = [];
let tradeSide = "buy";
let quotePriceUSDT = 1;
let marketRunning = false;
let ws = null;

const quoteMap = {
  USDT: null,
  USDC: null,
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

const quoteAssetEl   = document.getElementById("quoteAsset");
const marketPriceEl  = document.getElementById("marketPrice");
const marketApproxEl = document.getElementById("marketApprox");

const walletBXEl     = document.getElementById("walletBX");
const walletUSDTEl   = document.getElementById("walletUSDT");

const buyTab         = document.getElementById("buyTab");
const sellTab        = document.getElementById("sellTab");
const tradeBox       = document.getElementById("tradeBox");
const actionBtn      = document.getElementById("actionBtn");

const orderAmount    = document.getElementById("orderAmount");
const execPriceEl    = document.getElementById("execPrice");
const slippageEl     = document.getElementById("slippage");
const spreadEl       = document.getElementById("spread");

const bidsEl         = document.getElementById("bids");
const asksEl         = document.getElementById("asks");
const priceLadderEl  = document.getElementById("priceLadder");

const pairButtons    = document.querySelectorAll("#market .pair-btn");

/* ================= WALLET ================= */

const wallet = window.WALLET || { BX: 0, USDT: 0 };

async function loadMarketWallet() {
  try {
    const r = await fetch("https://api.bloxio.online/finance/wallet", {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("jwt")
      }
    });

    const w = await r.json();

    wallet.BX = Number(w.bx_balance || 0);
    wallet.USDT = Number(w.usdt_balance || 0);

    updateWalletUI();
  } catch (e) {
    console.warn("Wallet load failed", e);
    updateWalletUI();
  }
}

function updateWalletUI() {
  if (walletBXEl) walletBXEl.textContent = Number(wallet.BX || 0).toFixed(4);
  if (walletUSDTEl) walletUSDTEl.textContent = Number(wallet.USDT || 0).toFixed(4);
}

/* ================= INIT ================= */

function initMarket() {
  if (marketRunning) return;
  marketRunning = true;

  updateWalletUI();
  loadMarketWallet();
  bindEvents();

  marketPrice = BX_USDT_REFERENCE;
  updatePriceUI();

  generateOrderBook();
  renderOrderBook();
  setTradeSide("buy");

  PRO_CHART.init();
  PRO_CHART.reset(marketPrice);
  PRO_CHART.update(marketPrice);

  connectBinance(quoteMap[currentQuote]);
}

/* ================= BINANCE ================= */

function connectBinance(symbol = "btcusdt") {
  if (!symbol) {
    quotePriceUSDT = 1;
    computeBXPrice();
    return;
  }

  if (ws) {
    try {
      ws.onmessage = null;
      ws.close();
    } catch (_) {}
    ws = null;
  }

  ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@miniTicker`);
  window.marketWS = ws;

  ws.onopen = () => {
    console.log("Market WS connected:", symbol);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const price = parseFloat(msg.c);
      if (!price || isNaN(price)) return;

      quotePriceUSDT = price;
      computeBXPrice();
    } catch (e) {
      console.warn("WS parse error", e);
    }
  };

  ws.onerror = () => {
    console.warn("Binance WS error");
  };

  ws.onclose = () => {
    console.log("Market WS closed");
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
  updateTradePreview();

  PRO_CHART.update(marketPrice);
}

/* ================= ORDER BOOK ================= */

function generateOrderBook() {
  bids = [];
  asks = [];

  for (let i = ROWS; i > 0; i--) {
    bids.push({
      price: marketPrice - i * marketPrice * 0.0005,
      amount: +(Math.random() * 5 + 0.2).toFixed(2)
    });
  }

  for (let i = 1; i <= ROWS; i++) {
    asks.push({
      price: marketPrice + i * marketPrice * 0.0005,
      amount: +(Math.random() * 5 + 0.2).toFixed(2)
    });
  }
}

function renderOrderBook() {
  if (!bidsEl || !asksEl || !priceLadderEl) return;

  bidsEl.innerHTML = "";
  asksEl.innerHTML = "";
  priceLadderEl.innerHTML = "";

  bids.slice().reverse().forEach(o => {
    const div = document.createElement("div");
    div.className = "ob-row";
    div.innerHTML = `<span>${o.amount.toFixed(2)}</span><span>${o.price.toFixed(6)}</span>`;
    bidsEl.appendChild(div);
  });

  const mid = document.createElement("div");
  mid.className = "ob-row mid";
  mid.textContent = marketPrice.toFixed(6);
  priceLadderEl.appendChild(mid);

  asks.forEach(o => {
    const div = document.createElement("div");
    div.className = "ob-row";
    div.innerHTML = `<span>${o.price.toFixed(6)}</span><span>${o.amount.toFixed(2)}</span>`;
    asksEl.appendChild(div);
  });

  updateSpread();
  updateTradePreview();
}

function updateSpread() {
  if (!asks.length || !bids.length || !spreadEl) return;
  const spread = asks[0].price - bids[bids.length - 1].price;
  spreadEl.textContent = spread.toFixed(6);
}

/* ================= PRICE ================= */

function updatePriceUI() {
  if (marketPriceEl) marketPriceEl.textContent = marketPrice.toFixed(6);
  if (marketApproxEl) marketApproxEl.textContent = `≈ ${marketPrice.toFixed(2)} ${currentQuote}`;
}

/* ================= TRADE ================= */

function updateTradePreview() {
  if (!execPriceEl || !slippageEl || !orderAmount) return;

  const amount = parseFloat(orderAmount.value || "0");
  const price = tradeSide === "buy"
    ? (asks[0]?.price || marketPrice)
    : (bids[bids.length - 1]?.price || marketPrice);

  execPriceEl.textContent = price.toFixed(6);

  let slippage = 0;
  if (amount > 0) {
    slippage = Math.min(0.75, amount * 0.03);
  }
  slippageEl.textContent = slippage.toFixed(2);
}

async function executeTrade() {
  try {
    const amount = parseFloat(orderAmount.value);

    if (!amount || amount <= 0) {
      alert("Enter valid amount");
      return;
    }

    const pair = `BX/${currentQuote}`;
    const side = tradeSide;
    const price = side === "buy"
      ? (asks[0]?.price || marketPrice)
      : (bids[bids.length - 1]?.price || marketPrice);

    if (side === "buy") {
      const cost = amount * price;
      if (wallet.USDT < cost && currentQuote === "USDT") {
        alert("Insufficient USDT balance");
        return;
      }
    } else {
      if (wallet.BX < amount) {
        alert("Insufficient BX balance");
        return;
      }
    }

    if (typeof safeFetch === "function") {
      const data = await safeFetch("/exchange/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid: window.USER_ID,
          pair,
          side,
          price,
          amount
        })
      });

      if (data?.status) {
        await loadMarketWallet();
      }
    } else {
      // fallback local simulation
      if (side === "buy") {
        wallet.BX += amount;
        if (currentQuote === "USDT") wallet.USDT -= amount * price;
      } else {
        wallet.BX -= amount;
        if (currentQuote === "USDT") wallet.USDT += amount * price;
      }
      updateWalletUI();
    }

    generateOrderBook();
    renderOrderBook();
    PRO_CHART.update(price);

  } catch (e) {
    console.error("Trade error", e);
  }
}

/* ================= SIDE ================= */

function setTradeSide(side) {
  tradeSide = side;

  if (tradeBox) {
    tradeBox.classList.toggle("buy", side === "buy");
    tradeBox.classList.toggle("sell", side === "sell");
  }

  if (buyTab) buyTab.classList.toggle("active", side === "buy");
  if (sellTab) sellTab.classList.toggle("active", side === "sell");

  if (actionBtn) {
    actionBtn.textContent = side === "buy" ? "Buy BX" : "Sell BX";
    actionBtn.classList.toggle("buy", side === "buy");
    actionBtn.classList.toggle("sell", side === "sell");
  }

  updateTradePreview();
}

/* ================= EVENTS ================= */

function bindEvents() {
  pairButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      pairButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentQuote = btn.dataset.quote;
      if (quoteAssetEl) quoteAssetEl.textContent = currentQuote;

      connectBinance(quoteMap[currentQuote]);
      PRO_CHART.reset(marketPrice);
    });
  });

  if (buyTab) buyTab.onclick = () => setTradeSide("buy");
  if (sellTab) sellTab.onclick = () => setTradeSide("sell");
  if (actionBtn) actionBtn.onclick = executeTrade;

  if (orderAmount) {
    orderAmount.addEventListener("input", updateTradePreview);
  }

  document.querySelectorAll(".percent-row button").forEach(btn => {
    btn.onclick = () => {
      const percent = parseInt(btn.dataset.percent || "0");

      if (tradeSide === "buy") {
        const max = wallet.USDT / marketPrice;
        orderAmount.value = ((max * percent) / 100).toFixed(4);
      } else {
        orderAmount.value = ((wallet.BX * percent) / 100).toFixed(4);
      }

      updateTradePreview();
    };
  });
}

/* ======================================================
   PRO CHART ENGINE v5 FIXED
====================================================== */

const PRO_CHART = {
  canvas: null,
  ctx: null,
  tooltip: null,

  candles: [],
  ema: [],
  vwap: [],
  current: null,

  timeframe: 5000,
  maxCandles: 150,
  visibleCount: 60,
  minVisible: 20,
  maxVisible: 150,

  viewMax: null,
  viewMin: null,
  raf: null,

  init() {
    this.canvas = document.getElementById("bxChart");
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    this.tooltip = document.getElementById("chartTooltip");

    this.resize();
    window.addEventListener("resize", () => {
      requestAnimationFrame(() => this.resize());
    });

    this.bindTimeframes();
    this.bindControls();
    this.bindMouse();

    this.reset(BX_USDT_REFERENCE);

    if (!this.raf) {
      this.render();
    }
  },

  resize() {
    const p = this.canvas.parentElement;
    if (!p) return;
    this.canvas.width = p.clientWidth;
    this.canvas.height = p.clientHeight;
  },

  reset(price) {
    this.candles = [];
    this.ema = [];
    this.vwap = [];
    this.current = null;
    this.viewMax = null;
    this.viewMin = null;
    this.bootstrap(price);
  },

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

      if (this.candles.length > this.maxCandles) {
        this.candles.shift();
      }
    } else {
      this.current.high = Math.max(this.current.high, price);
      this.current.low = Math.min(this.current.low, price);
      this.current.close = price;
      this.current.volume++;
    }

    this.calcEMA(14);
    this.calcVWAP();
  },

  calcEMA(period) {
    if (this.candles.length < 2) return;

    const k = 2 / (period + 1);
    this.ema = [];

    let emaPrev = this.candles[0].close;
    for (let i = 0; i < this.candles.length; i++) {
      const close = this.candles[i].close;
      emaPrev = i === 0 ? close : close * k + emaPrev * (1 - k);
      this.ema.push(emaPrev);
    }
  },

  calcVWAP() {
    let pv = 0;
    let vol = 0;
    this.vwap = [];

    for (const c of this.candles) {
      const typical = (c.high + c.low + c.close) / 3;
      pv += typical * c.volume;
      vol += c.volume;
      this.vwap.push(vol ? pv / vol : typical);
    }
  },

  render() {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const visible = this.candles.slice(-this.visibleCount);

    if (visible.length >= 1) {
      const highs = visible.map(c => c.high);
      const lows = visible.map(c => c.low);

      let max = Math.max(...highs);
      let min = Math.min(...lows);

      if (Math.abs(max - min) < 0.0000001) {
        max += 0.0001;
        min -= 0.0001;
      }

      const padding = (max - min) * 0.15;
      max += padding;
      min -= padding;

      if (this.viewMax === null || this.viewMin === null) {
        this.viewMax = max;
        this.viewMin = min;
      }

      this.viewMax += (max - this.viewMax) * 0.08;
      this.viewMin += (min - this.viewMin) * 0.08;

      const scaleY = p =>
        h - ((p - this.viewMin) / (this.viewMax - this.viewMin)) * (h - 30);

      const candleWidth = Math.max(4, w / visible.length);

      // GRID
      ctx.strokeStyle = "rgba(255,255,255,.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const y = (h / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // CANDLES
      visible.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const openY = scaleY(c.open);
        const closeY = scaleY(c.close);
        const highY = scaleY(c.high);
        const lowY = scaleY(c.low);
        const up = c.close >= c.open;

        ctx.strokeStyle = up ? "#21c87a" : "#ff4d4f";
        ctx.fillStyle = up ? "#21c87a" : "#ff4d4f";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(openY - closeY));

        ctx.fillRect(
          x - candleWidth * 0.28,
          bodyY,
          candleWidth * 0.56,
          bodyH
        );
      });

      // EMA
      const visibleEMA = this.ema.slice(-visible.length);
      if (visibleEMA.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#f4c430";
        ctx.lineWidth = 1.5;
        visibleEMA.forEach((v, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(v);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }

      // VWAP
      const visibleVWAP = this.vwap.slice(-visible.length);
      if (visibleVWAP.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 1.5;
        visibleVWAP.forEach((v, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const y = scaleY(v);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    }

    this.raf = requestAnimationFrame(() => this.render());
  },

  bindTimeframes() {
    document.querySelectorAll(".tf-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".tf-btn")
          .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        const days = parseInt(btn.dataset.days || "1");
        this.visibleCount = Math.min(this.maxVisible, Math.max(this.minVisible, days * 20));
      };
    });
  },

  bindControls() {
    const zoomIn = document.getElementById("zoomIn");
    const zoomOut = document.getElementById("zoomOut");
    const reset = document.getElementById("resetView");

    if (zoomIn) {
      zoomIn.onclick = () => {
        this.visibleCount = Math.max(this.minVisible, this.visibleCount - 10);
      };
    }

    if (zoomOut) {
      zoomOut.onclick = () => {
        this.visibleCount = Math.min(this.maxVisible, this.visibleCount + 10);
      };
    }

    if (reset) {
      reset.onclick = () => {
        this.visibleCount = 60;
        this.viewMax = null;
        this.viewMin = null;
      };
    }
  },

  bindMouse() {
    if (!this.canvas || !this.tooltip) return;

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const visible = this.candles.slice(-this.visibleCount);
      if (!visible.length) return;

      const idx = Math.floor((x / this.canvas.width) * visible.length);
      const c = visible[idx];
      if (!c) return;

      this.tooltip.style.display = "block";
      this.tooltip.style.left = e.clientX + "px";
      this.tooltip.style.top = e.clientY + "px";

      this.tooltip.innerHTML = `
        O: ${c.open.toFixed(4)}<br>
        H: ${c.high.toFixed(4)}<br>
        L: ${c.low.toFixed(4)}<br>
        C: ${c.close.toFixed(4)}
      `;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.tooltip.style.display = "none";
    });
  }
};

/* ================= START ================= */

window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Market starting...");
  initMarket();
});
