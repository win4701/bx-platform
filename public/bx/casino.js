/* =========================================================
   BLOXIO CASINO — MONSTER MODE (FINAL PRODUCTION)
========================================================= */

(() => {
"use strict";

/* ================= CONFIG ================= */

const CONFIG = {
  MIN_BET: 1,
  WS_URL: "ws://localhost:3000"
};

/* ================= STATE ================= */

const state = {
  game:null,
  wallet:0,
  phase:"IDLE"
};

const LOCK = {
  play:false,
  ws:false
};

/* ================= HELPERS ================= */

const $ = (s,r=document)=>r.querySelector(s);

/* ================= API ================= */

const API = {

  async play(game,data){

    try{
      const res = await fetch("/api/casino/play",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ game,...data })
      });

      if(!res.ok) throw new Error();
      return await res.json();

    }catch{
      return { error:true };
    }
  },

  async wallet(){
    const res = await fetch("/api/wallet");
    return await res.json();
  }

};

/* ================= WEBSOCKET ================= */

const WS = {

  socket:null,

  connect(){

    if(LOCK.ws) return;
    LOCK.ws = true;

    this.socket = new WebSocket(CONFIG.WS_URL);

    this.socket.onmessage = (msg)=>{
      const d = JSON.parse(msg.data);

      if(d.type==="crash_start") startCrash();
      if(d.type==="crash_tick") updateCrash(d.multiplier);
      if(d.type==="crash_end") endCrash(d.multiplier);
      if(d.type==="bets") renderLiveBets(d.players);
    };

    this.socket.onclose = ()=>{
      LOCK.ws=false;
      setTimeout(()=>this.connect(),2000);
    };

  }
};

/* ================= INIT ================= */

function init(){

  if(!document.getElementById("casino")) return;

  bindEvents();
  syncWallet();
  WS.connect();

  console.log("💀 MONSTER CASINO READY");
}

/* ================= EVENTS ================= */

function bindEvents(){

  document.getElementById("casino").onclick = (e)=>{

    const card = e.target.closest(".casino-game-card");
    if(card) return openGame(card.dataset.game);

    if(e.target.id==="casinoBackBtn") return back();

    if(e.target.id==="casinoPlayBtn") return play();
  };
}

/* ================= WALLET ================= */

async function syncWallet(){
  try{
    const r = await API.wallet();
    state.wallet = r.balance || 0;
    updateWallet();
  }catch{}
}

function updateWallet(){
  const el = document.getElementById("casinoWalletText");
  if(el) el.textContent = state.wallet.toFixed(2)+" BX";
}

/* ================= NAV ================= */

function back(){

  cleanup();

  const grid = $("#casinoGamesGrid");
  if(grid) grid.style.display="grid";
}

function openGame(id){

  state.game = id;

  const grid = $("#casinoGamesGrid");
  if(grid) grid.style.display="none";

  const root = $("#casinoLobby");

  let view = $("#casinoGameView");

  if(!view){
    view = document.createElement("div");
    view.id="casinoGameView";
    root.appendChild(view);
  }

  view.innerHTML = `
    <button id="casinoBackBtn">← Back</button>
    <h2>${id}</h2>

    <div id="gameStage"></div>

    <input id="bet" value="1">

    ${id==="crash" ? `<input id="auto" placeholder="Auto x">` : ""}

    <button id="casinoPlayBtn">Play</button>
  `;
}

/* ================= PLAY ================= */

async function play(){

  if(LOCK.play) return;

  const bet = Number($("#bet")?.value||0);
  if(bet < CONFIG.MIN_BET) return alert("Min 1 BX");

  LOCK.play = true;
  disableBtn(true);

  const stage = $("#gameStage");
  if(stage) stage.textContent="Processing...";

  sendBet(bet);

  const res = await API.play(state.game,{ bet });

  if(res.error){
    alert("Error");
    return unlock();
  }

  state.wallet = res.balance;
  updateWallet();

  renderResult(res);

  unlock();
}

function unlock(){
  LOCK.play=false;
  disableBtn(false);
}

function disableBtn(x){
  const b=$("#casinoPlayBtn");
  if(b){
    b.disabled=x;
    b.style.opacity=x?0.5:1;
  }
}

/* ================= ENGINES ================= */

const Engines = {
  dice:r=>`🎲 ${r.roll?.toFixed(2)}`,
  limbo:r=>`🎯 ${r.multiplier?.toFixed(2)}x`,
  crash:r=>runCrashGraph(r.multiplier),
  slots:r=>`🎰 ${r.symbols?.join(" ")}`,
  coinflip:r=>r.result,
  mines:r=>r.result,
  hilo:r=>r.result,
  blackjack:r=>r.result,
  plinko:r=>`🔻 ${r.multiplier?.toFixed(2)}x`,
  fruitparty:r=>`🍉 ${r.multiplier?.toFixed(2)}x`,
  bananafarm:r=>`🍌 ${r.multiplier?.toFixed(2)}x`,
  airboss:r=>`✈️ ${r.multiplier?.toFixed(2)}x`
};

function renderResult(res){

  if(state.game==="crash") return;

  const stage=$("#gameStage");
  if(stage && Engines[state.game]){
    stage.textContent = Engines[state.game](res);
  }
}

/* ================= CRASH ================= */

function runCrashGraph(target){

  const stage=$("#gameStage");

  stage.innerHTML=`<canvas id="c"></canvas><div id="v">1.00x</div>`;

  const c=$("#c");
  const ctx=c.getContext("2d");

  c.width=stage.offsetWidth;
  c.height=200;

  let m=1,path=[];

  function loop(){

    m+=0.02;

    path.push({x:path.length*4,y:c.height-m*20});

    ctx.clearRect(0,0,c.width,c.height);

    ctx.beginPath();
    path.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle="#0f0";
    ctx.stroke();

    $("#v").textContent=m.toFixed(2)+"x";

    if(m>=target){
      $("#v").textContent=target.toFixed(2)+"x 💥";
      return;
    }

    requestAnimationFrame(loop);
  }

  loop();
}

/* ================= CRASH LIVE ================= */

let crashOn=false;

function startCrash(){ crashOn=true; }
function updateCrash(v){
  if(!crashOn) return;
  const el=$("#v");
  if(el) el.textContent=v.toFixed(2)+"x";
}
function endCrash(v){
  crashOn=false;
  const el=$("#v");
  if(el) el.textContent=v.toFixed(2)+"x 💥";
}

/* ================= LIVE BETS ================= */

function renderLiveBets(players){

  let box=$("#live");

  if(!box){
    box=document.createElement("div");
    box.id="live";
    $("#gameStage")?.appendChild(box);
  }

  box.innerHTML=players.map(p=>`
    <div>${p.name} ${p.bet}BX</div>
  `).join("");
}

/* ================= WS SEND ================= */

function sendBet(bet){
  WS.socket?.send(JSON.stringify({
    type:"bet",
    game:state.game,
    amount:bet
  }));
}

/* ================= CLEAN ================= */

function cleanup(){
  crashOn=false;
  $("#casinoGameView")?.remove();
}

/* ================= BOOT ================= */

function boot(){

  const tryInit=()=>{
    if(document.getElementById("casino")){
      init();
    }else{
      setTimeout(tryInit,100);
    }
  };

  tryInit();
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",boot,{once:true});
}else{
  boot();
}

})();
