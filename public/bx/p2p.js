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
      fiat: 'EUR',
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
      { type: 'fiat', code: 'EUR', mark: '€', countryCode: 'eu', region: '00 · Primary currency', name: 'Euro' },
      { type: 'fiat', code: 'DZD', mark: 'دج', countryCode: 'dz', region: 'Africa · North', name: 'Algerian Dinar' },
      { type: 'fiat', code: 'MAD', mark: 'د.م.', countryCode: 'ma', region: 'Africa · North', name: 'Moroccan Dirham' },
      { type: 'fiat', code: 'EGP', mark: 'E£', countryCode: 'eg', region: 'Africa · North', name: 'Egyptian Pound' },
      { type: 'fiat', code: 'TND', mark: 'د.ت', countryCode: 'tn', region: 'Africa · North', name: 'Tunisian Dinar' },
      { type: 'fiat', code: 'LYD', mark: 'ل.د', countryCode: 'ly', region: 'Africa · North', name: 'Libyan Dinar' },
      { type: 'fiat', code: 'MRU', mark: 'UM', countryCode: 'mr', region: 'Africa · North', name: 'Mauritanian Ouguiya' },
      { type: 'fiat', code: 'SDG', mark: 'ج.س.', countryCode: 'sd', region: 'Africa · North', name: 'Sudanese Pound' },
      { type: 'fiat', code: 'OMR', mark: 'ر.ع.', countryCode: 'om', region: 'Middle East', name: 'Omani Rial' },
      { type: 'fiat', code: 'JOD', mark: 'د.ا', countryCode: 'jo', region: 'Middle East', name: 'Jordanian Dinar' },
      { type: 'fiat', code: 'LBP', mark: 'ل.ل', countryCode: 'lb', region: 'Middle East', name: 'Lebanese Pound' },
      { type: 'fiat', code: 'RUB', mark: '₽', countryCode: 'ru', region: 'Europe & Eurasia', name: 'Russian Ruble' },
      { type: 'fiat', code: 'UYU', mark: '$U', countryCode: 'uy', region: 'Americas', name: 'Uruguayan Peso' },
      { type: 'fiat', code: 'TRY', mark: '₺', countryCode: 'tr', region: 'Middle East & Asia', name: 'Turkish Lira' },
      { type: 'fiat', code: 'PKR', mark: '₨', countryCode: 'pk', region: 'Middle East & Asia', name: 'Pakistani Rupee' },
      { type: 'fiat', code: 'CNY', mark: '¥', countryCode: 'cn', region: 'Middle East & Asia', name: 'Chinese Yuan' },
      { type: 'fiat', code: 'GBP', mark: '£', countryCode: 'gb', region: 'Europe', name: 'British Pound' },
      { type: 'fiat', code: 'CHF', mark: 'Fr', countryCode: 'ch', region: 'Europe', name: 'Swiss Franc' },
      { type: 'fiat', code: 'AED', mark: 'د.إ', countryCode: 'ae', region: 'Middle East', name: 'UAE Dirham' },
      { type: 'fiat', code: 'SAR', mark: '﷼', countryCode: 'sa', region: 'Middle East', name: 'Saudi Riyal' },
      { type: 'fiat', code: 'QAR', mark: 'ر.ق', countryCode: 'qa', region: 'Middle East', name: 'Qatari Riyal' },
      { type: 'fiat', code: 'KWD', mark: 'د.ك', countryCode: 'kw', region: 'Middle East', name: 'Kuwaiti Dinar' },
      { type: 'fiat', code: 'JPY', mark: '¥', countryCode: 'jp', region: 'Middle East & Asia', name: 'Japanese Yen' },
      { type: 'fiat', code: 'INR', mark: '₹', countryCode: 'in', region: 'Middle East & Asia', name: 'Indian Rupee' },
      { type: 'fiat', code: 'BRL', mark: 'R$', countryCode: 'br', region: 'Americas', name: 'Brazilian Real' },
      { type: 'fiat', code: 'MXN', mark: '$', countryCode: 'mx', region: 'Americas', name: 'Mexican Peso' },
      { type: 'fiat', code: 'USD', mark: '$', countryCode: 'us', region: 'Dollar currencies', name: 'US Dollar' },
      { type: 'fiat', code: 'CAD', mark: '$', countryCode: 'ca', region: 'Dollar currencies', name: 'Canadian Dollar' },
      { type: 'fiat', code: 'AUD', mark: '$', countryCode: 'au', region: 'Dollar currencies', name: 'Australian Dollar' },
      { type: 'fiat', code: 'NZD', mark: '$', countryCode: 'nz', region: 'Dollar currencies', name: 'New Zealand Dollar' },
      { type: 'fiat', code: 'SGD', mark: '$', countryCode: 'sg', region: 'Dollar currencies', name: 'Singapore Dollar' },
      { type: 'fiat', code: 'HKD', mark: '$', countryCode: 'hk', region: 'Dollar currencies', name: 'Hong Kong Dollar' },
      { type: 'fiat', code: 'TWD', mark: '$', countryCode: 'tw', region: 'Dollar currencies', name: 'New Taiwan Dollar' },
      { type: 'fiat', code: 'BND', mark: '$', countryCode: 'bn', region: 'Dollar currencies', name: 'Brunei Dollar' },
      { type: 'fiat', code: 'FJD', mark: '$', countryCode: 'fj', region: 'Dollar currencies', name: 'Fiji Dollar' },
      { type: 'fiat', code: 'SBD', mark: '$', countryCode: 'sb', region: 'Dollar currencies', name: 'Solomon Islands Dollar' },
      { type: 'fiat', code: 'XCD', mark: '$', countryCode: 'ag', region: 'Dollar currencies', name: 'Eastern Caribbean Dollar' },
      { type: 'fiat', code: 'BBD', mark: '$', countryCode: 'bb', region: 'Dollar currencies', name: 'Barbadian Dollar' },
      { type: 'fiat', code: 'BSD', mark: '$', countryCode: 'bs', region: 'Dollar currencies', name: 'Bahamian Dollar' },
      { type: 'fiat', code: 'BZD', mark: '$', countryCode: 'bz', region: 'Dollar currencies', name: 'Belize Dollar' },
      { type: 'fiat', code: 'GYD', mark: '$', countryCode: 'gy', region: 'Dollar currencies', name: 'Guyanese Dollar' },
      { type: 'fiat', code: 'JMD', mark: '$', countryCode: 'jm', region: 'Dollar currencies', name: 'Jamaican Dollar' },
      { type: 'fiat', code: 'LRD', mark: '$', countryCode: 'lr', region: 'Dollar currencies', name: 'Liberian Dollar' },
      { type: 'fiat', code: 'NAD', mark: '$', countryCode: 'na', region: 'Dollar currencies', name: 'Namibian Dollar' },
      { type: 'fiat', code: 'SRD', mark: '$', countryCode: 'sr', region: 'Dollar currencies', name: 'Surinamese Dollar' },
      { type: 'fiat', code: 'TTD', mark: '$', countryCode: 'tt', region: 'Dollar currencies', name: 'Trinidad and Tobago Dollar' }
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
      const code = currency.countryCode || 'eu';
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
        if (groups.has('00 · Primary currency')) {
          const primary = groups.get('00 · Primary currency');
          groups.delete('00 · Primary currency');
          const ordered = new Map([['00 · Primary currency', primary], ...groups]);
          groups.clear();
          ordered.forEach((items, region) => groups.set(region, items));
        }
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