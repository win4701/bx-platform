/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";

/* =========================================================
   SOUNDS (SAFE PLAY)
========================================================= */
const sounds = {
  click: document.getElementById("snd-click"),
  win:   document.getElementById("snd-win"),
  lose:  document.getElementById("snd-lose"),
  spin:  document.getElementById("snd-spin"),
};

function playSound(name){
  const s = sounds[name];
  if(!s) return;
  try{
    s.currentTime = 0;
    s.play();
  }catch(e){}
}

/* =========================================================
   SNAP / MOBILE FEEL
========================================================= */
function snap(el){
  el?.classList.add("snap");
  navigator.vibrate?.(10);
  setTimeout(()=>el?.classList.remove("snap"),150);
}

/* =========================================================
   VIEW NAVIGATION (CORE)
========================================================= */
const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".bottom-nav button");

function showTab(id){
  views.forEach(v=>{
    v.classList.remove("active");
    v.style.display = "none";
  });

  const el = document.getElementById(id);
  if(!el) return;

  document.body.dataset.mode = id;
  el.style.display = "block";
  requestAnimationFrame(()=> el.classList.add("active"));

  navButtons.forEach(b=>b.classList.remove("active"));
  document.querySelector(`.bottom-nav button[data-tab="${id}"]`)
    ?.classList.add("active");
}

navButtons.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    playSound("click");
    snap(btn);
    showTab(btn.dataset.tab);
  });
});

/* default */
showTab("wallet");

/* =========================================================
   WALLET
========================================================= */
async function loadBalances(){
  try{
    const r = await fetch(`${API_BASE}/wallet/balances`);
    const b = await r.json();

    setVal("bal-bx",   b.BX);
    setVal("bal-usdt", b.USDT);
    setVal("bal-ton",  b.TON);
    setVal("bal-sol",  b.SOL);
    setVal("bal-btc",  b.BTC, 8);
  }catch(e){}
}

function setVal(id,val,dec=2){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = val !== undefined ? Number(val).toFixed(dec) : "0";
}

loadBalances();

/* =========================================================
   MARKET – PAIR SELECTOR
========================================================= */
const pairBar = document.getElementById("pairBar");
const pairSheet = document.getElementById("pairSheet");
const currentPair = document.getElementById("currentPair");

pairBar?.addEventListener("click", ()=>{
  pairSheet?.classList.toggle("show");
  playSound("click");
});

document.querySelectorAll(".pair-option").forEach(opt=>{
  opt.addEventListener("click", ()=>{
    currentPair.textContent = opt.dataset.pair;
    pairSheet.classList.remove("show");
    series.length = 0;
    drawChart();
  });
});

/* =========================================================
   MARKET – CHART (CANVAS)
========================================================= */
const canvas = document.getElementById("priceChart");
const ctx = canvas?.getContext("2d");

let series = [];
let lastPrice = 0;

function resizeChart(){
  if(!canvas) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeChart);
resizeChart();

function drawChart(){
  if(!ctx || series.length < 2) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

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

  ctx.strokeStyle = series.at(-1) >= lastPrice ? "#4adebb" : "#ff8fa3";
  ctx.lineWidth = 2;
  ctx.stroke();

  lastPrice = series.at(-1);
}

/* =========================================================
   MARKET – LIVE DATA
========================================================= */
const amountInput = document.getElementById("amount");
const tradesUL = document.getElementById("trades");

async function tickPrice(){
  try{
    const pair = currentPair.textContent.replace(" / ","");
    const r = await fetch(`${API_BASE}/market/price?pair=${pair}`);
    const { price } = await r.json();

    series.push(price);
    if(series.length > 80) series.shift();
    drawChart();
  }catch(e){}
}

async function fetchTrades(){
  try{
    const pair = currentPair.textContent.replace(" / ","");
    const r = await fetch(`${API_BASE}/market/trades?pair=${pair}`);
    const data = await r.json();

    tradesUL.innerHTML = "";
    data.slice(0,8).forEach(t=>{
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${t.side.toUpperCase()}</span>
        <span>${t.amount}</span>
        <span>${t.price}</span>
      `;
      li.style.color = t.side === "buy" ? "#4adebb" : "#ff8fa3";
      tradesUL.appendChild(li);
    });
  }catch(e){}
}

/* =========================================================
   MARKET – BUY / SELL
========================================================= */
async function submitOrder(side){
  const amt = Number(amountInput.value);
  if(!amt) return;

  playSound("click");

  try{
    await fetch(`${API_BASE}/market/order`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        side,
        amount: amt,
        pair: currentPair.textContent.replace(" / ","")
      })
    });
    amountInput.value = "";
    loadBalances();
  }catch(e){}
}

document.querySelector(".btn.buy")
  ?.addEventListener("click",()=>submitOrder("buy"));

document.querySelector(".btn.sell")
  ?.addEventListener("click",()=>submitOrder("sell"));

/* =========================================================
   MARKET LOOP CONTROL
========================================================= */
let priceTimer, tradesTimer;

function startMarket(){
  priceTimer = setInterval(tickPrice,1500);
  tradesTimer = setInterval(fetchTrades,2500);
}

function stopMarket(){
  clearInterval(priceTimer);
  clearInterval(tradesTimer);
}

startMarket();

document.addEventListener("visibilitychange", ()=>{
  document.hidden ? stopMarket() : startMarket();
});

/* =========================================================
   CASINO
========================================================= */
document.querySelectorAll(".game").forEach(game=>{
  game.addEventListener("click", async ()=>{
    playSound("spin");
    snap(game);

    try{
      const r = await fetch(`${API_BASE}/casino/play`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ game: game.textContent.trim(), bet: 1 })
      });
      const res = await r.json();
      playSound(res.win ? "win" : "lose");
      loadBalances();
    }catch(e){}
  });
});

/* =========================================================
   MINING
========================================================= */
document.querySelectorAll("#mining .btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    playSound("click");
    snap(btn);
  });
});

/* =========================================================
   AIRDROP
========================================================= */
document.querySelector("#airdrop .btn")?.addEventListener("click",()=>{
  playSound("win");
});
/* =========================================================
   CASINO 3D INTERACTION
========================================================= */
document.querySelectorAll("#casino .game").forEach(game=>{
  game.addEventListener("mousemove", e=>{
    const r = game.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const rx = ((y / r.height) - 0.5) * -12;
    const ry = ((x / r.width) - 0.5) * 12;

    game.style.transform = `
      rotateX(${rx}deg)
      rotateY(${ry}deg)
      translateZ(30px)
    `;
  });

  game.addEventListener("mouseleave", ()=>{
    game.style.transform = "translateZ(0)";
  });
});
