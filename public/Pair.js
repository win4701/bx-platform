/* ================= MARKET PAIRS 
================= */

function bindMarketPairs() {
  const buttons = $$(".market-pair");

  buttons.forEach(btn => {
    const pair = btn.dataset.pair;
    if (!pair) return;

    btn.addEventListener("click", () => {
      MARKET.pair = pair;
      renderMarket();
      log.info("Market pair changed:", pair);
    });
  });
}

/* ================= PRICE UPDATE ================= */

function updateMarketPrice() {
  const drift = (Math.random() - 0.5) * 0.03;
  MARKET.price = Math.max(0.1, MARKET.price + drift);
}

/* ================= RENDER MARKET ================= */

function renderMarket() {
  const pairEl  = $("marketPair");
  const priceEl = $("marketPrice");
  const actionBtn = $("actionBtn");

  if (pairEl) {
    pairEl.textContent = MARKET.pair.replace("/", " / ");
  }

  if (priceEl) {
    priceEl.textContent = MARKET.price.toFixed(4);
  }

  // ===== Sync BUY / SELL UI =====
  if (actionBtn) {
    if (MARKET.side === "buy") {
      actionBtn.textContent = "Buy BX";
      actionBtn.classList.remove("sell");
      actionBtn.classList.add("buy");
    } else {
      actionBtn.textContent = "Sell BX";
      actionBtn.classList.remove("buy");
      actionBtn.classList.add("sell");
    }
  }

  // ===== Update chart every render =====
  updateChart();

  log.info("Market rendered", {
    pair: MARKET.pair,
    price: MARKET.price,
    side: MARKET.side
  });
  }

/* =================================================
   CASINO
================================================= */

const CASINO = {
  history: []
};
