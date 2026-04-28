// =======================================================
// 🎰 CASINO.JS — [1/6] CORE STATE + REGISTRY
// =======================================================

if (window.__BX_CASINO__) return;
window.__BX_CASINO__ = true;


// =======================================================
// 🧠 STATE SYSTEM
// =======================================================
const CasinoState = {

  user: null,
  balance: 0,

  currentGame: null,
  games: {},

  online: 0,
  volume: 0,

  roundId: null,
  playing: false,

  ws: null,

  setBalance(v){
    this.balance = v;
    document.getElementById("casinoWalletText").innerText = v.toFixed(2) + " BX";
  },

  setOnline(v){
    this.online = v;
    document.getElementById("casinoOnlineText").innerText = v;
  },

  setVolume(v){
    this.volume = v;
    document.getElementById("casinoVolumeText").innerText = v + " BX";
  }

};


// =======================================================
// 🌐 API SYSTEM
// =======================================================
const CasinoAPI = {

  async post(url, data){
    const res = await fetch("/api" + url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(data)
    });

    return res.json();
  }

};


// =======================================================
// 🔌 WS CLIENT
// =======================================================
const CasinoWS = {

  connect(){

    this.ws = new WebSocket("wss://your-domain/ws/casino");

    this.ws.onmessage = (e)=>{
      const data = JSON.parse(e.data);

      if(data.type === "stats"){
        CasinoState.setOnline(data.online);
        CasinoState.setVolume(data.volume);
      }

      if(data.type === "balance"){
        CasinoState.setBalance(data.balance);
      }

      if(data.type === "result"){
        GameFlow.onResult(data);
      }

    };

  }

};


// =======================================================
// 🎮 GAME REGISTRY (12 GAMES)
// =======================================================
const GameRegistry = {

  list: {

    crash: { id:"crash", type:"graph" },
    dice: { id:"dice", type:"graph" },
    roulette: { id:"roulette", type:"wheel" },

    slots: { id:"slots", type:"slots" },
    fruitparty: { id:"fruitparty", type:"slots" },
    bananafarm: { id:"bananafarm", type:"slots" },

    mines: { id:"mines", type:"grid" },

    plinko: { id:"plinko", type:"physics" },
    airboss: { id:"airboss", type:"physics" },
    limbo: { id:"limbo", type:"instant" },
    coinflip: { id:"coinflip", type:"instant" },
    hilo: { id:"hilo", type:"cards" },
    blackjack: { id:"blackjack", type:"cards" }

  },

  get(id){
    return this.list[id];
  }

};


// =======================================================
// 🎮 UI LOBBY SYSTEM
// =======================================================
const CasinoLobby = {

  init(){

    document.querySelectorAll(".casino-game-card")
      .forEach(card => {

        card.addEventListener("click", ()=>{

          const game = card.dataset.game;

          GameFlow.enter(game);

        });

      });

  }

};


// =======================================================
// 🎬 GAME FLOW
// =======================================================
const GameFlow = {

  enter(gameId){

    CasinoState.currentGame = gameId;

    document.getElementById("casinoLobby").classList.add("hidden");
    document.getElementById("casinoGameView").classList.remove("hidden");

    GameUI.load(gameId);

  },

  exit(){

    CasinoState.currentGame = null;

    document.getElementById("casinoLobby").classList.remove("hidden");
    document.getElementById("casinoGameView").classList.add("hidden");

    document.getElementById("casinoGameView").innerHTML = "";

  },

  async play(payload){

    if(CasinoState.playing) return;

    CasinoState.playing = true;

    const res = await CasinoAPI.post("/casino/play", payload);

    CasinoState.roundId = res.roundId;

    GameUI.startAnimation(payload.game, res.roundId);

  },

  onResult(data){

    if(data.roundId !== CasinoState.roundId) return;

    CasinoState.playing = false;

    GameUI.finish(data);

  }

};


