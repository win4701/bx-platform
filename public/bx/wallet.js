// ===============================
// BX WALLET (NEW SYSTEM)
// ===============================

window.WALLET = {

  balances: {},
  initialized: false,

  // ================= INIT =================
  async init(){

    if (this.initialized) return;

    console.log("BX Wallet init");

    this.bindUI();
    await this.load();

    this.initialized = true;
  },

  // ================= LOAD =================
  async load(){

    const data = await safeFetch("/finance/wallet");

    if (!data){
      console.error("Wallet load failed");
      return;
    }

    console.log("Wallet API:", data);

    this.balances = this.normalize(data);

    this.render();
  },

  // ================= NORMALIZE =================
  normalize(data){

    const result = {};

    Object.keys(data).forEach(k=>{
      result[k.toUpperCase()] = Number(data[k]);
    });

    return result;
  },

  // ================= RENDER =================
  render(){

    const supported = [
      "BX","USDT","USDC","BTC","BNB",
      "ETH","AVAX","ZEC","TON","SOL","LTC"
    ];

    supported.forEach(sym=>{

      const el = document.getElementById("bal-" + sym.toLowerCase());

      if (!el) return;

      const val = this.balances[sym] || 0;

      el.innerText = val.toFixed(4);

    });

  },

  // ================= REFRESH =================
  async refresh(){
    await this.load();
  },

  // ================= BINANCE =================
  async binance(){

    const amount = prompt("USDT amount");

    if (!amount) return;

    const res = await safeFetch("/payments/binance/create", {
      method:"POST",
      body:{
        amount:Number(amount),
        asset:"USDT"
      }
    });

    if (!res) return alert("Payment failed");

    const url =
      res.data?.checkoutUrl ||
      res.checkoutUrl ||
      res.url;

    if (url) window.open(url, "_blank");
  },

  // ================= CONNECT =================
  async connect(){

    try{

      // TON
      if (window.TON_CONNECT_UI){

        const ton = new TON_CONNECT_UI.TonConnectUI({
          manifestUrl:"https://www.bloxio.online/tonconnect-manifest.json",
          buttonRootId:"walletConnectBtn"
        });

        ton.onStatusChange(w=>{
          if (!w) return;

          safeFetch("/finance/wallet/connect", {
            method:"POST",
            body:{
              type:"ton",
              address:w.account.address
            }
          });

        });

        return;
      }

      // EVM fallback
      const provider = new WalletConnectProvider.default({
        rpc:{
          1:"https://rpc.ankr.com/eth",
          56:"https://rpc.ankr.com/bsc"
        }
      });

      await provider.enable();

      const web3 = new Web3(provider);
      const acc = await web3.eth.getAccounts();

      await safeFetch("/finance/wallet/connect", {
        method:"POST",
        body:{
          type:"evm",
          address:acc[0]
        }
      });

      alert("Connected");

    }catch(e){
      alert("Connect failed");
    }

  },

  // ================= ACTIONS =================
  async deposit(){

    const res = await safeFetch("/finance/deposit/USDT");

    if (!res) return alert("Deposit failed");

    alert("Address:\n" + (res.address || res.deposit_address));
  },

  async withdraw(){

    const amount = prompt("Amount");
    const address = prompt("Address");

    if (!amount || !address) return;

    const res = await safeFetch("/finance/withdraw", {
      method:"POST",
      body:{
        asset:"USDT",
        amount:parseFloat(amount),
        address
      }
    });

    if (!res) return alert("Withdraw failed");

    alert("Withdraw sent");

    this.refresh();
  },

  async transfer(){

    const user = document.getElementById("transferTelegram").value;
    const amount = Number(document.getElementById("transferAmount").value);

    if (!user || !amount) return;

    const res = await safeFetch("/finance/transfer", {
      method:"POST",
      body:{
        to_user:user,
        asset:"BX",
        amount
      }
    });

    if (!res) return alert("Transfer failed");

    alert("Transfer OK");

    this.refresh();
  },

  // ================= UI =================
  bindUI(){

    // Deposit
    const d = document.querySelector(".wallet-actions .primary");
    if (d) d.onclick = ()=>this.deposit();

    // Withdraw
    const w = document.querySelectorAll(".wallet-actions .btn")[1];
    if (w) w.onclick = ()=>this.withdraw();

    // Transfer
    const t = document.querySelector(".wallet-transfer .confirm");
    if (t) t.onclick = ()=>this.transfer();

    // Binance
    const b = document.getElementById("binanceConnectBtn");
    if (b) b.onclick = ()=>this.binance();

    // WalletConnect
    const wc = document.getElementById("walletConnectBtn");
    if (wc) wc.onclick = ()=>this.connect();

  }

};
