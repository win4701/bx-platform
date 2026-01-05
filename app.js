/* ============================
   Bloxio BX – App JS (Final)
   ============================ */

(() => {
  /* -------- Telegram -------- */
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  const uid = tg?.initDataUnsafe?.user?.id || "demo";

  /* -------- DOM Helpers -------- */
  const $ = id => document.getElementById(id);

  /* -------- Navigation -------- */
  window.openView = function (id, el) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    $(id).classList.add("active");
    el.classList.add("active");
  };

  /* -------- State -------- */
  async function loadState() {
    try {
      const r = await fetch(`/state?tg_id=${uid}`);
      if (!r.ok) return;
      const d = await r.json();

      if ($("bx"))   $("bx").textContent   = d.wallet?.bx   ?? 0;
      if ($("ton"))  $("ton").textContent  = d.wallet?.ton  ?? 0;
      if ($("usdt")) $("usdt").textContent = d.wallet?.usdt ?? 0;

    } catch (e) {
      console.error("state error", e);
    }
  }

  /* -------- Market -------- */
  window.submitMarket = async function () {
    const mode   = $("marketMode").value;
    const asset  = $("marketAsset").value;
    const amount = Number($("marketAmount").value);

    if (!amount || amount <= 0) return;

    let url;
    if (mode === "buy") {
      url = `/market/buy?uid=${uid}&amount=${amount}&pay=${asset}`;
    } else {
      url = `/market/sell?uid=${uid}&bx=${amount}&to=${asset}`;
    }

    try {
      await fetch(url, { method: "POST" });
      $("marketAmount").value = "";
      loadState();
    } catch (e) {
      console.error("market error", e);
    }
  };

  /* -------- Casino -------- */
  window.play = async function (game) {
    try {
      await fetch(
        `/casino/v3/play?uid=${uid}&game=${game}&bet=1&client_seed=${Math.random()}`,
        { method: "POST" }
      );
      loadState();
    } catch (e) {
      console.error("casino error", e);
    }
  };

  /* -------- Init -------- */
  document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setInterval(loadState, 5000);
  });

})();
