/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://bx-backend.fly.dev";

/* Internal price */
const INTERNAL_BX_USDT = 2.0; // 1 BX = 2 USDT
const MARKET_FEE = 0.002;

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
  if(!s) return;

  // لا تشغّل الصوت إلا بعد تفاعل المستخدم
  if (document.visibilityState !== "visible") return;

  try{
    s.pause();
    s.currentTime = 0;

    const playPromise = s.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // تجاهل الخطأ (المتصفح منع الصوت)
      });
    }
  }catch(e){
    // تجاهل أي خطأ بدون إيقاف JS
  }
}
/* =========================================================
   SNAP / MICRO FEEDBACK
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
  el.textContent = val !== undefined
    ? Number(val).toFixed(dec)
    : "0";
}

loadBalances();

/* =========================================================
   MARKET – PAIR SELECTOR (CLEAN VERSION)
========================================================= */

/* Available pairs */
const MARKET_PAIRS = [
  "BX / USDT",
  "BX / TON",
  "BX / SOL",
  "BX / BTC"
];

let currentPairIndex = 0;

const pairBar = document.getElementById("pairBar");
const currentPair = document.getElementById("currentPair");

/* Init default pair */
if(currentPair){
  currentPair.textContent = MARKET_PAIRS[currentPairIndex];
}

/* Switch pair on tap */
pairBar?.addEventListener("click", ()=>{
  playSound("click");
  snap(pairBar);

  /* Next pair */
  currentPairIndex++;
  if(currentPairIndex >= MARKET_PAIRS.length){
    currentPairIndex = 0;
  }

  const pair = MARKET_PAIRS[currentPairIndex];
  currentPair.textContent = pair;

  /* Reset chart data */
  series.length = 0;
  lastPrice = 0;
  drawChart();
});

/* =========================================================
   MARKET – CHART (BASIC + READY FOR ADVANCED)
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

/* =========================================================
   MARKET – DATA LOOP
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

    if(ENABLE_ANIM){
      currentPair.classList.remove("price-up","price-down");
      setTimeout(()=>{
        currentPair.classList.add(
          price >= lastPrice ? "price-up" : "price-down"
        );
      },10);
    }
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
      li.style.color =
        t.side === "buy" ? "#4adebb" : "#ff8fa3";
      tradesUL.appendChild(li);
    });
  }catch(e){}
}

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
   BUY / SELL (BASIC – PREVIEW READY)
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
   CASINO – GLOBAL GAME RUNNER (9 GAMES)
========================================================= */

document.querySelectorAll("#casino .game").forEach(game=>{
  game.addEventListener("click", async ()=>{
    playSound("spin");
    snap(game);

    try{
      const r = await fetch(
        `${API_BASE}/casino/play`,
        {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            uid: 1,
            game: game.dataset.game,
            bet: 1,
            client_seed: CLIENT_SEED
          })
        }
      );

      const data = await r.json();

      playSound(data.win ? "win" : "lose");
      onCasinoPlayed();
      showFairnessInfo(data);

    }catch(e){
      console.error("Casino error", e);
    }
  });
});

/* =========================================================
   MINING / AIRDROP (BASIC)
========================================================= */
document
  .querySelectorAll("#mining .btn, #airdrop .btn")
  .forEach(btn=>{
    btn.addEventListener("click",()=>{
      playSound("click");
      snap(btn);
    });
  });
/* =========================================================
   MINING – PLANS DATA
========================================================= */

const MINING_PLANS = {
  BX: [
    { name:"Starter", daily:"3%", days:30, min:10,  max:500 },
    { name:"Silver",  daily:"8%", days:45, min:100, max:2000 },
    { name:"Gold",    daily:"15%", days:60, min:500, max:10000 },
    { name:"VIP",     daily:"30%", days:90, min:2000,max:50000 }
  ],
  TON: [
    { name:"Starter", daily:"0.8%", days:30, min:5,  max:200 },
    { name:"Silver",  daily:"4%", days:45, min:50, max:1000 },
    { name:"Gold",    daily:"7.5%", days:60, min:200,max:5000 },
    { name:"VIP",     daily:"14%", days:90, min:1000,max:20000 }
  ],
  SOL: [
    { name:"Starter", daily:"0.7%", days:30, min:1,  max:100 },
    { name:"Silver",  daily:"3.5%", days:45, min:20, max:500 },
    { name:"Gold",    daily:"7%", days:60, min:100,max:3000 },
    { name:"VIP",     daily:"12%", days:90, min:500,max:10000 }
  ]
};

