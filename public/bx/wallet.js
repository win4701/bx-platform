/* =========================================================
   BX WALLET ULTRA (BINANCE STYLE + REAL + STABLE)
========================================================= */

window.WALLET = {

  balances:{},
  initialized:false,
  loading:false,

  /* ================= INIT ================= */

  async init(){

    if(this.initialized) return;

    console.log("💰 WALLET ULTRA INIT");

    this.bindUI();
    await this.load();

    this.autoRefresh();

    this.initialized = true;
  },

  /* ================= LOAD ================= */

  async load(){

    if(this.loading) return;

    this.loading = true;

    try{

      const data = await safeFetch("/finance/wallet");

      if(!data){
        this.showError("API ERROR");
        return;
      }

      this.balances = this.normalize(data);

      this.render();

    }catch(e){
      console.error(e);
      this.showError("LOAD FAILED");
    }

    this.loading = false;
  },

  /* ================= NORMALIZE ================= */

  normalize(data){

    const result = {};

    Object.keys(data).forEach(k=>{

      const sym = k.toUpperCase();
      const val = data[k];

      if(typeof val === "number"){
        result[sym] = { free: val, locked:0 };
      } else {
        result[sym] = {
          free: Number(val.free || 0),
          locked: Number(val.locked || 0)
        };
      }

    });

    return result;
  },

  /* ================= RENDER ================= */

  render(){

    const supported = [
      "BX","USDT","USDC","BTC","BNB",
      "ETH","AVAX","ZEC","TON","SOL","LTC"
    ];

    let totalUSDT = 0;

    supported.forEach(sym=>{

      const el = document.getElementById("bal-"+sym.toLowerCase());
      if(!el) return;

      const bal = this.balances[sym]?.free || 0;

      el.innerText = this.format(bal);

      // fake conversion (تقدر تربطها market)
      if(sym === "USDT") totalUSDT += bal;
      if(sym === "BX") totalUSDT += bal * 45;

    });

    // total balance (اختياري لو عندك element)
    const totalEl = document.getElementById("totalBalance");
    if(totalEl){
      totalEl.innerText = "$" + totalUSDT.toFixed(2);
    }

  },

  /* ================= FORMAT ================= */

  format(n){

    if(n >= 1) return n.toFixed(4);
    if(n >= 0.01) return n.toFixed(6);

    return n.toFixed(8);
  },

  /* ================= AUTO REFRESH ================= */

  autoRefresh(){

    setInterval(()=>{
      this.load();
    },4000);

  },

  /* ================= ERROR ================= */

  showError(msg){
    console.warn("WALLET:", msg);
  },

  /* ================= DEPOSIT ================= */

  async deposit(){

    const asset = prompt("Asset (USDT/BTC/ETH)");

    if(!asset) return;

    const res = await safeFetch(`/finance/deposit/${asset}`);

    if(!res){
      alert("Deposit failed");
      return;
    }

    alert("Address:\n"+res.address);
  },

  /* ================= WITHDRAW ================= */

  async withdraw(){

    const asset = prompt("Asset");
    const amount = prompt("Amount");
    const address = prompt("Address");

    if(!asset || !amount || !address) return;

    const res = await safeFetch("/finance/withdraw",{
      method:"POST",
      body: JSON.stringify({
        asset,
        amount:Number(amount),
        address
      })
    });

    if(!res){
      alert("Withdraw failed");
      return;
    }

    alert("Withdraw sent");

    this.load();
  },

  /* ================= TRANSFER ================= */

  async transfer(){

    const user = document.getElementById("transferTelegram")?.value;
    const amount = Number(document.getElementById("transferAmount")?.value);

    if(!user || !amount) return;

    const res = await safeFetch("/finance/transfer",{
      method:"POST",
      body: JSON.stringify({
        to_user:user,
        asset:"BX",
        amount
      })
    });

    if(!res){
      alert("Transfer failed");
      return;
    }

    alert("Transfer OK");

    this.load();
  },

  /* ================= BINANCE PAY ================= */

  async binancePay(){

    const amount = prompt("USDT amount");

    if(!amount) return;

    const res = await safeFetch("/payments/binance/create",{
      method:"POST",
      body: JSON.stringify({
        amount:Number(amount),
        asset:"USDT"
      })
    });

    if(!res){
      alert("Payment failed");
      return;
    }

    const url = res.checkoutUrl || res.url;

    if(url){
      window.open(url,"_blank");
    }

  },

  /* ================= WALLET CONNECT ================= */

  async connect(){

    try{

      if(window.ethereum){

        const acc = await window.ethereum.request({
          method:"eth_requestAccounts"
        });

        await safeFetch("/finance/wallet/connect",{
          method:"POST",
          body: JSON.stringify({
            type:"evm",
            address:acc[0]
          })
        });

        alert("Connected");

      } else {
        alert("No wallet found");
      }

    }catch(e){
      console.error(e);
      alert("Connect failed");
    }

  },

  /* ================= UI ================= */

  bindUI(){

    document.querySelector(".wallet-actions .primary")
      ?.addEventListener("click",()=>this.deposit());

    document.querySelectorAll(".wallet-actions .btn")[1]
      ?.addEventListener("click",()=>this.withdraw());

    document.querySelector(".wallet-transfer .confirm")
      ?.addEventListener("click",()=>this.transfer());

    document.getElementById("binanceConnectBtn")
      ?.addEventListener("click",()=>this.binancePay());

    document.getElementById("walletConnectBtn")
      ?.addEventListener("click",()=>this.connect());

  }

};
