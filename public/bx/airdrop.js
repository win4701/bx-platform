/* =========================================================
   AIRDROP PRO MAX (TASKS + ANTI CHEAT)
========================================================= */

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

    if (!isAuthenticated()){
      renderAirdrop();
      return;
    }

    const res = await safeFetch("/airdrop/status");

    if (!res){
      console.warn("Airdrop API failed");
      return;
    }

    AIRDROP.reward     = Number(res.reward || 0);
    AIRDROP.referrals  = Number(res.referrals || 0);
    AIRDROP.refReward  = Number(res.ref_reward || 0);
    AIRDROP.claimed    = !!res.claimed;
    AIRDROP.refCode    = res.ref_code || null;

    // 🔥 TASKS
    AIRDROP.tasks = res.tasks || [
      { id:"join_tg", name:"Join Telegram", reward:2, done:false },
      { id:"follow_x", name:"Follow X", reward:2, done:false },
      { id:"visit_site", name:"Visit Website", reward:1, done:false }
    ];

    renderAirdrop();

  }catch(e){
    console.error("Airdrop load error", e);
  }

  AIRDROP.loading = false;
}

/* ================= RENDER ================= */

function renderAirdrop(){

  // ===== REWARD =====
  const rewardEl = $("airdropReward");
  if (rewardEl){
    rewardEl.innerText = "+" + AIRDROP.reward + " BX";
  }

  // ===== STATS =====
  const statsEl = $("airdrop-ref-stats");
  if (statsEl){
    statsEl.innerText =
      `Referrals: ${AIRDROP.referrals} · Each = ${AIRDROP.refReward} BX`;
  }

  // ===== REF LINK =====
  const linkEl = $("ref-link-airdrop");
  if (linkEl){
    const link = generateReferralLink();
    linkEl.innerText = link || "Login required";
  }

  // ===== TASKS =====
  renderTasks();

  // ===== BUTTON =====
  const btn = $("claimAirdropBtn");

  if (!btn) return;

  if (!isAuthenticated()){
    btn.innerText = "Login required";
    btn.disabled = true;
    return;
  }

  if (AIRDROP.claimed){
    btn.innerText = "Claimed";
    btn.disabled = true;
  } else if (AIRDROP.reward <= 0){
    btn.innerText = "Complete tasks";
    btn.disabled = true;
  } else {
    btn.innerText = `Claim ${AIRDROP.reward} BX`;
    btn.disabled = false;
  }

}

/* ================= TASKS ================= */

function renderTasks(){

  const box = document.getElementById("airdropTasks");

  if (!box) return;

  box.innerHTML = "";

  AIRDROP.tasks.forEach(task => {

    const row = document.createElement("div");
    row.className = "task";

    row.innerHTML = `
      <span>${task.name}</span>
      <b>+${task.reward} BX</b>
      <button ${task.done ? "disabled" : ""}>
        ${task.done ? "Done" : "Start"}
      </button>
    `;

    if (!task.done){
      row.querySelector("button").onclick = ()=>{
        completeTask(task);
      };
    }

    box.appendChild(row);

  });

}

/* ================= COMPLETE TASK ================= */

async function completeTask(task){

  if (!isAuthenticated()){
    alert("Login first");
    return;
  }

  // 🔥 ANTI CHEAT (frontend basic)
  if (task.done){
    alert("Already done");
    return;
  }

  const res = await safeFetch("/airdrop/task", {
    method:"POST",
    body:{
      task_id: task.id
    }
  });

  if (!res){
    alert("Task failed");
    return;
  }

  task.done = true;

  AIRDROP.reward += task.reward;

  renderAirdrop();
}

/* ================= CLAIM ================= */

async function claimAirdrop(){

  if (!isAuthenticated()){
    alert("Login first");
    return;
  }

  if (AIRDROP.claimed){
    alert("Already claimed");
    return;
  }

  if (AIRDROP.reward <= 0){
    alert("Complete tasks first");
    return;
  }

  const res = await safeFetch("/airdrop/claim", {
    method: "POST"
  });

  if (!res){
    alert("Claim failed");
    return;
  }

  if (res.status === "ok"){

    AIRDROP.claimed = true;

    // 💰 wallet sync
    if (window.WALLET){
      WALLET.BX += AIRDROP.reward;
      renderWallet();
    }

    alert(`Claimed ${AIRDROP.reward} BX`);

    AIRDROP.reward = 0;

    renderAirdrop();

  }

}

/* ================= REF ================= */

function generateReferralLink(){
  if (!AIRDROP.refCode) return null;
  return `${location.origin}?ref=${AIRDROP.refCode}`;
}

function copyReferral(){

  const link = generateReferralLink();

  if (!link){
    alert("No link");
    return;
  }

  navigator.clipboard.writeText(link);

  alert("Copied!");
}

/* ================= EVENTS ================= */

document.addEventListener("click", (e)=>{

  if (e.target.id === "claimAirdropBtn"){
    claimAirdrop();
  }

  if (e.target.id === "copyRefBtn"){
    copyReferral();
  }

});
