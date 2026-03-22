/* =========================================================
   PART 5 — MINING (FIXED + NO BREAK)
========================================================= */

const MINING = {
  coin: "BX",
  subscription: null // نفس نظامك
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

/* ================= CALC EARNING (خفيف) ================= */

function calcEarning(plan, amount, start){

  if(!start) return 0;

  const now = Date.now();

  const duration = plan.days * 86400000;

  const progress = Math.min(1, (now - start) / duration);

  const total = amount * (plan.roi / 100);

  return total * progress;
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

    let earning = 0;

    if(isActive){
      earning = calcEarning(
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
            +${earning.toFixed(4)} ${MINING.coin}
          </div>
          <button disabled>Active</button>
        `
        : `<button>Subscribe</button>`
      }
    `;

    const btn = card.querySelector("button");

    if (!isActive){
      btn.onclick = () => subscribeMining(plan);
    }

    grid.appendChild(card);

  });

}

/* ================= VALIDATION ================= */

function validatePlan(plan, amount){

  if(amount < plan.min){
    return `Min: ${plan.min}`;
  }

  if(amount > plan.max){
    return `Max: ${plan.max}`;
  }

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

  // 🔥 نفس structure القديم
  MINING.subscription = {
    coin: MINING.coin,
    planId: plan.id,
    amount,
    start: Date.now()
  };

  renderMining();
  loadWallet();
    }
