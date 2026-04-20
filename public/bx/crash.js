(() => {
"use strict";

if (window.BX_CASINO) return;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const RNG = {
  float:(a,b)=> Math.random()*(b-a)+a,
  int:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  pick:arr=> arr[Math.floor(Math.random()*arr.length)]
};

const CASINO = {

state:{
  game:null,
  playing:false,
  bet:10
},

// ================= INIT =================
init(){

  this.lobby = $("#casinoLobby");
  this.view  = $("#casinoGameView");

  if(!this.lobby) return;

  $$(".casino-game-card").forEach(el=>{
    el.onclick = ()=> this.open(el.dataset.game);
  });

  window.BX_CASINO = this;
},

// ================= NAV =================
open(game){
  this.state.game = game;
  this.lobby.classList.add("hidden");
  this.view.classList.remove("hidden");
  this.render();
},

close(){
  this.state.playing = false;
  this.view.classList.add("hidden");
  this.lobby.classList.remove("hidden");
},

// ================= UI =================
render(){

const g = this.state.game;

this.view.innerHTML = `
<div class="game-shell">
<button id="backBtn">←</button>
<h2>${g.toUpperCase()}</h2>

<div id="gameStage"></div>

<input id="betInput" type="number" value="${this.state.bet}">

<div id="gameControls">${this.controls(g)}</div>

<button id="playBtn">Play</button>
${g==="crash"?`<button id="cashoutBtn">Cashout</button>`:""}
</div>
`;

$("#backBtn").onclick = ()=> this.close();
$("#playBtn").onclick = ()=> this.play();

if(g==="crash"){
  $("#cashoutBtn").onclick = ()=> this.cashout();
  this.initCrash();
}

},

controls(g){

switch(g){

case "dice": return `<input id="diceTarget" type="range" min="5" max="95" value="50">`;

case "coinflip": return `
<select id="coinSide">
<option value="heads">Heads</option>
<option value="tails">Tails</option>
</select>`;

case "limbo": return `<input id="limboTarget" type="number" value="2">`;

case "crash": return `<input id="crashAuto" type="number" value="2">`;

case "hilo": return `<select id="hiloChoice">
<option value="high">High</option>
<option value="low">Low</option>
</select>`;

case "roulette": return `<input id="rouletteNum" type="number" min="0" max="36">`;

case "mines": return `<input id="minesCount" type="number" min="1" max="24" value="3">`;

default: return `<div class="game-note">Instant Game</div>`;
}

},

// ================= PLAY =================
play(){

if(this.state.playing) return;

const bet = Number($("#betInput").value);
if(!bet || bet<=0) return;

this.state.playing = true;

const g = this.state.game;

setTimeout(()=>{

switch(g){

case "dice": this.gameDice(bet); break;
case "coinflip": this.gameCoinflip(bet); break;
case "limbo": this.gameLimbo(bet); break;
case "plinko": this.gamePlinko(bet); break;
case "blackjack": this.gameBlackjack(bet); break;
case "hilo": this.gameHilo(bet); break;
case "slots": this.gameSlots(bet); break;
case "mines": this.gameMines(bet); break;
case "fruitparty": this.gameFruit(bet); break;
case "bananafarm": this.gameBanana(bet); break;
case "airboss": this.gameAir(bet); break;
case "roulette": this.gameRoulette(bet); break;

}

}, 400);

},

// ================= GAMES =================

// DICE
gameDice(bet){
const target = Number($("#diceTarget").value);
const roll = RNG.float(0,100);
const win = roll < target;
const payout = bet * (100/target);
this.finish(win,payout,roll.toFixed(2));
},

// COINFLIP
gameCoinflip(bet){
const side = $("#coinSide").value;
const r = RNG.pick(["heads","tails"]);
this.finish(r===side, bet*2, r);
},

// LIMBO
gameLimbo(bet){
const target = Number($("#limboTarget").value);
const result = RNG.float(1,10);
this.finish(result>=target, bet*target, result.toFixed(2)+"x");
},

// CRASH
initCrash(){
$("#gameStage").innerHTML = `<div id="gameMultiplier">1.00x</div>`;
},

startCrash(){

this.crashRunning = true;
let m = 1;

const loop = ()=>{

if(!this.crashRunning) return;

m += m*0.02;
$("#gameMultiplier").innerText = m.toFixed(2)+"x";

if(Math.random() < 0.015*m){
this.crashRunning = false;
this.finish(false,0,m.toFixed(2));
return;
}

requestAnimationFrame(loop);
};

loop();
},

cashout(){
if(!this.crashRunning) return;
this.crashRunning=false;

const m = parseFloat($("#gameMultiplier").innerText);
this.finish(true, this.state.bet*m, m.toFixed(2));
},

// PLINKO
gamePlinko(bet){
const mult = RNG.pick([0.5,1,2,3,5,10]);
this.finish(mult>1, bet*mult, mult+"x");
},

// BLACKJACK
gameBlackjack(bet){
const p = RNG.int(16,23);
const d = RNG.int(16,23);
const win = p<=21 && (p>d || d>21);
this.finish(win, bet*2, `${p} vs ${d}`);
},

// HILO
gameHilo(bet){
const c1 = RNG.int(1,13);
const c2 = RNG.int(1,13);
const choice = $("#hiloChoice").value;
const win = choice==="high"?c2>c1:c2<c1;
this.finish(win, bet*2, `${c1} → ${c2}`);
},

// SLOTS
gameSlots(bet){
const reels = ["🍒","🍋","💎","7"];
const r = [RNG.pick(reels),RNG.pick(reels),RNG.pick(reels)];
const win = r[0]===r[1] && r[1]===r[2];
this.finish(win, bet*5, r.join(" "));
},

// MINES
gameMines(bet){
const mines = Number($("#minesCount").value);
const safe = Math.random() > mines/25;
const mult = 1 + mines*0.25;
this.finish(safe, bet*mult, mines+" mines");
},

// FRUIT
gameFruit(bet){
const mult = RNG.pick([0,2,4,8]);
this.finish(mult>0, bet*mult, mult+"x");
},

// BANANA
gameBanana(bet){
const mult = RNG.pick([0,1,3,6]);
this.finish(mult>1, bet*mult, mult+"x");
},

// AIRBOSS
gameAir(bet){
const m = RNG.float(1,5);
this.finish(m>2, bet*m, m.toFixed(2)+"x");
},

// ROULETTE
gameRoulette(bet){
const pickNum = Number($("#rouletteNum").value);
const spin = RNG.int(0,36);
const win = spin === pickNum;
this.finish(win, bet*35, spin);
},

// ================= RESULT =================
finish(win,payout,value){

this.state.playing=false;

$("#gameStage").innerHTML = `
<div style="font-size:26px;font-weight:1000">
${win?"WIN":"LOSE"}
</div>
<div>${value}</div>
`;

console.log(win ? "WIN "+payout : "LOSE");

}

};

document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();
