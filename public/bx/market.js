/* =========================================================
   BX MARKET PRO FINAL (STABLE + FIXED BX PRICE)
========================================================= */

const ROWS = 15;
const BX_USDT_REFERENCE = 45;

let currentQuote = "USDT";
let marketPrice = BX_USDT_REFERENCE;
let bids = [];
let asks = [];
let tradeSide = "buy";
let quotePriceUSDT = 1;

let ws = null;
let marketInitialized = false;

/* ================= QUOTES ================= */

const quoteMap = {
  USDT: null,
  USDC: null,
  BTC: "btcusdt",
  ETH: "ethusdt",
  BNB: "bnbusdt",
  SOL: "solusdt"
};

/* ================= WALLET ================= */

const wallet = {
  BX: 0,
  USDT: 0
};

async function loadMarketWallet(){

  const r = await safeFetch("/finance/wallet");
  if(!r) return;

  wallet.BX = r.bx_balance || 0;
  wallet.USDT = r.usdt_balance || 0;

  updateWalletUI();
}

/* ================= INIT ================= */

function initMarket(){

  if(marketInitialized) return;
  marketInitialized = true;

  bindEvents();
  loadMarketWallet();

  connectBinance(quoteMap[currentQuote]);

  marketPrice = BX_USDT_REFERENCE;

  generateOrderBook();
  renderOrderBook();

  PRO_CHART.init();
  PRO_CHART.reset(marketPrice);
  PRO_CHART.update(marketPrice);
  PRO_CHART.render();
}

/* ================= BINANCE WS ================= */

