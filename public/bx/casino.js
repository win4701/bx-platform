/* =========================================================
   BLOXIO CASINO — CORE V5 (PART 1)
========================================================= */

(() => {
"use strict";

/* ================= HELPERS ================= */

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);

const formatMoney=(n)=>{
  const num=Number(n||0);
  return num.toLocaleString(undefined,{
    minimumFractionDigits:num<100?2:0,
    maximumFractionDigits:2
  });
};

const uid=()=>Math.random().toString(36).slice(2,10);

/* ================= API (READY) ================= */

const BX_API={
  async play(game,data){
    const res=await fetch("/api/casino/play",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ game,...data })
    });
    return await res.json();
  }
};

/* ================= CASINO ================= */

const CASINO={

  root:null,
  lobby:null,
  gameView:null,

  state:{
    wallet:0,
    currentGame:null,
    isPlaying:false,
    betAmount:1,
    activeEngine:null
  },

  games:[
    {id:"dice",name:"Dice",icon:"🎲"},
    {id:"crash",name:"Crash",icon:"📈"},
    {id:"coinflip",name:"Coinflip",icon:"🪙"},
    {id:"slots",name:"Slots",icon:"🎰"},
    {id:"mines",name:"Brids",icon:"💣"}
  ],

/* ================= INIT ================= */

init(){
  this.root=document.getElementById("casino");
  if(!this.root) return;

  this.buildShell();
  this.renderLobby();

  window.CASINO=this;
},

/* ================= SHELL ================= */

buildShell(){
  this.root.innerHTML=`
    <div id="casinoLobby"></div>
    <div id="casinoGameView" class="hidden"></div>
  `;

  this.lobby=$("#casinoLobby",this.root);
  this.gameView=$("#casinoGameView",this.root);
},

/* ================= LOBBY ================= */

renderLobby(){
  this.lobby.innerHTML=`
    <h2>🎰 Bloxio Casino</h2>

    <div>Wallet: <b id="walletText">${formatMoney(this.state.wallet)} BX</b></div>

    <div id="gamesGrid">
      ${this.games.map(g=>`
        <button class="gameBtn" data-id="${g.id}">
          ${g.icon} ${g.name}
        </button>
      `).join("")}
    </div>
  `;

  $$(".gameBtn",this.lobby).forEach(btn=>{
    btn.onclick=()=>this.openGame(btn.dataset.id);
  });
},

/* ================= OPEN GAME ================= */

openGame(id){
  const game=this.games.find(g=>g.id===id);
  if(!game) return;

  this.state.currentGame=game;

  this.lobby.classList.add("hidden");
  this.gameView.classList.remove("hidden");

  this.renderGame(game);
},

/* ================= GAME VIEW ================= */

renderGame(game){
  this.gameView.innerHTML=`
    <button id="backBtn">← Back</button>

    <h2>${game.icon} ${game.name}</h2>

    <div id="gameStage">Loading...</div>

    <input id="betInput" type="number" min="1" value="${this.state.betAmount}">

    <button id="playBtn">Play</button>
  `;

  $("#backBtn").onclick=()=>this.back();
  $("#playBtn").onclick=()=>this.play();

  this.mountGame(game);
},

/* ================= BACK ================= */

back(){
  this.state.currentGame=null;
  this.gameView.classList.add("hidden");
  this.lobby.classList.remove("hidden");
  this.renderLobby();
},

/* ================= PLAY ================= */

async play(){
  if(this.state.isPlaying) return;

  const amount=Math.floor(Number($("#betInput").value||0));

  if(amount<1) return alert("Min 1 BX");
  if(amount>this.state.wallet) return alert("No balance");

  this.state.wallet-=amount;
  this.updateWallet();

  this.state.isPlaying=true;

  const res=await BX_API.play(this.state.currentGame.id,{
    bet:amount
  });

  if(this.state.activeEngine?.resolve){
    this.state.activeEngine.resolve(res);
  }
},

/* ================= FINISH ================= */

finish(result){
  const {win,payout}=result;

  if(payout>0) this.state.wallet+=payout;

  this.updateWallet();

  this.state.isPlaying=false;

  alert(win?"WIN":"LOSE");
},

/* ================= WALLET ================= */

updateWallet(){
  const el=$("#walletText");
  if(el) el.textContent=formatMoney(this.state.wallet)+" BX";
},

/* ================= MOUNT GAME ================= */

mountGame(game){
  const stage=$("#gameStage");

  const engines={
    dice:this.createDice(),
    crash:this.createCrash()
  };

  const engine=engines[game.id];

  if(!engine){
    stage.innerHTML="Game not ready";
    return;
  }

  this.state.activeEngine=engine;

  engine.mount(stage);
},

/* ================= ENGINES FINAL (12 GAMES) ================= */

createDice(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="dice">--</div>`;
      el=stage.querySelector("#dice");
    },
    resolve(res){
      const {roll,win,payout,multiplier}=res;
      el.textContent=roll.toFixed(2);
      setTimeout(()=>CASINO.finish({win,payout,multiplier}),400);
    }
  };
},

createCrash(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="crash">1.00x</div>`;
      el=stage.querySelector("#crash");
    },
    resolve(res){
      const {multiplier,win,payout}=res;
      let v=1;
      const i=setInterval(()=>{
        v+=0.05;
        if(v>=multiplier){
          clearInterval(i);
          el.textContent=multiplier.toFixed(2)+"x";
          CASINO.finish({win,payout,multiplier});
        }else{
          el.textContent=v.toFixed(2)+"x";
        }
      },40);
    }
  };
},

