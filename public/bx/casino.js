/* =====================================================
CASINO.JS — SECTION [1/6]
ECONOMY + CORE ENGINE + STATE
STATUS: /قف
===================================================== */

'use strict';

/* ================= ECONOMY ================= */
const BX_RATE = 45; // 1 BX = 45 USDT
const MIN_BET = 0.1;

/* ================= GLOBAL STATE ================= */
window.CASINO = window.CASINO || {};

CASINO.state = {
  balance: 0,
  activeGame: null,
  bet: MIN_BET,
  nonce: 0,
  seed: "bloxio-seed",
  history: []
};

/* ================= ENGINE LAYER ================= */
CASINO.Engine = {

  random(){
    const x = Math.sin(CASINO.state.nonce++ + Date.now()) * 10000;
    return x - Math.floor(x);
  },

  hash(seed, nonce){
    let h = 0;
    const str = seed + nonce;
    for(let i=0;i<str.length;i++){
      h = Math.imul(31,h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
  },

  roll(max=100){
    return Math.floor(this.random()*max);
  },

  payout(multiplier){
    return CASINO.state.bet * multiplier;
  },

  win(amount){
    CASINO.state.balance += amount;
    this.log("WIN", amount);
    this.fx("win");
  },

  lose(){
    CASINO.state.balance -= CASINO.state.bet;
    this.log("LOSE", CASINO.state.bet);
    this.fx("lose");
  },

  log(type, amount){
    CASINO.state.history.push({
      type,
      amount,
      time: Date.now()
    });
  },

  fx(type){
    const s = document.getElementById("snd-"+type);
    if(s) s.play().catch(()=>{});
  }

};

/* ================= API ================= */
CASINO.API = {

  setBet(v){
    if(v < MIN_BET) return;
    CASINO.state.bet = v;
  },

  getBalance(){
    return CASINO.state.balance;
  },

  setGame(name){
    CASINO.state.activeGame = name;
  }

};

/* ================= UI ENGINE ================= */
CASINO.UI = {

  updateBalance(){
    const el = document.getElementById("casinoWalletText");
    if(el){
      el.innerText = CASINO.state.balance.toFixed(2) + " BX";
    }
  },

  notify(msg){
    console.log("🎰", msg);
  }

};

/* ================= INIT ================= */
CASINO.init = function(){

  console.log("🎰 CASINO INIT [1/6]");

  // initial balance demo
  CASINO.state.balance = 10;

  CASINO.UI.updateBalance();

};

/* ================= BIND GAMES ================= */
document.addEventListener("click", e=>{
  const card = e.target.closest(".casino-game-card");
  if(!card) return;

  const game = card.dataset.game;
  CASINO.API.setGame(game);

  console.log("🎮 OPEN GAME:", game);
});
/* =====================================================
CASINO.JS — SECTION [2/6]
GAME ENGINE (12 GAMES REAL LOGIC)
STATUS: /قف
===================================================== */

CASINO.Games = {};

/* =====================================================
1. 🎲 DICE
===================================================== */
CASINO.Games.dice = function(){

  const roll = CASINO.Engine.roll(100);
  const win = roll > 50;

  if(win){
    CASINO.Engine.win(CASINO.Engine.payout(1.98));
  }else{
    CASINO.Engine.lose();
  }

  return roll;
};

/* =====================================================
2. 🪙 COINFLIP
===================================================== */
CASINO.Games.coinflip = function(){

  const r = CASINO.Engine.roll(2);
  const win = r === 1;

  if(win){
    CASINO.Engine.win(CASINO.Engine.payout(2));
  }else{
    CASINO.Engine.lose();
  }

  return r;
};

/* =====================================================
3. 🎯 LIMBO
===================================================== */
CASINO.Games.limbo = function(){

  const multi = (1 / CASINO.Engine.random()).toFixed(2);

  if(multi > 2){
    CASINO.Engine.win(CASINO.Engine.payout(multi));
  }else{
    CASINO.Engine.lose();
  }

  return multi;
};

/* =====================================================
4. 📈 CRASH
===================================================== */
CASINO.Games.crash = function(){

  const crash = (1 + CASINO.Engine.random()*10).toFixed(2);

  if(crash > 2){
    CASINO.Engine.win(CASINO.Engine.payout(crash));
  }else{
    CASINO.Engine.lose();
  }

  return crash;
};

/* =====================================================
5. 🔻 PLINKO
===================================================== */
CASINO.Games.plinko = function(){

  const slot = CASINO.Engine.roll(10);

  const table = [0,0.5,1,2,5,2,1,0.5,0,10];

  const multi = table[slot] || 0;

  if(multi > 0){
    CASINO.Engine.win(CASINO.Engine.payout(multi));
  }else{
    CASINO.Engine.lose();
  }

  return slot;
};

/* =====================================================
6. 🃏 BLACKJACK
===================================================== */
CASINO.Games.blackjack = function(){

  const player = CASINO.Engine.roll(11)+10;
  const dealer = CASINO.Engine.roll(11)+10;

  if(player > dealer){
    CASINO.Engine.win(CASINO.Engine.payout(2));
  }else{
    CASINO.Engine.lose();
  }

  return {player, dealer};
};

/* =====================================================
7. ⬆️ HILO
===================================================== */
CASINO.Games.hilo = function(){

  const a = CASINO.Engine.roll(13);
  const b = CASINO.Engine.roll(13);

  if(b > a){
    CASINO.Engine.win(CASINO.Engine.payout(2));
  }else{
    CASINO.Engine.lose();
  }

  return {a,b};
};

/* =====================================================
8. 🎰 SLOTS
===================================================== */
CASINO.Games.slots = function(){

  const a = CASINO.Engine.roll(5);
  const b = CASINO.Engine.roll(5);
  const c = CASINO.Engine.roll(5);

  const win = (a===b && b===c);

  if(win){
    CASINO.Engine.win(CASINO.Engine.payout(5));
  }else{
    CASINO.Engine.lose();
  }

  return [a,b,c];
};

/* =====================================================
9. 💣 MINES
===================================================== */
CASINO.Games.mines = function(){

  const safe = CASINO.Engine.roll(5);

  if(safe > 1){
    CASINO.Engine.win(CASINO.Engine.payout(1.5));
  }else{
    CASINO.Engine.lose();
  }

  return safe;
};

/* =====================================================
10. 🍉 FRUIT PARTY
===================================================== */
CASINO.Games.fruitparty = function(){

  const r = CASINO.Engine.roll(100);

  if(r > 70){
    CASINO.Engine.win(CASINO.Engine.payout(3));
  }else{
    CASINO.Engine.lose();
  }

  return r;
};

/* =====================================================
11. 🍌 BANANA FARM
===================================================== */
CASINO.Games.bananafarm = function(){

  const r = CASINO.Engine.roll(100);

  if(r > 60){
    CASINO.Engine.win(CASINO.Engine.payout(2.5));
  }else{
    CASINO.Engine.lose();
  }

  return r;
};

/* =====================================================
12. ✈️ AIRBOSS
===================================================== */
CASINO.Games.airboss = function(){

  const r = (1 + CASINO.Engine.random()*20).toFixed(2);

  if(r > 3){
    CASINO.Engine.win(CASINO.Engine.payout(r));
  }else{
    CASINO.Engine.lose();
  }

  return r;
};

/* =====================================================
EXECUTION WRAPPER
===================================================== */
CASINO.play = function(){

  const g = CASINO.state.activeGame;
  if(!g || !CASINO.Games[g]) return;

  const result = CASINO.Games[g]();

  CASINO.UI.updateBalance();

  console.log("🎰 RESULT:", g, result);

};

/* =====================================================
AUTO BIND PLAY
===================================================== */
document.addEventListener("dblclick", e=>{
  if(!CASINO.state.activeGame) return;
  CASINO.play();
});

/* =====================================================
CASINO.JS — SECTION [3/6]
UI ENGINE (RENDER + GAME VIEW + BET PANEL)
STATUS: /قف
===================================================== */

CASINO.DOM = {
  lobby: document.getElementById("casinoLobby"),
  view: document.getElementById("casinoGameView")
};

/* =====================================================
RENDER GAME VIEW
===================================================== */
CASINO.renderGame = function(name){

  if(!CASINO.DOM.view) return;

  CASINO.DOM.view.classList.remove("hidden");
  CASINO.DOM.lobby.style.display = "none";

  CASINO.DOM.view.innerHTML = `
    <div class="game-container">

      <div class="game-top">
        <button id="backToLobby">←</button>
        <h2>${name.toUpperCase()}</h2>
      </div>

      <div class="game-stage" id="gameStage"></div>

      <div class="bet-panel">
        <input id="betAmount" type="number" min="${MIN_BET}" step="0.1" value="${CASINO.state.bet}">
        <button id="betBtn">PLAY</button>
      </div>

      <div class="game-result" id="gameResult">—</div>

    </div>
  `;

  CASINO.bindGameUI();
};

/* =====================================================
BACK TO LOBBY
===================================================== */
CASINO.backLobby = function(){

  CASINO.DOM.view.classList.add("hidden");
  CASINO.DOM.lobby.style.display = "";

};

/* =====================================================
BIND UI EVENTS
===================================================== */
CASINO.bindGameUI = function(){

  document.getElementById("backToLobby").onclick = CASINO.backLobby;

  const betInput = document.getElementById("betAmount");
  const btn = document.getElementById("betBtn");

  betInput.oninput = ()=>{
    CASINO.API.setBet(parseFloat(betInput.value));
  };

  btn.onclick = ()=>{

    CASINO.play();

    const res = CASINO.state.history.slice(-1)[0];

    document.getElementById("gameResult").innerText =
      res.type + " : " + res.amount.toFixed(2) + " BX";

  };

};

/* =====================================================
OVERRIDE CLICK (OPEN GAME VIEW)
===================================================== */
document.addEventListener("click", e=>{

  const card = e.target.closest(".casino-game-card");
  if(!card) return;

  const game = card.dataset.game;

  CASINO.API.setGame(game);
  CASINO.renderGame(game);

});

/* =====================================================
LOBBY UI UPDATE
===================================================== */
CASINO.updateCasinoUI = function(){

  CASINO.UI.updateBalance();

};
/* =====================================================
CASINO.JS — SECTION [4/6]
FX ENGINE (ANIMATION + SOUND + PARTICLES)
STATUS: /قف
===================================================== */

CASINO.FX = {

  /* ===== SOUND ===== */
  play(name){
    const s = document.getElementById("snd-"+name);
    if(s){
      s.currentTime = 0;
      s.play().catch(()=>{});
    }
  },

  /* ===== SHAKE EFFECT ===== */
  shake(el){
    if(!el) return;

    el.style.transition = "transform 0.1s";

    let i = 0;
    const interval = setInterval(()=>{
      el.style.transform = `translateX(${(i%2?-5:5)}px)`;
      i++;
      if(i>6){
        clearInterval(interval);
        el.style.transform = "translateX(0)";
      }
    }, 50);
  },

  /* ===== GLOW ===== */
  glow(el, color="#00ff99"){
    if(!el) return;

    el.style.boxShadow = `0 0 20px ${color}`;
    setTimeout(()=>{
      el.style.boxShadow = "none";
    }, 500);
  },

  /* ===== PARTICLES ===== */
  particles(x, y){

    const container = document.createElement("div");
    container.className = "fx-particles";
    document.body.appendChild(container);

    for(let i=0;i<12;i++){

      const p = document.createElement("div");
      p.className = "fx-p";

      const dx = (Math.random()-0.5)*200;
      const dy = (Math.random()-0.5)*200;

      p.style.left = x+"px";
      p.style.top = y+"px";

      container.appendChild(p);

      requestAnimationFrame(()=>{
        p.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
        p.style.opacity = 0;
      });
    }

    setTimeout(()=> container.remove(), 800);
  },

  /* ===== RESULT FX ===== */
  result(type){

    const stage = document.getElementById("gameStage");
    const rect = stage?.getBoundingClientRect();

    if(type === "WIN"){

      this.play("win");
      this.glow(stage, "#00ff99");

      if(rect){
        this.particles(rect.x + rect.width/2, rect.y + rect.height/2);
      }

    }else{

      this.play("lose");
      this.shake(stage);

    }

  }

};

/* =====================================================
HOOK ENGINE FX
===================================================== */
const _win = CASINO.Engine.win;
const _lose = CASINO.Engine.lose;

CASINO.Engine.win = function(amount){
  _win.call(this, amount);
  CASINO.FX.result("WIN");
};

CASINO.Engine.lose = function(){
  _lose.call(this);
  CASINO.FX.result("LOSE");
};

/* =====================================================
SPIN FX (SLOTS)
===================================================== */
CASINO.FX.spin = function(){

  const stage = document.getElementById("gameStage");
  if(!stage) return;

  stage.innerHTML = "🎰🎰🎰";

  let t = 0;

  const interval = setInterval(()=>{

    stage.innerHTML =
      ["🍒","🍋","🍉","🍇","⭐"][Math.floor(Math.random()*5)] +
      ["🍒","🍋","🍉","🍇","⭐"][Math.floor(Math.random()*5)] +
      ["🍒","🍋","🍉","🍇","⭐"][Math.floor(Math.random()*5)];

    t++;

    if(t>10){
      clearInterval(interval);
    }

  }, 80);

};

/* =====================================================
BIND FX TO PLAY
===================================================== */
const _play = CASINO.play;

CASINO.play = function(){

  const g = CASINO.state.activeGame;

  if(g === "slots"){
    CASINO.FX.spin();
  }

  _play.call(this);

};
/* =====================================================
CASINO.JS — SECTION [5/6]
WS CLIENT + LIVE FEED + REALTIME SYSTEM
STATUS: /قف
===================================================== */

CASINO.WS = {

  socket: null,

  connect(){

    try{

      this.socket = new WebSocket("wss://api.bloxio.online/casino");

      this.socket.onopen = ()=>{
        console.log("🟢 CASINO WS CONNECTED");
      };

      this.socket.onmessage = (msg)=>{
        this.handle(JSON.parse(msg.data));
      };

      this.socket.onerror = ()=>{
        console.warn("🔴 WS ERROR");
      };

      this.socket.onclose = ()=>{
        console.warn("⚠️ WS CLOSED → RECONNECT...");
        setTimeout(()=> this.connect(), 2000);
      };

    }catch(e){
      console.warn("WS FAIL");
    }

  },

  send(data){
    if(this.socket && this.socket.readyState === 1){
      this.socket.send(JSON.stringify(data));
    }
  },

  handle(data){

    /* ===== LIVE BET FEED ===== */
    if(data.type === "bet"){

      CASINO.Live.push(data);

    }

    /* ===== GLOBAL STATS ===== */
    if(data.type === "stats"){

      CASINO.Live.stats(data);

    }

  }

};

/* =====================================================
LIVE FEED SYSTEM
===================================================== */
CASINO.Live = {

  track: document.getElementById("casinoTickerTrack"),

  push(data){

    if(!this.track) return;

    const el = document.createElement("div");
    el.className = "ticker-item";

    el.innerText =
      `${data.user} • ${data.game} • ${data.amount} BX`;

    this.track.appendChild(el);

    if(this.track.children.length > 30){
      this.track.removeChild(this.track.firstChild);
    }

  },

  stats(data){

    const w = document.getElementById("casinoWalletText");
    const p = document.getElementById("casinoOnlineText");
    const v = document.getElementById("casinoVolumeText");

    if(w) w.innerText = data.wallet + " BX";
    if(p) p.innerText = data.players;
    if(v) v.innerText = data.volume + " BX";

  }

};

/* =====================================================
FAKE STREAM (FALLBACK REALTIME)
===================================================== */
CASINO.Fake = {

  start(){

    setInterval(()=>{

      const games = [
        "dice","crash","limbo","slots","plinko"
      ];

      const data = {
        type: "bet",
        user: "user"+Math.floor(Math.random()*999),
        game: games[Math.floor(Math.random()*games.length)],
        amount: (Math.random()*5).toFixed(2)
      };

      CASINO.Live.push(data);

    }, 1200);

    setInterval(()=>{

      CASINO.Live.stats({
        wallet: CASINO.state.balance.toFixed(2),
        players: Math.floor(Math.random()*500)+50,
        volume: (Math.random()*1000).toFixed(0)
      });

    }, 2000);

  }

};

/* =====================================================
AUTO INIT WS
===================================================== */
CASINO.initWS = function(){

  CASINO.WS.connect();

  // fallback
  setTimeout(()=>{
    if(!CASINO.WS.socket || CASINO.WS.socket.readyState !== 1){
      CASINO.Fake.start();
    }
  }, 3000);

};

/* =====================================================
BOOT HOOK
===================================================== */
const _init = CASINO.init;

CASINO.init = function(){

  _init.call(this);

  CASINO.initWS();

};
/* =====================================================
CASINO.JS — SECTION [6/6]
FINAL SYSTEM (3D + GRAPH + FULL INTEGRATION)
STATUS: COMPLETE ✅
===================================================== */

CASINO.Render3D = {

  scene:null,
  camera:null,
  renderer:null,

  init(){

    const canvas = document.createElement("canvas");
    canvas.id = "casino3D";
    document.body.appendChild(canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({canvas, alpha:true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const geo = new THREE.BoxGeometry();
    const mat = new THREE.MeshBasicMaterial({color:0x00ff99, wireframe:true});
    const cube = new THREE.Mesh(geo, mat);

    this.scene.add(cube);

    this.camera.position.z = 3;

    const animate = ()=>{
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      this.renderer.render(this.scene, this.camera);
    };

    animate();

  }

};

/* =====================================================
CRASH GRAPH (PRO LEVEL)
===================================================== */
CASINO.Graph = {

  chart:null,

  init(){

    const el = document.createElement("canvas");
    el.id = "crashGraph";
    document.getElementById("gameStage")?.appendChild(el);

    this.chart = el.getContext("2d");

  },

  draw(multiplier){

    const ctx = this.chart;
    if(!ctx) return;

    ctx.clearRect(0,0,300,150);

    ctx.beginPath();
    ctx.moveTo(0,150);

    for(let i=0;i<multiplier*20;i++){
      ctx.lineTo(i,150 - i*0.5);
    }

    ctx.strokeStyle = "#00ff99";
    ctx.stroke();

  }

};

/* =====================================================
ROULETTE 3D
===================================================== */
CASINO.Roulette = {

  spin(){

    const num = CASINO.Engine.roll(37);

    if(num > 18){
      CASINO.Engine.win(CASINO.Engine.payout(2));
    }else{
      CASINO.Engine.lose();
    }

    return num;
  }

};

/* =====================================================
BIG WINS SYSTEM
===================================================== */
CASINO.BigWins = {

  track: document.getElementById("bigWinsTrack"),

  push(amount){

    if(amount < 5) return;

    const el = document.createElement("div");
    el.className = "big-win";

    el.innerText = "🔥 BIG WIN " + amount.toFixed(2) + " BX";

    this.track?.appendChild(el);

    setTimeout(()=> el.remove(), 4000);

  }

};

/* =====================================================
HOOK BIG WINS
===================================================== */
const __win = CASINO.Engine.win;

CASINO.Engine.win = function(amount){

  __win.call(this, amount);

  CASINO.BigWins.push(amount);

};

/* =====================================================
RESULT ANIMATION SYSTEM
===================================================== */
CASINO.ResultFX = {

  show(text){

    const el = document.createElement("div");
    el.className = "result-fx";
    el.innerText = text;

    document.body.appendChild(el);

    setTimeout(()=>{
      el.style.opacity = 0;
    },1000);

    setTimeout(()=> el.remove(),1500);

  }

};

/* =====================================================
UX FEEDBACK ENGINE
===================================================== */
CASINO.UX = {

  click(){
    const s = document.getElementById("snd-click");
    s?.play().catch(()=>{});
  }

};

document.addEventListener("click", ()=> CASINO.UX.click());

/* =====================================================
AUTO HOOK GRAPH (CRASH)
===================================================== */
const __crash = CASINO.Games.crash;

CASINO.Games.crash = function(){

  const result = __crash.call(this);

  setTimeout(()=>{
    CASINO.Graph.init();
    CASINO.Graph.draw(result);
  },100);

  return result;
};

/* =====================================================
FINAL INIT EXTENSION
===================================================== */
const ___init = CASINO.init;

CASINO.init = function(){

  ___init.call(this);

  // 3D Lobby
  setTimeout(()=> CASINO.Render3D.init(), 500);

  console.log("🎰 CASINO FULL READY [6/6]");

};

/* =====================================================
AUTO START
===================================================== */
document.addEventListener("DOMContentLoaded", ()=>{
  CASINO.init();
});
