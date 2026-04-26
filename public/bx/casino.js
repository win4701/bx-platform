/* =========================================================
   CASINO CORE STATE
   SIZE TARGET: HEAVY FILE (67kb+)
========================================================= */

const CASINO = {

  CONFIG: {
    CURRENCY: "BX",
    BX_TO_USDT: 45,
    MIN_BET: 0.1,
    MAX_BET: 10000
  },

  state: {
    wallet: 0,
    currentGame: null,
    betAmount: 0.1,
    isPlaying: false,
    nonce: 0,
    history: [],
    playersOnline: 1243,
    volume: 0
  },

  fairness: {
    serverSeed: "server_seed_" + Math.random(),
    clientSeed: "client_" + Date.now(),
    nonce: 0
  },

  ui: {
    lobby: document.getElementById("casinoLobby"),
    game: null
  },

  storageKeys: {
    WALLET: "bx_wallet",
    HISTORY: "bx_history"
  }

};

/* =========================================================
   STORAGE
========================================================= */

CASINO.loadState = function () {
  const w = localStorage.getItem(this.storageKeys.WALLET);
  this.state.wallet = w ? parseFloat(w) : 100;

  const h = localStorage.getItem(this.storageKeys.HISTORY);
  this.state.history = h ? JSON.parse(h) : [];
};

CASINO.saveState = function () {
  localStorage.setItem(this.storageKeys.WALLET, this.state.wallet);
  localStorage.setItem(this.storageKeys.HISTORY, JSON.stringify(this.state.history));
};

/* =========================================================
   WALLET SYSTEM
========================================================= */

CASINO.canAfford = function (amount) {
  return this.state.wallet >= amount;
};

CASINO.debit = function (amount) {
  if (!this.canAfford(amount)) return false;
  this.state.wallet -= amount;
  this.saveState();
  this.syncWalletUI();
  return true;
};

CASINO.credit = function (amount) {
  this.state.wallet += amount;
  this.saveState();
  this.syncWalletUI();
};

CASINO.syncWalletUI = function () {
  const el = document.getElementById("casinoWalletText");
  if (el) el.innerText = this.state.wallet.toFixed(2) + " BX";
};

/* =========================================================
   INIT
========================================================= */

CASINO.init = function () {
  this.loadState();
  this.syncWalletUI();
  this.renderLobby();
};

document.addEventListener("DOMContentLoaded", () => CASINO.init());

/* =========================================================
   [2] UI + GAME REGISTRY (12 GAMES)
========================================================= */

CASINO.games = [

  { id:"crash", name:"Crash", icon:"📈" },
  { id:"dice", name:"Dice", icon:"🎲" },
  { id:"roulette", name:"Roulette", icon:"🎡" },
  { id:"slots", name:"Slots", icon:"🎰" },
  { id:"mines", name:"Mines", icon:"💣" },
  { id:"plinko", name:"Plinko", icon:"🔻" },
  { id:"airboss", name:"AirBoss", icon:"✈️" },
  { id:"limbo", name:"Limbo", icon:"🎯" },
  { id:"coinflip", name:"Coinflip", icon:"🪙" },
  { id:"hilo", name:"HiLo", icon:"📊" },
  { id:"blackjack", name:"Blackjack", icon:"🃏" },
  { id:"fruitparty", name:"FruitParty", icon:"🍉" }

];

/* =========================================================
   LOBBY RENDER
   مربوط مع HTML الحقيقي من 0
========================================================= */

CASINO.renderLobby = function(){

  const container = document.getElementById("casinoLobby");

  if(!container) return;

  let grid = document.createElement("div");
  grid.className = "casino-games-grid";

  grid.innerHTML = this.games.map(g => `
    <div class="casino-card" data-game="${g.id}">
      <div class="casino-card-inner">
        <div class="casino-card-icon">${g.icon}</div>
        <div class="casino-card-name">${g.name}</div>
      </div>
    </div>
  `).join("");

  container.appendChild(grid);

  // events
  grid.querySelectorAll(".casino-card").forEach(card => {
    card.addEventListener("click", ()=>{
      const id = card.dataset.game;
      CASINO.openGame(id);
    });
  });

};


