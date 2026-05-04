"use strict";

const WebSocket = require("ws");

class WSEngine{

  constructor(server){

    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId → Set

    this.init();

  }

  init(){

    this.wss.on("connection", (ws, req)=>{

      ws.on("message",(msg)=>{
        this.handle(ws, msg);
      });

      ws.on("close",()=>{
        this.cleanup(ws);
      });

    });

  }

  /* =====================================================
     AUTH + REGISTER
  ===================================================== */

  handle(ws, msg){

    try{

      const data = JSON.parse(msg);

      if(data.type === "auth"){

        const userId = data.userId;

        ws.userId = userId;

        if(!this.clients.has(userId)){
          this.clients.set(userId, new Set());
        }

        this.clients.get(userId).add(ws);

        ws.send(JSON.stringify({
          type:"auth_success"
        }));

      }

    }catch{}

  }

  /* =====================================================
     SEND TO USER
  ===================================================== */

  send(userId, payload){

    const set = this.clients.get(userId);

    if(!set) return;

    set.forEach(ws=>{
      try{
        ws.send(JSON.stringify(payload));
      }catch{}
    });

  }

  /* =====================================================
     BROADCAST
  ===================================================== */

  broadcast(payload){

    this.wss.clients.forEach(ws=>{
      try{
        ws.send(JSON.stringify(payload));
      }catch{}
    });

  }

  /* =====================================================
     CLEANUP
  ===================================================== */

  cleanup(ws){

    const userId = ws.userId;

    if(!userId) return;

    const set = this.clients.get(userId);

    if(set){
      set.delete(ws);
    }

  }

}

module.exports = WSEngine;
