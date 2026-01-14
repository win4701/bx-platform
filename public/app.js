/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";

/* =========================================================
   TELEGRAM MINI APP (OPTIONAL)
========================================================= */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  document.body.classList.add("tma");
}

/* =========================================================
   SOUNDS (SMART & LIMITED)
========================================================= */
const sounds = {
  click: new Audio("assets/sounds/click.mp3"),
  spin:  new Audio("assets/sounds/spin.mp3"),
  win:   new Audio("assets/sounds/win.mp3"),
  lose:  new Audio("assets/sounds/lose.mp3"),
};

function playSound(name) {
  if (!sounds[name]) return;
  try {
    sounds[name].currentTime = 0;
    sounds[name].play();
    tg?.HapticFeedback?.impactOccurred("light");
  } catch (e) {}
}

/* =========================================================
   NAVIGATION + TRANSITIONS (NO display:none)
========================================================= */
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".bottom-nav button");
const tabs = ["wallet", "market", "casino", "mining", "airdrop"];
let currentIndex = 0;

function showTab(id) {
  views.forEach(v => v.classList.remove("active"));

  const target = document.getElementById(id);
  if (!target) return;

  document.body.dataset.mode = id;
  target.classList.add("active");

  navBtns.forEach(b => b.classList.remove("active"));
  document
    .querySelector(`.bottom-nav button[data-tab="${id}"]`)
    ?.classList.add("active");

  currentIndex = tabs.indexOf(id);
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    playSound("click");
    showTab(btn.dataset.tab);
  });
});

// default view
showTab("wallet");

/* =========================================================
   SWIPE NAVIGATION (MOBILE FIRST)
========================================================= */
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const diff = touchEndX - touchStartX;
  if (Math.abs(diff) < 60) return;

  if (diff < 0 && currentIndex < tabs.length - 1) {
    currentIndex++;
  } else if (diff > 0 && currentIndex > 0) {
    currentIndex--;
  }
  showTab(tabs[currentIndex]);
}

/* =========================================================
   WALLET (CALM / TRUST)
========================================================= */
async function loadBalances() {
  try {
    const r = await fetch(`${API_BASE}/wallet/balances`);
    const b = await r.json();
    setVal("bal-bx", b.BX);
    setVal("bal-usdt", b.USDT);
    setVal("bal-ton", b.TON);
    setVal("bal-sol", b.SOL);
    setVal("bal-btc", b.BTC, 8);
  } catch (e) {}
}

function setVal(id, val, dec = 2) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val !== undefined ? Number(val).toFixed(dec) : "0";
}

/* =========================================================
   MARKET (LIVE / BLUM-STYLE)
========================================================= */
const pairSelect = document.getElementById("pair");
const amountInput = document.getElementById("amount");
const tradesUL = document.getElementById("trades");

/* ----- Canvas Chart ----- */
const canvas = document.getElementById("priceChart");
const ctx = canvas.getContext("2d");
let series = [];

function resizeChart() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeChart);
resizeChart();

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (series.length < 2) return;

  const pad = 10;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  ctx.beginPath();
  series.forEach((p, i) => {
    const x = pad + (i / (series.length - 1)) * w;
    const y = pad + (1 - (p - min) / (max - min || 1)) * h;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = "#6ee7a8";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ----- Price Tick ----- */
async function tickPrice() {
  try {
    const pair = pairSelect.value.replace(" ", "");
    const r = await fetch(`${API_BASE}/market/price?pair=${pair}`);
    const { price } = await r.json();
    series.push(price);
    if (series.length > 80) series.shift();
    drawChart();
  } catch (e) {}
}

/* ----- Trades Feed ----- */
async function fetchTrades() {
  try {
    const pair = pairSelect.value.replace(" ", "");
    const r = await fetch(`${API_BASE}/market/trades?pair=${pair}`);
    const data = await r.json();
    tradesUL.innerHTML = "";
    data.slice(0, 8).forEach(t => {
      const li = document.createElement("li");
      li.className = t.side;
      li.innerHTML = `
        <span>${t.side.toUpperCase()}</span>
        <span>${t.amount}</span>
        <span>${t.price}</span>
      `;
      tradesUL.appendChild(li);
    });
  } catch (e) {}
}

/* ----- Buy / Sell ----- */
async function submitOrder(side) {
  playSound("click");
  const amt = Number(amountInput.value);
  if (!amt) return;

  await fetch(`${API_BASE}/market/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      side,
      amount: amt,
      pair: pairSelect.value
    })
  });
  amountInput.value = "";
}

document.querySelector(".btn.buy")?.addEventListener("click", () => submitOrder("buy"));
document.querySelector(".btn.sell")?.addEventListener("click", () => submitOrder("sell"));

/* ----- Market Loop (pause on hidden) ----- */
let priceTimer, tradesTimer;

function startMarketLoops() {
  priceTimer = setInterval(tickPrice, 1500);
  tradesTimer = setInterval(fetchTrades, 2500);
}
function stopMarketLoops() {
  clearInterval(priceTimer);
  clearInterval(tradesTimer);
}

startMarketLoops();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMarketLoops();
  else startMarketLoops();
});

/* =========================================================
   CASINO (VISUAL ONLY – NO LOGIC)
========================================================= */
document.querySelectorAll(".game").forEach(game => {
  game.addEventListener("click", () => {
    playSound("spin");
    game.classList.add("shake");
    setTimeout(() => game.classList.remove("shake"), 300);
  });
});

/* =========================================================
   MINING
========================================================= */
document.querySelectorAll("#mining .btn").forEach(btn => {
  btn.addEventListener("click", () => {
    playSound("click");
    fetch(`${API_BASE}/mining/claim`, { method: "POST" });
  });
});

/* =========================================================
   AIRDROP
========================================================= */
document.querySelector("#airdrop .btn")?.addEventListener("click", () => {
  playSound("win");
  fetch(`${API_BASE}/airdrop/claim`, { method: "POST" });
});

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  loadBalances();
});
