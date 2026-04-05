/* =========================================================
   BLOXIO — MAIN.JS SURGICAL PATCH FINAL
   Global View Router + UX Controller
   Compatible with:
   - wallet.js
   - market.js
   - casino.js
   - mining.js
   - airdrop.js
========================================================= */

(() => {
  'use strict';

  const APP = window.BX_APP || (window.BX_APP = {});
  const UI = APP.ui || (APP.ui = {});
  const STATE = APP.state || (APP.state = {});

  /* =========================================================
     CONFIG
  ========================================================= */
  const VIEW_IDS = ['wallet', 'market', 'casino', 'mining', 'airdrop', 'settings'];
  const DEFAULT_VIEW = 'wallet';
  const STORAGE_KEY = 'bloxio:lastView';

  /* =========================================================
     DOM
  ========================================================= */
  const views = new Map();
  const navButtons = new Map();

  document.querySelectorAll('.view').forEach(view => {
    if (view.id) views.set(view.id, view);
  });

  document.querySelectorAll('.bottom-nav [data-view]').forEach(btn => {
    const id = btn.dataset.view;
    if (id) navButtons.set(id, btn);
  });

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeCall(fn, ...args) {
    try {
      if (typeof fn === 'function') return fn(...args);
    } catch (err) {
      console.warn('[Bloxio main.js] safeCall error:', err);
    }
  }

  function playClick() {
    try {
      const snd = document.getElementById('snd-click');
      if (!snd || document.body.dataset.sound === 'off') return;
      snd.currentTime = 0;
      snd.play().catch(() => {});
    } catch (_) {}
  }

  function normalizeView(id) {
    return VIEW_IDS.includes(id) ? id : DEFAULT_VIEW;
  }

  function getHashView() {
    const hash = window.location.hash.replace('#', '').trim();
    return normalizeView(hash);
  }

  function saveView(id) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (_) {}
  }

  function loadSavedView() {
    try {
      return normalizeView(localStorage.getItem(STORAGE_KEY) || DEFAULT_VIEW);
    } catch (_) {
      return DEFAULT_VIEW;
    }
  }

  function setActiveNav(id) {
    navButtons.forEach((btn, key) => {
      const active = key === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function hideAllViews() {
    views.forEach(view => {
      view.classList.remove('active');
      view.setAttribute('hidden', 'hidden');
      view.style.display = 'none';
    });
  }

  function showView(id) {
    const target = views.get(id);
    if (!target) return;

    target.classList.add('active');
    target.removeAttribute('hidden');
    target.style.display = '';
  }

  function closeTransientPanels() {
    // Wallet
    $$('.wallet-panel').forEach(panel => {
      panel.classList.add('wallet-hidden');
    });

    // Mining
    $$('.mining-sub-panel').forEach(panel => {
      panel.classList.add('mining-hidden');
    });

    // Casino game overlay (اختياري فقط إذا كنت تريد العودة للّوبي عند مغادرة الكازينو)
    if (STATE.casino && typeof STATE.casino === 'object') {
      STATE.casino.lastVisitedAt = Date.now();
    }
  }

  function fireViewHooks(id) {
    // Global custom event
    document.dispatchEvent(new CustomEvent('bloxio:viewchange', {
      detail: { view: id }
    }));

    // Wallet
    if (id === 'wallet') {
      safeCall(window.renderWallet);
      safeCall(window.updateWalletUI);
      safeCall(window.refreshWalletUI);
    }

    // Market
    if (id === 'market') {
      safeCall(window.renderMarket);
      safeCall(window.updateMarketUI);
      safeCall(window.resizeMarketChart);
      safeCall(window.syncMarketLayout);
      setTimeout(() => safeCall(window.resizeMarketChart), 120);
    }

    // Casino
    if (id === 'casino') {
      safeCall(window.renderCasinoLobby);
      safeCall(window.updateCasinoUI);
      safeCall(window.syncCasinoLayout);
    }

    // Mining
    if (id === 'mining') {
      safeCall(window.renderMiningPlans);
      safeCall(window.updateMiningUI);
      safeCall(window.syncMiningLayout);
    }

    // Airdrop
    if (id === 'airdrop') {
      safeCall(window.renderAirdrop);
      safeCall(window.updateAirdropUI);
    }

    // Settings
    if (id === 'settings') {
      safeCall(window.renderSettings);
      safeCall(window.updateSettingsUI);
    }
  }

  /* =========================================================
     ROUTER
  ========================================================= */
  function goToView(nextView, options = {}) {
    const id = normalizeView(nextView);
    const current = STATE.currentView || null;

    if (!views.has(id)) {
      console.warn(`[Bloxio main.js] Unknown view: ${id}`);
      return;
    }

    if (current === id && !options.force) {
      setActiveNav(id);
      return;
    }

    closeTransientPanels();
    hideAllViews();
    showView(id);
    setActiveNav(id);

    STATE.currentView = id;
    saveView(id);

    if (!options.silentHash) {
      history.replaceState(null, '', `#${id}`);
    }

    fireViewHooks(id);
  }

  /* =========================================================
     NAV BINDING
  ========================================================= */
  function bindBottomNav() {
    navButtons.forEach((btn, id) => {
      btn.addEventListener('click', () => {
        playClick();
        goToView(id);
      });
    });
  }

  /* =========================================================
     ACTION BRIDGES
  ========================================================= */
  function bindActionBridges() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-action]');
      if (!trigger) return;

      const action = trigger.dataset.action;

      if (action === 'go-mining') {
        playClick();
        goToView('mining');
      }

      if (action === 'go-wallet') {
        playClick();
        goToView('wallet');
      }

      if (action === 'go-market') {
        playClick();
        goToView('market');
      }

      if (action === 'go-casino') {
        playClick();
        goToView('casino');
      }

      if (action === 'go-airdrop') {
        playClick();
        goToView('airdrop');
      }
    });
  }

  /* =========================================================
     HASH SUPPORT
  ========================================================= */
  function bindHashRouter() {
    window.addEventListener('hashchange', () => {
      const view = getHashView();
      goToView(view, { silentHash: true, force: true });
    });
  }

  /* =========================================================
     RESPONSIVE RESYNC
  ========================================================= */
  let resizeTimer = null;

  function onResizeResync() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const current = STATE.currentView || DEFAULT_VIEW;

      if (current === 'market') {
        safeCall(window.resizeMarketChart);
        safeCall(window.syncMarketLayout);
      }

      if (current === 'casino') {
        safeCall(window.syncCasinoLayout);
      }

      if (current === 'mining') {
        safeCall(window.syncMiningLayout);
      }
    }, 120);
  }

  /* =========================================================
     OPTIONAL GLOBAL API
  ========================================================= */
  UI.goToView = goToView;
  UI.getCurrentView = () => STATE.currentView || DEFAULT_VIEW;

  window.goToView = goToView;

  /* =========================================================
     BOOT
  ========================================================= */
  function boot() {
    bindBottomNav();
    bindActionBridges();
    bindHashRouter();
    window.addEventListener('resize', onResizeResync);

    const initial =
      window.location.hash
        ? getHashView()
        : loadSavedView();

    goToView(initial, { silentHash: false, force: true });

    document.body.classList.add('app-ready');

    console.log('[Bloxio] main.js surgical patch loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
