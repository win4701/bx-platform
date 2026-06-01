/* =========================================================
   FILE: server/websocket/index.js
   BLOXIO WebSocket Gateway
========================================================= */

module.exports=function(io){

const market=require("./market");
const casino=require("./casino");
const mining=require("./mining");
const wallet=require("./wallet");
const airdrop=require("./airdrop");
const system=require("./system");

market(io);
casino(io);
mining(io);
wallet(io);
airdrop(io);
system(io);

console.log(
"✅ BLOXIO WEBSOCKET READY"
);

};