createCoinflip(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="coin">🪙</div>`;
      el=stage.querySelector("#coin");
    },
    resolve(res){
      const {result,win,payout,multiplier}=res;
      el.textContent="🔄";
      setTimeout(()=>{
        el.textContent=result==="heads"?"🙂":"🦅";
        CASINO.finish({win,payout,multiplier});
      },700);
    }
  };
},

createLimbo(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="limbo">1.00x</div>`;
      el=stage.querySelector("#limbo");
    },
    resolve(res){
      const {roll,win,payout,multiplier}=res;
      let v=1;
      const i=setInterval(()=>{
        v+=0.1;
        if(v>=roll){
          clearInterval(i);
          el.textContent=roll.toFixed(2)+"x";
          CASINO.finish({win,payout,multiplier});
        }else{
          el.textContent=v.toFixed(2)+"x";
        }
      },30);
    }
  };
},

createPlinko(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="plinko">⬇️</div>`;
      el=stage.querySelector("#plinko");
    },
    resolve(res){
      const {multiplier,win,payout}=res;
      setTimeout(()=>{
        el.textContent=multiplier+"x";
        CASINO.finish({win,payout,multiplier});
      },600);
    }
  };
},

createBlackjack(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="bj">🃏</div>`;
      el=stage.querySelector("#bj");
    },
    resolve(res){
      const {win,payout,multiplier}=res;
      el.textContent="♠️♥️";
      setTimeout(()=>{
        CASINO.finish({win,payout,multiplier});
      },800);
    }
  };
},

createHiLo(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="hilo">?</div>`;
      el=stage.querySelector("#hilo");
    },
    resolve(res){
      const {card,win,payout,multiplier}=res;
      el.textContent=card;
      setTimeout(()=>{
        CASINO.finish({win,payout,multiplier});
      },600);
    }
  };
},

createSlots(){
  let cells=[];
  return{
    mount(stage){
      stage.innerHTML=`
        <div style="display:flex;gap:10px;justify-content:center">
          <div class="c">❔</div>
          <div class="c">❔</div>
          <div class="c">❔</div>
        </div>
      `;
      cells=[...stage.querySelectorAll(".c")];
    },
    resolve(res){
      const {symbols,win,payout,multiplier}=res;
      cells.forEach((c,i)=>c.textContent=symbols[i]);
      setTimeout(()=>{
        CASINO.finish({win,payout,multiplier});
      },500);
    }
  };
},

createBirds(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="birds">🐦</div>`;
      el=stage.querySelector("#birds");
    },
    resolve(res){
      const {safe,win,payout,multiplier}=res;
      el.textContent=safe?"🐦 SAFE":"💣 BOOM";
      setTimeout(()=>CASINO.finish({win,payout,multiplier}),600);
    }
  };
},

