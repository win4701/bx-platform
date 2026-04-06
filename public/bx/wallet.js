/* =========================================================
   BLOXIO — WALLET.JS SAFE REBIND FINAL
   Safe with current HTML / CSS / main architecture
========================================================= */

(function () {
  'use strict';

  /* =========================================================
     CONFIG
  ========================================================= */
  const ASSETS = [
    'BX', 'USDT', 'USDC', 'BTC', 'BNB', 'ETH', 'AVAX', 'ZEC', 'TON', 'SOL', 'LTC'
  ];

  const ASSET_USD = {
    BX: 45,
    USDT: 1.00,
    USDC: 1.00,
    BTC: 65000,
    BNB: 580,
    ETH: 3200,
    AVAX: 18,
    ZEC: 128,
    TON: 3.8,
    SOL: 145,
    LTC: 84
  };

  const FAKE_DEPOSIT_PREFIX = {
    BX: 'BX',
    USDT: '0xUSDT',
    USDC: '0xUSDC',
    BTC: 'bc1q',
    BNB: 'bnb1',
    ETH: '0xETH',
    AVAX: 'avax1',
    ZEC: 't1',
    TON: 'UQ',
    SOL: 'SoL'
  };

  const WALLET_INTEL = {
    currentAsset: 'BX'
  };

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    balances: {},
    depositAddress: '',
    searchQuery: ''
  };

  /* =========================================================
     HELPERS
  ========================================================= */
  function $(id) {
    return document.getElementById(id);
  }

  function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(n, digits = 4) {
    return safeNum(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits
    });
  }

  function shortAddr(v) {
    const s = String(v || '');
    if (s.length <= 18) return s;
    return `${s.slice(0, 10)}...${s.slice(-8)}`;
  }

  function randomPart(len = 24) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    let out = '';
    for (let i = 0; i < len; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function emitBalanceUpdate() {
    window.dispatchEvent(new CustomEvent('bx:balances:updated'));
  }

  function getStore() {
    try {
      if (window.BX_BALANCE && typeof window.BX_BALANCE.get === 'function') {
        return window.BX_BALANCE;
      }
    } catch (_) {}
    return null;
  }

  function getBalance(asset) {
    const store = getStore();
    if (store) return safeNum(store.get(asset) || 0);
    return safeNum(state.balances[asset] || 0);
  }

  function setBalance(asset, value) {
    const store = getStore();
    const num = safeNum(value);

    if (store && typeof store.set === 'function') {
      store.set(asset, num);
    } else {
      state.balances[asset] = num;
    }
  }

  function addBalance(asset, delta) {
    setBalance(asset, getBalance(asset) + safeNum(delta));
  }

  function subtractBalance(asset, delta) {
    setBalance(asset, Math.max(0, getBalance(asset) - safeNum(delta)));
  }

  function flashWallet(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove('wallet-flash-success');
    void el.offsetWidth;
    el.classList.add('wallet-flash-success');
  }

  /* =========================================================
     TOAST / STATUS
  ========================================================= */
  let toastTimer = null;

  function showToast(message, type = 'info') {
    const el = $('walletToast');
    if (!el) return;

    el.textContent = message;
    el.classList.remove('hidden');

    if (type === 'error') {
      el.style.borderColor = 'rgba(239,68,68,.22)';
    } else if (type === 'success') {
      el.style.borderColor = 'rgba(34,197,94,.22)';
    } else {
      el.style.borderColor = 'rgba(255,255,255,.06)';
    }

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 2400);
  }

  function setStatus(id, message = '', show = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('hidden', !show || !message);
  }

  /* =========================================================
     PANELS
  ========================================================= */
  function closeAllPanels() {
    ['depositPanel', 'withdrawPanel', 'transferPanel'].forEach(id => {
      $(id)?.classList.add('wallet-hidden');
    });
  }

  function openPanel(panelId) {
    closeAllPanels();
    $(panelId)?.classList.remove('wallet-hidden');
  }

  /* =========================================================
     RENDER BALANCES
  ========================================================= */
  function renderBalances() {
    ASSETS.forEach(asset => {
      const el = document.getElementById(`bal-${asset.toLowerCase()}`);
      if (el) el.textContent = fmt(getBalance(asset));
    });

    renderTotal();
    renderWalletEmptyState();
    renderIntelligence();
  }

  function renderTotal() {
    const total = ASSETS.reduce((sum, asset) => {
      return sum + (getBalance(asset) * safeNum(ASSET_USD[asset] || 0));
    }, 0);

    const totalEl = $('walletTotal');
    if (totalEl) totalEl.textContent = `$${fmt(total, 2)}`;
  }

  function renderWalletEmptyState() {
    const emptyEl = $('walletEmptyState');
    if (!emptyEl) return;

    const visibleRows = Array.from(document.querySelectorAll('#wallet .wallet-row'))
      .filter(row => row.style.display !== 'none');

    emptyEl.classList.toggle('hidden', visibleRows.length > 0);
  }

  /* =========================================================
     WALLET STATUS
  ========================================================= */
  function renderWalletStatus() {
    const el = $('walletStatus');
    if (!el) return;

    const total = ASSETS.reduce((sum, asset) => sum + getBalance(asset), 0);

    if (total > 0) {
      setStatus('walletStatus', 'Portfolio syncing', true);
    } else {
      el.classList.add('hidden');
    }
  }

  /* =========================================================
     DEPOSIT
  ========================================================= */
  function generateDepositAddress(asset) {
    const prefix = FAKE_DEPOSIT_PREFIX[asset] || 'ADDR';
    return `${prefix}${randomPart(28)}`;
  }

  function handleGenerateDeposit() {
    const asset = $('depositAsset')?.value || 'BX';
    const address = generateDepositAddress(asset);
    state.depositAddress = address;

    const addressEl = $('depositAddressText');
    if (addressEl) addressEl.textContent = address;

    setStatus('depositStatus', `${asset} address generated`, true);
    flashWallet('#depositPanel');
    showToast(`${asset} deposit address ready`, 'success');
  }

  async function handleCopyDeposit() {
    const value = state.depositAddress || $('depositAddressText')?.textContent || '';
    if (!value || value === '—') {
      showToast('Generate address first', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setStatus('depositStatus', 'Address copied', true);
      showToast('Address copied', 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  }

  /* =========================================================
     WITHDRAW
  ========================================================= */
  function handleWithdraw() {
    const asset = $('withdrawAsset')?.value || 'BX';
    const amount = safeNum($('withdrawAmount')?.value);
    const address = $('withdrawAddress')?.value?.trim() || '';

    if (!amount || amount <= 0) {
      setStatus('withdrawStatus', 'Enter a valid amount', true);
      showToast('Invalid withdraw amount', 'error');
      return;
    }

    if (!address) {
      setStatus('withdrawStatus', 'Enter destination address', true);
      showToast('Wallet address required', 'error');
      return;
    }

    if (getBalance(asset) < amount) {
      setStatus('withdrawStatus', `Insufficient ${asset} balance`, true);
      showToast(`Insufficient ${asset}`, 'error');
      return;
    }

    subtractBalance(asset, amount);
    renderBalances();
    renderWalletStatus();
    emitBalanceUpdate();

    $('withdrawAmount').value = '';
    $('withdrawAddress').value = '';

    setStatus('withdrawStatus', `${fmt(amount)} ${asset} withdrawn`, true);
    flashWallet('#withdrawPanel');
    showToast(`Withdraw submitted: ${fmt(amount)} ${asset}`, 'success');
  }

  /* =========================================================
     TRANSFER
  ========================================================= */
  function handleTransfer() {
    const asset = $('transferAsset')?.value || 'BX';
    const recipient =
      $('transferTelegram')?.value?.trim() ||
      $('transferTo')?.value?.trim() ||
      '';

    const amount = safeNum($('transferAmount')?.value);

    if (!recipient) {
      setStatus('transferStatus', 'Enter recipient', true);
      showToast('Recipient required', 'error');
      return;
    }

    if (!amount || amount <= 0) {
      setStatus('transferStatus', 'Enter a valid amount', true);
      showToast('Invalid transfer amount', 'error');
      return;
    }

    if (getBalance(asset) < amount) {
      setStatus('transferStatus', `Insufficient ${asset} balance`, true);
      showToast(`Insufficient ${asset}`, 'error');
      return;
    }

    subtractBalance(asset, amount);
    renderBalances();
    renderWalletStatus();
    emitBalanceUpdate();

    $('transferAmount').value = '';
    if ($('transferTelegram')) $('transferTelegram').value = '';
    if ($('transferTo')) $('transferTo').value = '';

    setStatus('transferStatus', `${fmt(amount)} ${asset} sent`, true);
    flashWallet('#transferPanel');
    showToast(`Transfer sent: ${fmt(amount)} ${asset}`, 'success');
  }

  /* =========================================================
     SEARCH
  ========================================================= */
  function bindAssetSearch() {
    const input = $('walletAssetSearch');
    if (!input) return;

    input.addEventListener('input', () => {
      state.searchQuery = input.value.trim().toLowerCase();

      const rows = Array.from(document.querySelectorAll('#wallet .wallet-row'));
      let visible = 0;

      rows.forEach(row => {
        const txt = row.textContent.toLowerCase();
        const match = !state.searchQuery || txt.includes(state.searchQuery);
        row.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      $('walletEmptyState')?.classList.toggle('hidden', visible > 0);
    });
  }

  /* =========================================================
     INTELLIGENCE
  ========================================================= */
  function renderIntelligence() {
    const title = $('walletIntelTitle');
    const text = $('walletIntelText');
    const badge = $('walletIntelBadge');
    const primary = $('walletIntelPrimary');
    const secondary = $('walletIntelSecondary');

    if (!title || !text || !badge || !primary || !secondary) return;

    const bx = getBalance('BX');
    const bnb = getBalance('BNB');
    const sol = getBalance('SOL');

    const totalCore = bx + bnb + sol;

    if (totalCore <= 0) {
      title.textContent = 'Ready to fund your wallet';
      text.textContent = 'Deposit crypto to activate trading, mining and casino features.';
      badge.textContent = 'START';
      primary.textContent = 'Deposit Now';
      secondary.textContent = 'Explore Market';
      primary.dataset.action = 'deposit';
      secondary.dataset.action = 'market';
      return;
    }

    if (bnb > 0 || sol > 0) {
      title.textContent = 'You are ready for mining';
      text.textContent = 'Your wallet has mining-supported assets. Start a plan from Mining now.';
      badge.textContent = 'MINING';
      primary.textContent = 'Go to Mining';
      secondary.textContent = 'Deposit More';
      primary.dataset.action = 'mining';
      secondary.dataset.action = 'deposit';
      return;
    }

    if (bx > 0) {
      title.textContent = 'BX detected in wallet';
      text.textContent = 'Use BX for casino gameplay, transfers and internal ecosystem actions.';
      badge.textContent = 'BX';
      primary.textContent = 'Open Casino';
      secondary.textContent = 'Open Market';
      primary.dataset.action = 'casino';
      secondary.dataset.action = 'market';
      return;
    }

    title.textContent = 'Wallet intelligence active';
    text.textContent = 'Manage your funds across wallet, market and mining.';
    badge.textContent = 'LIVE';
    primary.textContent = 'Deposit';
    secondary.textContent = 'Market';
    primary.dataset.action = 'deposit';
    secondary.dataset.action = 'market';
  }

  function handleIntelAction(action) {
    if (!action) return;

    if (action === 'deposit') {
      openPanel('depositPanel');
      flashWallet('#depositPanel');
      return;
    }

    if (action === 'market') {
      document.querySelector('[data-view="market"]')?.click();
      return;
    }

    if (action === 'casino') {
      document.querySelector('[data-view="casino"]')?.click();
      return;
    }

    if (action === 'mining') {
      document.querySelector('[data-view="mining"]')?.click();
    }
  }

  function bindIntelligenceActions() {
    $('walletIntelPrimary')?.addEventListener('click', (e) => {
      handleIntelAction(e.currentTarget.dataset.action);
    });

    $('walletIntelSecondary')?.addEventListener('click', (e) => {
      handleIntelAction(e.currentTarget.dataset.action);
    });
  }

  /* =========================================================
     QUICK SHEET
  ========================================================= */
  function openQuickSheet(assetName) {
    WALLET_INTEL.currentAsset = assetName || 'BX';
    $('walletQuickAssetName').textContent = assetName || 'Asset';
    $('walletQuickSheet')?.classList.remove('wallet-hidden');
  }

  function closeQuickSheet() {
    $('walletQuickSheet')?.classList.add('wallet-hidden');
  }

  function bindQuickRows() {
    const rows = Array.from(document.querySelectorAll('#wallet .wallet-row'));

    rows.forEach(row => {
      row.addEventListener('click', () => {
        const asset = row.dataset.asset || 'BX';
        openQuickSheet(asset);
      });
    });
  }

  function setSelectValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function bindQuickSheetActions() {
    $('walletQuickBackdrop')?.addEventListener('click', closeQuickSheet);
    $('walletQuickClose')?.addEventListener('click', closeQuickSheet);

    $('walletQuickDeposit')?.addEventListener('click', () => {
      closeQuickSheet();
      openPanel('depositPanel');
      setSelectValue('depositAsset', WALLET_INTEL.currentAsset);
      flashWallet('#depositPanel');
    });

    $('walletQuickWithdraw')?.addEventListener('click', () => {
      closeQuickSheet();
      openPanel('withdrawPanel');
      setSelectValue('withdrawAsset', WALLET_INTEL.currentAsset);
      flashWallet('#withdrawPanel');
    });

    $('walletQuickTransfer')?.addEventListener('click', () => {
      closeQuickSheet();
      openPanel('transferPanel');
      setSelectValue('transferAsset', WALLET_INTEL.currentAsset);
      flashWallet('#transferPanel');
    });
  }

  /* =========================================================
     BUTTONS / OPENERS
  ========================================================= */
  function bindPanelOpeners() {
    document.querySelectorAll('[data-wallet-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        openPanel(btn.dataset.walletOpen);
      });
    });

    document.querySelectorAll('[data-wallet-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.walletClose;
        $(id)?.classList.add('wallet-hidden');
      });
    });
  }

  function bindActions() {
    $('generateDepositBtn')?.addEventListener('click', handleGenerateDeposit);
    $('copyDepositBtn')?.addEventListener('click', handleCopyDeposit);
    $('submitWithdrawBtn')?.addEventListener('click', handleWithdraw);
    $('submitTransferBtn')?.addEventListener('click', handleTransfer);

    $('walletConnectBtn')?.addEventListener('click', () => {
      const btn = $('walletConnectBtn');
      if (!btn) return;
      btn.dataset.state = 'connected';
      btn.textContent = 'Wallet Connected';
      showToast('WalletConnect linked', 'success');
    });

    $('binanceConnectBtn')?.addEventListener('click', () => {
      const btn = $('binanceConnectBtn');
      if (!btn) return;
      btn.dataset.state = 'connected';
      btn.textContent = 'Binance Pay Linked';
      showToast('Binance Pay linked', 'success');
    });
  }

  /* =========================================================
     DEMO SAFE BOOTSTRAP
  ========================================================= */
  function bootstrapDemoBalances() {
    const hasAny = ASSETS.some(asset => getBalance(asset) > 0);
    if (hasAny) return;

    // قيم أولية خفيفة فقط إذا لا يوجد store جاهز
    setBalance('BX', 1250);
    setBalance('USDT', 48.5);
    setBalance('BNB', 0.12);
    setBalance('SOL', 0.45);
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */
  function renderAll() {
    renderBalances();
    renderWalletStatus();
  }

  function initWallet() {
    bootstrapDemoBalances();

    bindPanelOpeners();
    bindActions();
    bindAssetSearch();
    bindIntelligenceActions();
    bindQuickRows();
    bindQuickSheetActions();

    renderAll();

    window.addEventListener('bx:balances:updated', () => {
      renderAll();
    });

    window.BX_WALLET = {
      render: renderAll,
      openPanel,
      closeAllPanels,
      getBalance,
      setBalance,
      addBalance,
      subtractBalance,
      showToast
    };
  }

  /* =========================================================
     START
  ========================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWallet);
  } else {
    initWallet();
  }

})();