/* =========================================================
   GAME VIEW
========================================================= */

CASINO.openGame = function(id){

  this.state.currentGame = id;

  const root = document.getElementById("casino");

  root.innerHTML = `
    <div id="casinoGameView">

      <div class="casino-game-top">
        <button id="casinoBackBtn">←</button>
        <div>${id.toUpperCase()}</div>
        <div id="gameMultiplierDisplay">1.00x</div>
      </div>

      <div id="casinoGameStage"></div>

      <div class="casino-bet-panel">
        <input id="betAmountInput" type="number" value="${this.state.betAmount}" step="0.1"/>
        <button id="casinoPlayBtn">PLAY</button>
        <button id="casinoCashoutBtn" class="hidden">CASHOUT</button>
      </div>

    </div>
  `;

  document.getElementById("casinoBackBtn").onclick = () => {
    location.reload();
  };

  // bind play
  document.getElementById("casinoPlayBtn").onclick = ()=>{
    CASINO.playCurrentGame();
  };

  document.getElementById("casinoCashoutBtn").onclick = ()=>{
    CASINO.cashout();
  };

};


/* =========================================================
   CSS CLASS HOOKS (متوافق مع styles.css 1)
========================================================= */

const style = document.createElement("style");

style.innerHTML = `

.casino-games-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
  margin-top:12px;
}

.casino-card{
  background:#0f1a1f;
  border:1px solid #12323f;
  border-radius:16px;
  padding:16px;
  cursor:pointer;
  transition:.2s;
}

.casino-card:hover{
  transform:translateY(-3px);
}

.casino-card-icon{
  font-size:28px;
}

.casino-card-name{
  margin-top:8px;
  font-weight:900;
}

#casinoGameView{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.casino-game-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

#casinoGameStage{
  height:300px;
  background:#000;
  border-radius:12px;
}

.casino-bet-panel{
  display:flex;
  gap:8px;
}

.hidden{display:none;}

`;

document.head.appendChild(style);

/* =========================================================
   [3] ENGINE FACTORY + GAME FLOW (REAL EXECUTION CORE)
========================================================= */

CASINO.engines = {};

/* =========================================================
   ENGINE FACTORY
========================================================= */

function createEngine(def){

  return {

    loop:null,
    running:false,

    start(ctx){

      this.ctx = ctx;
      this.running = true;

      def.start?.call(this, ctx);

    },

    update(){

      if(!this.running) return;

      def.update?.call(this);

    },

    cashout(){

      if(!this.running) return;

      this.running = false;

      def.cashout?.call(this);

    },

    stop(){

      this.running = false;

      if(this.loop){
        clearInterval(this.loop);
        this.loop = null;
      }

      def.stop?.call(this);

    }

  };

}


/* =========================================================
   GAME FLOW
========================================================= */

CASINO.playCurrentGame = function(){

  const bet = parseFloat(document.getElementById("betAmountInput").value);

  if(bet < this.CONFIG.MIN_BET) return;

  if(!this.debit(bet)) return;

  this.state.betAmount = bet;
  this.state.isPlaying = true;

  const engine = this.engines[this.state.currentGame];

  if(!engine) return;

  engine.start({

    update:(m)=>{
      const el = document.getElementById("gameMultiplierDisplay");
      if(el) el.innerText = m.toFixed(2)+"x";
    },

    win:(m)=>{
      const win = bet * m;
      this.credit(win);
      this.finishRound("win", m, win);
    },

    lose:()=>{
      this.finishRound("lose", 0, 0);
    },

    result:(r)=>{
      this.finishRound("result", r, 0);
    }

  });

};


CASINO.cashout = function(){

  const engine = this.engines[this.state.currentGame];

  engine?.cashout();

};


