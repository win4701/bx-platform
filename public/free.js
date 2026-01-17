/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://bx-backend.fly.dev";

/* =========================================================
   PROVABLY FAIR – CLIENT SEED
========================================================= */
let CLIENT_SEED =
  localStorage.getItem("client_seed") || "1.2.3.4";

/* =========================================================
   DEVICE / PERFORMANCE
========================================================= */
const isLowEnd =
  navigator.hardwareConcurrency <= 4 ||
  navigator.deviceMemory <= 4;

const ENABLE_ANIM = !isLowEnd;

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
  if(!s || document.visibilityState !== "visible") return;
  try{
    s.pause(); s.currentTime = 0;
    s.play()?.catch(()=>{});
  }catch(e){}
}

/* =========================================================
   SNAP
========================================================= */
function snap(el){
  if(!el || !ENABLE_ANIM) return;
  el.classList.add("snap");
  navigator.vibrate?.(8);
}

/* =========================================================
   WALLET
========================================================= */
async function loadBalances(){
  try{
    const r = await fetch(`${API_BASE}/wallet/balances`);
    const b = await r.json();
    setVal("bal-bx", b.BX);
    setVal("bal-usdt", b.USDT);
    setVal("bal-ton", b.TON);
    setVal("bal-sol", b.SOL);
    setVal("bal-btc", b.BTC, 8);
  }catch(e){}
}
function setVal(id,val,dec=2){
  const el = document.getElementById(id);
  if(el) el.textContent =
    val !== undefined ? Number(val).toFixed(dec) : "0";
}
loadBalances();

/* =========================================================
   MARKET
========================================================= */
const MARKET_PAIRS = ["BX / USDT","BX / TON","BX / SOL","BX / BTC"];
let pairIndex = 0, series = [], lastPrice = 0;
const pairBar = document.getElementById("pairBar");
const currentPair = document.getElementById("currentPair");
const canvas = document.getElementById("priceChart");
const ctx = canvas?.getContext("2d");

if(currentPair) currentPair.textContent = MARKET_PAIRS[0];

pairBar?.addEventListener("click",()=>{
  playSound("click"); snap(pairBar);
  pairIndex = (pairIndex+1)%MARKET_PAIRS.length;
  currentPair.textContent = MARKET_PAIRS[pairIndex];
  series=[]; lastPrice=0; drawChart();
});

function resizeChart(){
  if(!canvas) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeChart);
resizeChart();

function drawChart(){
  if(!ctx || series.length<2) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const pad=10,min=Math.min(...series),max=Math.max(...series);
  ctx.beginPath();
  series.forEach((p,i)=>{
    const x=pad+(i/(series.length-1))*(canvas.width-pad*2);
    const y=pad+(1-(p-min)/(max-min||1))*(canvas.height-pad*2);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.strokeStyle = series.at(-1)>=lastPrice?"#4adebb":"#ff8fa3";
  ctx.lineWidth=2; ctx.stroke();
  lastPrice=series.at(-1);
}

async function tickPrice(){
  try{
    const pair=currentPair.textContent.replace(" / ","");
    const r=await fetch(`${API_BASE}/market/price?pair=${pair}`);
    const {price}=await r.json();
    series.push(price); if(series.length>80) series.shift();
    drawChart();
  }catch(e){}
}

let marketTimer;
function startMarket(){ stopMarket(); marketTimer=setInterval(tickPrice,1500); }
function stopMarket(){ clearInterval(marketTimer); }

/* =========================================================
   CASINO – 9 GAMES
========================================================= */
document.querySelectorAll("#casino .game").forEach(game=>{
  game.addEventListener("click",async()=>{
    playSound("spin"); snap(game);
    try{
      const r=await fetch(`${API_BASE}/casino/play`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          uid:1,
          game:game.dataset.game,
          bet:1,
          client_seed:CLIENT_SEED
        })
      });
      const data=await r.json();
      playSound(data.win?"win":"lose");
      onCasinoPlayed();
      showFairnessInfo(data);
    }catch(e){ console.error(e); }
  });
});

