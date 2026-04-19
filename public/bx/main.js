// =====================================================
// BLOXIO MAIN — CLEAN ROUTER (NO HASH)
// =====================================================

(() => {
  'use strict';

  const APP = window.BX_APP || (window.BX_APP = {});
  const UI = APP.ui || (APP.ui = {});
  const STATE = APP.state || (APP.state = {});

  const VIEW_IDS = ['wallet', 'market', 'casino', 'mining', 'airdrop', 'settings'];
  const DEFAULT_VIEW = 'wallet';
  const STORAGE_KEY = 'bloxio:lastView';

  const views = new Map();
  const navButtons = new Map();

  document.querySelectorAll('.view').forEach(v => {
    if (v.id) views.set(v.id, v);
  });

  document.querySelectorAll('.bottom-nav [data-view]').forEach(btn => {
    const id = btn.dataset.view;
    if (id) navButtons.set(id, btn);
  });

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function safe(fn, ...a){
    try { if (typeof fn === 'function') return fn(...a); }
    catch(e){ console.warn(e); }
  }

  function play(){
    try{
      const s = document.getElementById('snd-click');
      if(!s || document.body.dataset.sound === 'off') return;
      s.currentTime = 0;
      s.play().catch(()=>{});
    }catch(_){}
  }

  function normalize(id){
    return VIEW_IDS.includes(id) ? id : DEFAULT_VIEW;
  }

  function save(id){
    try{ localStorage.setItem(STORAGE_KEY, id); }catch(_){}
  }

  function load(){
    try{
      return normalize(localStorage.getItem(STORAGE_KEY) || DEFAULT_VIEW);
    }catch(_){
      return DEFAULT_VIEW;
    }
  }

  function setNav(id){
    navButtons.forEach((btn, key)=>{
      const a = key === id;
      btn.classList.toggle('active', a);
      btn.setAttribute('aria-current', a ? 'page' : 'false');
    });
  }

  function hideAll(){
    views.forEach(v=>{
      v.classList.remove('active');
      v.setAttribute('hidden','hidden');
      v.style.display = 'none';
    });
  }

  function show(id){
    const v = views.get(id);
    if(!v) return;
    v.classList.add('active');
    v.removeAttribute('hidden');
    v.style.display = '';
  }

  function closePanels(){
    $$('.wallet-panel').forEach(p=>p.classList.add('wallet-hidden'));
    $$('.mining-sub-panel').forEach(p=>p.classList.add('mining-hidden'));
  }

  function hooks(id){

    document.dispatchEvent(new CustomEvent('bloxio:viewchange',{detail:{view:id}}));

    if(id==='wallet'){
      safe(window.renderWallet);
      safe(window.updateWalletUI);
      safe(window.refreshWalletUI);
    }

    if(id==='market'){
      safe(window.renderMarket);
      safe(window.updateMarketUI);
      safe(window.resizeMarketChart);
      safe(window.syncMarketLayout);
      setTimeout(()=>safe(window.resizeMarketChart),120);
    }

    if(id==='casino'){
      safe(window.renderCasinoLobby);
      safe(window.updateCasinoUI);
      safe(window.syncCasinoLayout);
    }

    if(id==='mining'){
      safe(window.renderMiningPlans);
      safe(window.updateMiningUI);
      safe(window.syncMiningLayout);
    }

    if(id==='airdrop'){
      safe(window.renderAirdrop);
      safe(window.updateAirdropUI);
    }

    if(id==='settings'){
      safe(window.renderSettings);
      safe(window.updateSettingsUI);
    }
  }

  // ================= ROUTER =================

  function goToView(next, opt = {}){

    const id = normalize(next);
    const current = STATE.currentView || null;

    if(!views.has(id)) return;

    if(current === id && !opt.force){
      setNav(id);
      return;
    }

    closePanels();
    hideAll();
    show(id);
    setNav(id);

    STATE.currentView = id;
    save(id);

    // 🚫 NO HASH HERE

    hooks(id);
  }

  // ================= NAV =================

  function bindNav(){
    navButtons.forEach((btn,id)=>{
      btn.addEventListener('click', ()=>{
        play();
        goToView(id);
      });
    });
  }

  // ================= ACTIONS =================

  function bindActions(){
    document.addEventListener('click', (e)=>{
      const t = e.target.closest('[data-action]');
      if(!t) return;

      const a = t.dataset.action;

      if(a==='go-mining'){ play(); goToView('mining'); }
      if(a==='go-wallet'){ play(); goToView('wallet'); }
      if(a==='go-market'){ play(); goToView('market'); }
      if(a==='go-casino'){ play(); goToView('casino'); }
      if(a==='go-airdrop'){ play(); goToView('airdrop'); }
    });
  }

  // ================= RESIZE =================

  let rTimer = null;

  function onResize(){
    clearTimeout(rTimer);
    rTimer = setTimeout(()=>{
      const c = STATE.currentView || DEFAULT_VIEW;

      if(c==='market'){
        safe(window.resizeMarketChart);
        safe(window.syncMarketLayout);
      }

      if(c==='casino'){
        safe(window.syncCasinoLayout);
      }

      if(c==='mining'){
        safe(window.syncMiningLayout);
      }
    },120);
  }

  // ================= API =================

  UI.goToView = goToView;
  UI.getCurrentView = () => STATE.currentView || DEFAULT_VIEW;

  window.goToView = goToView;

  // ================= BOOT =================

  function boot(){

    bindNav();
    bindActions();

    window.addEventListener('resize', onResize);

    const initial = load(); // 🔥 بدون hash

    goToView(initial, {force:true});

    document.body.classList.add('app-ready');

    console.log('[Bloxio] clean router loaded');

  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

})();
