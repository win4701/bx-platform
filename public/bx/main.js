/* =====================================================
   BLOXIO MAIN — ULTRA STABLE ROUTER (FIXED ALL)
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

  /* ================= AUTH GUARD ================= */
  function isLocked(){
    const overlay = document.getElementById("authOverlay");
    return overlay && overlay.style.display !== "none";
  }

  /* ================= NAV ================= */
  function setNav(id){
    nav.forEach((b,k)=>{
      const a = k===id;
      b.classList.toggle('active', a);
      b.setAttribute('aria-current', a?'page':'false');
    });
  }

  function hideAll(){
    views.forEach(v=>{
      v.style.display='none';
      v.classList.remove('active');
    });
  }

  function show(id){
    const v = views.get(id);
    if(!v) return;
    v.style.display='';
    v.classList.add('active');
  }

  function closePanels(){
    $$('.wallet-panel').forEach(p=>p.classList.add('wallet-hidden'));
    $$('.mining-sub-panel').forEach(p=>p.classList.add('mining-hidden'));
  }

  /* ================= HOOKS ================= */
  function hooks(id){

    document.dispatchEvent(new CustomEvent('bloxio:view',{detail:id}));

    /* -------- WALLET -------- */
    if(id==='wallet'){
      safe(window.renderWallet);
      safe(window.updateWalletUI);
    }

    /* -------- MARKET -------- */
    if(id==='market'){
      safe(window.renderMarket);
      safe(window.updateMarketUI);
      safe(window.resizeMarketChart);
    }

    /* -------- CASINO -------- */
    if(id==='casino'){
      safe(window.renderCasinoLobby);
      safe(window.updateCasinoUI);
    }

    /* -------- MINING FIX 🔥 -------- */
    if(id==='mining'){

      // ✅ fallback 1 (old system)
      if(window.renderMining){
        safe(window.renderMining);
      }

      // ✅ fallback 2 (new system)
      if(window.renderMiningPlans){
        safe(window.renderMiningPlans);
      }

      safe(window.updateMiningUI);
    }

    /* -------- AIRDROP -------- */
    if(id==='airdrop'){
      safe(window.renderAirdrop);
    }

    /* -------- SETTINGS -------- */
    if(id==='settings'){
      safe(window.renderSettings);
    }
  }

  /* ================= ROUTER ================= */
  function go(id, opt={}){

    if(isLocked()) return; // 🔥 auth block

    const view = VIEWS.includes(id)?id:DEFAULT;

    if(STATE.current === view && !opt.force){
      setNav(view);
      return;
    }

    closePanels();
    hideAll();
    show(view);
    setNav(view);

    STATE.current = view;
    localStorage.setItem(STORE, view);

    hooks(view);
  }

  /* ================= NAV EVENTS ================= */
  function bind(){

    nav.forEach((btn,id)=>{
      btn.onclick = ()=>{
        if(isLocked()) return;
        go(id);
      };
    });

    document.addEventListener('click', e=>{
      const t = e.target.closest('[data-action]');
      if(!t) return;

      if(isLocked()) return;

      const a = t.dataset.action;

      if(a==='go-mining') go('mining');
      if(a==='go-wallet') go('wallet');
      if(a==='go-market') go('market');
      if(a==='go-casino') go('casino');
      if(a==='go-airdrop') go('airdrop');
    });

  }

  /* ================= BOOT ================= */
  function boot(){

    bind();

    const saved = localStorage.getItem(STORE) || DEFAULT;

    // 🔥 auth delay fix
    setTimeout(()=>{
      go(saved, {force:true});
    }, 50);

    console.log('🚀 MAIN FIXED READY');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

})();