// =======================================================
// 🚀 INIT
// =======================================================
document.addEventListener("DOMContentLoaded", ()=>{

  CasinoLobby.init();
  CasinoWS.connect();

});
// =======================================================
// 🎰 CASINO.JS — [2/6] UI SYSTEM (BC STYLE)
// =======================================================


// =======================================================
// 🎨 GAME UI SYSTEM
// =======================================================
const GameUI = {

  load(gameId){

    const view = document.getElementById("casinoGameView");

    view.innerHTML = `
      <div class="game-container">

        <!-- TOP BAR -->
        <div class="game-topbar">
          <button id="exitGameBtn">← Back</button>
          <div class="game-title">${gameId.toUpperCase()}</div>
          <div class="game-balance">${CasinoState.balance.toFixed(2)} BX</div>
        </div>

        <!-- GAME CANVAS -->
        <div class="game-stage">
          <canvas id="gameCanvas"></canvas>
          <div id="gameOverlay"></div>
        </div>

        <!-- BET PANEL -->
        <div class="bet-panel">

          <div class="bet-row">
            <input id="betAmount" type="number" min="0.1" step="0.1" value="0.1"/>
            <div class="bet-actions">
              <button data-bet="0.1">0.1</button>
              <button data-bet="1">1</button>
              <button data-bet="10">10</button>
              <button data-bet="100">100</button>
            </div>
          </div>

          <div class="bet-row">
            <button id="playBtn" class="bet-play">PLAY</button>
          </div>

        </div>

      </div>
    `;

    this.bind(gameId);

  },


  bind(gameId){

    document.getElementById("exitGameBtn").onclick = () => GameFlow.exit();

    document.querySelectorAll("[data-bet]").forEach(b=>{
      b.onclick = () => {
        document.getElementById("betAmount").value = b.dataset.bet;
      };
    });

    document.getElementById("playBtn").onclick = () => {

      const amount = parseFloat(document.getElementById("betAmount").value);

      if(amount < 0.1) return;

      GameFlow.play({
        game: gameId,
        bet: amount
      });

    };

  },


  startAnimation(game, roundId){

    const overlay = document.getElementById("gameOverlay");

    overlay.innerHTML = `<div class="game-loading">Starting...</div>`;

  },


  finish(data){

    const overlay = document.getElementById("gameOverlay");

    overlay.innerHTML = `
      <div class="game-result ${data.win ? 'win' : 'lose'}">
        ${data.win ? "WIN +" + data.payout : "LOSE"}
      </div>
    `;

    setTimeout(()=>{
      overlay.innerHTML = "";
    }, 2000);

  }

};


// =======================================================
// 🎨 BASIC STYLE INJECTION (BC LIKE)
// =======================================================
const CasinoStyle = {

  inject(){

    const style = document.createElement("style");

    style.innerHTML = `
    
    .game-container {
      display:flex;
      flex-direction:column;
      height:100%;
      background:#0b0f1a;
      color:#fff;
    }

    .game-topbar {
      display:flex;
      justify-content:space-between;
      padding:10px;
      background:#111827;
      font-weight:bold;
    }

    .game-stage {
      flex:1;
      position:relative;
      background:#0f172a;
    }

    #gameCanvas {
      width:100%;
      height:100%;
    }

    #gameOverlay {
      position:absolute;
      top:0;
      left:0;
      right:0;
      bottom:0;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:24px;
      font-weight:bold;
    }

    .bet-panel {
      padding:10px;
      background:#111827;
    }

    .bet-row {
      display:flex;
      gap:8px;
      margin-bottom:8px;
    }

    .bet-row input {
      flex:1;
      padding:8px;
      background:#1f2937;
      border:none;
      color:#fff;
    }

    .bet-actions button {
      background:#1f2937;
      border:none;
      color:#fff;
      padding:6px 10px;
    }

    .bet-play {
      width:100%;
      background:#22c55e;
      border:none;
      padding:10px;
      font-weight:bold;
    }

    .game-result.win {
      color:#22c55e;
    }

    .game-result.lose {
      color:#ef4444;
    }

    `;

    document.head.appendChild(style);

  }

};