const plansBox = document.getElementById("miningPlans");
const miningTabs = document.querySelectorAll(".mining-tabs button");

/* Tabs click */
miningTabs.forEach(btn=>{
  btn.addEventListener("click",()=>{
    miningTabs.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderMining(btn.dataset.coin);
  });
});

/* Default */
renderMining("BX");
function renderMining(coin){
  if (!plansBox || !MINING_PLANS[coin]) return;

  plansBox.innerHTML = "";

  MINING_PLANS[coin].forEach(p=>{
    const div = document.createElement("div");
    div.className = "mining-plan" + (p.name==="VIP" ? " vip" : "");

    div.innerHTML = `
      <h4>${p.name}</h4>
      <div class="badge">${coin} Mining</div>
      <ul>
        <li><span>Daily Profit</span><strong>${p.daily}</strong></li>
        <li><span>Duration</span><strong>${p.days} days</strong></li>
        <li><span>Min</span><strong>${p.min} ${coin}</strong></li>
        <li><span>Max</span><strong>${p.max} ${coin}</strong></li>
      </ul>
      <button class="btn primary">Subscribe</button>
      <div class="status"></div>
    `;

    const btn = div.querySelector(".btn");
    const status = div.querySelector(".status");

    btn.addEventListener("click",()=>{
      playSound("click");
      snap(btn);

      const res = subscribeMining(coin,p);
      if(res.ok){
        div.classList.add("active");
        btn.disabled = true;
        status.textContent = "Active Subscription";
        status.className = "status active";
      }else{
        status.textContent = res.msg;
        status.className = "status error";
      }
    });

    plansBox.appendChild(div);
  });
}
/* =========================================================
   MINING – WALLET SUBSCRIPTION LOGIC
========================================================= */

/* Mock wallet balances (fallback if API not ready) */
let WALLET = {
  BX: 1000,
  TON: 300,
  SOL: 150
};

/* Active subscriptions */
const ACTIVE_MINING = [];

/* Override balances if wallet loaded */
function syncWalletFromUI(){
  ["BX","TON","SOL"].forEach(c=>{
    const el = document.getElementById("bal-"+c.toLowerCase());
    if(el){
      WALLET[c] = Number(el.textContent) || WALLET[c];
    }
  });
}

/* Subscribe handler */
function subscribeMining(coin, plan){
  syncWalletFromUI();

  if(WALLET[coin] < plan.min){
    return {
      ok:false,
      msg:`Insufficient ${coin} balance`
    };
  }

  WALLET[coin] -= plan.min;

  ACTIVE_MINING.push({
    coin,
    plan:plan.name,
    amount:plan.min,
    daily:plan.daily,
    start:Date.now()
  });

  /* Update UI wallet */
  const balEl = document.getElementById("bal-"+coin.toLowerCase());
  if(balEl){
    balEl.textContent = WALLET[coin].toFixed(2);
  }

  return { ok:true };
}
/* =========================================================
   AIRDROP – CASINO + REFERRAL SYSTEM
========================================================= */

/* State */
let AIRDROP = {
  casinoRewarded:false,
  referralPoints:0
};

const AIRDROP_BX_REWARD = 2.5;
const REFERRAL_POINT_TO_BX = 0.5; // كل نقطة = 0.5 BX

/* Sync BX balance */
function addBX(amount){
  const el = document.getElementById("bal-bx");
  if(!el) return;

  let current = Number(el.textContent) || 0;
  current += amount;
  el.textContent = current.toFixed(2);
}

/* ===== Casino Play Reward ===== */
function onCasinoPlayed(){
  if(AIRDROP.casinoRewarded) return;

  AIRDROP.casinoRewarded = true;
  addBX(AIRDROP_BX_REWARD);

  updateAirdropUI("casino");
}

/* ===== Referral System ===== */

