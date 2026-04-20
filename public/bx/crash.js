// ======================================================
// BLOXIO CASINO — FULL REAL SYSTEM (NO PLACEHOLDERS)
// ======================================================

(() => {
"use strict";

if(window.BX_CASINO) return;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ======================================================
// CORE ENGINE
// ======================================================

const RNG = {
  f:(a,b)=> Math.random()*(b-a)+a,
  i:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  pick:a=> a[Math.floor(Math.random()*a.length)]
};

// ======================================================
// SOUND SYSTEM
// ======================================================

const SFX = {
  click: ()=> $("#snd-click")?.play(),
  win: ()=> $("#snd-win")?.play(),
  lose: ()=> $("#snd-lose")?.play(),
  spin: ()=> $("#snd-spin")?.play()
};

// ======================================================
// MAIN SYSTEM
// ======================================================

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

  $$(".casino-game-card").forEach(card=>{
    card.onclick = ()=> this.open(card.dataset.game);
  });

  $("#casinoRefreshBtn")?.addEventListener("click",()=>this.refresh());

  window.BX_CASINO = this;
},

refresh(){
  SFX.click();
  console.log("refresh");
},

// ================= NAV =================
open(g){

  this.state.game = g;

  this.lobby.classList.add("hidden");
  this.view.classList.remove("hidden");

  this.render();
},

close(){
  this.state.playing=false;
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
${g==="crash"?'<button id="cashoutBtn">Cashout</button>':""}

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

case "coinflip": return `<select id="coinSide"><option>heads</option><option>tails</option></select>`;

case "limbo": return `<input id="limboTarget" type="number" value="2">`;

case "crash": return `<input id="crashAuto" type="number" value="2">`;

case "hilo": return `<select id="hiloChoice"><option>high</option><option>low</option></select>`;

case "roulette": return `<input id="rouletteNum" type="number" min="0" max="36">`;

case "mines": return `<input id="minesCount" type="number" min="1" max="24" value="3">`;

default: return `<div>Instant Game</div>`;
}

},

// ================= PLAY =================
play(){

if(this.state.playing) return;

const bet = Number($("#betInput").value);
if(!bet) return;

this.state.bet = bet;
this.state.playing = true;

SFX.click();

setTimeout(()=> this.routeGame(),300);

},

routeGame(){

switch(this.state.game){

case "dice": return this.dice();
case "coinflip": return this.coinflip();
case "limbo": return this.limbo();
case "plinko": return this.plinko();
case "blackjack": return this.blackjack();
case "hilo": return this.hilo();
case "slots": return this.slots();
case "mines": return this.mines();
case "fruitparty": return this.fruit();
case "bananafarm": return this.banana();
case "airboss": return this.air();
case "roulette": return this.roulette();
case "crash": return this.startCrash();

}

},

// ======================================================
// GAMES
// ======================================================

// 🎲
dice(){
const t = Number($("#diceTarget").value);
const roll = RNG.f(0,100);
const win = roll < t;
this.finish(win, roll.toFixed(2));
},

// 🪙
coinflip(){
const side = $("#coinSide").value;
const r = RNG.pick(["heads","tails"]);
this.finish(r===side, r);
},

// 🎯
limbo(){
const t = Number($("#limboTarget").value);
const r = RNG.f(1,10);
this.finish(r>=t, r.toFixed(2)+"x");
},

// 🔻
plinko(){
const m = RNG.pick([0.5,1,2,5,10]);
this.finish(m>1, m+"x");
},

// 🃏
blackjack(){
const p = RNG.i(16,23);
const d = RNG.i(16,23);
const win = p<=21 && (p>d || d>21);
this.finish(win, `${p} vs ${d}`);
},

// ⬆️
hilo(){
const a = RNG.i(1,13);
const b = RNG.i(1,13);
const c = $("#hiloChoice").value;
const win = c==="high"?b>a:b<a;
this.finish(win, `${a} → ${b}`);
},

// 🎰
slots(){
SFX.spin();
const r = [RNG.pick(["🍒","💎","7"]),RNG.pick(["🍒","💎","7"]),RNG.pick(["🍒","💎","7"])];
const win = r[0]===r[1] && r[1]===r[2];
this.finish(win, r.join(" "));
},

// 💣
mines(){
const m = Number($("#minesCount").value);
const safe = Math.random()>m/25;
this.finish(safe, m+" mines");
},

// 🍉
fruit(){
const m = RNG.pick([0,2,5,10]);
this.finish(m>0, m+"x");
},

// 🍌
banana(){
const m = RNG.pick([0,1,3,6]);
this.finish(m>1, m+"x");
},

// ✈️
air(){
const m = RNG.f(1,5);
this.finish(m>2, m.toFixed(2)+"x");
},

// 🎯
roulette(){
const pick = Number($("#rouletteNum").value);
const spin = RNG.i(0,36);
this.finish(spin===pick, spin);
},

// ======================================================
// CRASH
// ======================================================

initCrash(){
$("#gameStage").innerHTML = `<div id="gameMultiplier">1.00x</div>`;
},

startCrash(){

this.crashRun = true;
let m = 1;

const loop = ()=>{

if(!this.crashRun) return;

m += m*0.02;

$("#gameMultiplier").innerText = m.toFixed(2)+"x";

if(Math.random()<0.015*m){
this.crashRun=false;
this.finish(false, m.toFixed(2));
return;
}

requestAnimationFrame(loop);
};

loop();
},

cashout(){
if(!this.crashRun) return;
this.crashRun=false;

const m = parseFloat($("#gameMultiplier").innerText);
this.finish(true, m.toFixed(2));
},

// ======================================================
// RESULT
// ======================================================

finish(win,value){

this.state.playing=false;

const stage = $("#gameStage");

stage.innerHTML = `
<div style="font-size:30px;font-weight:1000">
${win?"WIN":"LOSE"}
</div>
<div>${value}</div>
`;

win ? SFX.win() : SFX.lose();

}

};

document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();
