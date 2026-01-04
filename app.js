const tg = window.Telegram?.WebApp;
if(tg) tg.ready();

const uid = tg?.initDataUnsafe?.user?.id || 1;
const loader = document.getElementById("loader");

const el = {
  bx: document.getElementById("bx"),
  usdt: document.getElementById("usdt"),
  ton: document.getElementById("ton"),
  rate: document.getElementById("rate"),
  leaderboard: document.getElementById("leaderboard"),
  airdrop: document.getElementById("airdrop"),
  casino: document.getElementById("casino"),
  referral: document.getElementById("referral"),
};

function show(){ if(loader) loader.style.display="flex"; }
function hide(){ if(loader) loader.style.display="none"; }

async function fetchState(){
  const r = await fetch(`/state?uid=${uid}`);
  return r.json();
}

async function load(){
  try{
    show();
    const s = await fetchState();
    el.bx.textContent = "BX: "+s.wallet.bx;
    el.usdt.textContent = "USDT: "+s.wallet.usdt;
    el.ton.textContent = "TON: "+s.wallet.ton;
    el.rate.textContent = "Rate: "+s.mining.rate+" BX/sec";

    el.leaderboard.innerHTML = s.leaderboard
      .map(x=>`${x.rank}. ${x.uid===uid?"You":"User#"+x.uid} — ${x.bx} BX`)
      .join("<br>");

    el.airdrop.innerHTML = `Progress: ${s.airdrop.progress_pct}%<br>${s.airdrop.message}`;
    el.casino.innerHTML = `RTP: ${Math.round(s.casino.rtp*100)}%<br>Provably Fair`;
    el.referral.innerHTML =
      `Invited: ${s.referral.count}<br>
       Reward: ${s.referral.reward_bx} BX<br>
       <small>${s.referral.link}</small>`;
  }finally{
    hide();
  }
}

load();
setInterval(load,5000);