// =======================================================
// 🚀 INIT UI STYLE
// =======================================================
document.addEventListener("DOMContentLoaded", ()=>{
  CasinoStyle.inject();
});
// =======================================================
// 🎰 CASINO.JS — [3/6] ENGINE FACTORY + GAME RENDER
// =======================================================


// =======================================================
// 🧠 ENGINE FACTORY (UI ONLY)
// =======================================================
const EngineFactory = {

  current:null,

  create(type){

    if(this.current && this.current.destroy){
      this.current.destroy();
    }

    switch(type){

      case "graph": return GraphEngine;
      case "wheel": return RouletteEngine;
      case "slots": return SlotsEngine;
      case "grid": return MinesEngine;
      case "physics": return PhysicsEngine;
      case "cards": return CardsEngine;
      case "instant": return InstantEngine;

      default: return BaseEngine;
    }

  },

  mount(gameId){

    const meta = GameRegistry.get(gameId);

    this.current = this.create(meta.type);

    this.current.init(document.getElementById("gameCanvas"));

  }

};


// =======================================================
// 🎬 BASE ENGINE
// =======================================================
const BaseEngine = {

  canvas:null,
  ctx:null,

  init(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", ()=>this.resize());
  },

  resize(){
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  },

  update(){},
  destroy(){}

};


// =======================================================
// 📈 GRAPH ENGINE (Crash / Dice)
// =======================================================
const GraphEngine = {

  ...BaseEngine,

  points:[],
  mult:1,

  init(canvas){
    BaseEngine.init.call(this, canvas);
    this.points = [];
    this.mult = 1;
    this.loop();
  },

  loop(){

    this.mult += 0.02;
    this.points.push(this.mult);

    if(this.points.length > 120) this.points.shift();

    this.draw();

    this._raf = requestAnimationFrame(()=>this.loop());

  },

  draw(){

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0,0,w,h);

    ctx.beginPath();

    this.points.forEach((p,i)=>{
      const x = (i / this.points.length) * w;
      const y = h - (p/10)*h;

      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });

    ctx.strokeStyle="#22c55e";
    ctx.lineWidth=2;
    ctx.stroke();

  },

  destroy(){
    cancelAnimationFrame(this._raf);
  }

};


// =======================================================
// 🎡 ROULETTE ENGINE
// =======================================================
const RouletteEngine = {

  ...BaseEngine,

  angle:0,

  init(canvas){
    BaseEngine.init.call(this, canvas);
    this.loop();
  },

  loop(){
    this.angle += 0.05;
    this.draw();
    this._raf = requestAnimationFrame(()=>this.loop());
  },

  draw(){

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.translate(w/2,h/2);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.arc(0,0,100,0,Math.PI*2);
    ctx.strokeStyle="#fff";
    ctx.stroke();

    ctx.restore();

  },

  destroy(){
    cancelAnimationFrame(this._raf);
  }

};


// =======================================================
// 🎰 SLOTS ENGINE
// =======================================================
const SlotsEngine = {

  ...BaseEngine,

  reels:[0,0,0],

  init(canvas){
    BaseEngine.init.call(this, canvas);
    this.loop();
  },

  loop(){

    this.reels = this.reels.map(r => (r+1)%10);
    this.draw();

    this._raf = requestAnimationFrame(()=>this.loop());
  },

  draw(){

    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    this.reels.forEach((r,i)=>{
      ctx.fillText(r, 100 + i*100, 100);
    });

  },

  destroy(){
    cancelAnimationFrame(this._raf);
  }

};


