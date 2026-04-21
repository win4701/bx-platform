/* =========================================================
   BLOXIO CASINO — ULTRA AAA SYSTEM
   REAL UI / GAME ENGINES / BC.GAME STYLE
========================================================= */

(() => {
"use strict";

if(window.BX_CASINO) return;

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ================= CORE ================= */

const RNG = {
  f:(a,b)=> Math.random()*(b-a)+a,
  i:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  p:a=> a[Math.floor(Math.random()*a.length)]
};

const SFX = {
  click:()=> $("#snd-click")?.play(),
  win:()=> $("#snd-win")?.play(),
  lose:()=> $("#snd-lose")?.play()
};

/* ================= CASINO ================= */

const CASINO = {

state:{
  game:null,
  bet:10,
  playing:false,
  crashRun:false,
  history:[]
},

ui:{
  lobby:null,
  view:null
},

/* ================= INIT ================= */

init(){

  this.ui.lobby = $("#casinoLobby");
  this.ui.view  = $("#casinoGameView");

  if(!this.ui.lobby) return;

  this.bindGames();
  this.bindFilters();
  this.initLive();

  window.BX_CASINO = this;

  console.log("🎰 ULTRA CASINO READY");
},

/* ================= LOBBY ================= */

bindGames(){
  $$(".casino-game-card").forEach(card=>{
    card.onclick = ()=>{
      SFX.click();
      this.open(card.dataset.game);
    };
  });
},

bindFilters(){

  const tabs = $$(".casino-filter-tab");
  const games = $$(".casino-game-card");

  tabs.forEach(tab=>{
    tab.onclick = ()=>{

      tabs.forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");

      const type = tab.dataset.tab;

      games.forEach(g=>{
        const t = g.querySelector(".casino-game-type")?.innerText.toLowerCase();
        g.style.display = (type==="all" || t.includes(type)) ? "" : "none";
      });

    };
  });

},

/* ================= NAV ================= */

open(game){

  this.state.game = game;

  this.ui.lobby.classList.add("hidden");
  this.ui.view.classList.remove("hidden");

  this.render();
},

close(){

  this.state.playing=false;
  this.state.crashRun=false;

  this.ui.view.classList.add("hidden");
  this.ui.lobby.classList.remove("hidden");
},

/* ================= RENDER ================= */

render(){

switch(this.state.game){

case "crash": return this.renderCrash();
case "dice": return this.renderDice();
case "limbo": return this.renderLimbo();
case "coinflip": return this.renderCoinflip();
case "slots": return this.renderSlots();

default: return this.renderSimple();

}

},

/* ================= CRASH (AAA) ================= */

renderCrash(){

this.ui.view.innerHTML = `
<div class="crash-ui">

<div class="crash-header">
<button id="backBtn">←</button>
<h2>Crash</h2>
</div>

<div class="crash-stage">
<canvas id="crashCanvas"></canvas>
<div id="crashMultiplier">1.00x</div>
</div>

<div class="crash-panel">

<input id="betInput" value="${this.state.bet}">
<input id="autoCash" value="2">

<div class="crash-actions">
<button id="playBtn" class="btn-green">Bet</button>
<button id="cashoutBtn" class="btn-yellow">Cashout</button>
</div>

</div>

</div>
`;

$("#backBtn").onclick = ()=>this.close();
$("#playBtn").onclick = ()=>this.startCrash();
$("#cashoutBtn").onclick = ()=>this.cashout();

this.initCrash();

},

initCrash(){

const c = $("#crashCanvas");
const ctx = c.getContext("2d");

c.width = c.offsetWidth;
c.height = 220;

let x=0;
let m=1;

this.state.crashRun = true;

const loop = ()=>{

if(!this.state.crashRun) return;

ctx.clearRect(0,0,c.width,c.height);

ctx.beginPath();
ctx.strokeStyle="#00ff99";
ctx.lineWidth=3;

ctx.moveTo(0,220);

x+=2;
m+=m*0.02;

const y = 220 - m*15;

ctx.lineTo(x,y);
ctx.stroke();

$("#crashMultiplier").innerText = m.toFixed(2)+"x";

if(Math.random()<0.02*m){
this.state.crashRun=false;
this.finish(false,m.toFixed(2));
return;
}

requestAnimationFrame(loop);

};

loop();

},

startCrash(){
this.state.crashRun=true;
this.initCrash();
},

cashout(){

if(!this.state.crashRun) return;

this.state.crashRun=false;

const m = parseFloat($("#crashMultiplier").innerText);

this.finish(true,m.toFixed(2));

},

/* ================= DICE ================= */

renderDice(){

this.ui.view.innerHTML = `
<div class="dice-ui">

<button id="backBtn">←</button>

<div id="diceResult">--</div>

<input id="betInput" value="${this.state.bet}">
<input id="diceTarget" type="range" min="5" max="95" value="50">

<button id="playBtn">Roll</button>

</div>
`;

$("#backBtn").onclick=()=>this.close();
$("#playBtn").onclick=()=>this.dice();

},

dice(){

const t = Number($("#diceTarget").value);
const r = RNG.f(0,100);

this.finish(r<t, r.toFixed(2));

},

/* ================= LIMBO ================= */

renderLimbo(){

this.ui.view.innerHTML = `
<div class="limbo-ui">

<button id="backBtn">←</button>

<input id="betInput" value="${this.state.bet}">
<input id="target" value="2">

<button id="playBtn">Play</button>

</div>
`;

$("#backBtn").onclick=()=>this.close();
$("#playBtn").onclick=()=>this.limbo();

},

limbo(){

const t = Number($("#target").value);
const r = RNG.f(1,10);

this.finish(r>=t, r.toFixed(2)+"x");

},

/* ================= COIN ================= */

renderCoinflip(){

this.ui.view.innerHTML = `
<div class="coin-ui">

<button id="backBtn">←</button>

<select id="side">
<option>heads</option>
<option>tails</option>
</select>

<button id="playBtn">Flip</button>

</div>
`;

$("#backBtn").onclick=()=>this.close();
$("#playBtn").onclick=()=>this.coin();

},

coin(){

const s = $("#side").value;
const r = RNG.p(["heads","tails"]);

this.finish(r===s,r);

},

/* ================= SLOTS ================= */

renderSlots(){

this.ui.view.innerHTML = `
<div class="slots-ui">

<button id="backBtn">←</button>

<div id="slots">🎰 🎰 🎰</div>

<button id="playBtn">Spin</button>

</div>
`;

$("#backBtn").onclick=()=>this.close();
$("#playBtn").onclick=()=>this.slots();

},

slots(){

const r = [RNG.p(["🍒","💎","7"]),RNG.p(["🍒","💎","7"]),RNG.p(["🍒","💎","7"])];

$("#slots").innerText = r.join(" ");

this.finish(r[0]===r[1]&&r[1]===r[2], r.join(" "));

},

/* ================= RESULT ================= */

finish(win,val){

this.state.playing=false;

this.ui.view.insertAdjacentHTML("beforeend",`
<div class="game-result ${win?'win':'lose'}">
${win?"WIN":"LOSE"}<br>${val}
</div>
`);

win?SFX.win():SFX.lose();

this.state.history.unshift({win,val});

},

/* ================= LIVE ================= */

initLive(){

setInterval(()=>{
  $("#casinoOnlineText").innerText = RNG.i(100,500);
  $("#casinoVolumeText").innerText = RNG.i(1000,9000)+" BX";
},2000);

}

};

/* ================= BOOT ================= */

document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();
