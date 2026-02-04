/* =========================================================
   app.js
   Role: Execution Manager / Navigation Bridge
   Scope: PART 1 ONLY
========================================================= */

(function () {
  "use strict";

  /* =========================
     Global UI State
     ========================= */
  const State = {
    currentView: "wallet"
  };

  /* =========================
     DOM Helpers
     ========================= */
  const $  = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* =========================
     View Management
     ========================= */
  function showView(view) {
    // hide all sections
    $$("section").forEach(sec => {
      sec.classList.remove("active");
    });

    // show target section
    const target = $(view);
    if (target) {
      target.classList.add("active");
      State.currentView = view;
    }

    // update bottom navigation
    $$(".bottom-nav button").forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.view === view
      );
    });
  }

  /* =========================
     Navigation Binding
     ========================= */
  function bindNavigation() {
    $$(".bottom-nav button").forEach(btn => {
      const view = btn.dataset.view;
      if (!view) return;

      btn.addEventListener("click", () => {
        if (State.currentView === view) return;
        showView(view);
      });
    });
  }

  /* =========================
     App Bootstrap
     ========================= */
  function initApp() {
    bindNavigation();
    showView(State.currentView);
  }

  /* =========================
     Start App
     ========================= */
  document.addEventListener("DOMContentLoaded", initApp);

})();
/* =========================================================
   PART 2 — MARKET CHART (Canvas Only)
========================================================= */

const MarketChart = (function () {
  let canvas, ctx;
  let prices = [];
  const MAX_POINTS = 30;

  function init() {
    canvas = document.getElementById("marketChart");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    prices = [];
    draw(); // أول رسم
    startMockFeed();
  }

  function startMockFeed() {
    setInterval(() => {
      const last = prices.length
        ? prices[prices.length - 1]
        : 1.0;

      const next =
        last + (Math.random() - 0.5) * 0.02;

      prices.push(Math.max(0.5, next));
      if (prices.length > MAX_POINTS) {
        prices.shift();
      }

      draw();
    }, 1000);
  }

  function draw() {
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // background
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);

    if (prices.length < 2) return;

    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min || 1;

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();

    prices.forEach((p, i) => {
      const x = (i / (MAX_POINTS - 1)) * w;
      const y = h - ((p - min) / range) * h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  return {
    init
  };
})();
/* =========================================================
   PART 3 — MARKET PRICE (SSOT)
========================================================= */

const MarketPrice = (function () {
  let price = 1.0;
  let listeners = [];

  function get() {
    return price;
  }

  function set(newPrice) {
    if (typeof newPrice !== "number") return;
    price = newPrice;

    // notify listeners
    listeners.forEach(fn => fn(price));

    // update UI price if exists
    const el = document.querySelector(".last-price");
    if (el) el.textContent = price.toFixed(6);
  }

  function subscribe(fn) {
    if (typeof fn === "function") {
      listeners.push(fn);
    }
  }

  /* ---- TEMP FEED (replace later with real API) ---- */
  function startMockFeed() {
    setInterval(() => {
      const delta = (Math.random() - 0.5) * 0.02;
      set(Math.max(0.5, price + delta));
    }, 1000);
  }

  return {
    get,
    set,
    subscribe,
    startMockFeed
  };
})();
/* =========================================================
   PART 4 — MARKET LIFECYCLE (SHOW / HIDE)
========================================================= */

const MarketLifecycle = (function () {
  let active = false;

  function onShow() {
    if (active) return;
    active = true;

    // resume chart drawing
    MarketChart.resume?.();
  }

  function onHide() {
    if (!active) return;
    active = false;

    // pause chart drawing
    MarketChart.pause?.();
  }

  return {
    onShow,
    onHide
  };
})();
/* =========================================================
   PART 5 — MARKET BUY / SELL (UI ONLY)
========================================================= */

const MarketExecution = (function () {

  function init() {
    bindButtons();
  }

  function bindButtons() {
    const buyBtn  = document.querySelector(".btn-buy");
    const sellBtn = document.querySelector(".btn-sell");
    const amountInput = document.querySelector(".trade-amount");
    const resultBox = document.querySelector(".trade-result");

    if (!buyBtn || !sellBtn || !amountInput) return;

    buyBtn.addEventListener("click", () => {
      execute("buy", amountInput, resultBox);
    });

    sellBtn.addEventListener("click", () => {
      execute("sell", amountInput, resultBox);
    });
  }

  function execute(type, input, box) {
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
      showResult(box, "Invalid amount");
      return;
    }

    const price = MarketPrice.get();
    const total = amount * price;

    const msg =
      type === "buy"
        ? `Buy ${amount} @ ${price.toFixed(6)} = ${total.toFixed(6)}`
        : `Sell ${amount} @ ${price.toFixed(6)} = ${total.toFixed(6)}`;

    showResult(box, msg);
  }

  function showResult(box, msg) {
    if (!box) return;
    box.textContent = msg;
  }

  return {
    init
  };
})();
/* =========================================================
   PART 6 — MARKET HISTORY + STABILITY GUARD
========================================================= */

const MarketHistory = (function () {
  const MAX_LOGS = 20;
  let logs = [];

  function add(type, amount, price) {
    logs.unshift({
      type,
      amount,
      price,
      time: new Date().toLocaleTimeString()
    });

    if (logs.length > MAX_LOGS) {
      logs.pop();
    }

    render();
  }

  function render() {
    const box = document.querySelector(".trade-history");
    if (!box) return;

    box.innerHTML = logs.map(l =>
      `<div class="log ${l.type}">
        <span>${l.time}</span>
        <span>${l.type.toUpperCase()}</span>
        <span>${l.amount}</span>
        <span>@ ${l.price.toFixed(6)}</span>
      </div>`
    ).join("");
  }

  return {
    add
  };
})();
