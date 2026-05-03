/* =========================================================
   BLOXIO API ENGINE — FINAL PRO MAX
========================================================= */

"use strict";

/* ================= BASE ================= */

const BASE_URL =
  location.origin.includes("localhost")
    ? "http://localhost:3000/api"
    : location.origin + "/api";

/* ================= CONFIG ================= */

const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
};

const TIMEOUT = 10000;

/* ================= EVENT BUS ================= */

const listeners = new Map();

function emit(event, data){
  (listeners.get(event) || []).forEach(fn=>{
    try{ fn(data); }catch(e){ console.warn(e); }
  });
}

function on(event, fn){
  if(!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
}

/* ================= CORE REQUEST ================= */

async function request(url, options = {}){

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), TIMEOUT);

  try{

    const token = localStorage.getItem("token");

    const res = await fetch(BASE_URL + url, {
      method: "GET",
      headers:{
        ...DEFAULT_HEADERS,
        ...(token ? { Authorization:"Bearer " + token } : {})
      },
      credentials:"include",
      signal: controller.signal,
      ...options
    });

    clearTimeout(timer);

    let data = null;

    try{ data = await res.json(); }catch{}

    /* ================= AUTH ================= */

    if(res.status === 401){

      localStorage.removeItem("token");

      emit("auth:logout");

      return { error:"unauthorized" };
    }

    /* ================= ERROR ================= */

    if(!res.ok){

      console.warn("API ERROR:", url, data);

      emit("api:error", { url, data });

      return { error: data?.error || "request_failed" };
    }

    return data;

  }catch(e){

    clearTimeout(timer);

    if(e.name === "AbortError"){
      emit("api:error", { url, error:"timeout" });
      return { error:"timeout" };
    }

    emit("api:error", { url, error:"network" });

    console.error("API CRASH:", url, e);

    return { error:"network" };
  }

}

/* ================= RETRY ================= */

async function requestRetry(url, options = {}, retries = 2){

  let i = 0;

  while(i <= retries){

    const res = await request(url, options);

    if(res && !res.error){
      return res;
    }

    i++;

  }

  return { error:"retry_failed" };
}

/* =========================================================
API OBJECT
========================================================= */

window.API = {

  on,

  /* ================= BASE ================= */

  get(url){
    return requestRetry(url);
  },

  post(url, body = {}){
    return requestRetry(url,{
      method:"POST",
      body: JSON.stringify(body)
    });
  },

  put(url, body = {}){
    return requestRetry(url,{
      method:"PUT",
      body: JSON.stringify(body)
    });
  },

  delete(url){
    return requestRetry(url,{
      method:"DELETE"
    });
  },

  /* ================= AUTH ================= */

  check(){
    return this.get("/auth/check");
  },

  /* ================= WALLET ================= */

  wallet(){
    return this.get("/wallet");
  },

  history(){
    return this.get("/finance/history");
  },

  transfer(data){
    return this.post("/finance/transfer", data);
  },

  deposit(asset){
    return this.get(`/payments/deposit/${asset}`);
  },

  withdraw(data){
    return this.post("/payments/withdraw", data);
  },

  /* ================= MARKET ================= */

  market(){
    return this.get("/market");
  },

  /* ================= CASINO ================= */

  casino(){
    return this.get("/casino");
  },

  /* ================= MINING ================= */

  mining(){
    return this.get("/mining/status");
  },

  startMining(data){
    return this.post("/mining/start", data);
  },

  stopMining(){
    return this.post("/mining/stop");
  },

  /* ================= AIRDROP ================= */

  airdrop(){
    return this.get("/airdrop/status");
  },

  claimAirdrop(){
    return this.post("/airdrop/claim");
  },

  /* ================= SYNC SYSTEM ================= */

  syncWallet(){

    this.wallet().then(data=>{
      if(data && !data.error){
        emit("wallet:update", data);
      }
    });

  },

  syncMining(){

    this.mining().then(data=>{
      if(data && !data.error){
        emit("mining:update", data);
      }
    });

  },

  syncAirdrop(){

    this.airdrop().then(data=>{
      if(data && !data.error){
        emit("airdrop:update", data);
      }
    });

  },

  /* ================= FULL SYNC ================= */

  syncAll(){

    this.syncWallet();
    this.syncMining();
    this.syncAirdrop();

  }

};
