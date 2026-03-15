const marketBot = require("./engines/marketBot")
const miningEngine = require("./engines/miningEngine")
const depositWatcher = require("./services/depositWatcher")

let started = false

function startSystemBots(){

if(started) return

started = true

console.log("Starting Bloxio bots")

marketBot.start()
miningEngine.start()
depositWatcher.start()

console.log("Bots running")

}

module.exports = { startSystemBots }
