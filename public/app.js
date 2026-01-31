"use strict";

/* =======================================================
   1.1 — API Base URL
========================================================= */

const API_BASE = "https://bx-backend.fly.dev"; 

/* =======================================================
   1.2 — App State
========================================================= */

const APP_STATE = {
  ready: false, 
  view: "wallet", 
  user: null, 
  isLoading: false 
};

/* =======================================================
   1.3 — USER (من الـ LocalStorage أو الـ Cookie)
========================================================= */

const USER = {
  jwt: localStorage.getItem("jwt") || null, 
  isAuthenticated() {
    return this.jwt !== null;
  },
  setToken(jwt) {
    this.jwt = jwt;
    localStorage.setItem("jwt", jwt);
  }
};

/* =======================================================
   1.4 — API Authorization Headers
========================================================= */

function authHeaders() {
  return USER.isAuthenticated() ? { Authorization: "Bearer " + USER.jwt } : {};
}

/* =======================================================
   1.5 — Helper functions (DOM, Toasts, Logging)
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function toast(message) {
  if (!message) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000); 
}

function log(message) {
  console.log(message);
}

/* =======================================================
   1.6 — API Contract: Paths for FastAPI endpoints
========================================================= */

const API = {
  wallet: "/finance/wallet", 
  casino: {
    play: "/casino/play", 
    history: "/casino/history"
  },
  mining: {
    start: "/bxing/mining/start", 
    status: "/bxing/mining/status"
  },
  airdrop: {
    status: "/bxing/airdrop/status", 
    claim: "/bxing/airdrop/claim" 
  }
};

/* =======================================================
   2.1 — Wallet State
========================================================= */

const WALLET_STATE = {
  BX: 0.0,
  USDT: 0.0,
  BNB: 0.0,
  ETH: 0.0,
  SOL: 0.0,
  TON: 0.0,
  BTC: 0.0,

  set(walletData) {
    this.BX = walletData.BX || 0;
    this.USDT = walletData.USDT || 0;
    this.BNB = walletData.BNB || 0;
    this.ETH = walletData.ETH || 0;
    this.SOL = walletData.SOL || 0;
    this.TON = walletData.TON || 0;
    this.BTC = walletData.BTC || 0;
  },

  update(asset, amount) {
    if (this.hasOwnProperty(asset)) {
      this[asset] += amount;
    }
  }
};

/* =======================================================
   2.2 — Market State (Market Price)
========================================================= */

const MARKET_STATE = {
  price: 0.0,
  pair: "BX/USDT",  
  spread: 0.32,    
  between buy and sell price
  set(price) {
    this.price = price;
  },
  updatePrice(newPrice) {
    this.price = newPrice;
  },
  setPair(pair) {
    this.pair = pair;
  }
};

/* =======================================================
   2.3 — Casino State
========================================================= */

const CASINO_STATE = {
  activeGame: null,
  isPlaying: false,
  result: null,

  setGame(gameId) {
    this.activeGame = gameId;
    this.result = null;
  },

  setResult(result) {
    this.result = result;
  },

  startGame() {
    this.isPlaying = true;
  },

  stopGame() {
    this.isPlaying = false;
  }
};

/* =======================================================
   2.4 — Mining State
========================================================= */

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
  },

  stopMining() {
    this.isMining = false;
  },

  setEstimatedReturn(returnAmount) {
    this.estimatedReturn = returnAmount;
  }
};

/* =======================================================
   2.5 — Airdrop State
========================================================= */

const AIRDROP_STATE = {
  claimed: false,
  reward: 2.5,  
  setStatus(claimed, reward) {
    this.claimed = claimed;
    this.reward = reward || 2.5;
  },

  claimAirdrop() {
    this.claimed = true;
  }
};

/* =======================================================
   3.1 — Load Wallet (Get user wallet data)
========================================================= */

async function loadWallet() {
  const data = await safeFetch(API.wallet);
  if (!data) {
    toast("Failed to load wallet.");
    return;
  }

  WALLET_STATE.set(data);
  renderWallet(); STATE، 
}

/* =======================================================
   3.2 — Play Casino (Send play request to the backend)
========================================================= */

