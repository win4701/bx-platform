/* =========================================================
   BLOXIO — MAIN.JS FINAL CORE
   App Orchestrator / View Router / Module Binder
========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const APP = {
    view: "wallet",
    initialized: false,
    modulesBooted: {
      wallet: false,
      market: false,
      mining: false,
      casino: false,
      airdrop: false
    },

    /* =========================================================
       INIT
    ========================================================= */
    init() {
      if (this.initialized) return;

      this.bindNavigation();
      this.bindGlobalUI();
      this.bootCoreModules();
      this.restoreInitialView();
      this.bindGlobalEvents();

      this.initialized = true;
      console.log("🚀 BLOXIO MAIN CORE READY");
    },

    /* =========================================================
       VIEW ROUTER
    ========================================================= */
    setView(nextView) {
      if (!nextView) return;

      const target = $(nextView);
      if (!target) return;

      this.view = nextView;

      // hide all
      $$(".view").forEach(v => v.classList.remove("active"));

      // show selected
      target.classList.add("active");

      // nav active
      $$("[data-view]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === nextView);
      });

      // persist
      try {
        localStorage.setItem("bloxio_active_view", nextView);
      } catch (_) {}

      // post-view refresh
      this.onViewEnter(nextView);
    },

    onViewEnter(view) {
      switch (view) {
        case "wallet":
          this.safeRun(window.WALLET?.render, "wallet.render");
          break;

        case "market":
          this.safeRun(window.renderMarketWallet, "market.renderWallet");
          this.safeRun(window.renderMarket, "market.render");
          break;

        case "mining":
          this.safeRun(window.renderMining, "mining.render");
          break;

        case "casino":
          this.safeRun(window.renderCasinoHome, "casino.renderHome");
          break;

        case "airdrop":
          this.safeRun(window.renderAirdrop, "airdrop.render");
          break;
      }

      // generic event
      window.dispatchEvent(new CustomEvent("app:view:changed", {
        detail: { view }
      }));
    },

    restoreInitialView() {
      let saved = "wallet";

      try {
        saved = localStorage.getItem("bloxio_active_view") || "wallet";
      } catch (_) {}

      this.setView(saved);
    },

    /* =========================================================
       NAVIGATION
    ========================================================= */
    bindNavigation() {
      $$("[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
          const view = btn.dataset.view;
          if (!view) return;
          this.setView(view);
        });
      });
    },

    /* =========================================================
       CORE MODULE BOOT
    ========================================================= */
    bootCoreModules() {
      this.bootWallet();
      this.bootMarket();
      this.bootMining();
      this.bootCasino();
      this.bootAirdrop();
    },

    bootWallet() {
      if (this.modulesBooted.wallet) return;
      this.modulesBooted.wallet = true;

      if (window.WALLET?.init) {
        this.safeRun(() => window.WALLET.init(), "wallet.init");
      }
    },

    bootMarket() {
      if (this.modulesBooted.market) return;
      this.modulesBooted.market = true;

      if (typeof window.initMarket === "function") {
        this.safeRun(() => window.initMarket(), "market.init");
      } else {
        // fallback render-only mode
        this.safeRun(window.renderMarketWallet, "market.renderWallet");
      }
    },

    bootMining() {
      if (this.modulesBooted.mining) return;
      this.modulesBooted.mining = true;

      if (typeof window.initMining === "function") {
        this.safeRun(() => window.initMining(), "mining.init");
      }
    },

    bootCasino() {
      if (this.modulesBooted.casino) return;
      this.modulesBooted.casino = true;

      if (typeof window.initCasino === "function") {
        this.safeRun(() => window.initCasino(), "casino.init");
      }
    },

    bootAirdrop() {
      if (this.modulesBooted.airdrop) return;
      this.modulesBooted.airdrop = true;

      if (typeof window.initAirdrop === "function") {
        this.safeRun(() => window.initAirdrop(), "airdrop.init");
      }
    },

    /* =========================================================
       GLOBAL UI
    ========================================================= */
    bindGlobalUI() {
      // close wallet panels if user clicks outside (optional safe)
      document.addEventListener("click", (e) => {
        const openPanel = document.querySelector(".wallet-panel:not(.wallet-hidden)");
        if (!openPanel) return;

        const clickedInsidePanel = openPanel.contains(e.target);
        const clickedWalletOpen = e.target.closest("[data-wallet-open]");

        if (!clickedInsidePanel && !clickedWalletOpen) {
          openPanel.classList.add("wallet-hidden");
        }
      });

      // ESC closes lightweight UI
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;

        document.querySelectorAll(".wallet-panel").forEach(panel => {
          panel.classList.add("wallet-hidden");
        });

        const toast = $("walletToast");
        if (toast) toast.classList.add("hidden");
      });
    },

    /* =========================================================
       GLOBAL EVENT BUS
    ========================================================= */
    bindGlobalEvents() {
      // Wallet is the financial source of truth
      window.addEventListener("wallet:updated", (e) => {
        this.handleWalletUpdated(e?.detail || {});
      });

      // hard rerender request
      window.addEventListener("app:refresh", () => {
        this.refreshCurrentView();
      });

      // optional auth hook
      window.addEventListener("auth:changed", () => {
        this.refreshCurrentView();
      });
    },

    handleWalletUpdated(detail = {}) {
      const reason = detail.reason || "wallet:update";

      // wallet section
      this.safeRun(window.WALLET?.render, `wallet.render (${reason})`);

      // mining
      this.safeRun(window.renderMining, `mining.render (${reason})`);

      // market mini balances
      this.safeRun(window.renderMarketWallet, `market.renderWallet (${reason})`);

      // airdrop
      this.safeRun(window.renderAirdrop, `airdrop.render (${reason})`);
    },

    refreshCurrentView() {
      this.onViewEnter(this.view);
    },

    /* =========================================================
       HELPERS
    ========================================================= */
    safeRun(fn, label = "safeRun") {
      if (typeof fn !== "function") return;
      try {
        fn();
      } catch (err) {
        console.warn(`⚠️ ${label} failed`, err);
      }
    }
  };

  /* =========================================================
     EXPORT
  ========================================================= */
  window.APP = APP;
  window.setView = (view) => APP.setView(view);

  document.addEventListener("DOMContentLoaded", () => {
    APP.init();
  });
})();
