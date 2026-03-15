"use strict"

/* ===============================
ENGINES
=============================== */

const matchingEngine = require("./engines/matchingEngine")
const liquidityEngine = require("./engines/liquidityEngine")
const candleEngine = require("./engines/candleEngine")
const marketBot = require("./engines/marketBot")
const miningEngine = require("./engines/miningEngine")

/* ===============================
SERVICES
=============================== */

const depositWatcher = require("./services/depositWatcher")

/* ===============================
STATE
=============================== */

let started = false

/* ===============================
SAFE START
=============================== */

function safeStart(name, fn){

try{

fn()

console.log("✓",name,"started")

}catch(e){

console.error("✗",name,"failed:",e)

}

}

/* ===============================
MARKET SYSTEM
=============================== */

function startMarket(){

safeStart("Matching Engine", ()=>{

matchingEngine.startMatching()

})

safeStart("Liquidity Engine", ()=>{

liquidityEngine.startLiquidity()

})

safeStart("Candle Engine", ()=>{

candleEngine.start()

})

safeStart("Market Bot", ()=>{

marketBot.startBot()

})

}

/* ===============================
MINING SYSTEM
=============================== */

function startMining(){

safeStart("Mining Engine", ()=>{

miningEngine.startMiningScheduler()

})

}

/* ===============================
DEPOSIT SYSTEM
=============================== */

function startDeposits(){

safeStart("Deposit Watcher", ()=>{

depositWatcher.startWatcher()

})

}

/* ===============================
HEALTH MONITOR
=============================== */

function startHealthMonitor(){

setInterval(()=>{

console.log("System heartbeat", new Date().toISOString())

},60000)

}

/* ===============================
MAIN START
=============================== */

function start(){

if(started){

console.log("SystemBots already running")

return

}

started = true

console.log("================================")
console.log("Starting BLOXIO SYSTEM BOTS")
console.log("================================")

/* MARKET */

startMarket()

/* MINING */

startMining()

/* DEPOSITS */

startDeposits()

/* MONITOR */

startHealthMonitor()

console.log("================================")
console.log("All engines started")
console.log("================================")

}

/* ===============================
STOP SYSTEM
=============================== */

function stop(){

console.log("Stopping system bots")

process.exit()

}

module.exports = {

start,
stop

}
