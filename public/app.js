/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";
const INTERNAL_BX_USDT = 2;
const MARKET_FEE = 0.002;

/* =========================================================
   DEVICE / PERFORMANCE
========================================================= */
const ENABLE_ANIM = true;

/* =========================================================
   SOUNDS
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
   SNAP – SAFE FALLBACK
========================================================= */
function snap(el){
  if(!el || !ENABLE_ANIM) return;
  navigator.vibrate?.(8);
}

/* =========================================================
   VIEW NAVIGATION – STABLE (FINAL)
========================================================= */
document.addEventListener("DOMContentLoaded", ()=>{

  const views = document.querySelectorAll(".view");
  const navButtons = document.querySelectorAll(".bottom-nav button");

  function showTab(tabId){
    views.forEach(v => v.classList.remove("active"));

    const target = document.getElementById(tabId);
    if(!target){
      console.warn("View not found:", tabId);
      return;
    }
    target.classList.add("active");

    navButtons.forEach(b => b.classList.remove("active"));
    document
      .querySelector(`.bottom-nav button[data-tab="${tabId}"]`)
      ?.classList.add("active");
  }

  navButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      playSound("click");
      snap(btn);
      showTab(btn.dataset.tab);
    });
  });

  /* default view */
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
    el.textContent =
      val !== undefined ? Number(val).toFixed(dec) : "0";
  }

  loadBalances();

  /* =========================================================
     MARKET – PAIR SELECTOR (CLEAN)
  ========================================================= */
  const MARKET_PAIRS = ["BX / USDT","BX / TON","BX / SOL","BX / BTC"];
  let currentPairIndex = 0;

  const pairBar = document.getElementById("pairBar");
  const currentPair = document.getElementById("currentPair");

  if(currentPair){
    currentPair.textContent = MARKET_PAIRS[currentPairIndex];
  }

  pairBar?.addEventListener("click", ()=>{
    playSound("click");
    snap(pairBar);

    currentPairIndex =
      (currentPairIndex + 1) % MARKET_PAIRS.length;

    currentPair.textContent = MARKET_PAIRS[currentPairIndex];
    series.length = 0;
    lastPrice = 0;
    drawChart();
  });

  /* =========================================================
     MARKET – CHART
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

    ctx.strokeStyle =
      series.at(-1) >= lastPrice ? "#4adebb" : "#ff8fa3";
    ctx.lineWidth = 2;
    ctx.stroke();

    lastPrice = series.at(-1);
  }

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

  setInterval(tickPrice,1500);

  /* =========================================================
     MINING – PLANS (SINGLE VERSION)
  ========================================================= */
  const MINING_PLANS = {
    BX:[
      {name:"Starter",daily:"1.2%",days:30,min:10,max:500},
      {name:"Silver",daily:"2%",days:45,min:100,max:2000},
      {name:"Gold",daily:"3%",days:60,min:500,max:10000},
      {name:"VIP",daily:"4.5%",days:90,min:2000,max:50000}
    ]
  };

  const plansBox = document.getElementById("miningPlans");

  function renderMining(coin){
    if(!plansBox) return;
    plansBox.innerHTML = "";

    MINING_PLANS[coin].forEach(p=>{
      const div = document.createElement("div");
      div.className = "mining-plan";
      div.innerHTML = `
        <h4>${p.name}</h4>
        <ul>
          <li>Daily: ${p.daily}</li>
          <li>Duration: ${p.days} days</li>
          <li>Min: ${p.min} ${coin}</li>
          <li>Max: ${p.max} ${coin}</li>
        </ul>
        <button class="btn primary">Subscribe</button>
      `;
      plansBox.appendChild(div);
    });
  }

  renderMining("BX");

});
