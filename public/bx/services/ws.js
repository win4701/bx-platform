/* =========================================================
   BLOXIO WS ENGINE — FINAL PRO MAX
========================================================= */

"use strict";

const WS_URL =
  location.origin.includes("localhost")
    ? "ws://localhost:3000/ws"
    : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

/* =========================================================
WS CORE
========================================================= */

window.WS = {

  socket: null,
  connected: false,
  connecting: false,

  queue: [],
  channels: new Set(),

  reconnectDelay: 2000,
  maxReconnectDelay: 15000,

  /* ================= CONNECT ================= */

  connect(){

    if(this.connected || this.connecting) return;

    const token = localStorage.getItem("token");

    if(!token){
      console.warn("WS: no token");
      return;
    }

    this.connecting = true;

    const url = `${WS_URL}?token=${token}`;

    try{

      this.socket = new WebSocket(url);

    }catch(e){
      console.error("WS INIT ERROR", e);
      this.retry();
      return;
    }

    this.bindSocket();

  },

  /* ================= BIND ================= */

  bindSocket(){

    this.socket.onopen = ()=>{

      console.log("🟢 WS CONNECTED");

      this.connected = true;
      this.connecting = false;

      this.reconnectDelay = 2000;

      this.flushQueue();
      this.resubscribe();

      this.emit("ws:connected");

    };

    this.socket.onclose = ()=>{

      console.warn("🔴 WS CLOSED");

      this.connected = false;
      this.connecting = false;

      this.emit("ws:disconnected");

      this.retry();

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

  /* ================= RETRY ================= */

  retry(){

    setTimeout(()=>{
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * 1.5,
      this.maxReconnectDelay
    );

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
      this.socket.send(this.queue.shift());
    }

  },

  /* ================= CHANNELS ================= */

  subscribe(channel){

    if(!channel) return;

    this.channels.add(channel);
    this.send("subscribe", { channel });

  },

  unsubscribe(channel){

    if(!channel) return;

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

      /* ===== WALLET ===== */
      case "wallet_update":

        if(window.API){
          API.syncWallet();
        }

        this.emit("wallet:update", data);
        break;

      /* ===== MINING ===== */
      case "mining_reward":

        this.emit("mining:reward", data);
        break;

      /* ===== MARKET ===== */
      case "market_price":

        this.emit("market:price", data);
        break;

      case "market_trade":

        this.emit("market:trade", data);
        break;

      /* ===== CASINO ===== */
      case "casino_result":

        this.emit("casino:result", data);
        break;

      /* ===== AIRDROP ===== */
      case "airdrop":

        this.emit("airdrop:update", data);
        break;

      /* ===== NOTIFICATION ===== */
      case "notification":

        this.emit("notify", data);
        console.log("🔔", data.message);
        break;

      default:
        console.warn("WS UNKNOWN:", data);
    }

  },

  /* ================= EVENT SYSTEM ================= */

  events: {},

  on(event, fn){

    if(!this.events[event]){
      this.events[event] = [];
    }

    this.events[event].push(fn);

  },

  emit(event, data){

    (this.events[event] || []).forEach(fn=>{
      try{ fn(data); }catch{}
    });

  },

  /* ================= CLOSE ================= */

  disconnect(){

    if(this.socket){
      this.socket.close();
    }

    this.connected = false;
    this.connecting = false;

  }

};
