/* =======================================================
   4.4 — Render Mining Plans (Display mining plans)
========================================================= */

function renderMiningPlans() {
  if (!APP_STATE.ready || !MINING_STATE || !MINING_STATE.availablePlans) return;

  const plansContainer = $("miningGrid");
  if (!plansContainer) return;

  plansContainer.innerHTML = ""; // Clear existing plans

  // Display available plans based on MINING_STATE
  MINING_STATE.availablePlans.forEach(plan => {
    const planElement = document.createElement("div");
    planElement.classList.add("miningPlan");
    planElement.innerHTML = `
      <div>${plan.name}</div>
      <div>ROI: ${plan.roi * 100}%</div>
      <div>Investment: ${plan.min} - ${plan.max}</div>
      <div>Duration: ${plan.days} days</div>
    `;
    plansContainer.appendChild(planElement);

    // Make the plan clickable to select it
    planElement.addEventListener("click", () => {
      selectMiningPlan(plan);
    });
  });
}

/* =======================================================
   4.5 — Render Active Mining (Display active mining status)
========================================================= */

function renderActiveMining() {
  if (!APP_STATE.ready || !MINING_STATE) return;

  const activeMiningElement = $("activeMining");
  const roiElement = $("activeMiningROI");
  const returnElement = $("estimatedReturn");

  if (activeMiningElement) {
    activeMiningElement.textContent = `Active Plan: ${MINING_STATE.activePlan ? MINING_STATE.activePlan.name : "None"}`;
  }

  if (roiElement && MINING_STATE.activePlan) {
    roiElement.textContent = `ROI: ${MINING_STATE.activePlan.roi * 100}%`;
  }

  if (returnElement && MINING_STATE.estimatedReturn) {
    returnElement.textContent = `Estimated Return: ${MINING_STATE.estimatedReturn.toFixed(2)} USDT`;
  }
}

/* =======================================================
   Select Mining Plan (When user selects a plan)
========================================================= */

function selectMiningPlan(plan) {
  MINING_STATE.setPlan(plan);
  MINING_STATE.startMining();
  renderActiveMining(); // Update the active mining status
}
