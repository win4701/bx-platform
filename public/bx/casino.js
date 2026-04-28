// =======================================================
// 🎰 CASINO.JS — [1/6] CORE STATE + API + WS + REGISTRY (FIXED)
// =======================================================

if (window.__BX_CASINO__) return;
window.__BX_CASINO__ = true;


// =======================================================
// 🧠 STATE SYSTEM (STABLE)
// =======================================================
const CasinoState = {

  user: null,
  balance: 0,

  currentGame: null,
  playing: false,

  online: 0,
  volume: 0,

  roundId: null,

  ws: null,

  setBalance(v){
    this.balance = v || 0;

    const el = document.getElementById("casinoWalletText");
    if(el) el.innerText = this.balance.toFixed(2) + " BX";
  },

  setOnline(v){
    this.online = v || 0;

    const el = document.getElementById("casinoOnlineText");
    if(el) el.innerText = this.online;
  },

  setVolume(v){
    this.volume = v || 0;

    const el = document.getElementById("casinoVolumeText");
    if(el) el.innerText = this.volume + " BX";
  }

};


// =======================================================
// 🌐 API SYSTEM (SAFE)
// =======================================================
const CasinoAPI = {

  async post(url, data){

    try{

      const res = await fetch("/api" + url, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(data)
      });

      if(!res.ok) throw new Error("API ERROR");

      return await res.json();

    }catch(e){

      console.warn("API fallback:", url);

      // fallback response
      return {
        roundId: Date.now(),
        win: false,
        payout: 0,
        multiplier: 1
      };

    }

  }

};


// =======================================================
// 🔌 WS CLIENT (SAFE + AUTO RECONNECT)
// =======================================================
const CasinoWS = {

  ws: null,

  connect(){

    try{

      this.ws = new WebSocket("ws://localhost:3000/ws/casino");

    }catch(e){

      console.warn("WS DISABLED");
      return;

    }

    this.ws.onopen = ()=>{
      console.log("🟢 WS CONNECTED");
    };

    this.ws.onmessage = (e)=>{

      let data;

      try{
        data = JSON.parse(e.data);
      }catch{
        return;
      }

      // stats
      if(data.type === "stats"){
        CasinoState.setOnline(data.online);
        CasinoState.setVolume(data.volume);
      }

      // balance
      if(data.type === "balance"){
        CasinoState.setBalance(data.balance);
      }

      // result
      if(data.type === "result"){
        GameFlow.onResult(data);
      }

    };

    this.ws.onclose = ()=>{
      console.warn("🔁 WS RECONNECT...");
      setTimeout(()=>this.connect(), 2000);
    };

  }

};


// =======================================================
// 🎮 GAME REGISTRY (12 GAMES)
// =======================================================
const GameRegistry = {

  list: {

    crash:      { id:"crash", type:"graph" },
    dice:       { id:"dice", type:"graph" },
    roulette:   { id:"roulette", type:"wheel" },

    slots:      { id:"slots", type:"slots" },
    fruitparty: { id:"fruitparty", type:"slots" },
    bananafarm: { id:"bananafarm", type:"slots" },

    mines:      { id:"mines", type:"grid" },

    plinko:     { id:"plinko", type:"physics" },
    airboss:    { id:"airboss", type:"physics" },

    limbo:      { id:"limbo", type:"instant" },
    coinflip:   { id:"coinflip", type:"instant" },

    hilo:       { id:"hilo", type:"cards" },
    blackjack:  { id:"blackjack", type:"cards" }

  },

  get(id){
    return this.list[id] || null;
  }

};


// =======================================================
// 🎮 LOBBY SYSTEM (FIXED BINDS)
// =======================================================
const CasinoLobby = {

  init(){

    const cards = document.querySelectorAll(".casino-game-card");

    if(!cards.length){
      console.warn("No game cards found");
      return;
    }

    cards.forEach(card => {

      card.addEventListener("click", ()=>{

        const game = card.dataset.game;

        if(!GameRegistry.get(game)){
          console.warn("Invalid game:", game);
          return;
        }

        GameFlow.enter(game);

      });

    });

  }

};


