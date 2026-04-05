/* =========================================================
   BLOXIO — WALLET.JS FINAL FULL SYSTEM
   Compatible with:
   - bx/balance.js
   - index.html surgical patch
   - main.js surgical patch
========================================================= */

(() => {
  'use strict';

  if (window.BX_WALLET_BOOTED) {
    console.warn('[Wallet] Already booted — skipping duplicate init');
    return;
  }
  window.BX_WALLET_BOOTED = true;

  if (!window.BX_BALANCE) {
    console.error('[Wallet] BX_BALANCE not found. Load bx/balance.js first.');
    return;
  }

  const APP = window.BX_APP || (window.BX_APP = {});
  const WALLET = APP.wallet || (APP.wallet = {});

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ASSETS = ['BX', 'USDT', 'USDC', 'BTC', 'BNB', 'ETH', 'AVAX', 'ZEC', 'TON', 'SOL', 'LTC'];

  const ASSET_META = {
    BX:   { name: 'Bloxio', decimals: 2, usd: 1.00 },
    USDT: { name: 'Tether', decimals: 2, usd: 1.00 },
    USDC: { name: 'USD Coin', decimals: 2, usd: 1.00 },
    BTC:  { name: 'Bitcoin', decimals: 8, usd: 68000 },
    BNB:  { name: 'Binance', decimals: 6, usd: 620 },
    ETH:  { name: 'Ethereum', decimals: 6, usd: 3500 },
    AVAX: { name: 'Avalanche', decimals: 4, usd: 42 },
    ZEC:  { name: 'Zcash', decimals: 4, usd: 31 },
    TON:  { name: 'Toncoin', decimals: 4, usd: 6.2 },
    SOL:  { name: 'Solana', decimals: 4, usd: 180 },
    LTC:  { name: 'Litecoin', decimals: 4, usd: 92 }
  };

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const fmt = (value, asset = 'BX') => {
    const num = Number(value || 0);
    const decimals = ASSET_META[asset]?.decimals ?? 2;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals > 4 ? 6 : decimals
    });
  };

  const fmtUsd = (value) => {
    const num = Number(value || 0);
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

  const fakeAddress = (asset = 'USDT') => {
    const prefixMap = {
      BTC: 'bc1q',
      ETH: '0x',
      BNB: 'bnb1',
      USDT: 'T',
      USDC: '0x',
      AVAX: 'X-avax1',
      ZEC: 'zs',
      TON: 'UQ',
      SOL: 'SoL',
      LTC: 'ltc1',
      BX: 'BX'
    };

    const prefix = prefixMap[asset] || '0x';
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const body = Array.from({ length: 28 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${prefix}${body}`;
  };

  function playClick() {
    try {
      const snd = document.getElementById('snd-click');
      if (!snd || document.body.dataset.sound === 'off') return;
      snd.currentTime = 0;
      snd.play().catch(() => {});
    } catch (_) {}
  }

  function showToast(msg, type = 'info') {
    const el = document.getElementById('walletToast');
    if (!el) return;

    el.textContent = msg;
    el.classList.remove('hidden', 'success', 'error', 'info');
    el.classList.add(type);

    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 2200);
  }

  function setStatus(id, text, type = 'info', autoHide = true) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = text;
    el.classList.remove('hidden', 'success', 'error', 'info');
    el.classList.add(type);

    clearTimeout(el._hideTimer);
    if (autoHide) {
      el._hideTimer = setTimeout(() => {
        el.classList.add('hidden');
      }, 2500);
    }
  }

  function calcTotalUsd(balanceMap) {
    return Object.entries(balanceMap).reduce((sum, [asset, amount]) => {
      const price = ASSET_META[asset]?.usd ?? 0;
      return sum + Number(amount || 0) * price;
    }, 0);
  }

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    booted: false,
    currentOpenPanel: null,
    lastDepositAddress: null,
    connections: {
      walletconnect: false,
      binancepay: false
    }
  };

  /* =========================================================
     DOM MAP
  ========================================================= */
  const dom = {
    walletRoot: null,
    walletTotal: null,
    walletStatus: null,
    walletEmptyState: null,

    depositPanel: null,
    withdrawPanel: null,
    transferPanel: null,

    depositAsset: null,
    generateDepositBtn: null,
    depositAddressText: null,
    copyDepositBtn: null,
    depositStatus: null,

    withdrawAsset: null,
    withdrawAmount: null,
    withdrawAddress: null,
    submitWithdrawBtn: null,
    withdrawStatus: null,

    transferTelegram: null,
    transferAmount: null,
    submitTransferBtn: null,
    transferStatus: null,

    walletConnectBtn: null,
    binanceConnectBtn: null
  };

  function mapDom() {
    dom.walletRoot = document.getElementById('wallet');
    if (!dom.walletRoot) return false;

    dom.walletTotal = document.getElementById('walletTotal');
    dom.walletStatus = document.getElementById('walletStatus');
    dom.walletEmptyState = document.getElementById('walletEmptyState');

    dom.depositPanel = document.getElementById('depositPanel');
    dom.withdrawPanel = document.getElementById('withdrawPanel');
    dom.transferPanel = document.getElementById('transferPanel');

    dom.depositAsset = document.getElementById('depositAsset');
    dom.generateDepositBtn = document.getElementById('generateDepositBtn');
    dom.depositAddressText = document.getElementById('depositAddressText');
    dom.copyDepositBtn = document.getElementById('copyDepositBtn');
    dom.depositStatus = document.getElementById('depositStatus');

    dom.withdrawAsset = document.getElementById('withdrawAsset');
    dom.withdrawAmount = document.getElementById('withdrawAmount');
    dom.withdrawAddress = document.getElementById('withdrawAddress');
    dom.submitWithdrawBtn = document.getElementById('submitWithdrawBtn');
    dom.withdrawStatus = document.getElementById('withdrawStatus');

    dom.transferTelegram = document.getElementById('transferTelegram');
    dom.transferAmount = document.getElementById('transferAmount');
    dom.submitTransferBtn = document.getElementById('submitTransferBtn');
    dom.transferStatus = document.getElementById('transferStatus');

    dom.walletConnectBtn = document.getElementById('walletConnectBtn');
    dom.binanceConnectBtn = document.getElementById('binanceConnectBtn');

    return true;
  }

  /* =========================================================
     RENDER
  ========================================================= */
  function updateWalletUI() {
    const balances = BX_BALANCE.getAll();

    const map = {
      BX: 'bal-bx',
      USDT: 'bal-usdt',
      USDC: 'bal-usdc',
      BTC: 'bal-btc',
      BNB: 'bal-bnb',
      ETH: 'bal-eth',
      AVAX: 'bal-avax',
      ZEC: 'bal-zec',
      TON: 'bal-ton',
      SOL: 'bal-sol',
      LTC: 'bal-ltc'
    };

    Object.entries(map).forEach(([asset, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = fmt(balances[asset], asset);
    });

    if (dom.walletTotal) {
      dom.walletTotal.textContent = fmtUsd(calcTotalUsd(balances));
    }

    const hasAnyBalance = Object.values(balances).some(v => Number(v || 0) > 0);
    if (dom.walletEmptyState) {
      dom.walletEmptyState.classList.toggle('hidden', hasAnyBalance);
    }

    syncActionStates();
    syncConnectionStates();
  }

  function refreshWalletUI() {
    updateWalletUI();
  }

  function renderWallet() {
    if (!mapDom()) return;
    updateWalletUI();
  }

  function syncActionStates() {
    const bx = BX_BALANCE.get('BX');

    if (dom.submitTransferBtn) {
      dom.submitTransferBtn.disabled = bx <= 0;
    }
  }

  function syncConnectionStates() {
    if (dom.walletConnectBtn) {
      dom.walletConnectBtn.textContent = state.connections.walletconnect ? 'Connected' : 'WalletConnect';
      dom.walletConnectBtn.dataset.state = state.connections.walletconnect ? 'connected' : 'idle';
      dom.walletConnectBtn.classList.toggle('is-connected', state.connections.walletconnect);
    }

    if (dom.binanceConnectBtn) {
      dom.binanceConnectBtn.textContent = state.connections.binancepay ? 'Connected' : 'Binance Pay';
      dom.binanceConnectBtn.dataset.state = state.connections.binancepay ? 'connected' : 'idle';
      dom.binanceConnectBtn.classList.toggle('is-connected', state.connections.binancepay);
    }
  }

  /* =========================================================
     PANELS
  ========================================================= */
  function closeAllPanels() {
    [dom.depositPanel, dom.withdrawPanel, dom.transferPanel].forEach(panel => {
      if (panel) panel.classList.add('wallet-hidden');
    });
    state.currentOpenPanel = null;
  }

  function openPanel(panelId) {
    closeAllPanels();
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.remove('wallet-hidden');
    state.currentOpenPanel = panelId;
  }

  function togglePanel(panelId) {
    if (state.currentOpenPanel === panelId) {
      closeAllPanels();
      return;
    }
    openPanel(panelId);
  }

  /* =========================================================
     ACTIONS — DEPOSIT
  ========================================================= */
  function generateDepositAddress() {
    const asset = dom.depositAsset?.value || 'USDT';
    const address = fakeAddress(asset);

    state.lastDepositAddress = address;

    if (dom.depositAddressText) {
      dom.depositAddressText.textContent = address;
    }

    setStatus('depositStatus', `${asset} address generated`, 'success');
    showToast(`${asset} deposit address ready`, 'success');
  }

  async function copyDepositAddress() {
    const address = state.lastDepositAddress || dom.depositAddressText?.textContent?.trim();
    if (!address || address === '—') {
      setStatus('depositStatus', 'Generate address first', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setStatus('depositStatus', 'Address copied', 'success');
      showToast('Deposit address copied', 'success');
    } catch {
      setStatus('depositStatus', 'Copy failed', 'error');
    }
  }

  /* =========================================================
     ACTIONS — WITHDRAW
  ========================================================= */
  function submitWithdraw() {
    const asset = dom.withdrawAsset?.value || 'USDT';
    const amount = Number(dom.withdrawAmount?.value || 0);
    const address = (dom.withdrawAddress?.value || '').trim();

    if (!amount || amount <= 0) {
      setStatus('withdrawStatus', 'Enter valid amount', 'error');
      return;
    }

    if (!address || address.length < 6) {
      setStatus('withdrawStatus', 'Enter valid wallet address', 'error');
      return;
    }

    if (!BX_BALANCE.canAfford(asset, amount)) {
      setStatus('withdrawStatus', `Insufficient ${asset} balance`, 'error');
      return;
    }

    BX_BALANCE.sub(asset, amount);

    if (dom.withdrawAmount) dom.withdrawAmount.value = '';
    if (dom.withdrawAddress) dom.withdrawAddress.value = '';

    setStatus('withdrawStatus', `Withdrawal submitted: ${fmt(amount, asset)} ${asset}`, 'success');
    showToast(`Withdraw ${fmt(amount, asset)} ${asset}`, 'success');
    updateWalletUI();
  }

  /* =========================================================
     ACTIONS — TRANSFER
  ========================================================= */
  function submitTransfer() {
    const telegram = (dom.transferTelegram?.value || '').trim();
    const amount = Number(dom.transferAmount?.value || 0);

    if (!telegram || telegram.length < 2) {
      setStatus('transferStatus', 'Enter valid Telegram ID', 'error');
      return;
    }

    if (!amount || amount <= 0) {
      setStatus('transferStatus', 'Enter valid BX amount', 'error');
      return;
    }

    if (!BX_BALANCE.canAfford('BX', amount)) {
      setStatus('transferStatus', 'Insufficient BX balance', 'error');
      return;
    }

    BX_BALANCE.sub('BX', amount);

    if (dom.transferTelegram) dom.transferTelegram.value = '';
    if (dom.transferAmount) dom.transferAmount.value = '';

    setStatus('transferStatus', `Transferred ${fmt(amount, 'BX')} BX to ${telegram}`, 'success');
    showToast(`BX sent to ${telegram}`, 'success');
    updateWalletUI();
  }

  /* =========================================================
     CONNECTIONS
  ========================================================= */
  function toggleWalletConnect() {
    state.connections.walletconnect = !state.connections.walletconnect;
    syncConnectionStates();

    if (state.connections.walletconnect) {
      showToast('WalletConnect connected', 'success');
      setStatus('walletStatus', 'WalletConnect linked', 'success');
    } else {
      showToast('WalletConnect disconnected', 'info');
      setStatus('walletStatus', 'WalletConnect disconnected', 'info');
    }
  }

  function toggleBinancePay() {
    state.connections.binancepay = !state.connections.binancepay;
    syncConnectionStates();

    if (state.connections.binancepay) {
      showToast('Binance Pay connected', 'success');
      setStatus('walletStatus', 'Binance Pay linked', 'success');
    } else {
      showToast('Binance Pay disconnected', 'info');
      setStatus('walletStatus', 'Binance Pay disconnected', 'info');
    }
  }

  /* =========================================================
     BINDINGS
  ========================================================= */
  function bindPanelTriggers() {
    $$('[data-wallet-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        togglePanel(btn.dataset.walletOpen);
      });
    });

    $$('[data-wallet-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        closeAllPanels();
      });
    });
  }

  function bindDeposit() {
    dom.generateDepositBtn?.addEventListener('click', () => {
      playClick();
      generateDepositAddress();
    });

    dom.copyDepositBtn?.addEventListener('click', () => {
      playClick();
      copyDepositAddress();
    });

    dom.depositAsset?.addEventListener('change', () => {
      if (dom.depositAddressText) dom.depositAddressText.textContent = '—';
      state.lastDepositAddress = null;
    });
  }

  function bindWithdraw() {
    dom.submitWithdrawBtn?.addEventListener('click', () => {
      playClick();
      submitWithdraw();
    });
  }

  function bindTransfer() {
    dom.submitTransferBtn?.addEventListener('click', () => {
      playClick();
      submitTransfer();
    });
  }

  function bindConnections() {
    dom.walletConnectBtn?.addEventListener('click', () => {
      playClick();
      toggleWalletConnect();
    });

    dom.binanceConnectBtn?.addEventListener('click', () => {
      playClick();
      toggleBinancePay();
    });
  }

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.currentOpenPanel) {
        closeAllPanels();
      }
    });
  }

  function bindViewHooks() {
    document.addEventListener('bloxio:viewchange', (e) => {
      if (e.detail?.view === 'wallet') {
        renderWallet();
      }
    });
  }

  function bindBalanceSync() {
    BX_BALANCE.subscribe(() => {
      updateWalletUI();
    });
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */
  WALLET.openPanel = openPanel;
  WALLET.closePanels = closeAllPanels;
  WALLET.updateWalletUI = updateWalletUI;
  WALLET.refreshWalletUI = refreshWalletUI;
  WALLET.renderWallet = renderWallet;

  window.updateWalletUI = updateWalletUI;
  window.refreshWalletUI = refreshWalletUI;
  window.renderWallet = renderWallet;

  // اختياري للتجربة السريعة من الكونسول
  window.walletDemoDeposit = (asset = 'USDT', amount = 100) => {
    BX_BALANCE.add(asset, amount);
    showToast(`Demo deposit: ${fmt(amount, asset)} ${asset}`, 'success');
  };

  /* =========================================================
     BOOT
  ========================================================= */
  function boot() {
    if (!mapDom()) return;

    bindPanelTriggers();
    bindDeposit();
    bindWithdraw();
    bindTransfer();
    bindConnections();
    bindKeyboardShortcuts();
    bindViewHooks();
    bindBalanceSync();

    renderWallet();
    state.booted = true;

    console.log('[Bloxio] wallet.js final full system loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
