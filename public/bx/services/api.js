/* =========================================================
   BX API ENGINE (ULTRA FINAL PRO)
========================================================= */

const BASE_URL = "https://api.bloxio.online";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json"
};

// ================= CORE =================

async function request(url, options = {}){

  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 8000);

  try{

    const token = localStorage.getItem("token");

    const res = await fetch(BASE_URL + url, {
      headers:{
        ...DEFAULT_HEADERS,
        ...(token ? { "Authorization":"Bearer " + token } : {})
      },
      credentials:"include",
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeout);

    let data;

    try{
      data = await res.json();
    }catch{
      data = null;
    }

    if(!res.ok){

      console.warn("API ERROR:", url, data);

      // 🔥 auth expired
      if(res.status === 401){
        localStorage.removeItem("token");
      }

      return null;
    }

    return data;

  }catch(e){

    clearTimeout(timeout);

    if(e.name === "AbortError"){
      console.warn("API TIMEOUT:", url);
    } else {
      console.error("API CRASH:", url, e);
    }

    return null;
  }

}

// ================= RETRY =================

async function requestRetry(url, options = {}, retries = 2){

  let attempt = 0;

  while(attempt <= retries){

    const res = await request(url, options);

    if(res) return res;

    attempt++;

  }

  return null;
}

// ================= API =================

window.API = {

  // ---------- BASE ----------
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

  // ================= SERVICES =================

  wallet(){
    return this.get("/finance/wallet");
  },

  market(){
    return this.get("/market/data");
  },

  mining(){
    return this.get("/mining/user");
  },

  airdrop(){
    return this.get("/airdrop/status");
  },

  history(){
    return this.get("/finance/history");
  },

  // ================= ACTIONS =================

  claimAirdrop(){
    return this.post("/airdrop/claim");
  },

  subscribeMining(data){
    return this.post("/mining/subscribe", data);
  },

  claimMining(data){
    return this.post("/mining/claim", data);
  },

  deposit(asset){
    return this.get(`/finance/deposit/${asset}`);
  },

  withdraw(data){
    return this.post("/finance/withdraw", data);
  },

  transfer(data){
    return this.post("/finance/transfer", data);
  },

  binancePay(data){
    return this.post("/payments/binance/create", data);
  },

  connectWallet(data){
    return this.post("/finance/wallet/connect", data);
  }

};
