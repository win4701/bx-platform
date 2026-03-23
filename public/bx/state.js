// ===============================
// BX STATE MANAGER (PRO)
// ===============================

window.STATE = {

  data: {
    user: null,

    wallet: {},

    mining: {
      subscription: null
    },

    airdrop: {
      reward: 0
    },

    ui: {
      view: "wallet"
    }
  },

  listeners: [],

  // ================= GET =================
  get(path){

    return path.split(".").reduce((o,k)=>o?.[k], this.data);

  },

  // ================= SET =================
  set(path, value){

    const keys = path.split(".");
    let obj = this.data;

    keys.slice(0,-1).forEach(k=>{
      if(!obj[k]) obj[k] = {};
      obj = obj[k];
    });

    obj[keys.at(-1)] = value;

    this.notify(path, value);
  },

  // ================= UPDATE =================
  update(path, fn){

    const current = this.get(path);
    const next = fn(current);

    this.set(path, next);
  },

  // ================= SUBSCRIBE =================
  subscribe(path, callback){

    this.listeners.push({ path, callback });

  },

  // ================= NOTIFY =================
  notify(path, value){

    this.listeners.forEach(l => {

      if(path.startsWith(l.path)){
        l.callback(value, path);
      }

    });

  }

};
