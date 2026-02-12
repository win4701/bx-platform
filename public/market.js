/* =========================================================
   BLOXIO MARKET ENGINE v3.1 PRO FINAL
   Scoped • Clean • Stable • Binance Live
========================================================= */

(function () {

  if (!document.getElementById("bids")) return;

  /* ================== STATE ================== */

  const STATE = {
    base: "BX",
    quote: "USDT",
    reference: 38, // BX = 38 USDT
    price: 38,
    bid: 0,
    ask: 0,
    spread: 0,
    side: "BUY",
    socketTrade: null,
    socketDepth: null
  };

  const PAIRS = {
    USDT: null,
    USDC: null,
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    BNB: "BNBUSDT",
    SOL: "SOLUSDT",
    AVAX: "AVAXUSDT",
    LTC: "LTCUSDT",
    ZEC: "ZECUSDT",
    TON: "TONUSDT"
  };

  /* ================== DOM ================== */

  const DOM = {
    price: document.getElementById("currentPrice"),
    spread: document.getElementById("spreadValue"),
    bids: document.getElementById("bids"),
    asks: document.getElementById("asks"),
    buyBtn: document.getElementById("buyBtn"),
    sellBtn: document.getElementById("sellBtn"),
    tradeBtn: document.getElementById("tradeActionBtn"),
    amount: document.getElementById("amountInput"),
    exec: document.getElementById("execPrice"),
    slip: document.getElementById("slippageValue")
  };

  /* ================== INIT ================== */

  function init() {
    initPairs();
    initTrade();
    connectStreams();
  }

  /* ================== PAIRS ================== */

  function initPairs() {
    document.querySelectorAll(".pair-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pair-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        STATE.quote = btn.dataset.pair;
        connectStreams();
      });
    });
  }

  /* ================== BINANCE STREAM ================== */

  function connectStreams() {

    if (STATE.socketTrade) STATE.socketTrade.close();
    if (STATE.socketDepth) STATE.socketDepth.close();

    const symbol = PAIRS[STATE.quote];

    if (!symbol) {
      STATE.price = STATE.reference;
      renderPrice();
      buildStaticBook();
      return;
    }

    /* ---- Trade Stream ---- */

    STATE.socketTrade = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`
    );

    STATE.socketTrade.onmessage = e => {
      const data = JSON.parse(e.data);
      const marketPrice = parseFloat(data.p);
      STATE.price = STATE.reference / marketPrice;
      renderPrice();
      Chart.addTick(STATE.price);
    };

    /* ---- Depth Stream ---- */

    STATE.socketDepth = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth15@100ms`
    );

    STATE.socketDepth.onmessage = e => {
      const data = JSON.parse(e.data);
      renderBook(data.bids, data.asks);
    };
  }

  /* ================== PRICE ================== */

  function renderPrice() {
    if (!DOM.price) return;
    DOM.price.textContent = STATE.price.toFixed(6);

    if (STATE.bid && STATE.ask) {
      STATE.spread = STATE.ask - STATE.bid;
      if (DOM.spread)
        DOM.spread.textContent = STATE.spread.toFixed(6);
    }
  }

  /* ================== ORDER BOOK ================== */

  function renderBook(bids, asks) {

    if (!DOM.bids || !DOM.asks) return;

    DOM.bids.innerHTML = "";
    DOM.asks.innerHTML = "";

    const bestBid = parseFloat(bids[0][0]);
    const bestAsk = parseFloat(asks[0][0]);

    STATE.bid = STATE.reference / bestBid;
    STATE.ask = STATE.reference / bestAsk;

    renderPrice();

    bids.slice(0, 15).forEach(b => {
      const price = STATE.reference / parseFloat(b[0]);
      const row = document.createElement("div");
      row.className = "bid-row";
      row.textContent = price.toFixed(6);
      row.onclick = () => fill(price);
      DOM.bids.appendChild(row);
    });

    asks.slice(0, 15).forEach(a => {
      const price = STATE.reference / parseFloat(a[0]);
      const row = document.createElement("div");
      row.className = "ask-row";
      row.textContent = price.toFixed(6);
      row.onclick = () => fill(price);
      DOM.asks.appendChild(row);
    });
  }

  function buildStaticBook() {
    DOM.bids.innerHTML = "";
    DOM.asks.innerHTML = "";

    for (let i = 0; i < 15; i++) {
      const bid = STATE.price - i * 0.02;
      const ask = STATE.price + i * 0.02;

      const b = document.createElement("div");
      b.className = "bid-row";
      b.textContent = bid.toFixed(6);

      const a = document.createElement("div");
      a.className = "ask-row";
      a.textContent = ask.toFixed(6);

      DOM.bids.appendChild(b);
      DOM.asks.appendChild(a);
    }
  }

  /* ================== TRADE ================== */

  function initTrade() {

    if (!DOM.buyBtn || !DOM.sellBtn) return;

    DOM.buyBtn.onclick = () => {
      STATE.side = "BUY";
      DOM.tradeBtn.textContent = "Buy BX";
    };

    DOM.sellBtn.onclick = () => {
      STATE.side = "SELL";
      DOM.tradeBtn.textContent = "Sell BX";
    };

    DOM.tradeBtn.onclick = executeTrade;
  }

  function fill(price) {
    if (DOM.exec)
      DOM.exec.textContent = price.toFixed(6);
  }

  function executeTrade() {

    const amount = parseFloat(DOM.amount.value);
    if (!amount) return;

    const exec = STATE.side === "BUY" ? STATE.ask : STATE.bid;

    const slippage =
      Math.abs(exec - STATE.price) / STATE.price * 100;

    if (DOM.slip)
      DOM.slip.textContent = slippage.toFixed(2) + "%";

    if (DOM.exec)
      DOM.exec.textContent = exec.toFixed(6);

    console.log("Trade:", STATE.side, amount);
  }

  /* ================== CHART v3.1 PRO ================== */

  const Chart = (function () {

    const canvas = document.getElementById("chart");
    if (!canvas) return { addTick: () => {} };

    const ctx = canvas.getContext("3d");
    let candles = [];
    let volumes = [];
    let current = null;
    const tf = 5000;
    const max = 80;

    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    window.addEventListener("resize", resize);
    resize();

    function addTick(price) {

      const now = Date.now();

      if (!current) {
        current = { t: now, o: price, h: price, l: price, c: price };
      }

      if (now - current.t >= tf) {
        candles.push(current);
        volumes.push(Math.random() * 20 + 5);
        if (candles.length > max) {
          candles.shift();
          volumes.shift();
        }
        current = { t: now, o: price, h: price, l: price, c: price };
      } else {
        current.c = price;
        current.h = Math.max(current.h, price);
        current.l = Math.min(current.l, price);
      }

      draw();
    }

    function draw() {

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!candles.length) return;

      const prices = candles.flatMap(c => [c.h, c.l]);
      const maxP = Math.max(...prices);
      const minP = Math.min(...prices);
      const range = maxP - minP || 1;

      const w = canvas.width / max;

      candles.forEach((c, i) => {

        const x = i * w;
        const openY = canvas.height - ((c.o - minP) / range) * canvas.height;
        const closeY = canvas.height - ((c.c - minP) / range) * canvas.height;
        const highY = canvas.height - ((c.h - minP) / range) * canvas.height;
        const lowY = canvas.height - ((c.l - minP) / range) * canvas.height;

        const color = c.c >= c.o ? "#16c784" : "#ea3943";

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + w/2, highY);
        ctx.lineTo(x + w/2, lowY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillRect(x + w*0.2, Math.min(openY, closeY),
          w*0.6, Math.abs(openY - closeY) || 1);

        ctx.fillStyle = color + "55";
        ctx.fillRect(x + w*0.2, canvas.height - volumes[i],
          w*0.6, volumes[i]);
      });
    }

    return { addTick };

  })();

  /* ================== START ================== */

  init();

})();