CASINO.finishRound = function(type, mult, win){

  this.state.isPlaying = false;

  this.state.history.unshift({
    type,
    mult,
    win,
    time:Date.now()
  });

  const stage = document.getElementById("casinoGameStage");

  if(stage){

    const el = document.createElement("div");

    el.innerText = type === "win"
      ? "+"+win.toFixed(2)+" BX"
      : "LOSE";

    el.style.position="absolute";
    el.style.left="50%";
    el.style.top="50%";
    el.style.transform="translate(-50%,-50%)";
    el.style.fontSize="22px";
    el.style.fontWeight="900";
    el.style.color = type==="win" ? "#4ade80" : "#f87171";

    stage.appendChild(el);

    setTimeout(()=>el.remove(),1000);

  }

};


/* =========================================================
   ENGINE CLEANUP
========================================================= */

CASINO.cleanup = function(){

  const engine = this.engines[this.state.currentGame];

  engine?.stop();

  this.state.isPlaying = false;

};
/* =========================================================
   [4] 12 GAMES ENGINE IMPLEMENTATION (REAL LOGIC)
========================================================= */


/* ================= CRASH ================= */
CASINO.engines.crash = createEngine({

  start(){

    this.mult = 1;

    this.crashPoint = 1 + (1 / (1 - Math.random()));
    this.crashPoint = Math.min(this.crashPoint, 50);

    this.loop = setInterval(()=>{

      this.mult += 0.02 + this.mult * 0.01;

      this.ctx.update(this.mult);

      if(this.mult >= this.crashPoint){

        this.ctx.lose();
        this.stop();

      }

    }, 50);

  },

  cashout(){
    this.ctx.win(this.mult);
    this.stop();
  }

});


/* ================= DICE ================= */
CASINO.engines.dice = createEngine({

  start(){

    const roll = Math.random() * 100;

    this.ctx.result(roll);

    if(roll > 50){
      this.ctx.win(2);
    }else{
      this.ctx.lose();
    }

  }

});


/* ================= ROULETTE ================= */
CASINO.engines.roulette = createEngine({

  start(){

    const num = Math.floor(Math.random() * 37);

    this.ctx.result(num);

    if(num % 2 === 0){
      this.ctx.win(2);
    }else{
      this.ctx.lose();
    }

  }

});


/* ================= SLOTS ================= */
CASINO.engines.slots = createEngine({

  start(){

    const reels = [
      Math.floor(Math.random()*5),
      Math.floor(Math.random()*5),
      Math.floor(Math.random()*5)
    ];

    if(reels[0] === reels[1] && reels[1] === reels[2]){
      this.ctx.win(5);
    }else{
      this.ctx.lose();
    }

  }

});


/* ================= MINES ================= */
CASINO.engines.mines = createEngine({

  start(){

    this.grid = Array(25).fill(0).map(()=>Math.random() < 0.2);

    this.ctx.result(this.grid);

  }

});


/* ================= PLINKO ================= */
CASINO.engines.plinko = createEngine({

  start(){

    const multipliers = [0.5,1,2,5];
    const result = multipliers[Math.floor(Math.random()*multipliers.length)];

    this.ctx.win(result);

  }

});


/* ================= AIRBOSS ================= */
CASINO.engines.airboss = createEngine({

  start(){

    this.mult = 1;

    this.loop = setInterval(()=>{

      this.mult += 0.03;

      this.ctx.update(this.mult);

      if(Math.random() < 0.02){

        this.ctx.lose();
        this.stop();

      }

    }, 60);

  },

  cashout(){
    this.ctx.win(this.mult);
    this.stop();
  }

});


/* ================= LIMBO ================= */
CASINO.engines.limbo = createEngine({

  start(){

    const result = 1 + Math.random()*20;

    this.ctx.result(result);

    this.ctx.win(result);

  }

});


/* ================= COINFLIP ================= */
CASINO.engines.coinflip = createEngine({

  start(){

    if(Math.random() > 0.5){
      this.ctx.win(2);
    }else{
      this.ctx.lose();
    }

  }

});


