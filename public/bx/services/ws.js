/* =========================================================
   BX WEBSOCKET ENGINE (ULTRA FINAL PRO)
========================================================= */

const WS_URL = "wss://api.bloxio.online";

window.WS = {

  socket: null,
  connected: false,
  connecting: false,

  queue: [],
  channels: new Set(),

  reconnectDelay: 2000,

  /* ================= CONNECT ================= */

  connect(){

    if(this.connected || this.connecting) return;

    this.connecting = true;

    const token = localStorage.getItem("token");

    const url = token
      ? `${WS_URL}?token=${token}`
      : WS_URL;

    this.socket = new WebSocket(url);

    this.socket.onopen = ()=>{

      console.log("🟢 WS CONNECTED");

      this.connected = true;
      this.connecting = false;

      this.flushQueue();
      this.resubscribe();

    };

    this.socket.onclose = ()=>{

      console.log("🔴 WS CLOSED");

      this.connected = false;
      this.connecting = false;

      setTimeout(()=> this.connect(), this.reconnectDelay);

    };

    this.socket.onerror = (e)=>{
      console.warn("WS ERROR", e);
    };

    this.socket.onmessage = (msg)=>{

      try{
        const data = JSON.parse(msg.data);
        this.handle(data);
      }catch{
        console.warn("WS PARSE ERROR");
      }

    };

  },

  /* ================= SEND ================= */

  send(type, payload = {}){

    const message = JSON.stringify({
      type,
      ...payload
    });

    if(!this.connected){

      this.queue.push(message);

      return;
    }

    this.socket.send(message);
  },

  /* ================= QUEUE ================= */

  flushQueue(){

    while(this.queue.length){

      const msg = this.queue.shift();
      this.socket.send(msg);

    }

  },

  /* ================= CHANNEL ================= */

  subscribe(channel){

    this.channels.add(channel);

    this.send("subscribe", { channel });

  },

  unsubscribe(channel){

    this.channels.delete(channel);

    this.send("unsubscribe", { channel });

  },

  resubscribe(){

    this.channels.forEach(c=>{
      this.send("subscribe", { channel:c });
    });

  },

  /* ================= HANDLE ================= */

  handle(data){

    if(!data?.type) return;

    switch(data.type){

      case "wallet_update":

        STATE.set("wallet", data.wallet);
        break;

      case "market_price":

        STATE.set("market.price", data.price);
        break;

      case "market_trade":

        window.onMarketWS?.(data);
        break;

      case "casino_result":

        window.onCasinoWS?.(data);
        break;

      case "airdrop":

        STATE.update("airdrop.reward", r => r + data.amount);
        break;

      case "notification":

        console.log("🔔", data.message);
        break;

      default:
        console.warn("WS UNKNOWN:", data);
    }

  }

};