// =======================================================
// 💣 MINES ENGINE
// =======================================================
const MinesEngine = {

  ...BaseEngine,

  grid:[],

  init(canvas){
    BaseEngine.init.call(this, canvas);

    this.grid = Array(25).fill(0);

    this.draw();
  },

  draw(){

    const ctx = this.ctx;
    const size = 5;

    const cell = this.canvas.width / size;

    this.grid.forEach((v,i)=>{
      const x = (i%size)*cell;
      const y = Math.floor(i/size)*cell;

      ctx.strokeRect(x,y,cell,cell);
    });

  }

};


// =======================================================
// 🔻 PHYSICS ENGINE (Plinko / Airboss)
// =======================================================
const PhysicsEngine = {

  ...BaseEngine,

  y:0,

  init(canvas){
    BaseEngine.init.call(this, canvas);
    this.loop();
  },

  loop(){

    this.y += 2;

    if(this.y > this.canvas.height) this.y = 0;

    this.draw();

    this._raf = requestAnimationFrame(()=>this.loop());
  },

  draw(){

    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    ctx.beginPath();
    ctx.arc(this.canvas.width/2,this.y,10,0,Math.PI*2);
    ctx.fillStyle="#22c55e";
    ctx.fill();

  },

  destroy(){
    cancelAnimationFrame(this._raf);
  }

};


// =======================================================
// 🃏 CARDS ENGINE
// =======================================================
const CardsEngine = {

  ...BaseEngine,

  init(canvas){
    BaseEngine.init.call(this, canvas);
    this.draw();
  },

  draw(){
    const ctx = this.ctx;
    ctx.fillText("Cards Game", 100,100);
  }

};


// =======================================================
// ⚡ INSTANT ENGINE
// =======================================================
const InstantEngine = {

  ...BaseEngine,

  init(canvas){
    BaseEngine.init.call(this, canvas);
    this.draw();
  },

  draw(){
    const ctx = this.ctx;
    ctx.fillText("Instant Game", 100,100);
  }

};


// =======================================================
// 🔗 BIND ENGINE WITH UI
// =======================================================
const _oldLoad = GameUI.load;

GameUI.load = function(gameId){

  _oldLoad.call(this, gameId);

  setTimeout(()=>{
    EngineFactory.mount(gameId);
  },50);

};
// =======================================================
// 🎰 CASINO.JS — [4/6] GAME FLOW + BET SYSTEM + API
// =======================================================


// =======================================================
// 💰 BET SYSTEM (UI ONLY)
// =======================================================
const BetSystem = {

  getAmount(){
    return parseFloat(document.getElementById("betAmount").value) || 0;
  },

  validate(amount){
    if(amount < 0.1) return false;
    return true;
  }

};


// =======================================================
// 🎮 GAME FLOW OVERRIDE (REAL BACKEND)
// =======================================================
GameFlow.play = async function(payload){

  if(CasinoState.playing) return;

  const amount = BetSystem.getAmount();

  if(!BetSystem.validate(amount)) return;

  CasinoState.playing = true;

  const game = CasinoState.currentGame;

  // 🔥 CALL BACKEND
  const res = await CasinoAPI.post("/casino/play", {
    game,
    bet: amount
  });

  // round id from backend
  CasinoState.roundId = res.roundId;

  // start fake animation synced
  GameUI.startAnimation(game, res.roundId);

};


// =======================================================
// 🎯 HANDLE RESULT (FROM WS)
// =======================================================
GameFlow.onResult = function(data){

  if(data.roundId !== CasinoState.roundId) return;

  CasinoState.playing = false;

  // update UI
  GameUI.finish({
    win: data.win,
    payout: data.payout,
    multiplier: data.multiplier
  });

};


// =======================================================
// 🔄 AUTO BALANCE UPDATE (WS)
// =======================================================
CasinoWS.onBalance = function(balance){
  CasinoState.setBalance(balance);
};


