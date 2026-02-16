/*================= Airdrop  Calim ================= */

async function claimAirdrop() {
  try {
    const response = await apiPost("/bxing/airdrop/claim");

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

/* =========================================================
   MOBILE TOPUP — AIRDROP EXTENSION
========================================================= */

const TOPUP = {
  rate: 1,        // USDT rate (dynamic later)
  usdtAmount: 0,
  fiatAmount: 0
};

function initTopup() {
  const calcBtn = $("topup-calc");
  const confirmBtn = $("topup-confirm");

  if (!calcBtn) return;

  calcBtn.onclick = async () => {
    const amount = Number($("topup-amount").value);
    if (!amount || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    // لاحقًا سنجلب سعر P2P من backend
    TOPUP.rate = await fetchUsdtRate();
    TOPUP.fiatAmount = amount;
    TOPUP.usdtAmount = (amount / TOPUP.rate).toFixed(2);

    $("topup-result").innerHTML =
      `You pay: <b>${TOPUP.usdtAmount} USDT</b>`;

    confirmBtn.classList.remove("hidden");
  };

  confirmBtn.onclick = () => {
    if (!isAuthenticated()) {
      alert("Login required");
      return;
    }

    processTopupPayment();
  };
}

/* ===== Fetch dynamic USDT rate ===== */
async function fetchUsdtRate() {
  try {
    const data = await safeFetch("/pricing/usdt-rate");
    return data?.rate || 1;
  } catch {
    return 1;
  }
}

/* ===== Process payment ===== */
async function processTopupPayment() {
  const phone = $("topup-phone").value;
  const country = $("topup-country").value;

  const res = await safeFetch("/topup/request", {
    method: "POST",
    body: JSON.stringify({
      phone,
      country,
      fiat: TOPUP.fiatAmount,
      usdt: TOPUP.usdtAmount
    })
  });

  if (!res) {
    alert("Topup failed");
    return;
  }

  alert("Topup request submitted");
}

/* ================= Airdrop Loader ================= */

document.querySelector('[data-view="airdrop"]').addEventListener('click', function() {
  navigate("airdrop");
  loadAirdrop();  
});
