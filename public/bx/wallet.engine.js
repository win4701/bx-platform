/* =========================================================
   BLOXIO — WALLET ENGINE FINAL
   Single Source of Truth for:
   - wallet
   - mining
   - airdrop
   - transfers
========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "bloxio_wallet_engine_v1";

  const DEFAULT_WALLET = {
    BX: 1250.0000,
    BNB: 3.2500,
    SOL: 18.5000,
    USDT: 500.00
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadWalletState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_WALLET);

      const parsed = JSON.parse(raw);
      return {
        BX: Number(parsed.BX || 0),
        BNB: Number(parsed.BNB || 0),
        SOL: Number(parsed.SOL || 0),
        USDT: Number(parsed.USDT || 0)
      };
    } catch (_) {
      return clone(DEFAULT_WALLET);
    }
  }

  function saveWalletState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(window.WALLET));
    } catch (_) {}
  }

  function emitWalletUpdate(reason = "wallet:update") {
    try {
      window.dispatchEvent(new CustomEvent("wallet:updated", {
        detail: {
          wallet: clone(window.WALLET),
          reason
        }
      }));
    } catch (_) {}
  }

  function ensureWallet() {
    if (!window.WALLET || typeof window.WALLET !== "object") {
      window.WALLET = loadWalletState();
    }
  }

  function get(symbol) {
    ensureWallet();
    return Number(window.WALLET[symbol] || 0);
  }

  function set(symbol, value, reason = "wallet:set") {
    ensureWallet();
    window.WALLET[symbol] = Number(value || 0);
    saveWalletState();
    emitWalletUpdate(reason);
    return window.WALLET[symbol];
  }

  function add(symbol, amount, reason = "wallet:add") {
    ensureWallet();
    const next = get(symbol) + Number(amount || 0);
    return set(symbol, next, reason);
  }

  function subtract(symbol, amount, reason = "wallet:subtract") {
    ensureWallet();
    const next = Math.max(0, get(symbol) - Number(amount || 0));
    return set(symbol, next, reason);
  }

  function canAfford(symbol, amount) {
    ensureWallet();
    return get(symbol) >= Number(amount || 0);
  }

  function transfer(from, to, amount, reason = "wallet:transfer") {
    ensureWallet();

    amount = Number(amount || 0);
    if (!amount || amount <= 0) return false;
    if (!canAfford(from, amount)) return false;

    subtract(from, amount, `${reason}:from`);
    add(to, amount, `${reason}:to`);
    return true;
  }

  function reset() {
    window.WALLET = clone(DEFAULT_WALLET);
    saveWalletState();
    emitWalletUpdate("wallet:reset");
  }

  function initWalletEngine() {
    ensureWallet();
    saveWalletState();
    emitWalletUpdate("wallet:init");
  }

  window.WalletEngine = {
    init: initWalletEngine,
    get,
    set,
    add,
    subtract,
    transfer,
    canAfford,
    reset,
    save: saveWalletState,
    emit: emitWalletUpdate
  };

  document.addEventListener("DOMContentLoaded", initWalletEngine);
})();