// =======================================================
// 🔌 PATCH WS HANDLER
// =======================================================
const _wsOld = CasinoWS.connect;

CasinoWS.connect = function(){

  _wsOld.call(this);

  this.ws.onmessage = (e)=>{

    const data = JSON.parse(e.data);

    if(data.type === "stats"){
      CasinoState.setOnline(data.online);
      CasinoState.setVolume(data.volume);
    }

    if(data.type === "balance"){
      CasinoState.setBalance(data.balance);
    }

    if(data.type === "result"){
      GameFlow.onResult(data);
    }

  };

};


// =======================================================
// 🎬 UI ANIMATION (SYNCED)
// =======================================================
GameUI.startAnimation = function(game, roundId){

  const overlay = document.getElementById("gameOverlay");

  overlay.innerHTML = `<div class="game-loading">Playing...</div>`;

  // trigger engine visual only
  if(EngineFactory.current && EngineFactory.current.loop){
    // already running
  }

};


// =======================================================
// 🎬 RESULT UI (PRO STYLE)
// =======================================================
GameUI.finish = function(data){

  const overlay = document.getElementById("gameOverlay");

  overlay.innerHTML = `
    <div class="game-result ${data.win ? 'win' : 'lose'}">
      ${data.win ? "+" + data.payout.toFixed(2) + " BX" : "LOSE"}
      <div class="multiplier">${data.multiplier || ""}x</div>
    </div>
  `;

  setTimeout(()=>{
    overlay.innerHTML = "";
  },2000);

};
// =======================================================
// 🎰 CASINO.JS — [5/6] FAIRNESS + STORAGE + FX
// =======================================================


// =======================================================
// 🔐 FAIRNESS (DISPLAY ONLY - BACKEND CONTROL)
// =======================================================
const FairnessUI = {

  state: {
    serverSeed: "",
    clientSeed: "",
    nonce: 0
  },

  set(data){

    this.state.serverSeed = data.serverSeed || this.state.serverSeed;
    this.state.clientSeed = data.clientSeed || this.state.clientSeed;
    this.state.nonce = data.nonce || this.state.nonce;

  },

  render(){

    const el = document.getElementById("fairnessPanel");

    if(!el) return;

    el.innerHTML = `
      <div class="fair-row">Server: ${this.state.serverSeed}</div>
      <div class="fair-row">Client: ${this.state.clientSeed}</div>
      <div class="fair-row">Nonce: ${this.state.nonce}</div>
    `;

  }

};


// =======================================================
// 💾 STORAGE SYSTEM (LOCAL CACHE)
// =======================================================
const CasinoStorage = {

  keys: {
    BET: "bx_last_bet",
    GAME: "bx_last_game"
  },

  saveBet(v){
    localStorage.setItem(this.keys.BET, v);
  },

  getBet(){
    return parseFloat(localStorage.getItem(this.keys.BET)) || 0.1;
  },

  saveGame(g){
    localStorage.setItem(this.keys.GAME, g);
  },

  getGame(){
    return localStorage.getItem(this.keys.GAME);
  }

};


// =======================================================
// 🎯 FX SYSTEM (BC STYLE)
// =======================================================
const FX = {

  flash(){

    const el = document.getElementById("casinoGameView");

    el.style.boxShadow = "0 0 25px #22c55e";

    setTimeout(()=>{
      el.style.boxShadow = "none";
    },200);

  },

  shake(){

    const el = document.getElementById("casinoGameView");

    el.style.transform = "translateX(6px)";

    setTimeout(()=>{
      el.style.transform = "translateX(0)";
    },120);

  },

  float(text, color="#22c55e"){

    const stage = document.getElementById("gameOverlay");

    const el = document.createElement("div");

    el.className = "fx-float";
    el.innerText = text;
    el.style.color = color;

    stage.appendChild(el);

    setTimeout(()=>{
      el.remove();
    },900);

  }

};


