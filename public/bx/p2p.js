/* BLOXIO P2P page interactions — UI only; no fake offers or prices. */
(() => {
  'use strict';
  const init = () => {
    const root = document.getElementById('p2p');
    if (!root || root.dataset.p2pReady === '1') return;
    root.dataset.p2pReady = '1';

    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => [...root.querySelectorAll(selector)];
    
    // الحالة الافتراضية: BX (أول عملة) و DZD
    const state = { side: 'buy', expressSide: 'buy', section: 'market', asset: 'BX', fiat: 'DZD', currencyTarget: 'fiat', payment: 'all' };

    // مصفوفة العملات: الورقية مع الأعلام والمناطق، والرقمية (5 فقط)
    const renderCurrencies = (query = '') => {
  const list = currencies.filter(c => 
    c.type === state.currencyTarget && 
    (c.code + (c.mark || '') + (c.countryCode || '')).toLowerCase().includes(query.toLowerCase())
  );
  
  currencyList.replaceChildren();

  if (state.currencyTarget === 'fiat') {
    // تجميع حسب المنطقة
    const regions = {};
    list.forEach(c => {
      if (!regions[c.region]) regions[c.region] = [];
      regions[c.region].push(c);
    });

    Object.keys(regions).forEach(region => {
      const regionHeader = document.createElement('div');
      regionHeader.className = 'p2p-currency-region-label';
      regionHeader.textContent = region;
      regionHeader.style.cssText = 'padding:10px 16px 4px; font-size:10px; font-weight:700; color:#889e95; text-transform:uppercase; letter-spacing:0.08em;';
      currencyList.append(regionHeader);

      regions[region].forEach(c => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'p2p-currency-option';
        button.setAttribute('aria-selected', String(state.fiat === c.code));
        
        // استخدام مكتبة Flag-Icons (span مع كلاسات fi fi-xx)
        const flag = document.createElement('span');
        flag.className = `fi fi-${c.countryCode} p2p-flag-icon`; 
        flag.style.cssText = 'margin-right:12px; border-radius:2px; font-size: 1.2rem;';
        
        const code = document.createElement('strong');
        code.textContent = c.code;
        
        const check = document.createElement('span');
        check.className = 'p2p-currency-check';
        check.textContent = state.fiat === c.code ? '✓' : '';
        
        button.append(flag, code, check);
        button.addEventListener('click', () => {
          state.fiat = c.code;
          $('#p2pFiatLabel').textContent = c.code;
          
          // تحديث صورة العلم في الزر الرئيسي (باستخدام flagcdn كصورة)
          $('#p2pFiatFlag').src = `https://flagcdn.com/${c.countryCode}.svg`;
          
          $('#p2pExpressFiat').textContent = c.code;
          updateOffersTitle();
          currencySearch.value = '';
          setSheet(currencySheet, currencyBackdrop, false);
        });
        currencyList.append(button);
      });
    });
  } else {
    // العملات الرقمية
    list.forEach(c => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'p2p-currency-option';
      button.setAttribute('aria-selected', String(state.asset === c.code));
      
      const mark = document.createElement('span');
      mark.className = 'p2p-coin-mark p2p-coin-usdt';
      mark.textContent = c.mark;
      
      const code = document.createElement('strong');
      code.textContent = c.code;
      
      const check = document.createElement('span');
      check.className = 'p2p-currency-check';
      check.textContent = state.asset === c.code ? '✓' : '';
      
      button.append(mark, code, check);
      button.addEventListener('click', () => {
        state.asset = c.code;
        $('#p2pAssetLabel').textContent = c.code;
        $('#p2pExpressAsset').textContent = c.code;
        updateOffersTitle();
        currencySearch.value = '';
        setSheet(currencySheet, currencyBackdrop, false);
      });
      currencyList.append(button);
    });
  }

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'p2p-disclaimer';
    empty.textContent = 'No matching currency';
    currencyList.append(empty);
  }
};
    // دالة مساعدة لتحديث عنوان العروض
    const updateOffersTitle = () => {
      $('#p2pOffersTitle').textContent = `${state.side === 'buy' ? 'Buy' : 'Sell'} ${state.asset} with ${state.fiat}`;
    };

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

    // دالة عرض العملات (معدلة لدعم الأعلام والتقسيم الجغرافي)
    const renderCurrencies = (query = '') => {
      const list = currencies.filter(c => 
        c.type === state.currencyTarget && 
        (c.code + c.mark).toLowerCase().includes(query.toLowerCase())
      );
      
      currencyList.replaceChildren();

      if (state.currencyTarget === 'fiat') {
        // تجميع حسب المنطقة
        const regions = {};
        list.forEach(c => {
          if (!regions[c.region]) regions[c.region] = [];
          regions[c.region].push(c);
        });

        Object.keys(regions).forEach(region => {
          const regionHeader = document.createElement('div');
          regionHeader.className = 'p2p-currency-region-label';
          regionHeader.textContent = region;
          regionHeader.style.cssText = 'padding:10px 16px 4px; font-size:10px; font-weight:700; color:#889e95; text-transform:uppercase; letter-spacing:0.08em;';
          currencyList.append(regionHeader);

          regions[region].forEach(c => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'p2p-currency-option';
            button.setAttribute('aria-selected', String(state.fiat === c.code));
            
            const flag = document.createElement('span');
            flag.style.cssText = 'font-size:20px; margin-right:10px;';
            flag.textContent = c.mark;
            
            const code = document.createElement('strong');
            code.textContent = c.code;
            
            const check = document.createElement('span');
            check.className = 'p2p-currency-check';
            check.textContent = state.fiat === c.code ? '✓' : '';
            
            button.append(flag, code, check);
            button.addEventListener('click', () => {
              state.fiat = c.code;
              $('#p2pFiatLabel').textContent = c.code;
              // تحديث صورة العلم في الزر الرئيسي
              const flagMap = { 'DZD':'dz','MAD':'ma','EGP':'eg','EUR':'eu','GBP':'gb','CAD':'ca','AED':'ae','SAR':'sa','CNY':'cn','JPY':'jp','INR':'in','BRL':'br','MXN':'mx' };
              $('#p2pFiatFlag').src = `https://flagcdn.com/${flagMap[c.code]}.svg`;
              $('#p2pExpressFiat').textContent = c.code;
              updateOffersTitle();
              currencySearch.value = '';
              setSheet(currencySheet, currencyBackdrop, false);
            });
            currencyList.append(button);
          });
        });
      } else {
        // العملات الرقمية (بدون تقسيم)
        list.forEach(c => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'p2p-currency-option';
          button.setAttribute('aria-selected', String(state.asset === c.code));
          
          const mark = document.createElement('span');
          mark.className = 'p2p-coin-mark p2p-coin-usdt';
          mark.textContent = c.mark;
          
          const code = document.createElement('strong');
          code.textContent = c.code;
          
          const check = document.createElement('span');
          check.className = 'p2p-currency-check';
          check.textContent = state.asset === c.code ? '✓' : '';
          
          button.append(mark, code, check);
          button.addEventListener('click', () => {
            state.asset = c.code;
            $('#p2pAssetLabel').textContent = c.code;
            $('#p2pExpressAsset').textContent = c.code;
            updateOffersTitle();
            currencySearch.value = '';
            setSheet(currencySheet, currencyBackdrop, false);
          });
          currencyList.append(button);
        });
      }

      if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'p2p-disclaimer';
        empty.textContent = 'No matching currency';
        currencyList.append(empty);
      }
    };

    // مستمعات الأزرار الخمسة السريعة
    $$('.p2p-crypto-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.p2pCurrencyCode;
        state.asset = code;
        $('#p2pAssetLabel').textContent = code;
        $$('.p2p-crypto-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateOffersTitle();
      });
    });

    $$('[data-p2p-side]').forEach(button => button.addEventListener('click', () => {
      state.side = button.dataset.p2pSide;
      $$('[data-p2p-side]').forEach(b => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      updateOffersTitle();
    }));

    $$('[data-p2p-section]').forEach(button => button.addEventListener('click', () => {
      state.section = button.dataset.p2pSection;
      $$
