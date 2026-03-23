/* =========================================================
   BX STATE MANAGER (ULTRA FINAL STABLE)
========================================================= */

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

  listeners: new Map(),

  /* ================= GET ================= */

  get(path){

    return path.split(".").reduce((o,k)=>o?.[k], this.data);

  },

  /* ================= SET ================= */

  set(path, value){

    const keys = path.split(".");
    let obj = this.data;

    keys.slice(0,-1).forEach(k=>{
      if(!obj[k] || typeof obj[k] !== "object"){
        obj[k] = {};
      }
      obj = obj[k];
    });

    const lastKey = keys.at(-1);

    const oldVal = obj[lastKey];

    // ❌ avoid useless update
    if(oldVal === value) return;

    obj[lastKey] = value;

    this.notify(path, value, oldVal);
  },

  /* ================= UPDATE ================= */

  update(path, fn){

    const current = this.get(path);

    const next = fn(current);

    this.set(path, next);
  },

  /* ================= SUBSCRIBE ================= */

  subscribe(path, callback){

    if(!this.listeners.has(path)){
      this.listeners.set(path, []);
    }

    const arr = this.listeners.get(path);

    arr.push(callback);

    // 🔥 return unsubscribe
    return () => {
      const i = arr.indexOf(callback);
      if(i !== -1) arr.splice(i,1);
    };
  },

  /* ================= NOTIFY ================= */

  notify(path, value, oldVal){

    this.listeners.forEach((callbacks, key)=>{

      if(path.startsWith(key)){

        callbacks.forEach(cb=>{
          try{
            cb(value, oldVal, path);
          }catch(e){
            console.error("STATE ERROR:", key, e);
          }
        });

      }

    });

  },

  /* ================= RESET ================= */

  reset(){

    this.data = {
      user:null,
      wallet:{},
      mining:{ subscription:null },
      airdrop:{ reward:0 },
      ui:{ view:"wallet" }
    };

    this.listeners.clear();
  },

  /* ================= PERSIST (OPTIONAL) ================= */

  save(){

    try{
      localStorage.setItem("BX_STATE", JSON.stringify(this.data));
    }catch(e){}
  },

  load(){

    try{

      const saved = localStorage.getItem("BX_STATE");

      if(saved){
        this.data = JSON.parse(saved);
      }

    }catch(e){}

  }

};