// =======================================================
// 🎬 RESULT FX PATCH
// =======================================================
const _oldFinish = GameUI.finish;

GameUI.finish = function(data){

  _oldFinish.call(this, data);

  if(data.win){
    FX.flash();
    FX.float("+" + data.payout.toFixed(2) + " BX");
  }else{
    FX.shake();
  }

};


// =======================================================
// 💾 SAVE BET ON CHANGE
// =======================================================
document.addEventListener("input",(e)=>{

  if(e.target.id === "betAmount"){
    CasinoStorage.saveBet(e.target.value);
  }

});


// =======================================================
// 🔄 LOAD LAST BET
// =======================================================
document.addEventListener("DOMContentLoaded",()=>{

  const b = CasinoStorage.getBet();

  const input = document.getElementById("betAmount");

  if(input){
    input.value = b;
  }

});
// =======================================================
// 🎰 CASINO.JS — [6/6] FINAL INIT + COMPLETE SYSTEM
// =======================================================


// =======================================================
// 🚀 INIT SYSTEM (FULL BOOT)
// =======================================================
const CasinoInit = {

  start(){

    // restore last game
    const lastGame = CasinoStorage.getGame();

    if(lastGame && GameRegistry.get(lastGame)){
      GameFlow.enter(lastGame);
    }

    this.bindGlobal();

    console.log("🚀 BX CASINO READY");

  },

  bindGlobal(){

    // save game on enter
    const _enter = GameFlow.enter;

    GameFlow.enter = function(gameId){

      CasinoStorage.saveGame(gameId);

      _enter.call(this, gameId);

    };

  }

};


// =======================================================
// 🎨 EXTENDED BC STYLE (ADVANCED)
// =======================================================
const CasinoAdvancedStyle = {

  inject(){

    const style = document.createElement("style");

    style.innerHTML = `

    /* ===== GLOBAL ===== */
    body {
      background:#0b0f1a;
      color:#fff;
    }

    /* ===== LOBBY ===== */
    .casino-game-card {
      background:#111827;
      border-radius:12px;
      transition:0.2s;
      cursor:pointer;
    }

    .casino-game-card:hover {
      transform:scale(1.05);
      box-shadow:0 0 20px rgba(34,197,94,0.4);
    }

    /* ===== GAME ===== */
    .game-container {
      animation:fadeIn .2s ease;
    }

    @keyframes fadeIn {
      from { opacity:0; transform:translateY(10px); }
      to { opacity:1; transform:translateY(0); }
    }

    /* ===== RESULT ===== */
    .game-result {
      font-size:28px;
      text-align:center;
    }

    .game-result .multiplier {
      font-size:16px;
      opacity:0.7;
    }

    /* ===== FX FLOAT ===== */
    .fx-float {
      position:absolute;
      top:50%;
      left:50%;
      transform:translate(-50%, -50%);
      font-size:20px;
      font-weight:900;
      animation:floatUp 0.9s ease forwards;
    }

    @keyframes floatUp {
      from { transform:translate(-50%, -50%); opacity:1; }
      to { transform:translate(-50%, -120%); opacity:0; }
    }

    /* ===== BUTTON UX ===== */
    .bet-play {
      transition:0.2s;
    }

    .bet-play:active {
      transform:scale(0.95);
    }

    `;

    document.head.appendChild(style);

  }

};


// =======================================================
// 🔌 FINAL WS PATCH (AUTO RECONNECT)
// =======================================================
const _oldConnect = CasinoWS.connect;

CasinoWS.connect = function(){

  _oldConnect.call(this);

  this.ws.onclose = ()=>{
    console.warn("WS reconnecting...");
    setTimeout(()=>CasinoWS.connect(),2000);
  };

};


// =======================================================
// 🎬 FINAL BOOT
// =======================================================
document.addEventListener("DOMContentLoaded",()=>{

  CasinoAdvancedStyle.inject();
  CasinoInit.start();

});
