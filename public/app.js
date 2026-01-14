/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://api.bloxio.online";

/* =========================================================
   SOUNDS
========================================================= */
const SND = {
  click: document.getElementById("snd-click"),
  win: document.getElementById("snd-win"),
  lose: document.getElementById("snd-lose"),
};
function sound(name){
  try { SND[name]?.play(); } catch(e){}
}

/* =========================================================
   NAVIGATION (Bottom Tabs)
========================================================= */
const sections = document.querySelectorAll("main section");
const navButtons = document.querySelectorAll(".bottom-nav button");

function showTab(id){
  sections.forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "block";
  navButtons.forEach(b => b.classList.remove("active"));
  document.querySelector(`.bottom-nav button[data-tab="${id}"]`)?.classList.add("active");
}

navButtons.forEach(btn=>{
  btn.addEventListener("click",()=>{
    sound("click");
    showTab(btn.dataset.tab);
  });
});

// default
showTab("wallet");

/* =========================================================
   WALLET
========================================================= */
async function loadBalances(){
  try{
    const r = await fetch(`${API_BASE}/wallet/balances`);
    const b = await r.json();
    document.getElementById("bal-bx").textContent   = b.BX?.toFixed(2)   ?? "0";
    document.getElementById("bal-usdt").textContent = b.USDT?.toFixed(2) ?? "0";
    document.getElementById("bal-ton").textContent  = b.TON?.toFixed(2)  ?? "0";
    document.getElementById("bal-sol").textContent  = b.SOL?.toFixed(2)  ?? "0";
    document.getElementById("bal-btc").textContent  = b.BTC?.toFixed(8)  ?? "0";
  }catch(e){}
}

/* =========================================================
   MARKET (Live Price + Chart + Trades)
========================================================= */
const pairSelect = document.getElementById("pair");
const amountInput = document.getElementById("amount");
const tradesUL = document.getElementById("trades");
const chartCanvas = document.getElementById("priceChart");
const ctx = chartCanvas.getContext("2d");

let prices = [];

/* resize chart */
function resizeChart(){
  chartCanvas.width  = chartCanvas.parentElement.clientWidth;
  chartCanvas.height = chartCanvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeChart);
resizeChart();

/* draw lightweight line chart */
function drawChart(){
  ctx.clearRect(0,0,chartCanvas.width,chartCanvas.height);
  if(prices.length < 2) return;

  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const pad = 10;
  const h = chartCanvas.height - pad*2;
  const w = chartCanvas.width  - pad*2;

  ctx.beginPath();
  prices.forEach((p,i)=>{
    const x = pad + (i/(prices.length-1))*w;
    const y = pad + (1-(p-min)/(max-min||1))*h;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.strokeStyle = "#6ee7a8";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* fetch live price */
async function fetchPrice(){
  try{
    const pair = pairSelect.value.replace(" ","");
    const r = await fetch(`${API_BASE}/market/price?pair=${pair}`);
    const { price } = await r.json();
    prices.push(price);
    if(prices.length > 60) prices.shift();
    drawChart();
  }catch(e){}
}

/* fetch trades */
async function fetchTrades(){
  try{
    const pair = pairSelect.value.replace(" ","");
    const r = await fetch(`${API_BASE}/market/trades?pair=${pair}`);
    const data = await r.json();
    tradesUL.innerHTML = data.slice(0,8).map(t=>`
      <li>
        <span class="${t.side}">${t.side.toUpperCase()}</span>
        <span>${t.amount}</span>
        <span>${t.price}</span>
      </li>
    `).join("");
  }catch(e){}
}

setInterval(fetchPrice, 2000);
setInterval(fetchTrades, 3000);

/* submit order */
async function submitOrder(side){
  sound("click");
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

/* =========================================================
   CASINO (Free – No Unlock – No Dependency)
========================================================= */
async function playGame(game, bet){
  sound("click");
  const r = await fetch(`${API_BASE}/casino/play`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ game, bet })
  });
  const res = await r.json();
  res.win ? sound("win") : sound("lose");
}

/* =========================================================
   MINING
========================================================= */
async function claimMining(){
  sound("click");
  await fetch(`${API_BASE}/mining/claim`,{ method:"POST" });
}

/* =========================================================
   AIRDROP
========================================================= */
async function claimAirdrop(){
  sound("click");
  await fetch(`${API_BASE}/airdrop/claim`,{ method:"POST" });
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded",()=>{
  loadBalances();
});
