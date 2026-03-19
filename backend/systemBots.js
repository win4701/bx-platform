"use strict"

/* =========================================
IMPORT ENGINES
========================================= */

const { startMatching } = require("./engines/matchingEngine")
const marketBot = require("./engines/marketBot")
const liquidityEngine = require("./engines/liquidityEngine")
const candleEngine = require("./engines/candleEngine")
const tradesFeed = require("./engines/tradesFeed")

const miningEngine = require("./engines/miningEngine")
const casinoEngine = require("./engines/casinoEngine")

const depositWatcher = require("./services/depositWatcher")

/* 🔥 WS */
const wsHub = require("./wsHub")

/* =========================================
STATE
========================================= */

let started = false
const services = {}

/* =========================================
SAFE START + AUTO RESTART
========================================= */

function safeStart(name, fn){

  try{

    fn()

    services[name] = {
      status: "running",
      lastStart: Date.now()
    }

    console.log("✅", name, "started")

  }catch(e){

    console.error("❌", name, "failed:", e.message)

    services[name] = {
      status: "failed",
      error: e.message
    }

    /* 🔥 auto restart */
    setTimeout(()=>{

      console.log("🔄 Restarting", name)
      safeStart(name, fn)

    }, 5000)

  }

}

/* =========================================
SAFE LOOP
========================================= */

function safeInterval(name, fn, time){

  setInterval(async()=>{

    try{

      await fn()

    }catch(e){

      console.error("💥 Loop error:", name, e.message)

    }

  }, time)

}

/* =========================================
BROADCAST STATUS
========================================= */

function broadcastStatus(){

  wsHub.broadcast("system", {
    type: "system_status",
    services,
    time: Date.now()
  })

}

/* =========================================
START SYSTEM
========================================= */

function startSystemBots(){

  if(started){
    console.log("⚠️ Bots already running")
    return
  }

  started = true

  console.log("🚀 Starting Bloxio System Bots...")

  /* =========================================
  MARKET CORE
  ========================================= */

  safeStart("Matching Engine", ()=> startMatching())

  safeStart("Market Bot", ()=> marketBot.start && marketBot.start())

  safeStart("Liquidity Engine", ()=> liquidityEngine.start && liquidityEngine.start())

  safeStart("Candle Engine", ()=> candleEngine.start && candleEngine.start())

  safeStart("Trades Feed", ()=> tradesFeed.start && tradesFeed.start())

  /* =========================================
  CASINO
  ========================================= */

  safeStart("Casino Engine", ()=> casinoEngine.start && casinoEngine.start())

  /* =========================================
  MINING
  ========================================= */

  safeStart("Mining Engine", ()=> miningEngine.start && miningEngine.start())

  /* =========================================
  DEPOSITS
  ========================================= */

  safeStart("Deposit Watcher", ()=> {
    if(depositWatcher.startWatcher){
      depositWatcher.startWatcher()
    }
  })

  /* =========================================
  🔥 HEARTBEAT + WS
  ========================================= */

  safeInterval("Heartbeat", async()=>{

    console.log("💓 System alive")

    broadcastStatus()

  }, 10000)

  /* =========================================
  🔥 MARKET PUSH
  ========================================= */

  safeInterval("Market Broadcast", async()=>{

    wsHub.broadcast("market", {
      type:"tick",
      price: 45 + Math.random()
    })

  }, 1000)

  /* =========================================
  🔥 CASINO FEED
  ========================================= */

  safeInterval("Casino Feed", async()=>{

    wsHub.broadcast("casino", {
      type:"big_win",
      user:"bot_"+Math.floor(Math.random()*1000),
      amount:(Math.random()*50).toFixed(2)
    })

  }, 3000)

}

/* =========================================
GET STATUS (API)
========================================= */

function getSystemStatus(){
  return services
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  startSystemBots,
  getSystemStatus
                  }
