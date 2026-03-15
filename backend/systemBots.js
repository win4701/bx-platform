const marketBot = require("./engines/marketBot")
const miningEngine = require("./engines/miningEngine")
const depositWatcher = require("./services/depositWatcher")

let running = false

function startSystemBots(){

if(running) return

running = true

console.log("Starting Bloxio system bots")

try{

if(marketBot && marketBot.start){

marketBot.start()

console.log("Market bot started")

}

}catch(e){

console.error("Market bot error:",e)

}

try{

if(miningEngine && miningEngine.start){

miningEngine.start()

console.log("Mining engine started")

}

}catch(e){

console.error("Mining engine error:",e)

}

try{

if(depositWatcher && depositWatcher.start){

depositWatcher.start()

console.log("Deposit watcher started")

}

}catch(e){

console.error("Deposit watcher error:",e)

}

console.log("All bots started")

}

module.exports = {
startSystemBots
}
