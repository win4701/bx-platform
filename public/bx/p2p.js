/* BLOXIO P2P — safe UI interactions; live offers/quotes require a verified backend. */
(() => {
  'use strict';

  const init = () => {
    const root = document.getElementById('p2p');
    if (!root || root.dataset.p2pReady === '1') return;
    root.dataset.p2pReady = '1';

    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => [...root.querySelectorAll(selector)];
    const state = {
      side: 'buy',
      expressSide: 'buy',
      section: 'market',
      asset: 'BX',
      fiat: 'DZD',
      currencyTarget: 'fiat',
      payment: 'all',
      filters: { payment: 'all', min: '', max: '', merchant: '' }
    };

    const currencies = [
      { type: 'crypto', code: 'BX', mark: 'B', name: 'Bloxio' },
      { type: 'crypto', code: 'BTC', mark: '₿', name: 'Bitcoin' },
      { type: 'crypto', code: 'EUBX', mark: '€', name: 'Euro Bloxio' },
      { type: 'crypto', code: 'ETH', mark: '◆', name: 'Ethereum' },
      { type: 'crypto', code: 'SOL', mark: 'S', name: 'Solana' },
      { type: 'crypto', code: 'USDT', mark: '₮', name: 'Tether' },
      { type: 'fiat', code: 'DZD', mark: 'دج', countryCode: 'dz', region: 'Africa' },
      { type: 'fiat', code: 'MAD', mark: 'د.م.', countryCode: 'ma', region: 'Africa' },
      { type: 'fiat', code: 'EGP', mark: '£', countryCode: 'eg', region: 'Africa' },
      { type: 'fiat', code: 'TND', mark: 'د.ت', countryCode: 'tn', region: 'Africa' },
      { type: 'fiat', code: 'EUR', mark: '€', countryCode: 'eu', region: 'Europe' },
      { type: 'fiat', code: 'GBP', mark: '£', countryCode: 'gb', region: 'Europe' },
      { type: 'fiat', code: 'CHF', mark: 'Fr', countryCode: 'ch', region: 'Europe' },
      { type: 'fiat', code: 'USD', mark: '$', countryCode: 'us', region: 'Americas' },
      { type: 'fiat', code: 'CAD', mark: '$', countryCode: 'ca', region: 'Americas' },
      { type: 'fiat', code: 'BRL', mark: 'R$', countryCode: 'br', region: 'Americas' },
      { type: 'fiat', code: 'MXN', mark: '$', countryCode: 'mx', region: 'Americas' },
      { type: 'fiat', code: 'AED', mark: 'د.إ', countryCode: 'ae', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'SAR', mark: '﷼', countryCode: 'sa', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'QAR', mark: 'ر.ق', countryCode: 'qa', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'KWD', mark: 'د.ك', countryCode: 'kw', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'CNY', mark: '¥', countryCode: 'cn', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'JPY', mark: '¥', countryCode: 'jp', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'INR', mark: '₹', countryCode: 'in', region: 'Middle East & Asia' },
      { type: 'fiat', code: 'TRY', mark: '₺', countryCode: 'tr', region: 'Middle East & Asia' }
    ];

    const currencySheet = $('#p2pCurrencySheet');
    const currencyBackdrop = $('#p2pCurrencyBackdrop');
    const filterSheet = $('#p2pFilterDrawer');
    const filterBackdrop = $('#p2pFilterBackdrop');
    const currencyList = $('#p2pCurrencyList');
    const currencySearch = $('#p2pCurrencySearch');
    const manager = window.BLOXIO_ICONS || null;

    const updateOffersTitle = () => {
      const title = $('#p2pOffersTitle');
      if (title) title.textContent = `${state.side === 'buy' ? 'Buy' : 'Sell'} ${state.asset} with ${state.fiat}`;
    };

    const setSheet = (sheet, backdrop, open) => {
      if (!sheet || !backdrop) return;
      sheet.hidden = !open;
      backdrop.hidden = !open;
      document.body.classList.toggle('p2p-sheet-open',
        !currencySheet.hidden || !filterSheet.hidden);
      if (open) {
        const focusable = sheet.querySelector('input, button, select');
        if (focusable) focusable.focus();
      }
    };

    const updateFiatFlag = (currency) => {
      const flag = $('#p2pFiatFlag');
      if (!flag) return;
      const code = currency.countryCode || 'dz';
      flag.src = manager
        ? manager.flag(code, { width: 40 })
        : `https://flagcdn.com/${code}.svg`;
      flag.alt = currency.code;
      flag.onerror = () => { flag.onerror = null; flag.removeAttribute('src'); };
    };

    const selectCurrency = (currency) => {
      if (currency.type === 'fiat') {
        state.fiat = currency.code;
        const label = $('#p2pFiatLabel');
        if (label) label.textContent = currency.code;
        const expressFiat = $('#p2pExpressFiat');
        if (expressFiat) expressFiat.textContent = currency.code;
        updateFiatFlag(currency);
      } else {
        state.asset = currency.code;
        const assetLabel = $('#p2pAssetLabel');
        if (assetLabel) assetLabel.textContent = currency.code;
        const expressAsset = $('#p2pExpressAsset');
        if (expressAsset) expressAsset.textContent = currency.code;
      }
      updateOffersTitle();
      renderCurrencies(currencySearch ? currencySearch.value : '');
    };

    function renderCurrencies(query = '') {
      if (!currencyList) return;
      const needle = String(query).trim().toLowerCase();
      const list = currencies.filter((c) =>
        c.type === state.currencyTarget &&
        `${c.code} ${c.mark || ''} ${c.name || ''} ${c.countryCode || ''}`.toLowerCase().includes(needle)
      );
      currencyList.replaceChildren();

      const appendOption = (currency) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'p2p-currency-option';
        button.setAttribute('aria-selected', String(
          currency.type === 'fiat' ? state.fiat === currency.code : state.asset === currency.code
        ));

        if (currency.type === 'fiat') {
          const flag = document.createElement('img');
          flag.className = 'p2p-flag-icon';
          flag.alt = '';
          flag.loading = 'lazy';
          flag.width = 24;
          flag.height = 18;
          flag.src = manager
            ? manager.flag(currency.countryCode, { width: 40 })
            : `https://flagcdn.com/${currency.countryCode}.svg`;
          flag.onerror = () => { flag.onerror = null; flag.replaceWith(document.createTextNode(currency.mark)); };
          button.append(flag);
        } else {
          const mark = document.createElement('span');
          mark.className = 'p2p-coin-mark p2p-coin-usdt';
          mark.textContent = currency.mark;
          button.append(mark);
        }

        const code = document.createElement('strong');
        code.textContent = currency.code;
        button.append(code);

        if (currency.name) {
          const name = document.createElement('small');
          name.className = 'p2p-currency-name';
          name.textContent = currency.name;
          button.append(name);
        }

        const check = document.createElement('span');
        check.className = 'p2p-currency-check';
        check.textContent = button.getAttribute('aria-selected') === 'true' ? '✓' : '';
        button.append(check);
        button.addEventListener('click', () => {
          selectCurrency(currency);
          if (currencySearch) currencySearch.value = '';
          setSheet(currencySheet, currencyBackdrop, false);
        });
        currencyList.append(button);
      };

      if (state.currencyTarget === 'fiat') {
        const groups = new Map();
        list.forEach((currency) => {
          if (!groups.has(currency.region)) groups.set(currency.region, []);
          groups.get(currency.region).push(currency);
        });
        groups.forEach((items, region) => {
          const heading = document.createElement('div');
          heading.className = 'p2p-currency-region-label';
          heading.textContent = region;
          currencyList.append(heading);
          items.forEach(appendOption);
        });
      } else {
        list.forEach(appendOption);
      }

      if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'p2p-disclaimer';
        empty.textContent = 'No matching currency';
        currencyList.append(empty);
      }
    }

    const openCurrencySheet = (target) => {
      state.currencyTarget = target === 'asset' ? 'crypto' : 'fiat';
      const title = $('#p2pCurrencyTitle');
      if (title) title.textContent = state.currencyTarget === 'fiat' ? 'Select payment currency' : 'Select crypto asset';
      if (currencySearch) currencySearch.value = '';
      renderCurrencies();
      setSheet(currencySheet, currencyBackdrop, true);
    };

    // Quick crypto selector.
    $$('.p2p-crypto-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const currency = currencies.find((c) => c.type === 'crypto' && c.code === button.dataset.p2pCurrencyCode);
        if (!currency) return;
        selectCurrency(currency);
        $$('.p2p-crypto-btn').forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });

    // Buy / sell market toggle.
    $$('[data-p2p-side]').forEach((button) => button.addEventListener('click', () => {
      state.side = button.dataset.p2pSide === 'sell' ? 'sell' : 'buy';
      $$('[data-p2p-side]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateOffersTitle();
    }));

    // Market / Express tabs.
    $$('[data-p2p-section]').forEach((button) => button.addEventListener('click', () => {
      state.section = button.dataset.p2pSection === 'express' ? 'express' : 'market';
      $$('[data-p2p-section]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      const market = $('.p2p-market-view');
      const express = $('.p2p-express-view');
      if (market) market.hidden = state.section !== 'market';
      if (express) express.hidden = state.section !== 'express';
    }));

    // Currency selector triggers.
    $$('[data-p2p-open-currency]').forEach((button) => {
      button.addEventListener('click', () => openCurrencySheet(button.dataset.p2pOpenCurrency));
    });

    // Payment chips.
    $$('[data-p2p-payment]').forEach((button) => button.addEventListener('click', () => {
      state.payment = button.dataset.p2pPayment || 'all';
      $$('[data-p2p-payment]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      const select = $('#p2pFilterPayment');
      if (select) select.value = state.payment;
      state.filters.payment = state.payment;
    }));

    // Amount and merchant filters are stored locally; they do not create offers.
    const applyFilters = () => {
      state.filters = {
        payment: $('#p2pFilterPayment')?.value || 'all',
        min: $('#p2pMinAmount')?.value || '',
        max: $('#p2pMaxAmount')?.value || '',
        merchant: $('#p2pMerchantSearch')?.value.trim() || ''
      };
      state.payment = state.filters.payment;
      $$('[data-p2p-payment]').forEach((button) => {
        const active = button.dataset.p2pPayment === state.payment;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      setSheet(filterSheet, filterBackdrop, false);
      const note = $('#p2pConnectionNote');
      if (note) note.textContent = 'Filters saved locally · Live merchant offers are not connected';
    };

    $('#p2pFilterOpen')?.addEventListener('click', () => setSheet(filterSheet, filterBackdrop, true));
    $('#p2pFilterApply')?.addEventListener('click', applyFilters);
    $('#p2pFilterReset')?.addEventListener('click', () => {
      ['p2pFilterPayment', 'p2pMinAmount', 'p2pMaxAmount', 'p2pMerchantSearch'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = id === 'p2pFilterPayment' ? 'all' : '';
      });
      state.filters = { payment: 'all', min: '', max: '', merchant: '' };
      state.payment = 'all';
      $$('[data-p2p-payment]').forEach((button) => {
        const active = button.dataset.p2pPayment === 'all';
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    });

    // Close buttons, backdrops and Escape.
    $$('[data-p2p-close-sheet]').forEach((button) =>
      button.addEventListener('click', () => setSheet(currencySheet, currencyBackdrop, false)));
    $$('[data-p2p-close-filter]').forEach((button) =>
      button.addEventListener('click', () => setSheet(filterSheet, filterBackdrop, false)));
    currencyBackdrop?.addEventListener('click', () => setSheet(currencySheet, currencyBackdrop, false));
    filterBackdrop?.addEventListener('click', () => setSheet(filterSheet, filterBackdrop, false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setSheet(currencySheet, currencyBackdrop, false);
        setSheet(filterSheet, filterBackdrop, false);
      }
    });

    currencySearch?.addEventListener('input', () => renderCurrencies(currencySearch.value));

    // Express buy/sell UI. Quotes remain disabled until a real pricing API is configured.
    $$('[data-p2p-express-side]').forEach((button) => button.addEventListener('click', () => {
      state.expressSide = button.dataset.p2pExpressSide === 'sell' ? 'sell' : 'buy';
      $$('[data-p2p-express-side]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      const pay = $('#p2pPayLabel');
      const receive = $('#p2pReceiveLabel');
      if (pay) pay.textContent = state.expressSide === 'buy' ? 'You pay' : 'You sell';
      if (receive) receive.textContent = state.expressSide === 'buy' ? 'You receive' : 'You get';
    }));

    // Explicitly prevent accidental form-like submission; there is no live quote endpoint.
    const expressSubmit = $('.p2p-express-submit');
    if (expressSubmit) {
      expressSubmit.disabled = true;
      expressSubmit.textContent = 'Quotes unavailable';
      expressSubmit.title = 'Connect a verified P2P pricing service to enable quotes';
    }

    // Initial labels and empty state.
    const initialFiat = currencies.find((c) => c.code === state.fiat);
    if (initialFiat) updateFiatFlag(initialFiat);
    const fiatLabel = $('#p2pFiatLabel');
    const expressFiat = $('#p2pExpressFiat');
    const expressAsset = $('#p2pExpressAsset');
    if (fiatLabel) fiatLabel.textContent = state.fiat;
    if (expressFiat) expressFiat.textContent = state.fiat;
    if (expressAsset) expressAsset.textContent = state.asset;
    updateOffersTitle();

    // Keep the connection status honest: no fabricated merchants, prices or orders.
    const note = $('#p2pConnectionNote');
    if (note) note.textContent = 'P2P service not connected · No live prices or merchants are being displayed';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();