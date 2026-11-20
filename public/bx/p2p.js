/* BLOXIO P2P page interactions — UI only; no fake offers or prices. */
(() => {
  'use strict';
  const init = () => {
    const root = document.getElementById('p2p');
    if (!root || root.dataset.p2pReady === '1') return;
    root.dataset.p2pReady = '1';

    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => [...root.querySelectorAll(selector)];
    const state = { side: 'buy', expressSide: 'buy', section: 'market', asset: 'USDT', fiat: 'DZD', currencyTarget: 'fiat', payment: 'all' };

    const currencies = [
      { code: 'DZD', mark: 'دج', type: 'fiat' }, { code: 'AED', mark: 'د', type: 'fiat' },
      { code: 'AFN', mark: '؋', type: 'fiat' }, { code: 'ALL', mark: 'L', type: 'fiat' },
      { code: 'AMD', mark: '֏', type: 'fiat' }, { code: 'AOA', mark: 'Kz', type: 'fiat' },
      { code: 'ARS', mark: '$', type: 'fiat' }, { code: 'AUD', mark: '$', type: 'fiat' },
      { code: 'AZN', mark: '₼', type: 'fiat' }, { code: 'EUR', mark: '€', type: 'fiat' },
      { code: 'GBP', mark: '£', type: 'fiat' }, { code: 'MAD', mark: 'د.م', type: 'fiat' },
      { code: 'USD', mark: '$', type: 'fiat' }, { code: 'USDT', mark: '₮', type: 'asset' },
      { code: 'BTC', mark: '₿', type: 'asset' }, { code: 'ETH', mark: '◆', type: 'asset' },
      { code: 'BNB', mark: '◆', type: 'asset' }, { code: 'USDC', mark: '$', type: 'asset' }
    ];

    const currencySheet = $('#p2pCurrencySheet');
    const currencyBackdrop = $('#p2pCurrencyBackdrop');
    const filterSheet = $('#p2pFilterDrawer');
    const filterBackdrop = $('#p2pFilterBackdrop');
    const currencyList = $('#p2pCurrencyList');
    const currencySearch = $('#p2pCurrencySearch');

    const setSheet = (sheet, backdrop, open) => {
      sheet.hidden = !open;
      backdrop.hidden = !open;
      document.body.classList.toggle('p2p-sheet-open', open);
    };

    const renderCurrencies = (query = '') => {
      const list = currencies.filter(c => c.type === state.currencyTarget && (c.code + c.mark).toLowerCase().includes(query.toLowerCase()));
      currencyList.replaceChildren();
      list.forEach(c => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'p2p-currency-option';
        button.setAttribute('aria-selected', String((c.type === 'fiat' ? state.fiat : state.asset) === c.code));
        const mark = document.createElement('span');
        mark.className = 'p2p-coin-mark ' + (c.type === 'asset' ? 'p2p-coin-usdt' : 'p2p-coin-fiat');
        mark.textContent = c.mark;
        const code = document.createElement('strong');
        code.textContent = c.code;
        const check = document.createElement('span');
        check.className = 'p2p-currency-check';
        check.textContent = (c.type === 'fiat' ? state.fiat : state.asset) === c.code ? '✓' : '';
        button.append(mark, code, check);
        button.addEventListener('click', () => {
          if (c.type === 'fiat') {
            state.fiat = c.code;
            $('#p2pFiatLabel').textContent = c.code;
            $('#p2pExpressFiat').textContent = c.code;
          } else {
            state.asset = c.code;
            $('#p2pAssetLabel').textContent = c.code;
            $('#p2pExpressAsset').textContent = c.code;
          }
          $('#p2pOffersTitle').textContent = `${state.side === 'buy' ? 'Buy' : 'Sell'} ${state.asset} with ${state.fiat}`;
          currencySearch.value = '';
          setSheet(currencySheet, currencyBackdrop, false);
        });
        currencyList.append(button);
      });
      if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'p2p-disclaimer';
        empty.textContent = 'No matching currency';
        currencyList.append(empty);
      }
    };

    $$('[data-p2p-side]').forEach(button => button.addEventListener('click', () => {
      state.side = button.dataset.p2pSide;
      $$('[data-p2p-side]').forEach(b => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      $('#p2pOffersTitle').textContent = `${state.side === 'buy' ? 'Buy' : 'Sell'} ${state.asset} with ${state.fiat}`;
    }));

    $$('[data-p2p-section]').forEach(button => button.addEventListener('click', () => {
      state.section = button.dataset.p2pSection;
      $$('[data-p2p-section]').forEach(b => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      $$('[data-p2p-view]').forEach(view => { view.hidden = view.dataset.p2pView !== state.section; });
    }));

    $$('[data-p2p-open-currency]').forEach(button => button.addEventListener('click', () => {
      state.currencyTarget = button.dataset.p2pOpenCurrency;
      $('#p2pCurrencyTitle').textContent = state.currencyTarget === 'fiat' ? 'Select fiat currency' : 'Select crypto asset';
      renderCurrencies();
      setSheet(currencySheet, currencyBackdrop, true);
      currencySearch.focus();
    }));
    currencySearch.addEventListener('input', () => renderCurrencies(currencySearch.value));
    $$('[data-p2p-close-sheet]').forEach(b => b.addEventListener('click', () => setSheet(currencySheet, currencyBackdrop, false)));
    currencyBackdrop.addEventListener('click', () => setSheet(currencySheet, currencyBackdrop, false));

    $('#p2pFilterOpen').addEventListener('click', () => setSheet(filterSheet, filterBackdrop, true));
    $$('[data-p2p-close-filter]').forEach(b => b.addEventListener('click', () => setSheet(filterSheet, filterBackdrop, false)));
    filterBackdrop.addEventListener('click', () => setSheet(filterSheet, filterBackdrop, false));
    $('#p2pFilterReset').addEventListener('click', () => {
      $('#p2pFilterPayment').value = 'all';
      $('#p2pMinAmount').value = '';
      $('#p2pMaxAmount').value = '';
      $('#p2pMerchantSearch').value = '';
      state.payment = 'all';
      $$('[data-p2p-payment]').forEach(b => b.classList.toggle('active', b.dataset.p2pPayment === 'all'));
    });
    $('#p2pFilterApply').addEventListener('click', () => {
      state.payment = $('#p2pFilterPayment').value;
      $$('[data-p2p-payment]').forEach(b => b.classList.toggle('active', b.dataset.p2pPayment === state.payment));
      setSheet(filterSheet, filterBackdrop, false);
      // No offer dataset exists yet; the filter state is retained for the API integration.
      $('#p2pConnectionNote').textContent = 'Filters saved · Connect the P2P service to search live offers';
    });
    $$('[data-p2p-payment]').forEach(button => button.addEventListener('click', () => {
      state.payment = button.dataset.p2pPayment;
      $('#p2pFilterPayment').value = state.payment;
      $$('[data-p2p-payment]').forEach(b => b.classList.toggle('active', b === button));
    }));

    $$('[data-p2p-express-side]').forEach(button => button.addEventListener('click', () => {
      state.expressSide = button.dataset.p2pExpressSide;
      $$('[data-p2p-express-side]').forEach(b => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      $('#p2pPayLabel').textContent = state.expressSide === 'buy' ? 'You pay' : 'You receive';
      $('#p2pReceiveLabel').textContent = state.expressSide === 'buy' ? 'You receive' : 'You pay';
      $('#p2pReceiveAmount').value = '';
      $('#p2pReceiveAmount').placeholder = 'Rate unavailable';
    }));

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        setSheet(currencySheet, currencyBackdrop, false);
        setSheet(filterSheet, filterBackdrop, false);
      }
    });
  };

  window.BLOXIO_P2P = window.BLOXIO_P2P || {};
  window.BLOXIO_P2P.init = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
