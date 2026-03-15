const marketBot = require("./engines/marketBot")
const miningEngine = require("./engines/miningEngine")
const depositWatcher = require("./services/depositWatcher")

let running = false

function startSystemBots(){

if(running) return

running = true

console.log("Starting Bloxio system bots")

/* MARKET BOT */

try{

if(marketBot?.start){

marketBot.start()

console.log("Market bot started")

}

}catch(e){

console.error("Market bot error",e)

}

/* MINING ENGINE */

try{

if(miningEngine?.start){

miningEngine.start()

console.log("Mining engine started")

}

}catch(e){

console.error("Mining engine error",e)

}

/* DEPOSIT WATCHER */

try{

if(depositWatcher?.start){

depositWatcher.start()

console.log("Deposit watcher started")

}

}catch(e){

console.error("Deposit watcher error",e)

}

/* CASINO LOOP */

setInterval(()=>{

console.log("Casino system active")

},15000)

/* AIRDROP LOOP */

setInterval(()=>{

console.log("Airdrop system active")

},30000)

console.log("All Bloxio systems running")

}

module.exports = {
startSystemBots
}
