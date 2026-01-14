/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";

/* =========================================================
   SOUNDS
========================================================= */
const sounds = {
  click: new Audio("assets/sounds/click.mp3"),
  win:   new Audio("assets/sounds/win.mp3"),
  lose:  new Audio("assets/sounds/lose.mp3"),
  spin:  new Audio("assets/sounds/spin.mp3"),
};
function playSound(name){
  if(!sounds[name]) return;
  sounds[name].currentTime = 0;
  sounds[name].play();
}

/* =========================================================
   SECTION NAVIGATION + MODE (CORE LIFE)
========================================================= */
const sections = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".bottom-nav button");

function showTab(id){
  sections.forEach(s=>{
    s.classList.remove("active");
    s.style.display = "none";
  });

  const el = document.getElementById(id);
  document.body.dataset.mode = id;      // 👈 يغيّر الإيقاع العام
  el.style.display = "block";

  requestAnimationFrame(()=> el.classList.add("active"));

  navButtons.forEach(b=>b.classList.remove("active"));
  document.querySelector(`.bottom-nav button[data-tab="${id}"]`)
    ?.classList.add("active");
}

navButtons.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    playSound("click");
    showTab(btn.dataset.tab);
  });
});

// default
showTab("wallet");

/* =========================================================
   WALLET (CALM / TRUST)
========================================================= */
async function loadBalances(){
  try{
    const r = await fetch(`${API_BASE}/wallet/balances`);
    const b = await r.json();
    set("bal-bx",   b.BX);
    set("bal-usdt", b.USDT);
    set("bal-ton",  b.TON);
    set("bal-sol",  b.SOL);
    set("bal-btc",  b.BTC, 8);
  }catch(e){}
}

function set(id,val,dec=2){
  document.getElementById(id).textContent =
    val !== undefined ? Number(val).toFixed(dec) : "0";
}

/* =========================================================
   MARKET (FAST / LIVE)
========================================================= */
const pairSelect = document.getElementById("pair");
const amountInput = document.getElementById("amount");
const tradesUL = document.getElementById("trades");

let series = [];
let lastPrice = 0;

/* ===== Canvas Chart ===== */
const canvas = document.getElementById("priceChart");
const ctx = canvas.getContext("2d");

function resizeChart(){
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeChart);
resizeChart();

function drawChart(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(series.length < 2) return;

  const pad = 10;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const w = canvas.width - pad*2;
  const h = canvas.height - pad*2;

  ctx.beginPath();
  series.forEach((p,i)=>{
    const x = pad + (i/(series.length-1))*w;
    const y = pad + (1-(p-min)/(max-min||1))*h;
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  });
  ctx.strokeStyle = "#6ee7a8";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ===== Price Tick ===== */
async function tickPrice(){
  try{
    const pair = pairSelect.value.replace(" ","");
    const r = await fetch(`${API_BASE}/market/price?pair=${pair}`);
    const { price } = await r.json();

    series.push(price);
    if(series.length > 80) series.shift();
    drawChart();

    lastPrice = price;
  }catch(e){}
}

/* ===== Trades Feed ===== */
async function fetchTrades(){
  try{
    const pair = pairSelect.value.replace(" ","");
    const r = await fetch(`${API_BASE}/market/trades?pair=${pair}`);
    const data = await r.json();

    tradesUL.innerHTML = "";
    data.slice(0,8).forEach(t=>{
      const li = document.createElement("li");
      li.className = t.side;
      li.innerHTML = `
        <span>${t.side.toUpperCase()}</span>
        <span>${t.amount}</span>
        <span>${t.price}</span>
      `;
      tradesUL.appendChild(li);
    });
  }catch(e){}
}

/* ===== Buy / Sell ===== */
async function submitOrder(side){
  playSound("click");
  const amt = Number(amountInput.value);
  if(!amt) return;

  await fetch(`${API_BASE}/market/order`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      side,
      amount: amt,
      pair: pairSelect.value
    })
  });
  amountInput.value = "";
}

document.querySelector(".btn.buy")?.addEventListener("click",()=>submitOrder("buy"));
document.querySelector(".btn.sell")?.addEventListener("click",()=>submitOrder("sell"));

/* ===== Market Loop ===== */
let priceTimer, tradesTimer;
function startMarketLoops(){
  priceTimer = setInterval(tickPrice, 1500);
  tradesTimer = setInterval(fetchTrades, 2500);
}
startMarketLoops();

/* Pause when tab hidden */
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){
    clearInterval(priceTimer);
    clearInterval(tradesTimer);
  } else {
    startMarketLoops();
  }
});

/* =========================================================
   CASINO (DANGER / TENSION)
========================================================= */
document.querySelectorAll(".game").forEach(game=>{
  game.addEventListener("click", async ()=>{
    playSound("spin");
    game.classList.add("shake");

    await new Promise(r=>setTimeout(r, 350));

    const r = await fetch(`${API_BASE}/casino/play`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ game: game.textContent.trim(), bet: 1 })
    });
    const res = await r.json();

    game.classList.remove("shake");
    playSound(res.win ? "win" : "lose");
  });
});

/* =========================================================
   MINING
========================================================= */
document.querySelectorAll("#mining .btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    playSound("click");
    fetch(`${API_BASE}/mining/claim`,{ method:"POST" });
  });
});

/* =========================================================
   AIRDROP
========================================================= */
document.querySelector("#airdrop .btn")?.addEventListener("click", ()=>{
  playSound("win");
  fetch(`${API_BASE}/airdrop/claim`,{ method:"POST" });
});

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", ()=>{
  loadBalances();
});
