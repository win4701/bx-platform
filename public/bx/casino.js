/* =========================================================
   BLOXIO CASINO — ULTRA SINGLE FILE ARCHITECTURE
   core + games + ui (merged)
========================================================= */

(() => {
"use strict";

if(window.BX_CASINO) return ;

 /* =========================================================
   CORE LAYER — CLEAN VERSION (FIXED)
========================================================= */

const CORE = {

state:{
  game:null,
  bet:10,
  running:false,
  balance:1000,
  history:[]
},

/* ================= RNG ================= */

RNG:{
  float:(a,b)=> Math.random()*(b-a)+a,
  int:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  pick:a=> a[Math.floor(Math.random()*a.length)]
},

edge:0.98,

/* ================= STATE ================= */

setGame(g){
  this.state.game = g;
},

setRunning(v){
  this.state.running = v;
},

/* ================= RESULT ENGINE ================= */

result(win,data){

  // save history
  this.pushHistory(win,data);

  // UI output
  UI.showResult(win,data);

},

/* ================= HISTORY ================= */

pushHistory(win,data){

  this.state.history.unshift({
    win,
    data,
    time:Date.now()
  });

  if(this.state.history.length > 20){
    this.state.history.pop();
  }

  this.renderHistory();

},

renderHistory(){

  const el = document.getElementById("casinoTickerTrack");
  if(!el) return;

  el.innerHTML = this.state.history.map(h=>`
    <div class="${h.win?'win':'lose'}">
      ${typeof h.data === "object"
        ? JSON.stringify(h.data)
        : h.data}
    </div>
  `).join("");

},

/* ================= LIVE STATS ================= */

startStats(){

  setInterval(()=>{

    const online = document.getElementById("casinoOnlineText");
    const volume = document.getElementById("casinoVolumeText");

    if(online) online.innerText = this.RNG.int(120,450);
    if(volume) volume.innerText = this.RNG.int(1000,9000)+" BX";

  },2000);

},

/* ================= BIG WINS ================= */

startBigWins(){

  const container = document.getElementById("bigWinsTrack");
  if(!container) return;

  setInterval(()=>{

    const val = this.RNG.float(5,200).toFixed(2)+"x";

    const el = document.createElement("div");
    el.className = "win";
    el.innerText = val;

    container.prepend(el);

    if(container.children.length > 10){
      container.removeChild(container.lastChild);
    }

  },2500);

},

/* ================= INIT ================= */

init(){

  this.startStats();
  this.startBigWins();

  console.log("🔥 CORE READY");

}

};  

/* =========================================================
   GAMES — AAA LOGIC SYSTEM
========================================================= */

const GAMES = {

/* ================= CRASH (AAA MODEL) ================= */

crash:{

start(){

CORE.setRunning(true);

let m = 1;
let velocity = 0.02;

const loop = ()=>{

if(!CORE.state.running) return;

// acceleration curve
velocity += 0.0008;
m += m * velocity;

UI.updateCrash(m);

// dynamic crash curve (real feeling)
const crashPoint = Math.exp(Math.random() * 3);

if(m >= crashPoint){
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
CORE.result(true, UI.getCrash());

}

},

/* ================= DICE (TRUE RTP) ================= */

dice(){

const target = Number(UI.get("target"));

// probability
const chance = target / 100;

// RTP control
const payout = (1 / chance) * CORE.edge;

const roll = CORE.RNG.float(0,100);

const win = roll < target;

CORE.result(win,{
roll: roll.toFixed(2),
chance: (chance*100).toFixed(2)+"%",
payout: payout.toFixed(2)+"x"
});

},

/* ================= LIMBO (REAL FORMULA) ================= */

limbo(){

const target = Number(UI.get("target"));

// exponential distribution
const r = Math.floor((100 / (Math.random()*100 + 1)) * CORE.edge) / 10;

const win = r >= target;

CORE.result(win, r.toFixed(2)+"x");

},

/* ================= COIN (FAIR) ================= */

coin(){

const seed = Math.random();
const result = seed > 0.5 ? "heads" : "tails";

const choice = UI.get("side");

CORE.result(result === choice, result);

},

/* ================= PLINKO (WEIGHTED) ================= */

plinko(){

const weights = [
  {m:0.5,w:40},
  {m:1,w:30},
  {m:2,w:15},
  {m:5,w:10},
  {m:10,w:5}
];

const total = weights.reduce((a,b)=>a+b.w,0);
let r = Math.random()*total;

for(const item of weights){
  if(r < item.w){
    CORE.result(item.m>1,item.m+"x");
    return;
  }
  r -= item.w;
}

},

/* ================= BLACKJACK (REAL ENGINE) ================= */

blackjack(){

const deck = [];

for(let i=1;i<=13;i++){
  for(let j=0;j<4;j++){
    deck.push(i>10?10:i);
  }
}

const draw = ()=> deck.splice(CORE.RNG.int(0,deck.length-1),1)[0];

let player = [draw(),draw()];
let dealer = [draw(),draw()];

const sum = a=> a.reduce((s,v)=>s+v,0);

// player logic
while(sum(player) < 17){
  player.push(draw());
}

// dealer logic
while(sum(dealer) < 17){
  dealer.push(draw());
}

const ps = sum(player);
const ds = sum(dealer);

const win = ps<=21 && (ps>ds || ds>21);

CORE.result(win,{
player:ps,
dealer:ds
});

},

/* ================= HILO (CHAIN LOGIC) ================= */

hilo(){

let a = CORE.RNG.int(1,13);
let b = CORE.RNG.int(1,13);

const choice = UI.get("choice");

const win = choice === "high" ? b > a : b < a;

CORE.result(win,`${a} → ${b}`);

},

/* ================= SLOTS (REELS SYSTEM) ================= */

slots(){

const reels = [
["🍒","🍒","💎","7"],
["🍒","💎","💎","7"],
["🍒","💎","7","7"]
];

const spin = reels.map(r=> r[CORE.RNG.int(0,r.length-1)]);

UI.setSlots(spin);

// payout table
const key = spin.join("");

let payout = 0;

if(key === "7 7 7") payout = 10;
else if(spin[0]===spin[1] && spin[1]===spin[2]) payout = 5;
else if(spin.includes("💎")) payout = 2;

CORE.result(payout>0, payout+"x");

},

/* ================= MINES (GRID ENGINE) ================= */

mines(){

const size = 25;
const minesCount = 5;

let grid = Array(size).fill("safe");

for(let i=0;i<minesCount;i++){
  let index;
  do{
    index = CORE.RNG.int(0,size-1);
  }while(grid[index]==="mine");
  grid[index] = "mine";
}

// simulate click
const pick = CORE.RNG.int(0,size-1);

const win = grid[pick] !== "mine";

CORE.result(win, win ? "safe" : "💣");

},

/* ================= FRUIT ================= */

fruit(){

const table = [0,0,2,5,10];

const r = CORE.RNG.pick(table);

CORE.result(r>0,r+"x");

},

/* ================= BANANA ================= */

banana(){

const growth = CORE.RNG.float(0,6);

const win = growth > 2;

CORE.result(win, growth.toFixed(2)+"x");

},

/* ================= ROULETTE (EUROPEAN) ================= */

roulette(){

const spin = CORE.RNG.int(0,36);

const pick = Number(UI.get("num"));

const win = spin === pick;

CORE.result(win,{
spin,
payout: win ? "36x" : "0"
});

},
   
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
}; 

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
  CORE.init();
});

})();
