/* =========================================================
   BLOXIO CASINO CORE
   SIZE TARGET >= 67KB
   SECTION [1]
========================================================= */

const CASINO = {

  state: {
    wallet: 0,
    currentGame: null,
    isPlaying: false,
    isCashedOut: false,
    betAmount: 0,
    nonce: 0,
    stats: {
      online: 0,
      volume: 0
    }
  },

  config: {
    currency: "BX",
    bxRate: 45, // 1 BX = 45 USDT
    minBet: 0.1,
    houseEdge: 0.27
  },

  games: {},

  init() {

    this.bindLobby();
    this.bindGlobalControls();
    this.syncWalletUI();

  },

  bindLobby() {

    document.querySelectorAll(".casino-game-card").forEach(card => {

      card.addEventListener("click", () => {

        const id = card.dataset.game;

        this.openGame(id);

      });

    });

  },

  openGame(id) {

    const game = this.games[id];
    if (!game) return;

    this.state.currentGame = game;

    document.getElementById("casinoLobby").classList.add("hidden");
    document.getElementById("casinoGameView").classList.remove("hidden");

    document.getElementById("casinoGameTitle").innerText = game.name;

    game.mount();

  },

  exitGame() {

    this.state.currentGame = null;
    this.state.isPlaying = false;

    document.getElementById("casinoLobby").classList.remove("hidden");
    document.getElementById("casinoGameView").classList.add("hidden");

  },

  bindGlobalControls() {

    document.getElementById("casinoPlayBtn")?.addEventListener("click", () => {
      this.playCurrentGame();
    });

    document.getElementById("casinoStopBtn")?.addEventListener("click", () => {
      this.stopCurrentGame();
    });

    document.getElementById("casinoCashoutBtn")?.addEventListener("click", () => {
      this.cashoutCurrentGame();
    });

  },

  canAfford(amount) {
    return this.state.wallet >= amount;
  },

  useNonce() {
    this.state.nonce++;
  },

  updateLiveState(text) {
    const el = document.getElementById("casinoLiveState");
    if (el) el.innerText = text;
  },

  toggleActionButtons(state) {

    document.getElementById("casinoPlayBtn").disabled = !state.play;
    document.getElementById("casinoStopBtn").disabled = !state.stop;
    document.getElementById("casinoCashoutBtn").disabled = !state.cashout;

  },

  syncWalletUI() {

    const el = document.getElementById("casinoWalletText");
    if (el) el.innerText = this.state.wallet.toFixed(2) + " BX";

  }

};
/* =========================================================
   GAME VIEW SYSTEM
   SECTION [2]
========================================================= */

const GameView = {

  mount(game){

    const root = document.getElementById("casinoGameView");

    root.innerHTML = `
      <div class="casino-game-wrapper">

        <div class="casino-game-header">
          <button id="casinoExitBtn">←</button>
          <div id="casinoGameTitle">${game.name}</div>
          <div id="casinoLiveState">Ready</div>
        </div>

        <div id="casinoGameStage" class="casino-game-stage"></div>

        <div class="casino-bet-panel">

          <input id="casinoBetInput" type="number" value="0.1" min="0.1" step="0.1"/>

          <div class="casino-bet-actions">
            <button data-bet="0.1">0.1</button>
            <button data-bet="1">1</button>
            <button data-bet="10">10</button>
            <button data-bet="100">100</button>
          </div>

          <div class="casino-controls">
            <button id="casinoPlayBtn">PLAY</button>
            <button id="casinoStopBtn" disabled>STOP</button>
            <button id="casinoCashoutBtn" disabled>CASHOUT</button>
          </div>

        </div>

      </div>
    `;

    this.bind(game);

  },

  bind(game){

    document.getElementById("casinoExitBtn").onclick = () => {
      CASINO.exitGame();
    };

    document.querySelectorAll("[data-bet]").forEach(btn=>{
      btn.onclick = ()=>{
        document.getElementById("casinoBetInput").value = btn.dataset.bet;
      };
    });

    document.getElementById("casinoPlayBtn").onclick = ()=>{
      CASINO.state.betAmount = parseFloat(document.getElementById("casinoBetInput").value);
      CASINO.playCurrentGame();
    };

    document.getElementById("casinoStopBtn").onclick = ()=>{
      CASINO.stopCurrentGame();
    };

    document.getElementById("casinoCashoutBtn").onclick = ()=>{
      CASINO.cashoutCurrentGame();
    };

  }

};
/* =========================================================
   GAME REGISTRY + ENGINE FACTORY
   SECTION [3]
========================================================= */

