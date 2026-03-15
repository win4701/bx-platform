"use strict"

const marketBot = require("./engines/marketBot")
const liquidity = require("./engines/liquidityEngine")
const mining = require("./engines/miningEngine")
const deposits = require("./services/depositWatcher")

let started = false

function startSystemBots(){

if(started) return

started = true

console.log("Starting Bloxio bots")

try{
marketBot.start()
console.log("Market bot started")
}catch(e){}

try{
liquidity.start()
console.log("Liquidity engine started")
}catch(e){}

try{
mining.start()
console.log("Mining engine started")
}catch(e){}

try{
deposits.start()
console.log("Deposit watcher started")
}catch(e){}

console.log("All bots running")

}

module.exports = { startSystemBots }