createAirBoss(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="air">✈️ 1.00x</div>`;
      el=stage.querySelector("#air");
    },
    resolve(res){
      const {multiplier,win,payout}=res;
      let v=1;
      const i=setInterval(()=>{
        v+=0.05;
        if(v>=multiplier){
          clearInterval(i);
          el.textContent="💥 "+multiplier+"x";
          CASINO.finish({win,payout,multiplier});
        }else{
          el.textContent="✈️ "+v.toFixed(2)+"x";
        }
      },40);
    }
  };
},

createFruitParty(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="fruit">🍓🍇</div>`;
      el=stage.querySelector("#fruit");
    },
    resolve(res){
      const {win,payout,multiplier}=res;
      el.textContent="🍒🍍";
      setTimeout(()=>CASINO.finish({win,payout,multiplier}),500);
    }
  };
},

createBananaFarm(){
  let el;
  return{
    mount(stage){
      stage.innerHTML=`<div id="banana">🍌</div>`;
      el=stage.querySelector("#banana");
    },
    resolve(res){
      const {win,payout,multiplier}=res;
      el.textContent="🍌🍌🍌";
      setTimeout(()=>CASINO.finish({win,payout,multiplier}),500);
    }
  };
}

/* ================= BOOT ================= */

document.addEventListener("DOMContentLoaded",()=>CASINO.init());

})();

/* =========================================================
   BLOXIO CASINO — PART 3 (REAL-TIME SYSTEM)
========================================================= */

/* ================= WEBSOCKET ================= */

const BX_WS = {

  socket: null,

  connect() {
    try {
      this.socket = new WebSocket("ws://localhost:3000");

      this.socket.onopen = () => {
        console.log("WS CONNECTED");
      };

      this.socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        BX_LIVE.handle(data);
      };

      this.socket.onerror = () => {
        console.warn("WS ERROR");
      };

      this.socket.onclose = () => {
        console.warn("WS CLOSED — retrying...");
        setTimeout(() => this.connect(), 2000);
      };

    } catch (e) {
      console.error("WS FAIL", e);
    }
  }

};

/* ================= LIVE FEED ================= */

const BX_LIVE = {

  list: [],

  handle(data) {
    if (data.type === "bet") {
      this.add(data.payload);
    }

    if (data.type === "crash_tick") {
      this.updateCrash(data.payload);
    }
  },

  add(bet) {
    this.list.unshift(bet);
    if (this.list.length > 20) this.list.pop();
    this.render();
  },

  render() {
    let el = document.getElementById("liveFeed");
    if (!el) return;

    el.innerHTML = this.list.map(b => `
      <div class="liveItem">
        ${b.user} • ${b.game} • ${b.bet} BX → ${b.payout} BX
      </div>
    `).join("");
  },

  updateCrash(payload) {
    const el = document.getElementById("crashMultiLive");
    if (!el) return;

    el.textContent = payload.multiplier.toFixed(2) + "x";
  }

};

/* ================= AUTO BET ================= */

const BX_AUTO = {

  running: false,
  config: {
    bet: 1,
    onWin: 1,
    onLose: 2
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  },

  stop() {
    this.running = false;
  },

  async loop() {
    if (!this.running) return;

    await CASINO.play();

    setTimeout(() => {
      this.loop();
    }, 1500);
  }

};

/* ================= UI ADDONS ================= */

function injectLiveUI() {
  const casino = document.getElementById("casino");
  if (!casino) return;

  const box = document.createElement("div");
  box.innerHTML = `
    <div style="margin-top:10px">
      <h4>🔥 Live Bets</h4>
      <div id="liveFeed" style="font-size:12px"></div>
    </div>
  `;
  casino.appendChild(box);
}

function injectAutoUI() {
  const gameView = document.getElementById("casinoGameView");
  if (!gameView) return;

  const box = document.createElement("div");

  box.innerHTML = `
    <div style="margin-top:10px">
      <button id="autoStart">Start Auto</button>
      <button id="autoStop">Stop Auto</button>
    </div>
  `;

  gameView.appendChild(box);

  document.getElementById("autoStart").onclick = () => BX_AUTO.start();
  document.getElementById("autoStop").onclick = () => BX_AUTO.stop();
}

/* ================= EXTEND CASINO ================= */

const oldRenderGame = CASINO.renderGame;

CASINO.renderGame = function(game) {
  oldRenderGame.call(this, game);

  injectAutoUI();
};

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  BX_WS.connect();
  injectLiveUI();
});
