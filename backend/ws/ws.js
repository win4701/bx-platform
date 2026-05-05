"use strict";

/* =========================================================
   BLOXIO WS ENGINE — ULTRA REALTIME PRO
========================================================= */

const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const config = require("../config");

class WSEngine {

  constructor(server){

    this.wss = new WebSocket.Server({ server });

    this.clients = new Map();   // userId → Set(ws)
    this.channels = new Map();  // channel → Set(ws)

    this.init();
    this.heartbeat();

  }

  /* =========================================================
     INIT
  ========================================================= */

  init(){

    this.wss.on("connection",(ws,req)=>{

      ws.isAlive = true;

      ws.on("pong",()=> ws.isAlive = true);

      ws.on("message",(msg)=> this.handle(ws,msg));

      ws.on("close",()=> this.cleanup(ws));

      ws.on("error",()=> this.cleanup(ws));

    });

  }

  /* =========================================================
     AUTH (JWT SECURE)
  ========================================================= */

  authenticate(ws, token){

    try{

      const decoded = jwt.verify(
        token,
        config.security.jwtSecret
      );

      ws.userId = decoded.id;

      if(!this.clients.has(ws.userId)){
        this.clients.set(ws.userId,new Set());
      }

      this.clients.get(ws.userId).add(ws);

      ws.send(JSON.stringify({
        type:"auth_success"
      }));

    }catch{
      ws.send(JSON.stringify({ type:"auth_failed" }));
      ws.close();
    }

  }

  /* =========================================================
     HANDLE MESSAGES
  ========================================================= */

  handle(ws,msg){

    try{

      const data = JSON.parse(msg);

      switch(data.type){

        case "auth":
          this.authenticate(ws,data.token);
          break;

        case "subscribe":
          this.subscribe(ws,data.channel);
          break;

        case "unsubscribe":
          this.unsubscribe(ws,data.channel);
          break;

        case "ping":
          ws.send(JSON.stringify({type:"pong"}));
          break;

      }

    }catch{}

  }

  /* =========================================================
     CHANNEL SYSTEM
  ========================================================= */

  subscribe(ws,channel){

    if(!this.channels.has(channel)){
      this.channels.set(channel,new Set());
    }

    this.channels.get(channel).add(ws);

  }

  unsubscribe(ws,channel){

    const set = this.channels.get(channel);

    if(set) set.delete(ws);

  }

  /* =========================================================
     SEND TO USER
  ========================================================= */

  send(userId,payload){

    const set = this.clients.get(userId);
    if(!set) return;

    set.forEach(ws=>{
      if(ws.readyState === 1){
        ws.send(JSON.stringify(payload));
      }
    });

  }

  /* =========================================================
     BROADCAST
  ========================================================= */

  broadcast(payload){

    this.wss.clients.forEach(ws=>{
      if(ws.readyState === 1){
        ws.send(JSON.stringify(payload));
      }
    });

  }

  /* =========================================================
     CHANNEL BROADCAST
  ========================================================= */

  publish(channel,payload){

    const set = this.channels.get(channel);
    if(!set) return;

    set.forEach(ws=>{
      if(ws.readyState === 1){
        ws.send(JSON.stringify(payload));
      }
    });

  }

  /* =========================================================
     HEARTBEAT (ANTI DEAD CONNECTIONS)
  ========================================================= */

  heartbeat(){

    setInterval(()=>{

      this.wss.clients.forEach(ws=>{

        if(!ws.isAlive){
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();

      });

    }, config.ws.heartbeat || 30000);

  }

  /* =========================================================
     CLEANUP
  ========================================================= */

  cleanup(ws){

    /* remove user */
    if(ws.userId){
      const set = this.clients.get(ws.userId);
      if(set){
        set.delete(ws);
      }
    }

    /* remove from channels */
    this.channels.forEach(set=>{
      set.delete(ws);
    });

  }

}

module.exports = WSEngine;