/* =========================================================
   AIRDROP
========================================================= */
let AIRDROP={casinoRewarded:false};
function addBX(a){
  const el=document.getElementById("bal-bx");
  if(el) el.textContent=(Number(el.textContent)||0 + a).toFixed(2);
}
function onCasinoPlayed(){
  if(AIRDROP.casinoRewarded) return;
  AIRDROP.casinoRewarded=true;
  addBX(2.5);
  document.getElementById("casinoTask")?.classList.add("done");
  document.getElementById("casinoTask").textContent="✔ Casino Played – 2.5 BX Added";
  const s=document.getElementById("airdropStatus");
  if(s){ s.textContent="Reward added"; s.className="status success"; }
}

/* =========================================================
   PROVABLY FAIR UI
========================================================= */
function showFairnessInfo(d){
  let box=document.getElementById("fairnessBox");
  if(!box){
    box=document.createElement("div");
    box.id="fairnessBox";
    box.style.fontSize="12px";
    box.style.marginTop="12px";
    document.getElementById("casino").appendChild(box);
  }
  box.innerHTML=`
<b>Provably Fair</b><br/>
Client Seed: <code>${CLIENT_SEED}</code><br/>
Server Seed Hash: <code>${d.server_seed_hash}</code><br/>
Nonce: <code>${d.nonce}</code><br/>
<button id="verifyBtn" class="btn secondary" style="margin-top:6px;font-size:12px">
Verify Fairness
</button>`;
}

document.addEventListener("click",e=>{
  if(e.target.id==="verifyBtn"){
    alert("Save Client Seed, Server Seed Hash and Nonce.\nWhen server reveals seed, hash must match.");
  }
});

/* =========================================================
   CLIENT SEED INPUT
========================================================= */
document.addEventListener("DOMContentLoaded",()=>{
  const w=document.getElementById("wallet");
  if(!w) return;
  const box=document.createElement("div");
  box.style.marginTop="12px";
  box.innerHTML=`
<label style="font-size:12px;color:#9fb3c8">Client Seed</label>
<input value="${CLIENT_SEED}" style="margin-top:6px"/>`;
  const i=box.querySelector("input");
  i.onchange=()=>{
    CLIENT_SEED=i.value||"1.2.3.4";
    localStorage.setItem("client_seed",CLIENT_SEED);
  };
  w.appendChild(box);
});

/* =========================================================
   MINING – BASE VALUES
========================================================= */
const MINING_PLANS={
BX:[
{name:"Basic",daily:0.5,days:30,min:10,max:500},
{name:"Standard",daily:1.2,days:45,min:100,max:2000},
{name:"Advanced",daily:2.5,days:60,min:500,max:10000},
{name:"VIP",daily:4.0,days:90,min:2000,max:50000}
],
TON:[
{name:"Basic",daily:0.7,days:30,min:5,max:300},
{name:"Standard",daily:1.8,days:45,min:50,max:1500},
{name:"VIP",daily:3.5,days:75,min:500,max:20000}
],
SOL:[
{name:"Basic",daily:0.6,days:30,min:1,max:100},
{name:"Standard",daily:1.6,days:45,min:20,max:800},
{name:"VIP",daily:3.0,days:75,min:200,max:10000}
]
};

/* =========================================================
   NAVIGATION
========================================================= */
document.addEventListener("DOMContentLoaded",()=>{
  const views=document.querySelectorAll(".view");
  const btns=document.querySelectorAll(".bottom-nav button");
  function show(tab){
    views.forEach(v=>v.style.display="none");
    document.getElementById(tab).style.display="block";
    stopMarket();
    if(tab==="market") startMarket();
    btns.forEach(b=>b.classList.remove("active"));
    document.querySelector(`.bottom-nav button[data-tab="${tab}"]`)
      ?.classList.add("active");
  }
  btns.forEach(b=>b.onclick=()=>show(b.dataset.tab));
  show("wallet");
});
