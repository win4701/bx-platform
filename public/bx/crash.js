/* =========================================================
   BLOXIO CASINO — ULTRA SINGLE FILE SYSTEM
   SIZE: LARGE / ALL-IN-ONE / NO SPLIT
========================================================= */

(() => {
"use strict";

if(window.BX_CASINO) return;

/* ================= CORE ================= */

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const RNG = {
  f:(a,b)=> Math.random()*(b-a)+a,
  i:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  p:a=> a[Math.floor(Math.random()*a.length)]
};

const EDGE = 0.98;

/* ================= MAIN ================= */

const CASINO = {

state:{
  game:null,
  bet:10,
  running:false,
  crashRun:false
},

init(){

  this.lobby = $("#casinoLobby");
  this.view  = $("#casinoGameView");

  if(!this.lobby) return;

  $$(".casino-game-card").forEach(c=>{
    c.onclick = ()=> this.open(c.dataset.game);
  });

  window.BX_CASINO = this;

},

/* ================= NAV ================= */

open(g){
  this.state.game = g;
  this.lobby.classList.add("hidden");
  this.view.classList.remove("hidden");
  this.render();
},

close(){
  this.state.running=false;
  this.state.crashRun=false;
  this.view.classList.add("hidden");
  this.lobby.classList.remove("hidden");
},

/* ================= RENDER ================= */

render(){

switch(this.state.game){

case "crash": return this.crashUI();
case "dice": return this.diceUI();
case "limbo": return this.limboUI();
case "coinflip": return this.coinUI();
case "plinko": return this.plinkoUI();
case "blackjack": return this.blackjackUI();
case "hilo": return this.hiloUI();
case "slots": return this.slotsUI();
case "mines": return this.minesUI();
case "fruitparty": return this.fruitUI();
case "bananafarm": return this.bananaUI();
case "roulette": return this.rouletteUI();

}

},

/* =========================================================
   CRASH
========================================================= */

crashUI(){

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

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.crashStart();
$("#cash").onclick=()=>this.crashCash();

},

crashStart(){

this.state.crashRun=true;

let m=1;
let speed=0.02;

const loop=()=>{

if(!this.state.crashRun) return;

m += m*speed;

if(m>2) speed=0.03;
if(m>5) speed=0.05;

$("#multiplier").innerText=m.toFixed(2)+"x";

if(Math.random()<0.01*m){
this.state.crashRun=false;
this.result(false,m);
return;
}

requestAnimationFrame(loop);

};

loop();
},

crashCash(){
if(!this.state.crashRun) return;
this.state.crashRun=false;
const m=parseFloat($("#multiplier").innerText);
this.result(true,m);
},

/* =========================================================
   DICE
========================================================= */

diceUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>

<input id="target" type="range" min="5" max="95" value="50">
<div id="res"></div>

<button id="play">ROLL</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.dice();

},

dice(){

const t=Number($("#target").value);
const roll=RNG.f(0,100);
const payout=(100/t)*EDGE;

this.result(roll<t,{roll,payout});

},

/* =========================================================
   LIMBO
========================================================= */

limboUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>

<input id="target" value="2">
<button id="play">Play</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.limbo();

},

limbo(){

const t=Number($("#target").value);
const r=(1/Math.random())*EDGE;

this.result(r>=t,r);

},

/* =========================================================
   COIN
========================================================= */

coinUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>

<select id="side">
<option>heads</option>
<option>tails</option>
</select>

<button id="play">Flip</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.coin();

},

coin(){

const s=$("#side").value;
const r=RNG.p(["heads","tails"]);

this.result(r===s,r);

},

/* =========================================================
   PLINKO
========================================================= */

plinkoUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>
<button id="play">Drop</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.plinko();

},

plinko(){

const m=RNG.p([0.5,1,2,5,10]);
this.result(m>1,m);

},

/* =========================================================
   BLACKJACK
========================================================= */

blackjackUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>
<button id="play">Draw</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.blackjack();

},

blackjack(){

const p=RNG.i(16,23);
const d=RNG.i(16,23);
this.result(p<=21&&(p>d||d>21),`${p} vs ${d}`);

},

/* =========================================================
   HILO
========================================================= */

hiloUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>

<select id="choice">
<option>high</option>
<option>low</option>
</select>

<button id="play">Play</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.hilo();

},

hilo(){

const a=RNG.i(1,13);
const b=RNG.i(1,13);
const c=$("#choice").value;

this.result(c==="high"?b>a:b<a,`${a}->${b}`);

},

/* =========================================================
   SLOTS
========================================================= */

slotsUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>

<div id="slots">🎰🎰🎰</div>
<button id="play">Spin</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.slots();

},

slots(){

const r=[RNG.p(["🍒","💎","7"]),RNG.p(["🍒","💎","7"]),RNG.p(["🍒","💎","7"])];
$("#slots").innerText=r.join("");
this.result(r[0]===r[1]&&r[1]===r[2],r.join(" "));

},

/* =========================================================
   MINES
========================================================= */

minesUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>
<button id="play">Open</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.mines();

},

mines(){

const safe=Math.random()>0.3;
this.result(safe,"mine");

},

/* =========================================================
   FRUIT
========================================================= */

fruitUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>
<button id="play">Play</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.fruit();

},

fruit(){

const m=RNG.p([0,2,5,10]);
this.result(m>0,m);

},

/* =========================================================
   BANANA
========================================================= */

bananaUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>
<button id="play">Play</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.banana();

},

banana(){

const m=RNG.p([0,1,3,6]);
this.result(m>1,m);

},

/* =========================================================
   ROULETTE
========================================================= */

rouletteUI(){

this.view.innerHTML=`
<div class="game">
<button id="back">←</button>

<input id="num" min="0" max="36">
<button id="play">Spin</button>
</div>
`;

$("#back").onclick=()=>this.close();
$("#play").onclick=()=>this.roulette();

},

roulette(){

const p=Number($("#num").value);
const r=RNG.i(0,36);
this.result(p===r,r);

},

/* ================= RESULT ================= */

result(win,val){

this.view.insertAdjacentHTML("beforeend",`
<div class="result ${win?'win':'lose'}">
${win?'WIN':'LOSE'}<br>${JSON.stringify(val)}
</div>
`);

}

};

document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();
