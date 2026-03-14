const marketEngine = require("./engines/marketEngine");
const orderbookEngine = require("./engines/orderbookEngine");
const liquidityEngine = require("./engines/liquidityEngine");
const tradesFeed = require("./engines/tradesFeed");
const marketBot = require("./engines/marketBot");

const casinoEngine = require("./engines/casinoEngine");
const casinoAudit = require("./engines/casinoAudit");

const miningEngine = require("./engines/miningEngine");

function start(){

console.log("SYSTEM BOTS STARTING");

/* ================= MARKET ================= */

marketEngine.start();
orderbookEngine.start();
liquidityEngine.start();
tradesFeed.start();
marketBot.start();

/* ================= CASINO ================= */

casinoEngine.start();
casinoAudit.start();

/* ================= MINING ================= */

miningEngine.start();

console.log("SYSTEM BOTS RUNNING");

}

module.exports = { start };
