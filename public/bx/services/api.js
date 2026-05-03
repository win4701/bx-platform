/* =========================================================
   BX API ENGINE — PRO MAX STABLE
========================================================= */

const BASE_URL =
  location.origin.includes("localhost")
    ? "http://localhost:3000/api"
    : location.origin + "/api";

/* ================= CORE ================= */

const DEFAULT_HEADERS = {
  "Content-Type":"application/json"
};

const listeners = new Map();

function emit(event,data){
  (listeners.get(event)||[]).forEach(fn=>{
    try{ fn(data); }catch{}
  });
}

function on(event,fn){
  if(!listeners.has(event)) listeners.set(event,[]);
  listeners.get(event).push(fn);
}

/* ================= REQUEST ================= */

async function request(url, options = {}){

  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 10000);

  try{

    const token = localStorage.getItem("token");

    const res = await fetch(BASE_URL + url,{
      method:"GET",
      headers:{
        ...DEFAULT_HEADERS,
        ...(token ? { Authorization:"Bearer "+token } : {})
      },
      credentials:"include",
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeout);

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
      return { error: data?.error || "request_failed" };
    }

    return data;

  }catch(e){

    clearTimeout(timeout);

    if(e.name === "AbortError"){
      console.warn("API TIMEOUT:", url);
      return { error:"timeout" };
    }

    console.error("API CRASH:", url, e);
    return { error:"network" };
  }

}

/* ================= RETRY ================= */

async function requestRetry(url, options={}, retries=2){

  let i = 0;

  while(i <= retries){

    const res = await request(url, options);

    if(res && !res.error) return res;

    i++;

  }

  return { error:"retry_failed" };
}

/* ================= API ================= */

window.API = {

  on,

  /* ===== BASE ===== */

  get(url){
    return requestRetry(url);
  },

  post(url, body={}){
    return requestRetry(url,{
      method:"POST",
      body: JSON.stringify(body)
    });
  },

  put(url, body={}){
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

  /* ================= SERVICES ================= */

  wallet(){
    return this.get("/wallet");
  },

  market(){
    return this.get("/market");
  },
   
   casino(){
    return this.get("/casino");
  },

  mining(){
    return this.get("/mining/status");
  },

  airdrop(){
    return this.get("/airdrop/status");
  },

  history(){
    return this.get("/finance/history");
  },

  /* ================= ACTIONS ================= */

  claimAirdrop(){
    return this.post("/airdrop/claim");
  },

  startMining(data){
    return this.post("/mining/start", data);
  },

  stopMining(){
    return this.post("/mining/stop");
  },

  deposit(asset){
    return this.get(`/payments/deposit/${asset}`);
  },

  withdraw(data){
    return this.post("/payments/withdraw", data);
  },

  transfer(data){
    return this.post("/finance/transfer", data);
  },

  /* ================= REALTIME HOOKS ================= */

  syncWallet(){

    this.wallet().then(data=>{
      if(data && !data.error){
        emit("wallet:update", data);
      }
    });

  },

  syncAll(){

    this.syncWallet();

    this.airdrop().then(d=>{
      if(d && !d.error){
        emit("airdrop:update", d);
      }
    });

    this.mining().then(d=>{
      if(d && !d.error){
        emit("mining:update", d);
      }
    });

  }

};
