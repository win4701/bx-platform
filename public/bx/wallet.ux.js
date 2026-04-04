/* =========================================================
   BLOXIO — WALLET UX ENGINE FINAL
   Toast + Status + Loading + Copy + Empty State + Button State
========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const WalletUX = {
    toastTimer: null,

    /* =========================================================
       INIT
    ========================================================= */
    init() {
      this.bindCopyDeposit();
      this.bindWalletStatusEvents();
      this.bindPanelAutoReset();
      this.bindWalletUpdateFeedback();
      this.refreshEmptyState();
      this.syncButtonStates();
    },

    /* =========================================================
       TOAST
    ========================================================= */
    showToast(message, type = "info", timeout = 2400) {
      const toast = $("walletToast");
      if (!toast) return;

      toast.textContent = message;
      toast.className = `wallet-toast ${type}`;
      toast.classList.remove("hidden");

      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
      }, timeout);
    },

    /* =========================================================
       STATUS BOXES
    ========================================================= */
    setStatus(id, message, type = "info") {
      const el = $(id);
      if (!el) return;

      el.textContent = message;
      el.className = `wallet-status ${type}`;
      el.classList.remove("hidden");
    },

    clearStatus(id) {
      const el = $(id);
      if (!el) return;

      el.textContent = "";
      el.className = "wallet-status hidden";
    },

    clearAllStatuses() {
      [
        "walletStatus",
        "depositStatus",
        "withdrawStatus",
        "transferStatus"
      ].forEach(id => this.clearStatus(id));
    },

    /* =========================================================
       LOADING
    ========================================================= */
    setLoading(buttonId, isLoading, loadingText = "Processing...") {
      const btn = $(buttonId);
      if (!btn) return;

      if (isLoading) {
        btn.dataset.originalText = btn.textContent;
        btn.disabled = true;
        btn.classList.add("is-loading");
        btn.textContent = loadingText;
      } else {
        btn.disabled = false;
        btn.classList.remove("is-loading");
        btn.textContent = btn.dataset.originalText || btn.textContent;
      }
    },

    setGlobalWalletSync(isLoading, text = "Syncing wallet...") {
      if (isLoading) {
        this.setStatus("walletStatus", text, "info");
      } else {
        this.clearStatus("walletStatus");
      }
    },

    /* =========================================================
       COPY DEPOSIT
    ========================================================= */
    bindCopyDeposit() {
      const copyBtn = $("copyDepositBtn");
      if (!copyBtn) return;

      copyBtn.addEventListener("click", async () => {
        const address = $("depositAddressText")?.textContent?.trim();

        if (!address || address === "—") {
          this.setStatus("depositStatus", "No deposit address to copy", "error");
          this.showToast("No address generated", "error");
          return;
        }

        try {
          await navigator.clipboard.writeText(address);
          this.setStatus("depositStatus", "Address copied successfully", "success");
          this.showToast("Deposit address copied", "success");
        } catch (err) {
          console.error("Copy failed:", err);
          this.setStatus("depositStatus", "Copy failed", "error");
          this.showToast("Copy failed", "error");
        }
      });
    },

    /* =========================================================
       EMPTY STATE
    ========================================================= */
    refreshEmptyState() {
      const empty = $("walletEmptyState");
      if (!empty || !window.WALLET) return;

      const balances = window.WALLET.balances || {};
      const hasFunds = Object.values(balances).some(asset => Number(asset?.free || 0) > 0);

      if (hasFunds) {
        empty.classList.add("hidden");
      } else {
        empty.classList.remove("hidden");
      }
    },

    /* =========================================================
       BUTTON STATES
    ========================================================= */
    setConnectButtonState(btnId, state = "idle", label = null) {
      const btn = $(btnId);
      if (!btn) return;

      btn.dataset.state = state;
      btn.classList.remove("connected", "error", "loading");

      if (state === "loading") {
        btn.classList.add("loading");
      }

      if (state === "connected") {
        btn.classList.add("connected");
      }

      if (state === "error") {
        btn.classList.add("error");
      }

      if (label) {
        btn.textContent = label;
      }
    },

    syncButtonStates() {
      const walletBtn = $("walletConnectBtn");
      const binanceBtn = $("binanceConnectBtn");

      if (walletBtn && !walletBtn.dataset.state) {
        walletBtn.dataset.state = "idle";
      }

      if (binanceBtn && !binanceBtn.dataset.state) {
        binanceBtn.dataset.state = "idle";
      }
    },

    /* =========================================================
       PANEL UX
    ========================================================= */
    bindPanelAutoReset() {
      document.querySelectorAll("[data-wallet-open]").forEach(btn => {
        btn.addEventListener("click", () => {
          this.clearAllStatuses();
        });
      });

      document.querySelectorAll("[data-wallet-close]").forEach(btn => {
        btn.addEventListener("click", () => {
          this.clearAllStatuses();
        });
      });
    },

    /* =========================================================
       WALLET FEEDBACK EVENTS
    ========================================================= */
    bindWalletStatusEvents() {
      window.addEventListener("wallet:sync:start", (e) => {
        const msg = e.detail?.message || "Syncing wallet...";
        this.setGlobalWalletSync(true, msg);
      });

      window.addEventListener("wallet:sync:end", () => {
        this.setGlobalWalletSync(false);
      });

      window.addEventListener("wallet:action:success", (e) => {
        const { panel, message } = e.detail || {};
        if (panel) this.setStatus(panel, message || "Success", "success");
        this.showToast(message || "Wallet action successful", "success");
      });

      window.addEventListener("wallet:action:error", (e) => {
        const { panel, message } = e.detail || {};
        if (panel) this.setStatus(panel, message || "Action failed", "error");
        this.showToast(message || "Wallet action failed", "error");
      });
    },

    bindWalletUpdateFeedback() {
      window.addEventListener("wallet:updated", () => {
        this.refreshEmptyState();
      });
    },

    /* =========================================================
       HELPERS TO EMIT EVENTS
    ========================================================= */
    emitSyncStart(message = "Syncing wallet...") {
      window.dispatchEvent(new CustomEvent("wallet:sync:start", {
        detail: { message }
      }));
    },

    emitSyncEnd() {
      window.dispatchEvent(new CustomEvent("wallet:sync:end"));
    },

    emitSuccess(panelId, message) {
      window.dispatchEvent(new CustomEvent("wallet:action:success", {
        detail: {
          panel: panelId,
          message
        }
      }));
    },

    emitError(panelId, message) {
      window.dispatchEvent(new CustomEvent("wallet:action:error", {
        detail: {
          panel: panelId,
          message
        }
      }));
    }
  };

  window.WalletUX = WalletUX;

  document.addEventListener("DOMContentLoaded", () => {
    WalletUX.init();
  });
})();