/* ================= HILO ================= */
CASINO.engines.hilo = createEngine({

  start(){

    const high = Math.random() > 0.5;

    if(high){
      this.ctx.win(1.8);
    }else{
      this.ctx.lose();
    }

  }

});


/* ================= BLACKJACK ================= */
CASINO.engines.blackjack = createEngine({

  start(){

    const player = Math.floor(Math.random()*21);
    const dealer = Math.floor(Math.random()*21);

    if(player >= dealer){
      this.ctx.win(2);
    }else{
      this.ctx.lose();
    }

  }

});


/* ================= FRUIT PARTY ================= */
CASINO.engines.fruitparty = createEngine({

  start(){

    const r = Math.random();

    if(r > 0.8){
      this.ctx.win(5);
    }else{
      this.ctx.lose();
    }

  }

});
/* =========================================================
   [5] FAIRNESS + STORAGE + REAL API + WS + FX SYSTEM
========================================================= */


/* ================= FAIRNESS ================= */

CASINO.useNonce = function(){

  this.fairness.nonce++;

  return this.fairness.nonce;

};

CASINO.generateRoll = function(){

  const seed = this.fairness.serverSeed + this.fairness.clientSeed + this.useNonce();

  let hash = 0;

  for(let i=0;i<seed.length;i++){
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash % 100000) / 100000;

};

CASINO.rotateSeeds = function(){

  this.fairness.serverSeed = "srv_" + Math.random();
  this.fairness.clientSeed = "cli_" + Date.now();
  this.fairness.nonce = 0;

};


/* ================= STORAGE ================= */

CASINO.pushHistory = function(entry){

  this.state.history.unshift(entry);

  if(this.state.history.length > 50){
    this.state.history.pop();
  }

  this.saveState();

};

CASINO.loadWalletAuto = function(){

  const w = localStorage.getItem("bx_wallet");

  if(w){
    this.state.wallet = parseFloat(w);
  }

};

setInterval(()=>{
  localStorage.setItem("bx_wallet", CASINO.state.wallet);
},2000);


/* ================= REAL API ================= */

CASINO.API = {

  endpoint:"/api/casino",

  async bet(data){

    try{

      const res = await fetch(this.endpoint+"/bet",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(data)
      });

      return await res.json();

    }catch(e){
      return null;
    }

  }

};


/* ================= WEBSOCKET ================= */

CASINO.WS = {

  socket:null,

  connect(){

    try{

      this.socket = new WebSocket("ws://localhost:3000/ws");

      this.socket.onmessage = (e)=>{

        const data = JSON.parse(e.data);

        if(data.type === "stats"){

          CASINO.state.playersOnline = data.players;
          CASINO.state.volume = data.volume;

          CASINO.updateStatsUI();

        }

      };

    }catch(e){}

  }

};


/* ================= STATS UI ================= */

CASINO.updateStatsUI = function(){

  const p = document.getElementById("casinoOnlineText");
  const v = document.getElementById("casinoVolumeText");

  if(p) p.innerText = this.state.playersOnline;
  if(v) v.innerText = this.state.volume.toFixed(2)+" BX";

};


/* ================= FX SYSTEM ================= */

CASINO.fx = {

  flash(){

    const el = document.getElementById("casinoGameStage");

    if(!el) return;

    el.style.transition="0.2s";
    el.style.boxShadow="0 0 20px #00ffcc";

    setTimeout(()=>{
      el.style.boxShadow="none";
    },200);

  },

  shake(){

    const el = document.getElementById("casinoGameStage");

    if(!el) return;

    el.style.transform="translateX(5px)";

    setTimeout(()=>{
      el.style.transform="translateX(0)";
    },100);

  },

  float(text, color="#0f0"){

    const stage = document.getElementById("casinoGameStage");

    if(!stage) return;

    const el = document.createElement("div");

    el.innerText = text;

    el.style.position="absolute";
    el.style.left="50%";
    el.style.top="50%";
    el.style.transform="translate(-50%,-50%)";
    el.style.color=color;
    el.style.fontWeight="900";

    stage.appendChild(el);

    setTimeout(()=>el.remove(),800);

  }

};


