// ===============================
// BX API SERVICE (PRO)
// ===============================

const BASE_URL = "";

// ================= CORE =================

async function request(url, options = {}){

  try{

    const res = await fetch(BASE_URL + url, {
      headers:{
        "Content-Type":"application/json"
      },
      credentials:"include",
      ...options
    });

    const data = await res.json();

    if(!res.ok){
      console.warn("API error:", data);
      return null;
    }

    return data;

  }catch(e){
    console.error("API crash:", url, e);
    return null;
  }

}

// ================= API =================

window.API = {

  // ---------- GET ----------
  get(url){
    return request(url);
  },

  // ---------- POST ----------
  post(url, body = {}){
    return request(url,{
      method:"POST",
      body: JSON.stringify(body)
    });
  },

  // ---------- PUT ----------
  put(url, body = {}){
    return request(url,{
      method:"PUT",
      body: JSON.stringify(body)
    });
  },

  // ---------- DELETE ----------
  delete(url){
    return request(url,{
      method:"DELETE"
    });
  },

  // ================= SERVICES =================

  wallet(){
    return this.get("/finance/wallet");
  },

  mining(){
    return this.get("/mining/user");
  },

  airdrop(){
    return this.get("/airdrop/status");
  },

  market(){
    return this.get("/market/data");
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
  }

};
