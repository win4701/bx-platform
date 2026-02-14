/* ===========================
   MARKET v3.1 PRO CLEAN
   =========================== */

const BASE = "BX";
const REF_PRICE = 38; // السعر المرجعي

let state = {
  pair: "USDT",
  mid: REF_PRICE,
  spread: 0.02,
  bids: [],
  asks: [],
  wallet: {
    BX: 1000,
    USDT: 1000
  },
  side: "BUY",
  position: null
};

/* ===========================
   INIT
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  initPairs();
  initToggle();
  generateBook();
  renderAll();
  startSimulation();
  initChart();
});

/* ===========================
   PAIRS (5 فوق / 5 تحت)
   =========================== */

const PAIRS = [
  "USDT","USDC","BTC","ETH","BNB",
  "SOL","AVAX","LTC","ZEC","TON"
];

function initPairs(){
  const buttons = document.querySelectorAll(".pair-btn");
  buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".pair-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.pair = btn.dataset.pair;
      state.mid = REF_PRICE;
      generateBook();
      renderAll();
    });
  });
}

/* ===========================
   BUY / SELL TOGGLE
   =========================== */

function initToggle(){
  const buyBtn = document.getElementById("buyBtn");
  const sellBtn = document.getElementById("sellBtn");

  buyBtn.onclick = ()=>{
    state.side = "BUY";
    buyBtn.classList.add("active");
    sellBtn.classList.remove("active");
    updateMainButton();
  };

  sellBtn.onclick = ()=>{
    state.side = "SELL";
    sellBtn.classList.add("active");
    buyBtn.classList.remove("active");
    updateMainButton();
  };

  document.getElementById("tradeActionBtn").onclick = executeTrade;
}

function updateMainButton(){
  const btn = document.getElementById("tradeActionBtn");
  btn.textContent = state.side === "BUY" ? "Buy BX" : "Sell BX";
}

/* ===========================
   ORDER BOOK GENERATION
   =========================== */

function generateBook(){
  state.bids = [];
  state.asks = [];

  for(let i=1;i<=7;i++){
    state.bids.push(state.mid - (i * 0.02));
    state.asks.push(state.mid + (i * 0.02));
  }
}

/* ===========================
   RENDER
   =========================== */

function renderAll(){
  renderPrice();
  renderBook();
  renderWallet();
}

function renderPrice(){
  document.getElementById("priceMain").textContent =
    state.mid.toFixed(6);

  document.getElementById("spreadValue").textContent =
    "Spread: " + (state.asks[0] - state.bids[0]).toFixed(6);
}

function renderBook(){
  const body = document.getElementById("orderBookBody");
  body.innerHTML = "";

  // Asks
  state.asks.slice().reverse().forEach(price=>{
    body.appendChild(createRow("", price, price, "ask"));
  });

  // Mid
  const mid = document.createElement("div");
  mid.className = "mid-price";
  mid.textContent = state.mid.toFixed(6);
  body.appendChild(mid);

  // Bids
  state.bids.forEach(price=>{
    body.appendChild(createRow(price, price, "", "bid"));
  });
}

function createRow(bid, price, ask, type){
  const row = document.createElement("div");
  row.className = "ob-row " + type;

  row.innerHTML = `
    <span>${bid || ""}</span>
    <span>${price.toFixed ? price.toFixed(6) : price}</span>
    <span>${ask || ""}</span>
  `;

  return row;
}

function renderWallet(){
  document.querySelector("#bxBalance").textContent =
    state.wallet.BX.toFixed(2);

  document.querySelector("#usdtBalance").textContent =
    state.wallet.USDT.toFixed(2);
}

/* ===========================
   TRADE EXECUTION
   =========================== */

function executeTrade(){

  const amount = parseFloat(
    document.getElementById("amountInput").value
  );

  if(!amount || amount <= 0) return;

  const bestPrice =
    state.side === "BUY" ? state.asks[0] : state.bids[0];

  const slippage =
    Math.abs(bestPrice - state.mid);

  document.getElementById("execPrice").textContent =
    bestPrice.toFixed(6);

  document.getElementById("slippageValue").textContent =
    slippage.toFixed(6);

  if(state.side === "BUY"){
    const cost = amount * bestPrice;
    if(state.wallet.USDT >= cost){
      state.wallet.USDT -= cost;
      state.wallet.BX += amount;
    }
  } else {
    if(state.wallet.BX >= amount){
      state.wallet.BX -= amount;
      state.wallet.USDT += amount * bestPrice;
    }
  }

  renderWallet();
}

/* ===========================
   SIMULATION
   =========================== */

function startSimulation(){
  setInterval(()=>{
    const move = (Math.random()-0.5) * 0.04;
    state.mid += move;
    generateBook();
    renderAll();
    updateChart(state.mid);
  },1500);
}

/* ===========================
   CHART (Canvas Clean)
   =========================== */

let chartCtx;
let chartData = [];

function initChart(){
  const canvas = document.getElementById("chartCanvas");
  if(!canvas) return;
  chartCtx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
}

function updateChart(price){
  if(!chartCtx) return;

  chartData.push(price);
  if(chartData.length > 50)
    chartData.shift();

  chartCtx.clearRect(0,0,500,200);

  chartCtx.beginPath();
  chartCtx.strokeStyle = "#00c896";
  chartCtx.lineWidth = 2;

  chartData.forEach((p,i)=>{
    const x = i * 10;
    const y = 200 - (p - REF_PRICE) * 20 - 100;
    if(i===0) chartCtx.moveTo(x,y);
    else chartCtx.lineTo(x,y);
  });

  chartCtx.stroke();
  }
