const AIRDROP = {
  reward: 0,
  referrals: 0,
  referralReward: 0,
  claimed: false
};

/* ================= LOAD ================= */

async function loadAirdrop() {

  try {

    const res = await apiGet("/airdrop/status");

    if (!res) return;

    AIRDROP.reward = res.reward || 0;
    AIRDROP.referrals = res.referrals || 0;
    AIRDROP.referralReward = res.referralReward || 0;
    AIRDROP.claimed = res.claimed;

    /* ===== STATUS ===== */

    const status = document.getElementById("airdrop-status");

    if (status) {
      status.textContent = AIRDROP.claimed
        ? "Airdrop already claimed"
        : `Reward: ${AIRDROP.reward} BX`;
    }

    /* ===== CLAIM BUTTON ===== */

    const btn = document.getElementById("claim-airdrop");

    if (btn) {
      btn.classList.toggle("hidden", AIRDROP.claimed);
    }

    /* ===== REFERRALS ===== */

    const refStats = document.getElementById("airdrop-ref-stats");

    if (refStats) {
      refStats.textContent =
        `Referrals: ${AIRDROP.referrals} · Each = ${AIRDROP.referralReward} BX`;
    }

    /* ===== REF LINK ===== */

    renderReferral();

  } catch (err) {

    console.error("Airdrop error:", err);

  }

}

/* ================= CLAIM ================= */

async function claimAirdrop() {

  try {

    const res = await apiPost("/airdrop/claim");

    if (!res) {
      alert("Claim failed");
      return;
    }

    if (res.status === "ok") {
      alert("Airdrop claimed!");
      await loadAirdrop();
      if (typeof loadWallet === "function") loadWallet();
    } else {
      alert("Already claimed");
    }

  } catch (err) {

    console.error("Claim error:", err);

  }

}

/* ================= REFERRAL ================= */

function generateReferralLink() {

  if (!USER?.token) return null;

  return `${location.origin}?ref=${USER.token.slice(0, 8)}`;

}

function renderReferral() {

  const link = generateReferralLink();

  if (!link) return;

  const settings = document.getElementById("ref-link");
  const airdrop = document.getElementById("ref-link-airdrop");

  if (settings) settings.innerText = link;
  if (airdrop) airdrop.innerText = link;

}

/* ================= COPY ================= */

function copyReferral() {

  const link = generateReferralLink();

  if (!link) {
    alert("Login first");
    return;
  }

  navigator.clipboard.writeText(link);
  alert("Copied!");

}

/* ================= HELPERS ================= */

const apiGet = (url) => safeFetch(url, { method: "GET" });

const apiPost = (url, body = {}) =>
  safeFetch(url, {
    method: "POST",
    body: JSON.stringify(body)
  });
