/* ================== CORE ================== */
const API = "";
const TG = window.Telegram?.WebApp;
const UID = TG?.initDataUnsafe?.user?.id || null;

/* ================== HTTP ================== */
async function post(path, data = {}) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: UID, ...data })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function get(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ================== STATE ================== */
const STATE = {
  wallet:{bx:0,ton:0,usdt:0},
  price:{buy:{},sell:{},spread:{}},

  async loadWallet(){
    const w = await get(`/state?uid=${UID}`);
    this.wallet = w;
    UI.renderWallet();
  },
  async loadPrice(){
    this.price = await get("/market/price");
    UI.renderPrices();
  },
  async loadAll(){
    await this.loadWallet();
    await this.loadPrice();
  }
};

/* ================== UI ================== */
const UI = {
  renderWallet(){
    bx.textContent   = STATE.wallet.bx.toFixed(4);
    ton.textContent  = STATE.wallet.ton.toFixed(4);
    usdt.textContent = STATE.wallet.usdt.toFixed(4);
  },
  renderPrices(){
    buyUSDT.textContent  = STATE.price.buy.usdt;
    sellUSDT.textContent = STATE.price.sell.usdt;
    buyTON.textContent   = STATE.price.buy.ton;
    sellTON.textContent  = STATE.price.sell.ton;
  },
  show(id){
    document.querySelectorAll(".section")
      .forEach(s=>s.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
  }
};

/* ================== MARKET ================== */
const MARKET = {
  mode:"buy",
  asset:"usdt",
  setMode(m){ this.mode=m; this.calc(); },
  setAsset(a){ this.asset=a; this.calc(); },
  calc(){
    const a=+amountInput.value||0;
    const p=this.mode==="buy"
      ? STATE.price.buy[this.asset]
      : STATE.price.sell[this.asset];
    total.textContent=(a*p).toFixed(6);
  },
  async confirm(){
    await post(`/market/${this.mode}`,{
      amount:+amountInput.value,
      asset:this.asset
    });
    await STATE.loadAll();
  }
};

/* ================== WALLET ================== */
const WALLET = {
  deposit(provider,amount){
    return post("/wallet/deposit",{provider,amount:+amount})
      .then(STATE.loadWallet);
  },
  withdraw(asset,amount,address){
    return post("/wallet/withdraw",{asset,amount:+amount,address})
      .then(STATE.loadWallet);
  }
};

/* ================== MINING (SERVER AUTH) ================== */
const MINING = {
  async start(asset){
    await post("/mining/start",{asset});
  },
  async stop(asset){
    await post("/mining/stop",{asset});
  },
  async claim(){
    await post("/mining/claim",{});
    await STATE.loadWallet();
  }
};

/* ================== AIRDROP ================== */
const AIRDROP = {
  async load(){
    this.state = await get(`/airdrop/state?uid=${UID}`);
    airdropProgress.textContent =
      `${this.state.completed}/${this.state.total}`;
    airdropClaim.disabled = !this.state.claimable;
  },
  async complete(id){
    await post("/airdrop/complete",{task_id:id});
    await this.load();
  },
  async claim(){
    await post("/airdrop/claim",{});
    await STATE.loadWallet();
    await this.load();
  }
};

/* ================== CASINO ================== */
const CASINO = {
  _t:0,
  async play(game,bet){
    const n=Date.now();
    if(n-this._t<1500) throw"COOLDOWN";
    this._t=n;
    const r=await post("/casino/play",{game,bet:+bet});
    await STATE.loadWallet();
    return r;
  }
};

/* ================== BOOT ================== */
document.addEventListener("DOMContentLoaded",async()=>{
  await STATE.loadAll();
  await AIRDROP.load();
});

/* ================== EXPOSE ================== */
window.App={
  show:UI.show,
  marketBuy:()=>MARKET.setMode("buy"),
  marketSell:()=>MARKET.setMode("sell"),
  marketAsset:a=>MARKET.setAsset(a),
  marketConfirm:()=>MARKET.confirm(),
  deposit:(p,a)=>WALLET.deposit(p,a),
  withdraw:(a,amt,addr)=>WALLET.withdraw(a,amt,addr),
  miningStart:a=>MINING.start(a),
  miningStop:a=>MINING.stop(a),
  miningClaim:()=>MINING.claim(),
  airdropTask:id=>AIRDROP.complete(id),
  airdropClaim:()=>AIRDROP.claim(),
  dice:b=>CASINO.play("dice",b),
  slots:b=>CASINO.play("slots",b),
  pvp:b=>CASINO.play("pvp",b),
  chicken:b=>CASINO.play("chicken",b),
  crash:b=>CASINO.play("crash",b)
};