async function playCasino(gameId, betAmount) {
  if (!gameId || betAmount <= 0) {
    toast("Invalid game or bet amount.");
    return;
  }

  const result = await safeFetch(API.casino.play, {
    method: "POST",
    body: JSON.stringify({
      game: gameId,
      bet: betAmount,
      client_seed: localStorage.getItem("client_seed") || "default"
    })
  });

  if (!result) {
    toast("Casino service unavailable");
    return;
  }

  CASINO_STATE.setResult(result);
  renderCasinoUI(result); 
}

/* =======================================================
   3.3 — Start Mining (Send mining request)
========================================================= */

async function startMining(asset, plan) {
  if (!asset || !plan) {
    toast("Invalid asset or plan.");
    return;
  }

  const result = await safeFetch(API.mining.start, {
    method: "POST",
    body: JSON.stringify({
      asset,
      plan
    })
  });

  if (!result) {
    toast("Mining service unavailable");
    return;
  }

  MINING_STATE.setPlan(plan);
  MINING_STATE.startMining();
  renderMiningPlans(); 
}

/* =======================================================
   3.4 — Load Mining Status (Get active mining data)
========================================================= */

async function loadMiningStatus() {
  const data = await safeFetch(API.mining.status);
  if (!data) {
    toast("Failed to load mining status.");
    return;
  }

  MINING_STATE.setPlan(data.plan);
  MINING_STATE.setEstimatedReturn(data.estimatedReturn);
  renderActiveMining(); 
}

/* =======================================================
   3.5 — Airdrop Status (Get user airdrop status)
========================================================= */

async function loadAirdropStatus() {
  const data = await safeFetch(API.airdrop.status);
  if (!data) {
    toast("Failed to load airdrop status.");
    return;
  }
  AIRDROP_STATE.setStatus(data.claimed, data.reward);
  renderAirdrop(); 
}

/* =======================================================
   3.6 — Claim Airdrop (Send claim request)
========================================================= */

async function claimAirdrop() {
  const result = await safeFetch(API.airdrop.claim, { method: "POST" });

  if (!result) {
    toast("Airdrop service unavailable");
    return;
  }

  AIRDROP_STATE.claimAirdrop();
  renderAirdrop(); 
  }

/* =======================================================
   4.1 — Render Wallet (Update wallet data in UI)
========================================================= */

function renderWallet() {
  if (!APP_STATE.ready || !WALLET_STATE) return;

  Object.entries(WALLET_STATE).forEach(([asset, amount]) => {
    const elementId = `bal-${asset.toLowerCase()}`;
    const element = $(elementId);
    if (element) element.textContent = amount.toFixed(2);
  });
}

/* =======================================================
   4.2 — Render Market Price (Display market price)
========================================================= */

function renderMarketPrice() {
  if (!APP_STATE.ready || MARKET_STATE.price === 0) return;

  const priceElement = $("lastPrice");
  if (priceElement) {
    priceElement.textContent = MARKET_STATE.price.toFixed(4);
  }
}

/* =======================================================
   4.3 — Render Casino UI (Display active game and result)
========================================================= */

function renderCasinoUI(result) {
  if (!APP_STATE.ready || !CASINO_STATE) return;

  const gameElement = $("activeGame");
  const resultElement = $("gameResult");

  if (gameElement) {
    gameElement.textContent = `Active Game: ${CASINO_STATE.activeGame || "None"}`;
  }

  if (resultElement) {
    resultElement.textContent = `Result: ${result ? result.win ? "You Win!" : "You Lose!" : "Waiting..."}`;
  }
}

/* =======================================================
   4.4 — Render Mining Plans (Display mining plans)
========================================================= */

function renderMiningPlans() {
  if (!APP_STATE.ready || !MINING_STATE || !MINING_STATE.availablePlans) return;

  const plansContainer = $("miningGrid");
  if (!plansContainer) return;

  plansContainer.innerHTML = ""; 

  const activePlans = MINING_STATE.availablePlans[ACTIVE_MINING_COIN];

  activePlans.forEach(plan => {
    const planElement = document.createElement("div");
    planElement.classList.add("mining-plan");
    planElement.innerHTML = `
      <div class="plan-header">
        <h4>${plan.name}</h4>
        ${plan.vip ? `<span class="badge vip">VIP</span>` : ""}
      </div>
      <div class="plan-details">
        <div><strong>ROI:</strong> ${plan.roi * 100}%</div>
        <div><strong>Investment:</strong> ${plan.min} - ${plan.max}</div>
        <div><strong>Duration:</strong> ${plan.days} days</div>
      </div>
      <button class="subscribe-button" onclick="selectMiningPlan('${plan.id}')">Subscribe</button>
    `;
    plansContainer.appendChild(planElement);
  });
}