/* Simulate referral (later from backend) */
function addReferral(){
  AIRDROP.referralPoints++;

  const bx = REFERRAL_POINT_TO_BX;
  addBX(bx);

  updateAirdropUI("referral");
}

/* ===== UI Update ===== */
function updateAirdropUI(type){
  const status = document.getElementById("airdropStatus");
  const casinoTask = document.getElementById("casinoTask");
  const refPoints = document.getElementById("refPoints");

  if(type === "casino" && casinoTask){
    casinoTask.classList.add("done");
    casinoTask.innerHTML = "✔ Casino Played – 2.5 BX Added";
    status.textContent = "Reward added to wallet";
    status.className = "status success";
  }

  if(type === "referral" && refPoints){
    refPoints.textContent = AIRDROP.referralPoints;
    status.textContent = "Referral reward added";
    status.className = "status success";
  }
}

/* =========================================================
   PROVABLY FAIR – UI
========================================================= */
function showFairnessInfo(data){
  let box = document.getElementById("fairnessBox");
  if(!box){
    box = document.createElement("div");
    box.id = "fairnessBox";
    box.style.marginTop = "12px";
    box.style.fontSize = "12px";
    box.style.color = "#9fb3c8";
    document.getElementById("casino").appendChild(box);
  }

  box.innerHTML = `
    <strong>Provably Fair</strong><br/>
    Client Seed: <code>${CLIENT_SEED}</code><br/>
    Server Seed Hash: <code>${data.server_seed_hash}</code><br/>
    Nonce: <code>${data.nonce}</code><br/>
    <button id="verifyBtn"
      class="btn secondary"
      style="margin-top:6px;font-size:12px">
      Verify Fairness
    </button>
  `;
}

document.addEventListener("click",e=>{
  if(e.target.id === "verifyBtn"){
    alert(
`Verification steps:
1. Save Server Seed Hash
2. Save Client Seed
3. Save Nonce
4. When server reveals seed,
   hash(seed) must match`
    );
  }
});

/* =========================================================
   WALLET – DEPOSIT METHODS LOGIC
========================================================= */

document.querySelectorAll(".deposit-method").forEach(method=>{
  method.addEventListener("click", ()=>{
    playSound("click");
    snap(method);

    const type = method.dataset.method;

    if(type === "binance"){
      alert("Enter your Binance ID (Coming Soon)");
      // لاحقًا: open modal + API
    }

    if(type === "walletconnect"){
      alert("WalletConnect integration (Coming Soon)");
      // لاحقًا: WalletConnect SDK
    }
  });
});

/* =========================================================
   CLIENT SEED INPUT (UI)
========================================================= */
document.addEventListener("DOMContentLoaded", ()=>{
  const wallet = document.getElementById("wallet");
  if(!wallet) return;

  const box = document.createElement("div");
  box.style.marginTop = "12px";
  box.innerHTML = `
    <label style="font-size:12px;color:#9fb3c8">
      Client Seed
    </label>
    <input
      value="${CLIENT_SEED}"
      style="margin-top:6px"
      placeholder="1.2.3.4"/>
  `;

  const input = box.querySelector("input");
  input.onchange = ()=>{
    CLIENT_SEED = input.value || "1.2.3.4";
    localStorage.setItem("client_seed", CLIENT_SEED);
  };

  wallet.appendChild(box);
});

/* =========================================================
   FINAL SAFE TAB NAVIGATION
========================================================= */

document.addEventListener("DOMContentLoaded", ()=>{

  const views = document.querySelectorAll(".view");
  const navButtons = document.querySelectorAll(".bottom-nav button");

  function showTab(tabId){
  views.forEach(v=>{
    v.classList.remove("active");
    v.style.display = "none";   // ← هذا السطر الحاسم
  });

  const target = document.getElementById(tabId);
  if(!target) return;

  target.style.display = "block"; // ← وهذا
  target.classList.add("active");

  navButtons.forEach(b=>b.classList.remove("active"));
  document
    .querySelector(`.bottom-nav button[data-tab="${tabId}"]`)
    ?.classList.add("active");
}

  navButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const tab = btn.dataset.tab;
      if(tab){
        showTab(tab);
      }
    });
  });

  showTab("wallet");

});