function connectBinance(symbol = "btcusdt") {

  if(window.marketWS){
    window.marketWS.close();
  }

  if (!symbol) {
    quotePriceUSDT = 1;
    computeBXPrice();
    return;
  }

  ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`
  );

  window.marketWS = ws;

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const price = parseFloat(msg.c);
    if (!price) return;

    quotePriceUSDT = price;
    computeBXPrice();
  };

  ws.onerror = () => {
    console.log("WS error");
  };
}

/* ================= PRICE ENGINE ================= */

function computeBXPrice() {

  if (!quotePriceUSDT || quotePriceUSDT <= 0) return;

  let target;

  if (currentQuote === "USDT" || currentQuote === "USDC") {
    target = BX_USDT_REFERENCE;
  } else {
    target = BX_USDT_REFERENCE / quotePriceUSDT;
  }

  // 🔥 smooth price
  marketPrice = marketPrice * 0.9 + target * 0.1;

  updatePriceUI();
  generateOrderBook();
  renderOrderBook();

  PRO_CHART.update(marketPrice);
}

/* ================= ORDERBOOK ================= */

function generateOrderBook() {

  bids = [];
  asks = [];

  const spread = marketPrice * 0.001;

  for (let i = ROWS; i > 0; i--) {
    bids.push({
      price: marketPrice - i * spread,
      amount: (Math.random() * 5).toFixed(2)
    });
  }

  for (let i = 1; i <= ROWS; i++) {
    asks.push({
      price: marketPrice + i * spread,
      amount: (Math.random() * 5).toFixed(2)
    });
  }
}

function renderOrderBook(){

  bidsEl.innerHTML="";
  asksEl.innerHTML="";
  priceLadderEl.innerHTML="";

  bids.forEach(o=>{
    const div=document.createElement("div");
    div.className="ob-row bid";
    div.innerHTML=`<span>${o.amount}</span><span>${o.price.toFixed(6)}</span>`;
    bidsEl.appendChild(div);
  });

  const mid=document.createElement("div");
  mid.className="ob-row mid";
  mid.textContent=marketPrice.toFixed(6);
  priceLadderEl.appendChild(mid);

  asks.forEach(o=>{
    const div=document.createElement("div");
    div.className="ob-row ask";
    div.innerHTML=`<span>${o.price.toFixed(6)}</span><span>${o.amount}</span>`;
    asksEl.appendChild(div);
  });

  updateSpread();
}

function updateSpread(){
  if(!asks.length || !bids.length) return;
  const spread = asks[0].price - bids[0].price;
  spreadEl.textContent = spread.toFixed(6);
}

/* ================= PRICE UI ================= */

function updatePriceUI() {
  marketPriceEl.textContent = marketPrice.toFixed(6);
  marketApproxEl.textContent =
    `≈ ${marketPrice.toFixed(2)} ${currentQuote}`;
}

/* ================= TRADE ================= */

async function executeTrade(){

  const amount = parseFloat(orderAmount.value);
  if(!amount || amount <= 0) return;

  const price =
    tradeSide === "buy"
      ? asks[0].price
      : bids[0].price;

  const res = await safeFetch("/exchange/order",{
    method:"POST",
    body: JSON.stringify({
      pair:`BX/${currentQuote}`,
      side:tradeSide,
      price,
      amount
    })
  });

  if(res && res.status){
    await loadMarketWallet();
    generateOrderBook();
    renderOrderBook();
    PRO_CHART.update(price);
  }
}

/* ================= EVENTS ================= */

function bindEvents(){

  pairButtons.forEach(btn => {

    btn.onclick = () => {

      pairButtons.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      currentQuote = btn.dataset.quote;
      quoteAssetEl.textContent = currentQuote;

      connectBinance(quoteMap[currentQuote]);

      PRO_CHART.reset(marketPrice);
    };

  });

  buyTab.onclick = ()=> setTradeSide("buy");
  sellTab.onclick = ()=> setTradeSide("sell");
  actionBtn.onclick = executeTrade;
}

/* ================= SIDE ================= */

function setTradeSide(side){

  tradeSide = side;

  tradeBox.classList.toggle("buy", side === "buy");
  tradeBox.classList.toggle("sell", side === "sell");

  buyTab.classList.toggle("active", side === "buy");
  sellTab.classList.toggle("active", side === "sell");

  actionBtn.textContent =
    side === "buy" ? "Buy BX" : "Sell BX";
}

/* ======================================================
   BX INSTITUTIONAL CHART ENGINE v5 (OPTIMIZED)
====================================================== */

const PRO_CHART = {

  canvas: null,
  ctx: null,

  candles: [],
  ema: [],
  vwap: [],

  current: null,

  timeframe: 5000,
  maxCandles: 200,
  visibleCount: 80,

  lastRender: 0,
  renderFPS: 30,

  viewMax: null,
  viewMin: null,

  /* ================= INIT ================= */

  init(){

    this.canvas = document.getElementById("bxChart");
    if(!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");

    this.resize();

    window.addEventListener("resize", ()=>this.resize());

    this.reset(45);
    this.start();
  },

  resize(){

    const p = this.canvas.parentElement;
    this.canvas.width = p.clientWidth;
    this.canvas.height = p.clientHeight;

  },

  /* ================= RESET ================= */

  reset(price){

    this.candles = [];
    this.ema = [];
    this.vwap = [];

    this.current = null;

    this.viewMax = null;
    this.viewMin = null;

    this.bootstrap(price);

  },

  bootstrap(price){

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

  /* ================= UPDATE ================= */

  update(price){

    if(!price) return;

    const now = Date.now();

    if(!this.current){
      this.bootstrap(price);
      return;
    }

    if(now - this.current.time > this.timeframe){

      this.current = {
        open: this.current.close,
        high: price,
        low: price,
        close: price,
        volume: 1,
        time: now
      };

      this.candles.push(this.current);

      if(this.candles.length > this.maxCandles){
        this.candles.shift();
      }

    } else {

      this.current.high = Math.max(this.current.high, price);
      this.current.low = Math.min(this.current.low, price);
      this.current.close = price;
      this.current.volume++;

    }

    this.calcEMAFast();
    this.calcVWAPFast();

  },

  /* ================= FAST EMA ================= */

  calcEMAFast(){

    const period = 14;

    if(this.candles.length < period) return;

    const k = 2 / (period + 1);

    const last = this.candles.at(-1).close;

    if(!this.ema.length){
      this.ema.push(last);
      return;
    }

    const prev = this.ema.at(-1);
    const next = last * k + prev * (1 - k);

    this.ema.push(next);

    if(this.ema.length > this.maxCandles){
      this.ema.shift();
    }

  },

  /* ================= FAST VWAP ================= */

  calcVWAPFast(){

    const c = this.candles.at(-1);

    if(!c) return;

    if(!this._pv){
      this._pv = 0;
      this._vol = 0;
    }

    const typical = (c.high + c.low + c.close)/3;

    this._pv += typical * c.volume;
    this._vol += c.volume;

    const val = this._vol ? this._pv / this._vol : typical;

    this.vwap.push(val);

    if(this.vwap.length > this.maxCandles){
      this.vwap.shift();
    }

  },

  /* ================= LOOP ================= */

  start(){

    const loop = (t)=>{

      if(t - this.lastRender > 1000 / this.renderFPS){

        this.render();
        this.lastRender = t;

      }

      requestAnimationFrame(loop);

    };

    requestAnimationFrame(loop);
  },

  /* ================= RENDER ================= */

  render(){

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0,0,w,h);

    const visible = this.candles.slice(-this.visibleCount);
    if(visible.length < 2) return;

    const highs = visible.map(c=>c.high);
    const lows  = visible.map(c=>c.low);

    let max = Math.max(...highs);
    let min = Math.min(...lows);

    const pad = (max-min)*0.1;
    max+=pad; min-=pad;

    this.viewMax = max;
    this.viewMin = min;

    const scaleY = p =>
      h - ((p - min)/(max-min)) * (h-20);

    const cw = w / this.visibleCount;

    /* ===== Gradient ===== */

    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,"#0f172a");
    grad.addColorStop(1,"#020617");

    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    /* ===== Candles ===== */

    visible.forEach((c,i)=>{

      const x = i*cw + cw/2;

      const openY  = scaleY(c.open);
      const closeY = scaleY(c.close);
      const highY  = scaleY(c.high);
      const lowY   = scaleY(c.low);

      const up = c.close >= c.open;

      ctx.strokeStyle = up ? "#00ff88" : "#ff3b3b";
      ctx.fillStyle   = up ? "#00ff88" : "#ff3b3b";

      ctx.beginPath();
      ctx.moveTo(x,highY);
      ctx.lineTo(x,lowY);
      ctx.stroke();

      ctx.fillRect(
        x - cw*0.3,
        Math.min(openY,closeY),
        cw*0.6,
        Math.max(1,Math.abs(openY-closeY))
      );

    });

    /* ===== EMA ===== */

    ctx.beginPath();
    ctx.strokeStyle="#facc15";

    this.ema.slice(-visible.length).forEach((v,i)=>{
      const x=i*cw+cw/2;
      const y=scaleY(v);
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });

    ctx.stroke();

    /* ===== VWAP ===== */

    ctx.beginPath();
    ctx.strokeStyle="#a855f7";

    this.vwap.slice(-visible.length).forEach((v,i)=>{
      const x=i*cw+cw/2;
      const y=scaleY(v);
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });

    ctx.stroke();

    /* ===== Price Line ===== */

    const last = visible.at(-1).close;
    const y = scaleY(last);

    ctx.strokeStyle="#ffffff33";
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(w,y);
    ctx.stroke();

  }
};
