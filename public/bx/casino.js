/* =========================================================
   BLOXIO CASINO — ULTRA SYSTEM (2500+ STYLE ENGINE)
   SINGLE FILE / MODULAR INTERNAL / PRODUCTION STYLE
========================================================= */

(() => {
"use strict";

/* ================= GUARD ================= */
if(window.BX_CASINO) return;

/* ================= HELPERS ================= */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ================= RNG ================= */
const RNG = {
  f:(a,b)=> Math.random()*(b-a)+a,
  i:(a,b)=> Math.floor(Math.random()*(b-a+1))+a,
  p:a=> a[Math.floor(Math.random()*a.length)]
};

/* ================= SOUND ================= */
const SFX = {
  click:()=> $("#snd-click")?.play(),
  win:()=> $("#snd-win")?.play(),
  lose:()=> $("#snd-lose")?.play(),
  spin:()=> $("#snd-spin")?.play()
};

/* ================= CORE ================= */
const CASINO = {

state:{
  game:null,
  playing:false,
  bet:10,
  history:[]
},

fx:{
  pulse:false
},

ui:{
  stage:null,
  view:null,
  lobby:null
},

/* ================= INIT ================= */
init(){

  this.ui.lobby = $("#casinoLobby");
  this.ui.view  = $("#casinoGameView");

  if(!this.ui.lobby) return;

  this.bindLobby();
  this.bindFilters();
  this.initTicker();
  this.initBigWins();

  window.BX_CASINO = this;
},

/* ================= LOBBY ================= */
bindLobby(){

  $$(".casino-game-card").forEach(card=>{
    card.onclick = ()=>{
      SFX.click();
      this.open(card.dataset.game);
    };
  });

},

open(game){

  this.state.game = game;

  this.ui.lobby.classList.add("hidden");
  this.ui.view.classList.remove("hidden");

  this.render();
},

close(){

  this.state.playing=false;

  this.ui.view.classList.add("hidden");
  this.ui.lobby.classList.remove("hidden");
},
   
/* ================= Filter ================= */
bindFilters(){

  const tabs = document.querySelectorAll('.casino-filter-tab');
  const games = document.querySelectorAll('.casino-game-card');

  tabs.forEach(tab=>{
    tab.onclick = ()=>{

      // active state
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');

      const type = tab.dataset.tab;

      games.forEach(game=>{

        const gameType = game.querySelector('.casino-game-type')?.innerText.toLowerCase();

        if(type === 'all'){
          game.style.display = '';
          return;
        }

        if(gameType?.includes(type)){
          game.style.display = '';
        }else{
          game.style.display = 'none';
        }

      });

    };
  });

   }
/* ================= UI ================= */
render(){

const g = this.state.game;

this.ui.view.innerHTML = `
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

$("#backBtn").onclick=()=>this.close();
$("#playBtn").onclick=()=>this.play();

this.ui.stage = $("#gameStage");

if(g==="crash"){
  $("#cashoutBtn").onclick=()=>this.cashout();
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

default: return `<div>Instant</div>`;
}

},

/* ================= PLAY ================= */
play(){

if(this.state.playing) return;

const bet = Number($("#betInput").value);
if(!bet) return;

this.state.bet = bet;
this.state.playing = true;

SFX.click();

setTimeout(()=> this.route(),200);

},

route(){

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

/* ================= GAMES ================= */

dice(){
const t = Number($("#diceTarget").value);
const r = RNG.f(0,100);
this.finish(r<t, r.toFixed(2));
},

coinflip(){
const side = $("#coinSide").value;
const r = RNG.p(["heads","tails"]);
this.finish(r===side, r);
},

limbo(){
const t = Number($("#limboTarget").value);
const r = RNG.f(1,10);
this.finish(r>=t, r.toFixed(2)+"x");
},

plinko(){
const m = RNG.p([0.5,1,2,3,5,10]);
this.finish(m>1, m+"x");
},

blackjack(){
const p = RNG.i(16,23);
const d = RNG.i(16,23);
this.finish(p<=21 && (p>d || d>21), `${p} vs ${d}`);
},

hilo(){
const a = RNG.i(1,13);
const b = RNG.i(1,13);
const c = $("#hiloChoice").value;
this.finish(c==="high"?b>a:b<a, `${a}→${b}`);
},

slots(){
SFX.spin();
const r = [RNG.p(["🍒","💎","7"]),RNG.p(["🍒","💎","7"]),RNG.p(["🍒","💎","7"])];
this.finish(r[0]===r[1]&&r[1]===r[2], r.join(" "));
},

mines(){
const m = Number($("#minesCount").value);
const safe = Math.random()>m/25;
this.finish(safe, m+" mines");
},

fruit(){
const m = RNG.p([0,2,5,10]);
this.finish(m>0, m+"x");
},

banana(){
const m = RNG.p([0,1,3,6]);
this.finish(m>1, m+"x");
},

air(){
const m = RNG.f(1,5);
this.finish(m>2, m.toFixed(2)+"x");
},

roulette(){
const p = Number($("#rouletteNum").value);
const s = RNG.i(0,36);
this.finish(p===s, s);
},

/* ================= CRASH ================= */
initCrash(){
this.ui.stage.innerHTML = `<div id="gameMultiplier">1.00x</div>`;
},

startCrash(){

this.crashRun=true;
let m=1;

const loop=()=>{

if(!this.crashRun) return;

m+=m*0.02;

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

const m=parseFloat($("#gameMultiplier").innerText);
this.finish(true,m.toFixed(2));
},

/* ================= RESULT ================= */
finish(win,val){

this.state.playing=false;

this.ui.stage.innerHTML = `
<div style="font-size:32px;font-weight:1000">
${win?"WIN":"LOSE"}
</div>
<div>${val}</div>
`;

this.pushHistory(win,val);

win?SFX.win():SFX.lose();

},

/* ================= HISTORY ================= */
pushHistory(win,val){

this.state.history.unshift({win,val,time:Date.now()});
if(this.state.history.length>20) this.state.history.pop();

this.renderTicker();
},

/* ================= TICKER ================= */
initTicker(){
this.ticker = $("#casinoTickerTrack");
},

renderTicker(){

if(!this.ticker) return;

this.ticker.innerHTML = this.state.history.map(h=>`
<div class="${h.win?'win':'lose'}">${h.val}</div>
`).join("");

},

/* ================= BIG WINS ================= */
initBigWins(){

this.bigWins = $("#bigWinsTrack");

setInterval(()=>{
  const val = (RNG.f(10,100)).toFixed(2)+"x";

  const el = document.createElement("div");
  el.innerText = val;

  this.bigWins?.prepend(el);

  if(this.bigWins?.children.length>10){
    this.bigWins.removeChild(this.bigWins.lastChild);
  }

},3000);

}

};

/* ================= BOOT ================= */
document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();