// =======================================================
// 🎬 GAME FLOW (REAL CONTROL)
// =======================================================
const GameFlow = {

  enter(gameId){

    CasinoState.currentGame = gameId;

    const lobby = document.getElementById("casinoLobby");
    const view  = document.getElementById("casinoGameView");

    if(lobby) lobby.classList.add("hidden");
    if(view)  view.classList.remove("hidden");

    GameUI.load(gameId);

  },

  exit(){

    CasinoState.currentGame = null;

    const lobby = document.getElementById("casinoLobby");
    const view  = document.getElementById("casinoGameView");

    if(lobby) lobby.classList.remove("hidden");
    if(view){
      view.classList.add("hidden");
      view.innerHTML = "";
    }

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
// 🎰 CASINO.JS — [2/6] UI SYSTEM (LOBBY → GAME VIEW) FIXED
// =======================================================

  
const GameUI = {

  load(gameId){

    const view = document.getElementById("casinoGameView");

    if(!view){
      console.error("GameView not found");
      return;
    }

    view.innerHTML = `
      <div class="game-container">

        <!-- TOP BAR -->
        <div class="game-topbar">
          <button id="exitGameBtn">←</button>
          <div class="game-title">${gameId.toUpperCase()}</div>
          <div class="game-balance" id="gameBalance">
            ${CasinoState.balance.toFixed(2)} BX
          </div>
        </div>

        <!-- STAGE -->
        <div class="game-stage">
          <canvas id="gameCanvas"></canvas>
          <div id="gameOverlay"></div>
        </div>

        <!-- BET PANEL -->
        <div class="bet-panel">

          <div class="bet-row">
            <input 
              id="betAmount"
              type="number"
              min="0.1"
              step="0.1"
              value="0.1"
            />

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


  // =====================================================
  // 🔗 BINDS (FIXED)
  // =====================================================
  bind(gameId){

    // EXIT
    const exitBtn = document.getElementById("exitGameBtn");
    if(exitBtn){
      exitBtn.onclick = ()=> GameFlow.exit();
    }

    // QUICK BETS
    document.querySelectorAll("[data-bet]").forEach(btn=>{
      btn.onclick = ()=>{
        const input = document.getElementById("betAmount");
        if(input) input.value = btn.dataset.bet;
      };
    });

    // PLAY BUTTON
    const playBtn = document.getElementById("playBtn");

    if(playBtn){
      playBtn.onclick = ()=>{

        const input = document.getElementById("betAmount");
        const amount = parseFloat(input?.value || 0);

        if(amount < 0.1){
          console.warn("Min bet 0.1");
          return;
        }

        GameFlow.play({
          game: gameId,
          bet: amount
        });

      };
    }

  },


  // =====================================================
  // 🎬 START ANIMATION (UI ONLY)
  // =====================================================
  startAnimation(game, roundId){

    const overlay = document.getElementById("gameOverlay");

    if(!overlay) return;

    overlay.innerHTML = `
      <div class="game-loading">
        Playing...
      </div>
    `;

  },


  // =====================================================
  // 🎯 RESULT UI
  // =====================================================
  finish(data){

    const overlay = document.getElementById("gameOverlay");

    if(!overlay) return;

    overlay.innerHTML = `
      <div class="game-result ${data.win ? 'win' : 'lose'}">
        ${data.win ? "+" + (data.payout || 0).toFixed(2) + " BX" : "LOSE"}
        <div class="multiplier">${data.multiplier || ""}</div>
      </div>
    `;

    setTimeout(()=>{
      overlay.innerHTML = "";
    }, 2000);

  }

};


// =======================================================
// 🎨 STYLE (SAFE INJECTION)
// =======================================================
const CasinoStyle = {

  inject(){

    if(document.getElementById("casino-style")) return;

    const style = document.createElement("style");
    style.id = "casino-style";

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
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:22px;
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
      cursor:pointer;
    }

    .bet-play {
      width:100%;
      background:#22c55e;
      border:none;
      padding:10px;
      font-weight:bold;
      cursor:pointer;
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
// 🎰 CASINO.JS — [3/6] ENGINE FACTORY + RENDER (FIXED STABLE)
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
    if(!meta) return;

    const canvas = document.getElementById("gameCanvas");
    if(!canvas){
      console.warn("Canvas not ready");
      return;
    }

    this.current = this.create(meta.type);
    this.current.init(canvas);

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

    this._resizeHandler = ()=>this.resize();
    window.addEventListener("resize", this._resizeHandler);

  },

  resize(){

    if(!this.canvas) return;

    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 200;

    this.canvas.width = w;
    this.canvas.height = h;

  },

  destroy(){

    if(this._raf) cancelAnimationFrame(this._raf);

    window.removeEventListener("resize", this._resizeHandler);

  }

};


// =======================================================
// 📈 GRAPH ENGINE (CRASH / DICE)
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

    if(this.points.length > 120){
      this.points.shift();
    }

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

      const x = (i/(this.points.length-1 || 1)) * w;
      const y = h - (p/10)*h;

      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);

    });

    ctx.strokeStyle="#22c55e";
    ctx.lineWidth=2;
    ctx.stroke();

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
    this.angle = 0;

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
    ctx.translate(w/2, h/2);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.arc(0,0,100,0,Math.PI*2);
    ctx.strokeStyle="#fff";
    ctx.stroke();

    ctx.restore();

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
    this.reels = [0,0,0];

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

    ctx.font = "40px monospace";
    ctx.fillStyle = "#22c55e";

    this.reels.forEach((r,i)=>{
      ctx.fillText(r, 60 + i*80, 120);
    });

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

    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    this.grid.forEach((v,i)=>{

      const x = (i%size)*cell;
      const y = Math.floor(i/size)*cell;

      ctx.strokeStyle="#444";
      ctx.strokeRect(x,y,cell,cell);

    });

  }

};


// =======================================================
// 🔻 PHYSICS ENGINE
// =======================================================
const PhysicsEngine = {

  ...BaseEngine,

  y:0,

  init(canvas){

    BaseEngine.init.call(this, canvas);
    this.y = 0;

    this.loop();

  },

  loop(){

    this.y += 2;

    if(this.y > this.canvas.height){
      this.y = 0;
    }

    this.draw();

    this._raf = requestAnimationFrame(()=>this.loop());

  },

  draw(){

    const ctx = this.ctx;

    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    ctx.beginPath();
    ctx.arc(this.canvas.width/2, this.y, 10, 0, Math.PI*2);
    ctx.fillStyle="#22c55e";
    ctx.fill();

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

    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    ctx.fillStyle="#fff";
    ctx.font="20px sans-serif";

    ctx.fillText("CARDS GAME", 50,100);

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

    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    ctx.fillStyle="#fff";
    ctx.font="20px sans-serif";

    ctx.fillText("INSTANT GAME", 50,100);

  }

};


// =======================================================
// 🔗 PATCH UI LOAD (NO TIMEOUT BUG)
// =======================================================
const __oldLoad = GameUI.load;

GameUI.load = function(gameId){

  __oldLoad.call(this, gameId);

  requestAnimationFrame(()=>{
    EngineFactory.mount(gameId);
  });

};
// =======================================================
// 🎰 CASINO.JS — [4/6] GAME FLOW + BET SYSTEM + API (FIXED)
// =======================================================
// =======================================================
// 💰 BET SYSTEM (STRICT)
// =======================================================
const BetSystem = {

  get(){

    const el = document.getElementById("betAmount");
    if(!el) return 0;

    return parseFloat(el.value) || 0;

  },

  valid(amount){

    if(amount < 0.1){
      console.warn("Min bet = 0.1 BX");
      return false;
    }

    if(amount > CasinoState.balance){
      console.warn("Insufficient balance");
      return false;
    }

    return true;

  }

};


// =======================================================
// 🎮 GAME FLOW (BACKEND CONTROL)
// =======================================================
GameFlow.play = async function(payload){

  if(CasinoState.playing) return;

  const amount = BetSystem.get();

  if(!BetSystem.valid(amount)) return;

  CasinoState.playing = true;

  const game = CasinoState.currentGame;

  let res;

  try{

    res = await CasinoAPI.post("/casino/play", {
      game,
      bet: amount
    });

  }catch(e){

    console.warn("API FAIL → fallback");
    res = { roundId: Date.now() };

  }

  CasinoState.roundId = res.roundId;

  // UI animation only
  GameUI.startAnimation(game, res.roundId);

};


// =======================================================
// 🎯 RESULT HANDLER (WS)
// =======================================================
GameFlow.onResult = function(data){

  if(!data) return;

  if(data.roundId !== CasinoState.roundId){
    return;
  }

  CasinoState.playing = false;

  // update balance if provided
  if(typeof data.balance !== "undefined"){
    CasinoState.setBalance(data.balance);
  }

  GameUI.finish({
    win: data.win,
    payout: data.payout || 0,
    multiplier: data.multiplier || 1
  });

};


// =======================================================
// 🔌 WS PATCH (STABLE HANDLER)
// =======================================================
const __oldWS = CasinoWS.connect;

CasinoWS.connect = function(){

  __oldWS.call(this);

  if(!this.ws) return;

  this.ws.onmessage = (e)=>{

    let data;

    try{
      data = JSON.parse(e.data);
    }catch{
      return;
    }

    switch(data.type){

      case "stats":
        CasinoState.setOnline(data.online);
        CasinoState.setVolume(data.volume);
      break;

      case "balance":
        CasinoState.setBalance(data.balance);
      break;

      case "result":
        GameFlow.onResult(data);
      break;

    }

  };

};


// =======================================================
// 🎬 UI ANIMATION (SAFE)
// =======================================================
GameUI.startAnimation = function(game, roundId){

  const overlay = document.getElementById("gameOverlay");
  if(!overlay) return;

  overlay.innerHTML = `
    <div class="game-loading">
      Playing...
    </div>
  `;

};


// =======================================================
// 🎬 RESULT UI (FIXED)
// =======================================================
GameUI.finish = function(data){

  const overlay = document.getElementById("gameOverlay");
  if(!overlay) return;

  const isWin = data.win === true;

  overlay.innerHTML = `
    <div class="game-result ${isWin ? "win" : "lose"}">
      ${isWin ? "+" + data.payout.toFixed(2) + " BX" : "LOSE"}
      <div class="multiplier">${data.multiplier}x</div>
    </div>
  `;

  setTimeout(()=>{
    overlay.innerHTML = "";
  },2000);

};
// =======================================================
// 🎰 CASINO.JS — [5/6] FAIRNESS + STORAGE + FX (FIXED)
// =======================================================


// =======================================================
// 🔐 FAIRNESS UI (DISPLAY ONLY)
// =======================================================
const FairnessUI = {

  data:{
    serverSeed:"-",
    clientSeed:"-",
    nonce:0
  },

  set(d){

    if(!d) return;

    this.data.serverSeed = d.serverSeed || this.data.serverSeed;
    this.data.clientSeed = d.clientSeed || this.data.clientSeed;
    this.data.nonce = d.nonce ?? this.data.nonce;

    this.render();

  },

  render(){

    const el = document.getElementById("fairnessPanel");
    if(!el) return;

    el.innerHTML = `
      <div class="fair-row">Server: ${this.data.serverSeed}</div>
      <div class="fair-row">Client: ${this.data.clientSeed}</div>
      <div class="fair-row">Nonce: ${this.data.nonce}</div>
    `;

  }

};


// =======================================================
// 💾 STORAGE SYSTEM (SAFE)
// =======================================================
const CasinoStorage = {

  KEYS:{
    BET:"bx_bet",
    GAME:"bx_game"
  },

  saveBet(v){
    try{
      localStorage.setItem(this.KEYS.BET, v);
    }catch{}
  },

  getBet(){
    try{
      return parseFloat(localStorage.getItem(this.KEYS.BET)) || 0.1;
    }catch{
      return 0.1;
    }
  },

  saveGame(g){
    try{
      localStorage.setItem(this.KEYS.GAME, g);
    }catch{}
  },

  getGame(){
    try{
      return localStorage.getItem(this.KEYS.GAME);
    }catch{
      return null;
    }
  }

};


// =======================================================
// 🎯 FX SYSTEM (STABLE)
// =======================================================
const FX = {

  flash(){

    const el = document.getElementById("casinoGameView");
    if(!el) return;

    el.style.boxShadow = "0 0 25px rgba(34,197,94,0.6)";

    setTimeout(()=>{
      el.style.boxShadow = "none";
    },180);

  },

  shake(){

    const el = document.getElementById("casinoGameView");
    if(!el) return;

    el.style.transform = "translateX(6px)";

    setTimeout(()=>{
      el.style.transform = "translateX(0)";
    },120);

  },

  float(text, color="#22c55e"){

    const stage = document.getElementById("gameOverlay");
    if(!stage) return;

    const el = document.createElement("div");

    el.className = "fx-float";
    el.innerText = text;
    el.style.color = color;

    stage.appendChild(el);

    requestAnimationFrame(()=>{
      el.style.transform = "translate(-50%,-120%)";
      el.style.opacity = "0";
    });

    setTimeout(()=>{
      el.remove();
    },900);

  }

};


// =======================================================
// 🎬 PATCH RESULT FX
// =======================================================
const __oldFinishFX = GameUI.finish;

GameUI.finish = function(data){

  __oldFinishFX.call(this, data);

  if(data.win){
    FX.flash();
    FX.float("+" + data.payout.toFixed(2) + " BX");
  }else{
    FX.shake();
  }

};


// =======================================================
// 💾 AUTO SAVE BET
// =======================================================
document.addEventListener("input",(e)=>{

  if(e.target && e.target.id === "betAmount"){
    CasinoStorage.saveBet(e.target.value);
  }

});


// =======================================================
// 🔄 RESTORE BET ON LOAD
// =======================================================
document.addEventListener("DOMContentLoaded",()=>{

  const input = document.getElementById("betAmount");

  if(input){
    input.value = CasinoStorage.getBet();
  }

});
// =======================================================
// 🎰 CASINO.JS — [6/6] INIT + FINAL SYSTEM (FULL FIXED)
// =======================================================

const CasinoInit = {

  started:false,

  start(){

    if(this.started) return;
    this.started = true;

    console.log("🚀 CASINO INIT START");

    // restore last game
    const lastGame = CasinoStorage.getGame();

    if(lastGame && GameRegistry.get(lastGame)){
      GameFlow.enter(lastGame);
    }

    this.bindGlobal();

    console.log("✅ CASINO READY");

  },

  bindGlobal(){

    const oldEnter = GameFlow.enter;

    GameFlow.enter = function(gameId){

      CasinoStorage.saveGame(gameId);

      oldEnter.call(this, gameId);

    };

  }

};


// =======================================================
// 🎨 ADVANCED STYLE (BC STYLE)
// =======================================================
const CasinoAdvancedStyle = {

  inject(){

    if(document.getElementById("casino-advanced-style")) return;

    const style = document.createElement("style");
    style.id = "casino-advanced-style";

    style.innerHTML = `

    body {
      background:#0b0f1a;
      color:#fff;
    }

    .casino-game-card {
      background:#111827;
      border-radius:12px;
      transition:0.2s;
      cursor:pointer;
      padding:10px;
      text-align:center;
    }

    .casino-game-card:hover {
      transform:scale(1.05);
      box-shadow:0 0 20px rgba(34,197,94,0.4);
    }

    .game-container {
      animation:fadeIn .2s ease;
    }

    @keyframes fadeIn {
      from { opacity:0; transform:translateY(10px); }
      to { opacity:1; transform:translateY(0); }
    }

    .game-result {
      font-size:28px;
      text-align:center;
    }

    .game-result .multiplier {
      font-size:16px;
      opacity:0.7;
    }

    .fx-float {
      position:absolute;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      font-size:20px;
      font-weight:900;
      transition:all 0.9s ease;
      pointer-events:none;
    }

    .bet-play:active {
      transform:scale(0.95);
    }

    .hidden {
      display:none !important;
    }

    `;

    document.head.appendChild(style);

  }

};


// =======================================================
// 🔌 FINAL WS PATCH (SAFE RECONNECT)
// =======================================================
const __oldWSConnectFinal = CasinoWS.connect;

CasinoWS.connect = function(){

  try{
    __oldWSConnectFinal.call(this);
  }catch(e){
    console.warn("WS skipped");
    return;
  }

  if(!this.ws) return;

  this.ws.onclose = ()=>{
    console.warn("🔁 WS RECONNECT...");
    setTimeout(()=>CasinoWS.connect(), 2000);
  };

};


// =======================================================
// 🔄 GLOBAL FULL INIT (FIXED ORDER)
// =======================================================
window.addEventListener("DOMContentLoaded", () => {

  console.log("🔥 CASINO BOOT");

  // 🎨 styles
  if (typeof CasinoStyle !== "undefined") {
    CasinoStyle.inject();
  }

  // 🎮 lobby
  if (typeof CasinoLobby !== "undefined") {
    CasinoLobby.init();
  }

  // 🔌 WS (safe)
  if (typeof CasinoWS !== "undefined") {
    try {
      CasinoWS.connect();
    } catch(e){
      console.warn("WS disabled");
    }
  }

  // 🚀 start system
  if (typeof CasinoInit !== "undefined") {
    CasinoInit.start();
  }

});
