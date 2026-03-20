/* =========================================================
   PART   / CONFIG / Airdrop 
========================================================= */

async function loadAirdrop() {
  try {
    const response = await apiGet("/airdrop/status");

    const airdropStatusText = response.claimed
      ? " You've already claimed your Airdrop!"
      : `Reward: ${response.reward} BX`;

    document.getElementById("airdrop-status").textContent = airdropStatusText;

    document.getElementById("claim-airdrop").classList.toggle("hidden", response.claimed);

  } catch (error) {
    console.error("Error loading airdrop status", error);
    document.getElementById("airdrop-status").textContent = " Failed to load Airdrop status";
  }
}

/* ================= REFERRAL SYSTEM ================= */

function generateReferralLink() {

  if (!USER.token) return null;

  // نجيب user id من التوكن (بسيط)
  const id = USER.token.slice(0, 8);

  return `${location.origin}?ref=${id}`;
}

function renderReferral() {

  const link = generateReferralLink();

  if (!link) return;

  // Settings
  const main = document.getElementById("ref-link");
  if (main) main.innerText = link;

  // Airdrop
  const air = document.getElementById("ref-link-airdrop");
  if (air) air.innerText = link;

}

/* ================= COPY ================= */

function copyReferral(){

  const link = generateReferralLink();

  if (!link) return alert("Login first");

  navigator.clipboard.writeText(link);

  alert("Copied!");
}
/* ================= Airdrop  Calim ================= */

async function claimAirdrop() {
  try {
    const response = await apiPost("/airdrop/claim");

    if (response.status === "ok") {
      loadAirdrop();  
      alert(" You've successfully claimed your Airdrop!");
    } else {
      alert(" You have already claimed your Airdrop.");
    }

  } catch (error) {
    console.error("Error claiming Airdrop", error);
    alert(" Something went wrong while claiming your Airdrop.");
  }
}
  
   
/* ================= Airdrop Click ================= */
const apiGet = (url) => safeFetch(url, { method: "GET" });
const apiPost = (url, body = {}) =>
  safeFetch(url, {
    method: "POST",
    body: JSON.stringify(body)
  });