/* =======================================================
   4.5 — Render Active Mining (Display active mining status)
========================================================= */

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

/*====================================================
   button Mining  (When user selects a plan)
========================================================= */

document.querySelectorAll(".mining-tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mining-tabs button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    ACTIVE_MINING_COIN = btn.dataset.coin;

    renderMiningPlans();
  });
});

/* =======================================================
   Select Mining Plan (When user selects a plan)
========================================================= */

function selectMiningPlan(planId) {
  const selectedPlan = MINING_STATE.availablePlans[ACTIVE_MINING_COIN].find(plan => plan.id === planId);
  
  if (!selectedPlan) {
    toast("Invalid mining plan selected.");
    return;
  }

  MINING_STATE.setPlan(ACTIVE_MINING_COIN, selectedPlan);
  MINING_STATE.startMining();
  renderActiveMining();  
}

/* =======================================================
   4.6 — Render Airdrop (Display airdrop status)
========================================================= */

function renderAirdrop() {
  if (!APP_STATE.ready || !AIRDROP_STATE) return;

  const airdropStatusElement = $("airdropStatus");
  const airdropRewardElement = $("airdropReward");

  if (airdropStatusElement) {
    airdropStatusElement.textContent = AIRDROP_STATE.claimed ? "Claimed" : "Not Claimed";
  }

  if (airdropRewardElement) {
    airdropRewardElement.textContent = `Reward: ${AIRDROP_STATE.reward} USDT`;
  }
}

/* =======================================================
   4.7 — Bind Events (Add event listeners)
========================================================= */

function bindEvents() {
  $("claimAirdropButton")?.addEventListener("click", () => {
    claimAirdrop();
  });

  $("startMiningButton")?.addEventListener("click", () => {
    startMining("BX", "Starter");
  });

  $("playCasinoButton")?.addEventListener("click", () => {
    playCasino("blackjack", 10);
  });
}

/* =======================================================
   5.1 — Initialize Application (On DOMContentLoaded)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  loadWallet();
  loadMiningStatus();
  loadAirdropStatus();
  startMarket();
  APP_STATE.ready = true;
  navigate(APP_STATE.view);
});

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.view); 
  });
}

/* =======================================================
   5.2 — Navigation (Control view transitions)
========================================================= */

function navigate(view) {
  if (!view) return;

  APP_STATE.view = view;

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  const target = document.getElementById(view);
  if (target) target.classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(b =>
    b.classList.remove("active")
  );

  const btn = document.querySelector(
    `.bottom-nav button[data-view="${view}"]`
  );
  if (btn) btn.classList.add("active");
}

/* =======================================================
   5.3 — Start/Stop Market Loop (Simulate market behavior)
========================================================= */

let marketLoopTimer = null;

function startMarket() {
  if (marketLoopTimer) return; 
  marketLoopTimer = setInterval(() => {
    if (!APP_STATE.ready || APP_STATE.view !== "market") return;
    MARKET_STATE.price += (Math.random() - 0.5) * 0.32;
    renderMarketPrice(); 
  }, 1200); 
}

function stopMarket() {
  if (marketLoopTimer) {
    clearInterval(marketLoopTimer);
    marketLoopTimer = null;
  }
}

/* =======================================================
   5.4 — Start/Stop Casino (Start/Stop game bots)
========================================================= */

let casinoBotsTimer = null;

function startCasino() {
  if (casinoBotsTimer) return; 
  casinoBotsTimer = setInterval(() => {
    if (!APP_STATE.ready || APP_STATE.view !== "casino") return;
    playCasino("blackjack", 10); 
  }, 5000); 
}

function stopCasino() {
  if (casinoBotsTimer) {
    clearInterval(casinoBotsTimer);
    casinoBotsTimer = null;
  }
}

/* =======================================================
   5.5 — Auto Bind Navigation (To link navigation events)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();  
});

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.view); 
  });
}

/* =======================================================
   5.6 — Automatic Actions for Specific Views
========================================================= */

function startAutoActions() {
  if (APP_STATE.view === "market") {
    startMarket(); 
  }
   
  if (APP_STATE.view === "casino") {
    startCasino(); 
  }
}
