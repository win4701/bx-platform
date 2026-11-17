"use strict";

const AIRDROP = {
  reward: 0,
  referrals: 0,
  refReward: 0,
  claimed: false,
  refCode: null,
  tasks: [],
  loading: false
};

/* ================= LOAD ================= */

async function loadAirdrop(){

  if (AIRDROP.loading) return;
  AIRDROP.loading = true;

  try{

    const res = await safeFetch("/airdrop/status");

    if (!res) return;

    AIRDROP.reward    = Number(res.reward || 0);
    AIRDROP.referrals = Number(res.referrals || 0);
    AIRDROP.refReward = Number(res.referralReward || 0);
    AIRDROP.claimed   = !!res.claimed;
    AIRDROP.refCode   = res.refCode || null;
    AIRDROP.tasks     = res.tasks || [];

    renderAirdrop();

  }catch(e){
    console.error(e);
  }

  AIRDROP.loading = false;
}

/* ================= RENDER ================= */

function renderAirdrop(){

  // REWARD
  const r = $("airdropReward");
  if (r) r.innerText = "+" + AIRDROP.reward.toFixed(2) + " BX";

  // STATS
  const s = $("airdrop-ref-stats");
  if (s){
    s.innerText =
      `👥 ${AIRDROP.referrals} · 💰 ${AIRDROP.refReward} BX / ref`;
  }

  // REF LINK
  const link = generateReferralLink();
  const linkEl = $("ref-link-airdrop");

  if (linkEl){
    linkEl.value = link || "Login required";
  }

  // TASKS
  renderTasks();

  // BUTTON
  const btn = $("claimAirdropBtn");

  if (!btn) return;

  if (AIRDROP.claimed){
    btn.innerText = "Claimed";
    btn.disabled = true;
  } else if (AIRDROP.reward <= 0){
    btn.innerText = "Complete tasks";
    btn.disabled = true;
  } else {
    btn.innerText = `Claim ${AIRDROP.reward.toFixed(2)} BX`;
    btn.disabled = false;
  }

}

/* ================= TASKS ================= */

function renderTasks(){

  const box = $("airdropTasks");
  if (!box) return;

  box.innerHTML = "";

  AIRDROP.tasks.forEach(t => {

    const row = document.createElement("div");
    row.className = "task";

    row.innerHTML = `
      <div class="task-left">
        <span>${t.name}</span>
        <small>+${t.reward} BX</small>
      </div>
      <button ${t.done ? "disabled" : ""}>
        ${t.done ? "Done" : "Start"}
      </button>
    `;

    if (!t.done){
      row.querySelector("button").onclick = ()=>{
        completeTask(t);
      };
    }

    box.appendChild(row);

  });

}

/* ================= TASK ================= */

async function completeTask(task){

  const res = await safeFetch("/airdrop/task", {
    method:"POST",
    body:{ task_id: task.id }
  });

  if (!res) return;

  task.done = true;
  AIRDROP.reward += task.reward;

  renderAirdrop();
}

/* ================= CLAIM ================= */

async function claimAirdrop(){

  const res = await safeFetch("/airdrop/claim", {
    method:"POST"
  });

  if (!res || !res.success){
    alert("Claim failed");
    return;
  }

  AIRDROP.claimed = true;

  // 💰 WALLET SYNC REALTIME
  if (window.WALLET){
    WALLET.BX += res.reward;
    renderWallet();
  }

  showToast(`+${res.reward} BX`);

  AIRDROP.reward = 0;

  renderAirdrop();
}

/* ================= REF ================= */

function generateReferralLink(){
  if (!AIRDROP.refCode) return null;
  return `${location.origin}?ref=${AIRDROP.refCode}`;
}

function copyReferral(){

  const link = generateReferralLink();

  if (!link) return;

  navigator.clipboard.writeText(link);

  showToast("Copied");
}

/* ================= EVENTS ================= */

document.addEventListener("click",(e)=>{

  if (e.target.id === "claimAirdropBtn"){
    claimAirdrop();
  }

  if (e.target.id === "copyRefBtn"){
    copyReferral();
  }

});

/* ================= AUTO LOAD ================= */

document.addEventListener("DOMContentLoaded", loadAirdrop);
