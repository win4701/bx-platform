// ===================== MINING STATE =====================

const MINING_STATE = {
  activePlan: null,
  isMining: false,
  estimatedReturn: 0.0,
  availablePlans: {
    BX: [
      { id:"p10", name:"Starter",  days:10, roi:2.5, min:10,  max:100 },
      { id:"p21", name:"Basic",    days:21, roi:5,   min:50,  max:300 },
      { id:"p30", name:"Golden",   days:30, roi:8,   min:200, max:800 },
      { id:"p45", name:"Advanced", days:45, roi:12,  min:400, max:2500 },
      { id:"p60", name:"Platine",  days:60, roi:17,  min:750, max:9000 },
      { id:"p90", name:"Infinity", days:90, roi:25,  min:1000,max:20000, vip:true }
    ],
    SOL: [
      { id:"p10", name:"Starter",  days:10, roi:1,   min:1,   max:5 },
      { id:"p21", name:"Basic",    days:21, roi:2.8, min:10,  max:50 },
      { id:"p30", name:"Golden",   days:30, roi:4,   min:40,  max:160 },
      { id:"p45", name:"Advanced", days:45, roi:7,   min:120, max:500 },
      { id:"p60", name:"Platine",  days:60, roi:9,   min:200, max:1000 },
      { id:"p90", name:"Infinity", days:90, roi:14,  min:500, max:2500, vip:true }
    ],
    BNB: [
      { id:"p10", name:"Starter",  days:10, roi:0.8, min:0.05, max:1 },
      { id:"p21", name:"Basic",    days:21, roi:1.8, min:1,   max:4 },
      { id:"p30", name:"Golden",   days:30, roi:3,   min:5,   max:50 },
      { id:"p45", name:"Advanced", days:45, roi:5,   min:10,  max:100 },
      { id:"p60", name:"Platine",  days:60, roi:7,   min:15,  max:150 },
      { id:"p90", name:"Infinity", days:90, roi:11,  min:25,  max:200, vip:true }
    ]
  },
  
  setPlan(coin, plan) {
    this.activePlan = plan;
    this.activeCoin = coin;
    this.isMining = true;
  },

  startMining() {
    if (!this.activePlan) {
      throw new Error("No mining plan selected");
    }
    this.isMining = true;
    // Logica for mining start can go here
  },

  stopMining() {
    this.isMining = false;
  },

  setEstimatedReturn(returnAmount) {
    this.estimatedReturn = returnAmount;
  }
};

// ===================== MINING PLAN RENDER =====================

// Render Mining Plans Dynamically
function renderMiningPlans() {
  const plansContainer = document.getElementById("miningGrid");
  if (!plansContainer) return;
  plansContainer.innerHTML = "";

  const coinPlans = MINING_STATE.availablePlans[MINING_STATE.activeCoin] || [];
  
  coinPlans.forEach(plan => {
    const planElement = document.createElement("div");
    planElement.classList.add("mining-plan");
    planElement.innerHTML = `
      <h4>${plan.name}</h4>
      <p>Days: ${plan.days}</p>
      <p>ROI: ${plan.roi}%</p>
      <p>Min Investment: ${plan.min}</p>
      <p>Max Investment: ${plan.max}</p>
      <button onclick="selectMiningPlan('${plan.id}')">Select</button>
    `;
    plansContainer.appendChild(planElement);
  });
}

// ===================== SELECT MINING PLAN =====================

function selectMiningPlan(planId) {
  const selectedPlan = MINING_STATE.availablePlans[MINING_STATE.activeCoin].find(plan => plan.id === planId);
  
  if (!selectedPlan) {
    alert("Invalid plan selected");
    return;
  }

  MINING_STATE.setPlan(MINING_STATE.activeCoin, selectedPlan);
  alert(`Selected: ${selectedPlan.name}`);
  renderActiveMining();  // Update mining status UI
}

// ===================== RENDER ACTIVE MINING =====================

function renderActiveMining() {
  const activePlanElement = document.getElementById("activeMiningPlan");
  const estimatedReturnElement = document.getElementById("estimatedReturn");

  if (activePlanElement) {
    activePlanElement.textContent = `Active Plan: ${MINING_STATE.activePlan ? MINING_STATE.activePlan.name : "None"}`;
  }

  if (estimatedReturnElement && MINING_STATE.estimatedReturn) {
    estimatedReturnElement.textContent = `Estimated Return: ${MINING_STATE.estimatedReturn} BX`;
  }
}
