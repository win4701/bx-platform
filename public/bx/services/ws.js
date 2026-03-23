// ===============================
// BX WEBSOCKET SERVICE
// ===============================

window.WS = {

  socket: null,
  connected: false,

  // ================= CONNECT =================
  connect(){

    if(this.connected) return;

    const url = location.origin.replace("http", "ws");

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("🟢 WS connected");
      this.connected = true;
    };

    this.socket.onclose = () => {
      console.log("🔴 WS disconnected");
      this.connected = false;

      // 🔁 auto reconnect
      setTimeout(()=> this.connect(), 3000);
    };

    this.socket.onerror = (e)=>{
      console.error("WS error", e);
    };

    this.socket.onmessage = (msg)=>{
      this.handle(JSON.parse(msg.data));
    };

  },

  // ================= HANDLE =================
  handle(data){

    if(!data?.type) return;

    switch(data.type){

      // ===== WALLET UPDATE =====
      case "wallet_update":

        STATE.set("wallet", data.wallet);

        break;

      // ===== MARKET PRICE =====
      case "price":

        STATE.set("market.price", data.price);

        break;

      // ===== BIG WIN =====
      case "big_win":

        console.log("🎉 BIG WIN:", data);

        break;

      // ===== AIRDROP =====
      case "airdrop":

        STATE.update("airdrop.reward", r => r + data.amount);

        break;

      default:
        console.warn("Unknown WS:", data);
    }

  },

  // ================= SEND =================
  send(type, payload = {}){

    if(!this.connected) return;

    this.socket.send(JSON.stringify({
      type,
      ...payload
    }));

  }

};
