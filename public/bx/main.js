/* =====================================================
   BLOXIO MAIN — PRO ROUTER (NO CONFLICT VERSION)
===================================================== */

(() => {
  'use strict';

  const APP   = window.BX_APP || (window.BX_APP = {});
  const UI    = APP.ui || (APP.ui = {});
  const STATE = APP.state || (APP.state = {});

  const VIEWS = ['wallet','market','casino','mining','airdrop','settings'];
  const DEFAULT = 'wallet';
  const STORE = 'bloxio:view';

  const views = new Map();
  const nav   = new Map();

  document.querySelectorAll('.view').forEach(v=>{
    if(v.id) views.set(v.id, v);
  });

  document.querySelectorAll('.bottom-nav [data-view]').forEach(b=>{
    nav.set(b.dataset.view, b);
  });

  const $  = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const safe = fn=>{
    try{ if(typeof fn === 'function') return fn(); }
    catch(e){ console.warn('[SAFE]', e); }
  };

  /* ================= AUTH ================= */

  function isLocked(){
    const overlay = document.getElementById("authOverlay");
    return overlay && overlay.style.display !== "none";
  }

  /* ================= NAV ================= */

  function setNav(id){
    nav.forEach((b,k)=>{
      const active = k === id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function hideAll(){
    views.forEach(v=>{
      v.style.display = 'none';
      v.classList.remove('active');
    });
  }

  function show(id){
    const v = views.get(id);
    if(!v) return;
    v.style.display = '';
    v.classList.add('active');
  }

  /* ================= PANEL FIX 🔥 ================= */

  function closePanels(options = {}){

    const { keepWallet } = options;

    // 🔥 لا تغلق wallet panels إذا داخل wallet
    if(!keepWallet){
      $$('.wallet-panel').forEach(p=>{
        p.classList.add('wallet-hidden');
      });
    }

    // mining panels دائماً تتغلق
    $$('.mining-sub-panel').forEach(p=>{
      p.classList.add('mining-hidden');
    });

  }

  /* ================= HOOKS ================= */

  function hooks(id){

    document.dispatchEvent(new CustomEvent('bloxio:view',{detail:id}));

    switch(id){

      case 'wallet':
        safe(window.renderWallet);
        safe(window.updateWalletUI);
        break;

      case 'market':
        safe(window.renderMarket);
        safe(window.updateMarketUI);
        safe(window.resizeMarketChart);
        break;

      case 'casino':
        safe(window.renderCasinoLobby);
        safe(window.updateCasinoUI);
        break;

      case 'mining':
        safe(window.renderMining);
        safe(window.renderMiningPlans);
        safe(window.updateMiningUI);
        break;

      case 'airdrop':
        safe(window.renderAirdrop);
        break;

      case 'settings':
        safe(window.renderSettings);
        break;

    }

  }

  /* ================= ROUTER ================= */

  function go(id, opt={}){

    if(isLocked()) return;

    const view = VIEWS.includes(id) ? id : DEFAULT;

    if(STATE.current === view && !opt.force){
      setNav(view);
      return;
    }

    // 🔥 FIX: لا تكسر wallet
    closePanels({
      keepWallet: view === "wallet"
    });

    hideAll();
    show(view);
    setNav(view);

    STATE.current = view;
    localStorage.setItem(STORE, view);

    hooks(view);
  }

  /* ================= ACTION SYSTEM 🔥 ================= */

  function bindActions(){

    document.addEventListener('click', e=>{

      const t = e.target.closest('[data-action]');
      if(!t) return;

      if(isLocked()) return;

      const a = t.dataset.action;

      switch(a){

        case 'go-wallet':  go('wallet'); break;
        case 'go-market':  go('market'); break;
        case 'go-casino':  go('casino'); break;
        case 'go-mining':  go('mining'); break;
        case 'go-airdrop': go('airdrop'); break;

      }

    });

  }

  /* ================= NAV ================= */

  function bindNav(){

    nav.forEach((btn,id)=>{
      btn.onclick = ()=>{
        if(isLocked()) return;
        go(id);
      };
    });

  }

  /* ================= BOOT ================= */

  function boot(){

    bindNav();
    bindActions();

    const saved = localStorage.getItem(STORE) || DEFAULT;

    setTimeout(()=>{
      go(saved, {force:true});
    }, 50);

    console.log('🚀 MAIN PRO READY');

  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
