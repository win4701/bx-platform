/* =====================================================
   BX MINI APP - app.js
   Single Script / Clean Sections
===================================================== */

/* =========================
   CONFIG & INIT
========================= */
const tg = window.Telegram?.WebApp;
if (tg) tg.ready();

const uid =
  tg?.initDataUnsafe?.user?.id ||
  tg?.initDataUnsafe?.user?.uid ||
  1; // fallback للتجربة المحلية

const API_STATE = "/state";

/* =========================
   DOM REFERENCES
========================= */
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

/* =========================
   API
========================= */
async function fetchState() {
  const r = await fetch(`${API_STATE}?uid=${uid}`);
  if (!r.ok) throw new Error("Failed to load state");
  return r.json();
}

/* =========================
   RENDER: WALLET
========================= */
function renderWallet(s) {
  if (!el.bx) return;
  el.bx.textContent = `BX: ${s.wallet.bx}`;
  el.usdt.textContent = `USDT: ${s.wallet.usdt}`;
  el.ton.textContent = `TON: ${s.wallet.ton}`;
}

/* =========================
   RENDER: MINING
========================= */
function renderMining(s) {
  if (!el.rate) return;
  el.rate.textContent = `Rate: ${s.mining.rate} BX/sec`;
}

/* =========================
   RENDER: LEADERBOARD
========================= */
function renderLeaderboard(s) {
  if (!el.leaderboard) return;

  el.leaderboard.innerHTML = s.leaderboard
    .map(
      (x) =>
        `${x.rank}. ${
          x.uid === uid ? "You" : "User#" + x.uid
        } — ${x.bx} BX`
    )
    .join("<br>");
}

/* =========================
   RENDER: AIRDROP
========================= */
function renderAirdrop(s) {
  if (!el.airdrop) return;

  el.airdrop.innerHTML = `
    Progress: ${s.airdrop.progress_pct}%<br>
    ${s.airdrop.message}
  `;
}

/* =========================
   RENDER: CASINO
========================= */
function renderCasino(s) {
  if (!el.casino) return;

  el.casino.innerHTML = `
    RTP: ${Math.round(s.casino.rtp * 100)}%<br>
    ${s.casino.fair ? "Provably Fair" : ""}
  `;
}

/* =========================
   RENDER: REFERRAL
========================= */
function renderReferral(s) {
  if (!el.referral) return;

  el.referral.innerHTML = `
    Invited: ${s.referral.count}<br>
    Reward: ${s.referral.reward_bx} BX<br>
    <small>${s.referral.link}</small>
  `;
}

/* =========================
   STATUS / NOTICES
========================= */
function handleStatus(s) {
  if (s.status?.withdraw_pending) {
    console.log("Withdrawal pending");
    // يمكن لاحقًا استبداله Toast / Banner
  }
}

/* =========================
   MAIN LOOP
========================= */
async function load() {
  try {
    const s = await fetchState();

    renderWallet(s);
    renderMining(s);
    renderLeaderboard(s);
    renderAirdrop(s);
    renderCasino(s);
    renderReferral(s);
    handleStatus(s);
  } catch (e) {
    console.error("Load error:", e);
  }
}

/* =========================
   START
========================= */
load();
setInterval(load, 5000);
