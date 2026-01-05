const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const uid = tg?.initDataUnsafe?.user?.id || 0;
const ref = new URLSearchParams(location.search).get("ref");

let priceChart;

/* ---------- UI HELPERS ---------- */
function showTab(t){
  document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll("#tab-buy,#tab-sell,#tab-swap")
    .forEach(d=>d.classList.add("hidden"));

  document.querySelector(`[onclick="showTab('${t}')"]`).classList.add("active");
  document.getElementById("tab-"+t).classList.remove("hidden");
}

/* ---------- CORE LOAD ---------- */
async function load(){
  const s = await fetch(`/state?uid=${uid}&ref=${ref}`).then(r=>r.json());

  bx.textContent = s.wallet.bx;
  usdt.textContent = s.wallet.usdt;
  ton.textContent = s.wallet.ton;
  mineRate.textContent = s.mining.rate;

  loadReferrals();
  loadChart();
}

/* ---------- MARKET ---------- */
async function buyBX(){
  const v = +buyAmount.value;
  await fetch(`/market/buy?uid=${uid}&usdt=${v}`,{method:"POST"});
  marketResult.textContent = "Buy executed";
  load();
}

async function sellBX(){
  const v = +sellAmount.value;
  const r = await fetch(`/market/sell?uid=${uid}&bx=${v}`,{method:"POST"});
  const j = await r.json();
  marketResult.textContent = j.error ? "Sell limit exceeded" : "Sell executed";
  load();
}

async function swapBX(asset){
  const v = +swapAmount.value;
  await fetch(`/market/swap?uid=${uid}&bx=${v}&asset=${asset}`,{method:"POST"});
  marketResult.textContent = `Swapped to ${asset}`;
  load();
}

/* ---------- CASINO ---------- */
async function playCasino(){
  const v = +casinoBet.value;
  const r = await fetch(`/casino/play?uid=${uid}&bet=${v}`,{method:"POST"});
  const j = await r.json();
  casinoResult.textContent = j.win ? `+${j.payout} BX` : `-${j.burned} BX`;
  load();
}

/* ---------- AIRDROP ---------- */
async function claimTask(task){
  await fetch("/airdrop/claim",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({uid,task})
  });
  load();
}

/* ---------- REFERRALS ---------- */
async function loadReferrals(){
  const r = await fetch(`/referrals/stats?uid=${uid}`).then(r=>r.json());
  refCount.textContent = r.total;

  const lb = await fetch("/referrals/leaderboard").then(r=>r.json());
  refLB.innerHTML = lb.map(x=>{
    const name = x.uid === uid ? "You" : "User " + x.uid;
    return `${x.rank}. ${name} — ${x.total}`;
  }).join("<br>");
}

/* ---------- CHART ---------- */
async function loadChart(){
  const data = await fetch("/chart").then(r=>r.json());
  if(!data || !data.length) return;

  const labels = data.map(x=>new Date(x.ts*1000).toLocaleTimeString());
  const prices = data.map(x=>x.price);

  bxPrice.textContent = prices[prices.length-1];

  if(priceChart){
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = prices;
    priceChart.update();
    return;
  }

  priceChart = new Chart(document.getElementById("chart"),{
    type:"line",
    data:{
      labels,
      datasets:[{
        data:prices,
        borderColor:"#5b7cff",
        tension:.3
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{x:{display:false}}
    }
  });
}

/* ---------- START ---------- */
window.onload = load;
