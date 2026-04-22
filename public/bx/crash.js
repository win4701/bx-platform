/* =========================================================
   BLOXIO CASINO — ULTRA SINGLE FILE ARCHITECTURE
   core + games + ui (merged)
========================================================= */

(() => {
"use strict";

if(window.BX_CASINO) return;

/* =========================================================
   CORE LAYER (ENGINE / STATE / EVENTS)
========================================================= */

const CORE = {

state:{
  game:null,
  bet:10,
  running:false,
  balance:1000,
  history:[]
},

RNG:{
  float:(a,b)=> Math.random()*(b-a)+a,
  int:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  pick:a=> a[Math.floor(Math.random()*a.length)]
},

edge:0.98,

setGame(g){
  this.state.game = g;
},

setRunning(v){
  this.state.running = v;
},

result(win,data){

  this.state.history.unshift({win,data});

  UI.showResult(win,data);

}

};

/* =========================================================
   GAMES LAYER (REAL LOGIC PER GAME)
========================================================= */

const GAMES = {

/* ================= CRASH ================= */

crash:{

start(){

CORE.setRunning(true);

let m = 1;
let speed = 0.02;

const loop = ()=>{

if(!CORE.state.running) return;

m += m*speed;

if(m>2) speed=0.03;
if(m>5) speed=0.05;

UI.updateCrash(m);

if(Math.random()<0.01*m){
CORE.setRunning(false);
CORE.result(false,m);
return;
}

requestAnimationFrame(loop);

};

loop();

},

cash(){

if(!CORE.state.running) return;

CORE.setRunning(false);

const m = UI.getCrash();
CORE.result(true,m);

}

},

/* ================= DICE ================= */

dice(){

const t = UI.get("target");
const roll = CORE.RNG.float(0,100);

const payout = (100/t)*CORE.edge;

CORE.result(roll<t,{roll,payout});

},

/* ================= LIMBO ================= */

limbo(){

const t = UI.get("target");
const r = (1/Math.random())*CORE.edge;

CORE.result(r>=t,r);

},

/* ================= COIN ================= */

coin(){

const s = UI.get("side");
const r = CORE.RNG.pick(["heads","tails"]);

CORE.result(r===s,r);

},

/* ================= PLINKO ================= */

plinko(){

const m = CORE.RNG.pick([0.5,1,2,5,10]);

CORE.result(m>1,m);

},

/* ================= BLACKJACK ================= */

blackjack(){

const p = CORE.RNG.int(16,23);
const d = CORE.RNG.int(16,23);

CORE.result(p<=21&&(p>d||d>21),`${p} vs ${d}`);

},

/* ================= HILO ================= */

hilo(){

const a = CORE.RNG.int(1,13);
const b = CORE.RNG.int(1,13);
const c = UI.get("choice");

CORE.result(c==="high"?b>a:b<a,`${a}->${b}`);

},

/* ================= SLOTS ================= */

slots(){

const r=[
CORE.RNG.pick(["🍒","💎","7"]),
CORE.RNG.pick(["🍒","💎","7"]),
CORE.RNG.pick(["🍒","💎","7"])
];

UI.setSlots(r);

CORE.result(r[0]===r[1]&&r[1]===r[2],r.join(" "));

},

/* ================= MINES ================= */

mines(){

const safe = Math.random()>0.3;

CORE.result(safe,"grid");

},

/* ================= FRUIT ================= */

fruit(){

const m = CORE.RNG.pick([0,2,5,10]);

CORE.result(m>0,m);

},

/* ================= BANANA ================= */

banana(){

const m = CORE.RNG.pick([0,1,3,6]);

CORE.result(m>1,m);

},

/* ================= ROULETTE ================= */

roulette(){

const p = UI.get("num");
const r = CORE.RNG.int(0,36);

CORE.result(p===r,r);

}

};

/* =========================================================
   UI LAYER (RENDER + DOM)
========================================================= */

const UI = {

init(){

this.lobby = document.getElementById("casinoLobby");
this.view  = document.getElementById("casinoGameView");

document.querySelectorAll(".casino-game-card").forEach(c=>{
  c.onclick = ()=> this.open(c.dataset.game);
});

},

open(g){

CORE.setGame(g);

this.lobby.classList.add("hidden");
this.view.classList.remove("hidden");

this.render(g);

},

close(){

CORE.setRunning(false);

this.view.classList.add("hidden");
this.lobby.classList.remove("hidden");

},

render(g){

switch(g){

case "crash": return this.crash();
case "dice": return this.dice();
case "limbo": return this.limbo();
case "coinflip": return this.coin();
case "plinko": return this.simple("Plinko",()=>GAMES.plinko());
case "blackjack": return this.simple("Blackjack",()=>GAMES.blackjack());
case "hilo": return this.hilo();
case "slots": return this.slots();
case "mines": return this.simple("Mines",()=>GAMES.mines());
case "fruitparty": return this.simple("Fruit",()=>GAMES.fruit());
case "bananafarm": return this.simple("Banana",()=>GAMES.banana());
case "roulette": return this.roulette();

}

},

/* ================= UI TEMPLATES ================= */

base(title,body){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>
<h2>${title}</h2>
${body}
</div>
`;

document.getElementById("back").onclick=()=>this.close();

},

simple(title,action){

this.base(title,`
<button id="play">Play</button>
`);

document.getElementById("play").onclick=action;

},

/* ================= CRASH UI ================= */

crash(){

this.base("Crash",`
<div id="multiplier">1.00x</div>
<button id="play">Start</button>
<button id="cash">Cashout</button>
`);

document.getElementById("play").onclick=()=>GAMES.crash.start();
document.getElementById("cash").onclick=()=>GAMES.crash.cash();

},

updateCrash(m){
document.getElementById("multiplier").innerText=m.toFixed(2)+"x";
},

getCrash(){
return parseFloat(document.getElementById("multiplier").innerText);
},

/* ================= DICE UI ================= */

dice(){

this.base("Dice",`
<input id="target" type="range" min="5" max="95" value="50">
<button id="play">Roll</button>
`);

document.getElementById("play").onclick=()=>GAMES.dice();

},

/* ================= LIMBO ================= */

limbo(){

this.base("Limbo",`
<input id="target" value="2">
<button id="play">Play</button>
`);

document.getElementById("play").onclick=()=>GAMES.limbo();

},

/* ================= COIN ================= */

coin(){

this.base("Coin",`
<select id="side">
<option>heads</option>
<option>tails</option>
</select>
<button id="play">Flip</button>
`);

document.getElementById("play").onclick=()=>GAMES.coin();

},

/* ================= HILO ================= */

hilo(){

this.base("HiLo",`
<select id="choice">
<option>high</option>
<option>low</option>
</select>
<button id="play">Play</button>
`);

document.getElementById("play").onclick=()=>GAMES.hilo();

},

/* ================= SLOTS ================= */

slots(){

this.base("Slots",`
<div id="slots">🎰🎰🎰</div>
<button id="play">Spin</button>
`);

document.getElementById("play").onclick=()=>GAMES.slots();

},

setSlots(r){
document.getElementById("slots").innerText=r.join("");
},

/* ================= ROULETTE ================= */

roulette(){

this.base("Roulette",`
<input id="num" min="0" max="36">
<button id="play">Spin</button>
`);

document.getElementById("play").onclick=()=>GAMES.roulette();

},

/* ================= HELPERS ================= */

get(id){
return document.getElementById(id).value;
},

showResult(win,data){

this.view.insertAdjacentHTML("beforeend",`
<div class="result ${win?'win':'lose'}">
${win?'WIN':'LOSE'}<br>${JSON.stringify(data)}
</div>
`);

}

};

/* =========================================================
   BOOT
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{
  UI.init();
  window.BX_CASINO = {CORE,GAMES,UI};
});

})();
