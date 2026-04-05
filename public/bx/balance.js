/* =========================================================
   BLOXIO — UNIFIED BALANCE SYSTEM (UBS)
========================================================= */

(() => {
  'use strict';

  if (window.BX_BALANCE) return;

  const STORAGE_KEY = 'bx:wallet:v1';

  const DEFAULT_STATE = {
    BX: 0,
    USDT: 0,
    USDC: 0,
    BTC: 0,
    ETH: 0,
    BNB: 0,
    AVAX: 0,
    ZEC: 0,
    TON: 0,
    SOL: 0,
    LTC: 0
  };

  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = load();

  function emit() {
    listeners.forEach(fn => {
      try { fn(state); } catch {}
    });
  }

  const api = {

    get(asset = 'BX') {
      return Number(state[asset] || 0);
    },

    getAll() {
      return { ...state };
    },

    set(asset, value) {
      state[asset] = Math.max(0, Number(value) || 0);
      save(state);
      emit();
    },

    add(asset, value) {
      state[asset] = (state[asset] || 0) + Number(value || 0);
      save(state);
      emit();
    },

    sub(asset, value) {
      state[asset] = Math.max(0, (state[asset] || 0) - Number(value || 0));
      save(state);
      emit();
    },

    canAfford(asset, value) {
      return (state[asset] || 0) >= value;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    reset() {
      state = { ...DEFAULT_STATE };
      save(state);
      emit();
    }
  };

  window.BX_BALANCE = api;

})();
