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
   MOBILE TOPUP — AIRDROP EXTENSION (SAFE VERSION)
========================================================= */

const TOPUP = {
  rate: 1,
  usdtAmount: 0,
  fiatAmount: 0
};

function initTopup() {
  const calcBtn = document.getElementById("topup-calc");
  const confirmBtn = document.getElementById("topup-confirm");
  const amountInput = document.getElementById("topup-amount");

  if (!calcBtn || !confirmBtn || !amountInput) return;

  calcBtn.onclick = async () => {
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    try {
      TOPUP.rate = await fetchUsdtRate();
    } catch {
      TOPUP.rate = 1;
    }

    TOPUP.fiatAmount = amount;
    TOPUP.usdtAmount = (amount / TOPUP.rate).toFixed(2);

    const resultBox = document.getElementById("topup-result");
    if (resultBox) {
      resultBox.innerHTML =
        `You Pay: <b>${TOPUP.usdtAmount} USDT</b>`;
    }

    confirmBtn.classList.remove("hidden");
  };

  confirmBtn.onclick = async () => {
    if (!isAuthenticated()) {
      alert("Login required");
      return;
    }

    await processTopupPayment();
  };
}

/* ===== Fetch dynamic USDT rate ===== */
async function fetchUsdtRate() {
  try {
    const data = await safeFetch("/pricing/usdt-rate");
    return parseFloat(data?.rate) || 1;
  } catch {
    return 1;
  }
}

/* ===== Process payment ===== */
async function processTopupPayment() {
  const phone = document.getElementById("topup-phone")?.value;
  const country = document.getElementById("topup-country")?.value;

  if (!phone || !country) {
    alert("Missing phone or country");
    return;
  }

  const res = await safeFetch("/topup/request", {
    method: "POST",
    body: JSON.stringify({
      phone,
      country,
      fiat: TOPUP.fiatAmount,
      usdt: TOPUP.usdtAmount
    })
  });

  if (!res || res.status !== "ok") {
    alert("Topup failed");
    return;
  }

  alert("Topup request submitted successfully");
}

/* ================= Airdrop Loader ================= */

document
  .querySelector('[data-view="airdrop"]')
  ?.addEventListener("click", function () {
    navigate("airdrop");
    loadAirdrop();
    setTimeout(initTopup, 200);
  });
