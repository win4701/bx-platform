/* =========================================================
   PART 5 — MINING (FINAL PRO CLEAN)
========================================================= */

const MINING = {
  coin: "BX",
  subscription: null // نفس نظامك
};

/* ================= PLANS BY COIN ================= */

const MINING_PLANS_BY_COIN = {
  BX: [
    { id:"p10", name:"Starter",  days:10, roi:2.5, min:5,   max:60  },
    { id:"p21", name:"Basic",    days:21, roi:5,   min:50,   max:250  },
    { id:"p30", name:"Golden",   days:30, roi:8,   min:200,  max:800  },
    { id:"p45", name:"Pro", days:45, roi:12,  min:400,  max:2500 },
    { id:"p60", name:"Platine",  days:60, roi:17,  min:750,  max:9000 },
    { id:"p90", name:"Infinity", days:90, roi:25,  min:1000, max:20000, sub:true }
  ],

  SOL: [
    { id:"p10", name:"Starter",  days:10, roi:1,   min:1,    max:5   },
    { id:"p21", name:"Basic",    days:21, roi:2.8, min:10,   max:50  },
    { id:"p30", name:"Golden",   days:30, roi:4,   min:40,   max:160 },
    { id:"p45", name:"Pro", days:45, roi:7,   min:120,  max:500 },
    { id:"p60", name:"Platine",  days:60, roi:9,   min:200,  max:1000 },
    { id:"p90", name:"Infinity", days:90, roi:14,  min:500,  max:2500, sub:true }
  ],

  BNB: [
    { id:"p10", name:"Starter",  days:10, roi:0.8, min:0.05, max:1   },
    { id:"p21", name:"Basic",    days:21, roi:1.8, min:1,    max:4   },
    { id:"p30", name:"Golden",   days:30, roi:3,   min:5,    max:50  },
    { id:"p45", name:"Pro", days:45, roi:5,   min:10,   max:100 },
    { id:"p60", name:"Platine",  days:60, roi:7,   min:15,   max:150 },
    { id:"p90", name:"Infinity", days:90, roi:11,  min:25,   max:200, sub:true }
  ]
};

/* ================= ENTRY ================= */

function renderMining() {
  bindMiningTabs();
  renderMiningPlans();
}

/* ================= TABS ================= */

function bindMiningTabs() {

  const buttons = $$(".mining-tabs button");

  buttons.forEach(btn => {

    const coin = btn.dataset.coin;

    btn.classList.toggle("active", coin === MINING.coin);

    btn.onclick = () => {
      if (MINING.coin === coin) return;
      MINING.coin = coin;
      renderMining();
    };

  });

}

/* ================= CALC ================= */

function calcMining(plan, amount, start){

  if(!start) return { earning:0, progress:0, left:0 };

  const now = Date.now();
  const duration = plan.days * 86400000;

  const elapsed = now - start;

  const progress = Math.min(1, elapsed / duration);

  const total = amount * (plan.roi / 100);

  const earning = total * progress;

  const left = Math.max(0, duration - elapsed);

  return { earning, progress, left };
}

/* ================= TIME FORMAT ================= */

function formatTime(ms){

  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  return `${d}d ${h%24}h ${m%60}m`;
}

/* ================= RENDER ================= */

function renderMiningPlans(){

  const grid = $("miningGrid");
  if (!grid) return;

  const plans = MINING_PLANS_BY_COIN[MINING.coin];
  grid.innerHTML = "";

  plans.forEach(plan => {

    const isActive =
      MINING.subscription &&
      MINING.subscription.coin === MINING.coin &&
      MINING.subscription.planId === plan.id;

    let data = { earning:0, progress:0, left:0 };

    if(isActive){
      data = calcMining(
        plan,
        MINING.subscription.amount,
        MINING.subscription.start
      );
    }

    const card = document.createElement("div");
    card.className = "card mining-plan";

    card.innerHTML = `
      <h3>
        ${plan.name}
        ${plan.sub ? '<span class="sub-tag">SUB</span>' : ''}
      </h3>

      <div class="mining-profit">${plan.roi}%</div>

      <ul>
        <li>${plan.days} days</li>
        <li>Min: ${plan.min} ${MINING.coin}</li>
        <li>Max: ${plan.max} ${MINING.coin}</li>
      </ul>

      ${
        isActive
        ? `
          <div class="profit">
            +${data.earning.toFixed(4)} ${MINING.coin}
          </div>

          <div class="progress-bar">
            <div style="width:${(data.progress*100).toFixed(1)}%"></div>
          </div>

          <div class="time-left">
            ⏳ ${formatTime(data.left)}
          </div>

          <button class="claim">Claim</button>
          <button disabled>Active</button>
        `
        : `<button class="sub">Subscribe</button>`
      }
    `;

    // ================= EVENTS =================

    if(!isActive){

      card.querySelector(".sub").onclick = ()=>{
        subscribeMining(plan);
      };

    } else {

      card.querySelector(".claim").onclick = ()=>{
        claimMining(plan);
      };

    }

    grid.appendChild(card);

  });

}

/* ================= VALIDATION ================= */

function validatePlan(plan, amount){

  if(amount < plan.min) return `Min: ${plan.min}`;
  if(amount > plan.max) return `Max: ${plan.max}`;

  return null;
}

/* ================= SUBSCRIBE ================= */

async function subscribeMining(plan){

  if(!isAuthenticated()){
    alert("Please login first");
    return;
  }

  const amount = Number(
    prompt(`Amount (${plan.min} - ${plan.max})`)
  );

  if(!amount) return;

  const error = validatePlan(plan, amount);

  if(error){
    alert(error);
    return;
  }

  const res = await safeFetch("/mining/subscribe", {
    method: "POST",
    body: JSON.stringify({
      coin: MINING.coin,
      plan_id: plan.id,
      amount
    })
  });

  if (!res){
    alert("Mining failed");
    return;
  }

  alert("Mining started");

  MINING.subscription = {
    coin: MINING.coin,
    planId: plan.id,
    amount,
    start: Date.now()
  };

  renderMining();
  loadWallet();
}

/* ================= CLAIM ================= */

async function claimMining(plan){

  const sub = MINING.subscription;

  if(!sub) return;

  const data = calcMining(plan, sub.amount, sub.start);

  if(data.earning <= 0){
    alert("No profit yet");
    return;
  }

  await safeFetch("/mining/claim", {
    method: "POST",
    body: JSON.stringify({
      coin: sub.coin,
      plan_id: sub.planId
    })
  });

  if(window.WALLET){
    WALLET[sub.coin] += data.earning;
    renderWallet();
  }

  sub.start = Date.now();

  alert(`Claimed +${data.earning.toFixed(4)} ${sub.coin}`);

  renderMining();
}

/* ================= AUTO REFRESH ================= */

setInterval(()=>{

  if(window.APP?.view === "mining"){
    renderMining();
  }

},2000);
