/* =========================================================
   BLOXIO CASINO — COMPLETE SYSTEM (PRO STRUCTURE)
   12 GAMES / CLEAN ARCH / REAL LOGIC BASE
========================================================= */

(() => {
"use strict";

if(window.BX_CASINO) return;

/* ================= HELPERS ================= */

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const RNG = {
  float:(a,b)=> Math.random()*(b-a)+a,
  int:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  pick:a=> a[Math.floor(Math.random()*a.length)]
};

const EDGE = 0.98;

/* ================= MAIN ================= */

const CASINO = {

state:{
  current:null,
  running:false,
  bet:10
},

init(){

  this.lobby = $("#casinoLobby");
  this.view  = $("#casinoGameView");

  if(!this.lobby) return;

  this.bindLobby();

  window.BX_CASINO = this;
},

/* ================= NAV ================= */

bindLobby(){

  $$(".casino-game-card").forEach(card=>{
    card.onclick = ()=> this.open(card.dataset.game);
  });

},

open(game){

  this.state.current = game;

  this.lobby.classList.add("hidden");
  this.view.classList.remove("hidden");

  this.render();

},

close(){

  this.state.running = false;

  this.view.classList.add("hidden");
  this.lobby.classList.remove("hidden");

},

/* ================= RENDER ================= */

render(){

const g = this.state.current;

switch(g){

case "crash": return this.renderCrash();
case "dice": return this.renderDice();
case "limbo": return this.renderLimbo();
case "coinflip": return this.renderCoin();
case "plinko": return this.renderPlinko();
case "blackjack": return this.renderBlackjack();
case "hilo": return this.renderHilo();
case "slots": return this.renderSlots();
case "mines": return this.renderMines();
case "fruitparty": return this.renderFruit();
case "bananafarm": return this.renderBanana();
case "roulette": return this.renderRoulette();

}

},

/* =========================================================
   CRASH
========================================================= */

renderCrash(){

this.view.innerHTML = `
<div class="game crash">
<button id="back">←</button>
<h2>Crash</h2>

<div id="multiplier">1.00x</div>

<input id="bet" value="${this.state.bet}">
<button id="play">Start</button>
<button id="cash">Cashout</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.crashStart();
$("#cash").onclick = ()=>this.crashCash();

},

crashStart(){

this.state.running = true;

let m = 1;
let speed = 0.02;

const loop = ()=>{

if(!this.state.running) return;

m += m * speed;

if(m > 2) speed = 0.03;
if(m > 5) speed = 0.05;

$("#multiplier").innerText = m.toFixed(2)+"x";

if(Math.random() < 0.01 * m){
  this.state.running = false;
  this.result(false,m);
  return;
}

requestAnimationFrame(loop);

};

loop();
},

crashCash(){

if(!this.state.running) return;

this.state.running = false;

const m = parseFloat($("#multiplier").innerText);
this.result(true,m);

},

/* =========================================================
   DICE
========================================================= */

renderDice(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>

<input id="target" type="range" min="5" max="95" value="50">
<button id="play">Roll</button>

<div id="res"></div>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.dice();

},

dice(){

const t = Number($("#target").value);
const roll = RNG.float(0,100);

const payout = (100/t)*EDGE;

this.result(roll<t,{roll,payout});

},

/* =========================================================
   LIMBO
========================================================= */

renderLimbo(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>

<input id="target" value="2">
<button id="play">Play</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.limbo();

},

limbo(){

const t = Number($("#target").value);
const r = (1/Math.random())*EDGE;

this.result(r>=t,r);

},

/* =========================================================
   COIN
========================================================= */

renderCoin(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>

<select id="side">
<option>heads</option>
<option>tails</option>
</select>

<button id="play">Flip</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.coin();

},

coin(){

const s = $("#side").value;
const r = RNG.pick(["heads","tails"]);

this.result(r===s,r);

},

/* =========================================================
   PLINKO
========================================================= */

renderPlinko(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>
<button id="play">Drop</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.plinko();

},

plinko(){

const multipliers = [0.5,1,2,5,10];
const m = RNG.pick(multipliers);

this.result(m>1,m);

},

/* =========================================================
   BLACKJACK
========================================================= */

renderBlackjack(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>
<button id="play">Draw</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.blackjack();

},

blackjack(){

const p = RNG.int(16,23);
const d = RNG.int(16,23);

const win = p<=21 && (p>d || d>21);

this.result(win,`${p} vs ${d}`);

},

/* =========================================================
   HILO
========================================================= */

renderHilo(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>

<select id="choice">
<option>high</option>
<option>low</option>
</select>

<button id="play">Play</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.hilo();

},

hilo(){

const a = RNG.int(1,13);
const b = RNG.int(1,13);

const c = $("#choice").value;

this.result(c==="high"?b>a:b<a,`${a}→${b}`);

},

/* =========================================================
   SLOTS
========================================================= */

renderSlots(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>

<div id="slots">🎰🎰🎰</div>
<button id="play">Spin</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.slots();

},

slots(){

const reels = ["🍒","💎","7"];
const r = [RNG.pick(reels),RNG.pick(reels),RNG.pick(reels)];

$("#slots").innerText = r.join("");

this.result(r[0]===r[1]&&r[1]===r[2],r.join(" "));

},

/* =========================================================
   MINES
========================================================= */

renderMines(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>
<button id="play">Open</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.mines();

},

mines(){

const safe = Math.random()>0.3;

this.result(safe,"mine");

},

/* =========================================================
   FRUIT
========================================================= */

renderFruit(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>
<button id="play">Play</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.fruit();

},

fruit(){

const m = RNG.pick([0,2,5,10]);

this.result(m>0,m);

},

/* =========================================================
   BANANA
========================================================= */

renderBanana(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>
<button id="play">Play</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.banana();

},

banana(){

const m = RNG.pick([0,1,3,6]);

this.result(m>1,m);

},

/* =========================================================
   ROULETTE
========================================================= */

renderRoulette(){

this.view.innerHTML = `
<div class="game">
<button id="back">←</button>

<input id="num" min="0" max="36">
<button id="play">Spin</button>
</div>
`;

$("#back").onclick = ()=>this.close();
$("#play").onclick = ()=>this.roulette();

},

roulette(){

const p = Number($("#num").value);
const r = RNG.int(0,36);

this.result(p===r,r);

},

/* ================= RESULT ================= */

result(win,data){

this.view.insertAdjacentHTML("beforeend",`
<div class="result ${win?'win':'lose'}">
${win?'WIN':'LOSE'}<br>${JSON.stringify(data)}
</div>
`);

}

};

/* ================= BOOT ================= */

document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();
