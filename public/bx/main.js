/* =========================================
   BLOXIO MAIN — AUTH SAFE VERSION
========================================= */

(() => {
  'use strict';

  const APP = window.BX_APP || (window.BX_APP = {});
  const UI = APP.ui || (APP.ui = {});
  const STATE = APP.state || (APP.state = {});

  const VIEW_IDS = ['wallet','market','casino','mining','airdrop','settings'];
  const DEFAULT_VIEW = 'wallet';
  const STORAGE_KEY = 'bloxio:lastView';

  const views = new Map();
  const navButtons = new Map();

  document.querySelectorAll('.view').forEach(v=>{
    if(v.id) views.set(v.id, v);
  });

  document.querySelectorAll('.bottom-nav [data-view]').forEach(btn=>{
    navButtons.set(btn.dataset.view, btn);
  });

  // ================= HELPERS =================

  const $ = s => document.querySelector(s);

  function normalize(id){
    return VIEW_IDS.includes(id) ? id : DEFAULT_VIEW;
  }

  function getHash(){
    return normalize(location.hash.replace('#',''));
  }

  function save(id){
    try{ localStorage.setItem(STORAGE_KEY,id); }catch(e){}
  }

  function load(){
    try{ return normalize(localStorage.getItem(STORAGE_KEY)); }
    catch(e){ return DEFAULT_VIEW; }
  }

  function setActiveNav(id){
    navButtons.forEach((btn,key)=>{
      btn.classList.toggle("active", key===id);
    });
  }

  function hideAll(){
    views.forEach(v=>{
      v.style.display="none";
      v.classList.remove("active");
    });
  }

  function show(id){
    const el = views.get(id);
    if(!el) return;

    el.style.display="block";
    el.classList.add("active");
  }

  function fireHooks(id){

    if(id==="wallet"){
      window.WALLET?.init();
    }

    if(id==="market"){
      window.WS?.subscribe("market");
      window.initMarket?.();
    }

    if(id==="casino"){
      window.WS?.subscribe("casino");
      window.CASINO?.init();
    }

    if(id==="mining"){
      window.renderMining?.();
    }

    if(id==="airdrop"){
      window.initAirdrop?.();
    }
  }

  // ================= ROUTER =================

  function goToView(id, opt={}){

    if(!window.AUTH_READY){
      console.warn("Blocked view before auth");
      return;
    }

    id = normalize(id);

    hideAll();
    show(id);
    setActiveNav(id);

    STATE.currentView = id;
    save(id);

    if(!opt.silentHash){
      history.replaceState(null,'',`#${id}`);
    }

    fireHooks(id);
  }

  // ================= BIND =================

  function bindNav(){
    navButtons.forEach((btn,id)=>{
      btn.onclick = ()=> goToView(id);
    });
  }

  function bindHash(){
    window.addEventListener("hashchange", ()=>{
      goToView(getHash(), {silentHash:true});
    });
  }

  // ================= START =================

  function start(){

    if(STATE.started) return;
    STATE.started = true;

    console.log("🚀 MAIN START");

    bindNav();
    bindHash();

    const initial = location.hash ? getHash() : load();

    goToView(initial, {force:true});
  }

  // ================= EXPORT =================

  window.startMain = start;
  window.goToView = goToView;

})();