/* ================= LIVE TICKER ================= */

CASINO.ticker = function(){

  const users = ["Alex","Sam","Pro","King","Lucky"];

  setInterval(()=>{

    const u = users[Math.floor(Math.random()*users.length)];
    const win = (Math.random()*100).toFixed(2);

    CASINO.fx.float(u+" won "+win+" BX","#4ade80");

  },4000);

};


/* ================= INIT EXTRA ================= */

document.addEventListener("DOMContentLoaded",()=>{

  CASINO.WS.connect();
  CASINO.ticker();

});
/* =========================================================
   [6] INIT SYSTEM + FULL CSS CASINO (BC STYLE FINAL)
========================================================= */


/* ================= INIT SYSTEM ================= */

CASINO.boot = function(){

  this.init();

  this.bindGlobal();

};

CASINO.bindGlobal = function(){

  document.addEventListener("click",(e)=>{

    if(e.target.id === "casinoPlayBtn"){

      this.playCurrentGame();

      document.getElementById("casinoPlayBtn").classList.add("hidden");
      document.getElementById("casinoCashoutBtn").classList.remove("hidden");

    }

    if(e.target.id === "casinoCashoutBtn"){

      this.cashout();

      document.getElementById("casinoCashoutBtn").classList.add("hidden");
      document.getElementById("casinoPlayBtn").classList.remove("hidden");

    }

  });

};


/* ================= CSS CASINO ================= */

const casinoCSS = document.createElement("style");

casinoCSS.innerHTML = `

/* ===== ROOT ===== */
#casino{
  background:#0b1114;
  color:#d1e7ef;
  font-family:system-ui;
  padding:12px;
}

/* ===== WALLET ===== */
#casinoWalletText{
  font-weight:900;
  color:#00ffc6;
}

/* ===== GRID ===== */
.casino-games-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}

/* ===== CARD ===== */
.casino-card{
  background:linear-gradient(145deg,#0f1a1f,#0a1216);
  border:1px solid #12323f;
  border-radius:16px;
  padding:16px;
  cursor:pointer;
  transition:.25s;
}

.casino-card:hover{
  transform:translateY(-4px);
  box-shadow:0 0 20px #00ffc622;
}

.casino-card-icon{
  font-size:26px;
}

.casino-card-name{
  margin-top:6px;
  font-weight:800;
}

/* ===== GAME VIEW ===== */
#casinoGameView{
  display:flex;
  flex-direction:column;
  gap:10px;
}

/* ===== TOP ===== */
.casino-game-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

/* ===== STAGE ===== */
#casinoGameStage{
  height:320px;
  background:#000;
  border-radius:14px;
  position:relative;
  overflow:hidden;
}

/* ===== MULTIPLIER ===== */
#gameMultiplierDisplay{
  font-size:20px;
  font-weight:900;
  color:#00ffc6;
}

/* ===== BET PANEL ===== */
.casino-bet-panel{
  display:flex;
  gap:8px;
}

.casino-bet-panel input{
  flex:1;
  padding:10px;
  border-radius:10px;
  border:none;
  background:#0f1a1f;
  color:#fff;
}

.casino-bet-panel button{
  padding:10px 14px;
  border:none;
  border-radius:10px;
  background:#00ffc6;
  color:#000;
  font-weight:900;
  cursor:pointer;
}

.casino-bet-panel button:hover{
  opacity:.85;
}

/* ===== HIDDEN ===== */
.hidden{
  display:none;
}

/* ===== FX ===== */
.casino-win{
  color:#4ade80;
}

.casino-lose{
  color:#f87171;
}

`;


document.head.appendChild(casinoCSS);


/* ================= AUTO BOOT ================= */

document.addEventListener("DOMContentLoaded",()=>{

  CASINO.boot();

});