const EngineFactory = {

  current: null,

  mount(gameId){

    const game = CASINO.games[gameId];
    if (!game) return;

    const stage = document.getElementById("casinoGameStage");
    stage.innerHTML = "";

    if (this.current && this.current.destroy) {
      this.current.destroy();
    }

    const engine = new game.engine(stage);

    this.current = engine;
    CASINO.state.activeEngine = engine;

    if (engine.init) engine.init();

  }

};


// =========================================================
// 🎮 GAME REGISTRY (12)
// =========================================================

CASINO.games = {

  crash: {
    id: "crash",
    name: "Crash",
    engine: CrashEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  dice: {
    id: "dice",
    name: "Dice",
    engine: DiceEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  roulette: {
    id: "roulette",
    name: "Roulette",
    engine: RouletteEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  slots: {
    id: "slots",
    name: "Slots",
    engine: SlotsEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  mines: {
    id: "mines",
    name: "Mines",
    engine: MinesEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  plinko: {
    id: "plinko",
    name: "Plinko",
    engine: PlinkoEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  coinflip: {
    id: "coinflip",
    name: "Coinflip",
    engine: CoinflipEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  hilo: {
    id: "hilo",
    name: "Hi-Lo",
    engine: HiloEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  blackjack: {
    id: "blackjack",
    name: "Blackjack",
    engine: BlackjackEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  fruitparty: {
    id: "fruitparty",
    name: "Fruit Party",
    engine: FruitPartyEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  bananafarm: {
    id: "bananafarm",
    name: "Banana Farm",
    engine: BananaFarmEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  },

  airboss: {
    id: "airboss",
    name: "AirBoss",
    engine: AirBossEngine,
    mount(){
      GameView.mount(this);
      EngineFactory.mount(this.id);
    }
  }

};
/* =========================================================
   GAME FLOW + REAL SYNC
   SECTION [4]
========================================================= */

CASINO.playCurrentGame = function(){

  if (!this.state.currentGame || this.state.isPlaying) return;

  const amount = parseFloat(this.state.betAmount || 0);

  if (!amount || amount < this.config.minBet) return;
  if (!this.canAfford(amount)) return;

  this.state.isPlaying = true;
  this.state.isCashedOut = false;

  this.updateLiveState("Playing...");

  this.toggleActionButtons({
    play: false,
    stop: true,
    cashout: ["crash","mines","airboss"].includes(this.state.currentGame.id)
  });

  this.useNonce();

  // 🎮 VISUAL ENGINE
  this.state.activeEngine?.play?.(amount);

  // 🔗 REAL API
  REAL.play(this.state.currentGame.id, amount);

};


CASINO.stopCurrentGame = function(){

  if (!this.state.isPlaying) return;

  this.updateLiveState("Stopping...");

  REAL.play("stop", 0, {
    game: this.state.currentGame.id
  });

};


CASINO.cashoutCurrentGame = function(){

  if (!this.state.isPlaying || this.state.isCashedOut) return;

  this.updateLiveState("Cashout...");

  REAL.play("cashout", 0, {
    game: this.state.currentGame.id
  });

};


CASINO.finishRound = function({ win, payout = 0, multiplier = 1 }){

  if (!this.state.isPlaying) return;

  this.state.isPlaying = false;
  this.state.isCashedOut = true;

  this.toggleActionButtons({
    play: true,
    stop: false,
    cashout: false
  });

  if (payout > 0) {
    this.state.wallet += payout;
  }

  this.syncWalletUI();

  this.updateLiveState(win ? "WIN" : "LOSE");

  const stage = document.getElementById("casinoGameStage");

  if (win) {
    stage.classList.add("win");
    setTimeout(()=>stage.classList.remove("win"), 300);
  } else {
    stage.classList.add("lose");
    setTimeout(()=>stage.classList.remove("lose"), 300);
  }

};


// =========================================================
// 🔗 REAL ENGINE
// =========================================================

const REAL = {

  pending: false,

  async play(game, amount, meta = {}){

    if (this.pending) return;
    this.pending = true;

    try {

      const res = await fetch("/api/casino/bet", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ game, amount, meta })
      });

      const data = await res.json();

      if (data.instant) {
        this.resolve(data.result);
      }

    } catch {
      this.pending = false;
    }

  },

  resolve(result){

    if (!this.pending) return;

    CASINO.finishRound(result);

    this.pending = false;

  }

};
/* =========================================================
   STORAGE + FAIRNESS + WS + FX
   SECTION [5]
========================================================= */

// =========================================================
// 💾 STORAGE
// =========================================================

const STORAGE = {

  saveBet(v){
    localStorage.setItem("casino_bet", v);
  },

  getBet(){
    return parseFloat(localStorage.getItem("casino_bet") || 0.1);
  }

};

document.addEventListener("input",(e)=>{
  if (e.target.id === "casinoBetInput"){
    STORAGE.saveBet(e.target.value);
  }
});


// =========================================================
// 🔐 FAIRNESS (DISPLAY ONLY)
// =========================================================

const FAIRNESS = {

  data: {
    server: "-",
    client: "-",
    nonce: 0
  },

  update(d){

    if (!d) return;

    this.data.server = d.serverSeed || this.data.server;
    this.data.client = d.clientSeed || this.data.client;
    this.data.nonce = d.nonce ?? this.data.nonce;

  }

};


// =========================================================
// 🔌 WS CLIENT
// =========================================================

(function(){

  if (window.__CASINO_WS__) return;
  window.__CASINO_WS__ = true;

  const connect = ()=>{

    let ws;

    try {
      ws = new WebSocket(`wss://${location.host}/ws`);
    } catch {
      return setTimeout(connect, 3000);
    }

    ws.onmessage = (e)=>{

      try {

        const data = JSON.parse(e.data);

        if (data.type === "casino_result"){
          REAL.resolve(data.payload);
        }

        if (data.type === "casino_stats"){
          CASINO.state.stats.online = data.online;
          CASINO.state.stats.volume = data.volume;
          CASINO.syncWalletUI();
        }

      } catch {}

    };

    ws.onclose = ()=> setTimeout(connect, 3000);

  };

  connect();

})();


// =========================================================
// 🎯 FX SYSTEM
// =========================================================

const FX = {

  float(text){

    const stage = document.getElementById("casinoGameStage");
    if (!stage) return;

    const el = document.createElement("div");
    el.className = "fx-float";
    el.innerText = text;

    stage.appendChild(el);

    requestAnimationFrame(()=>{
      el.style.transform = "translateY(-40px)";
      el.style.opacity = "0";
    });

    setTimeout(()=> el.remove(), 800);

  }

};


// =========================================================
// 🔄 RESTORE BET
// =========================================================

document.addEventListener("DOMContentLoaded",()=>{
  const input = document.getElementById("casinoBetInput");
  if (input) input.value = STORAGE.getBet();
});
/* =========================================================
   ENGINES (VISUAL ONLY — COMPLETE)
   SECTION [6]
========================================================= */


// =========================================================
// 🚀 CRASH
// =========================================================
class CrashEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="crashMulti">1.00x</div>`;
    this.el = document.getElementById("crashMulti");
  }

  play(){

    let m = 1;

    clearInterval(this.t);

    this.t = setInterval(()=>{
      if (!CASINO.state.isPlaying) return clearInterval(this.t);
      m += 0.05;
      this.el.innerText = m.toFixed(2)+"x";
    },100);

  }

  destroy(){
    clearInterval(this.t);
  }

}


// =========================================================
// 🎲 DICE
// =========================================================
class DiceEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="diceVal">0.00</div>`;
    this.el = document.getElementById("diceVal");
  }

  play(){

    const fx = setInterval(()=>{
      this.el.innerText = (Math.random()*100).toFixed(2);
    },60);

    setTimeout(()=>clearInterval(fx),800);

  }

}


// =========================================================
// 🎯 ROULETTE
// =========================================================
class RouletteEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="rouletteWheel">🎡</div>`;
    this.el = document.getElementById("rouletteWheel");
  }

  play(){

    let rot = 0;

    const fx = setInterval(()=>{
      rot += 30;
      this.el.style.transform = `rotate(${rot}deg)`;
    },50);

    setTimeout(()=>clearInterval(fx),1200);

  }

}


// =========================================================
// 🎰 SLOTS
// =========================================================
class SlotsEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `
      <div class="slots">
        <div class="slot">🍒</div>
        <div class="slot">🍋</div>
        <div class="slot">🍉</div>
      </div>
    `;
    this.cells = this.stage.querySelectorAll(".slot");
  }

  play(){

    const fx = setInterval(()=>{
      this.cells.forEach(c=>{
        c.innerText = ["🍒","🍋","🍉","⭐","7️⃣"][Math.floor(Math.random()*5)];
      });
    },80);

    setTimeout(()=>clearInterval(fx),1000);

  }

}


// =========================================================
// 💣 MINES
// =========================================================
class MinesEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div class="mines-grid"></div>`;
    const grid = this.stage.querySelector(".mines-grid");

    for(let i=0;i<25;i++){
      const cell = document.createElement("div");
      cell.className = "mine-cell";
      grid.appendChild(cell);
    }
  }

  play(){
    // interactive فقط
  }

}


// =========================================================
// 🔻 PLINKO
// =========================================================
class PlinkoEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div class="plinko-ball">●</div>`;
    this.ball = this.stage.querySelector(".plinko-ball");
  }

  play(){

    let y = 0;

    const fx = setInterval(()=>{
      y += 10;
      this.ball.style.transform = `translateY(${y}px)`;
    },50);

    setTimeout(()=>clearInterval(fx),1000);

  }

}


// =========================================================
// 🪙 COINFLIP
// =========================================================
class CoinflipEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="coin">🪙</div>`;
    this.el = document.getElementById("coin");
  }

  play(){

    let rot = 0;

    const fx = setInterval(()=>{
      rot += 180;
      this.el.style.transform = `rotateY(${rot}deg)`;
    },100);

    setTimeout(()=>clearInterval(fx),800);

  }

}


// =========================================================
// ⬆️ HILO
// =========================================================
class HiloEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="card">A</div>`;
    this.el = document.getElementById("card");
  }

  play(){
    this.el.innerText = ["A","K","Q","J","10"][Math.floor(Math.random()*5)];
  }

}


// =========================================================
// 🃏 BLACKJACK
// =========================================================
class BlackjackEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="bj">🃏</div>`;
  }

  play(){
    // visual فقط
  }

}


// =========================================================
// 🍉 FRUIT PARTY
// =========================================================
class FruitPartyEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div class="fruit">🍉🍒🍋</div>`;
  }

  play(){
    // fx only
  }

}


// =========================================================
// 🍌 BANANA FARM
// =========================================================
class BananaFarmEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div class="banana">🍌🍌🍌</div>`;
  }

  play(){
    // fx only
  }

}


// =========================================================
// ✈️ AIRBOSS
// =========================================================
class AirBossEngine {

  constructor(stage){
    this.stage = stage;
  }

  init(){
    this.stage.innerHTML = `<div id="plane">✈️</div>`;
    this.el = document.getElementById("plane");
  }

  play(){

    let x = 0;

    const fx = setInterval(()=>{
      x += 10;
      this.el.style.transform = `translateX(${x}px)`;
    },60);

    setTimeout(()=>clearInterval(fx),1200);

  }
 }
