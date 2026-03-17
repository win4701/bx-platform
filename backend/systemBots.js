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

/* =========================================
STATE
========================================= */

let started = false

/* =========================================
SAFE START WRAPPER
========================================= */

function safeStart(name, fn){

try{

fn()
console.log("✓",name,"started")

}catch(e){

console.error("❌",name,"failed:",e)

}

}

/* =========================================
LOOP PROTECTION
========================================= */

function safeInterval(name, fn, time){

setInterval(async()=>{

try{

await fn()

}catch(e){

console.error("Loop error:",name,e)

}

},time)

}

/* =========================================
START SYSTEM BOTS
========================================= */

function startSystemBots(){

if(started){
console.log("Bots already running")
return
}

started = true

console.log("🚀 Starting Bloxio System Bots...")

/* =========================================
MARKET CORE
========================================= */

safeStart("Matching Engine", ()=>{

startMatching()

})

safeStart("Market Bot", ()=>{

if(marketBot.start) marketBot.start()

})

safeStart("Liquidity Engine", ()=>{

if(liquidityEngine.start) liquidityEngine.start()

})

safeStart("Candle Engine", ()=>{

if(candleEngine.start) candleEngine.start()

})

safeStart("Trades Feed", ()=>{

if(tradesFeed.start) tradesFeed.start()

})

/* =========================================
CASINO
========================================= */

safeStart("Casino Engine", ()=>{

if(casinoEngine.start) casinoEngine.start()

})

/* =========================================
MINING
========================================= */

safeStart("Mining Engine", ()=>{

if(miningEngine.start) miningEngine.start()

})

/* =========================================
DEPOSITS
========================================= */

safeStart("Deposit Watcher", ()=>{

if(depositWatcher.startWatcher){
depositWatcher.startWatcher()
}

})

/* =========================================
HEARTBEAT
========================================= */

safeInterval("Heartbeat", async()=>{

console.log("💓 Bots running",new Date().toISOString())

},60000)

}

/* =========================================
EXPORT
========================================= */

module.exports = {
startSystemBots
}
