/* =========================================================
   BLOXIO CASINO — FULL CLEAN VERSION (PRODUCTION BASE)
========================================================= */

(() => {
"use strict";

/* ================= HELPERS ================= */

const $ = (s,r=document)=>r.querySelector(s);

const format = (n)=>Number(n||0).toFixed(2);

/* ================= API ================= */

const API = {
  async play(game, data){
    const res = await fetch("/api/casino/play",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ game,...data })
    });
    return await res.json();
  }
};

/* ================= STATE ================= */

const GAME_PHASE = {
  IDLE:"IDLE",
  PROCESSING:"PROCESSING"
};

const state = {
  screen:"lobby",
  game:null,
  wallet:0,
  bet:1,
  phase:GAME_PHASE.IDLE
};

/* ================= ROOT ================= */

const root = document.getElementById("casino");

/* ================= GAMES ================= */

const games = [
  {id:"dice",name:"Dice",icon:"🎲"},
  {id:"crash",name:"Crash",icon:"📈"},
  {id:"coinflip",name:"Coinflip",icon:"🪙"},
  {id:"limbo",name:"Limbo",icon:"🎯"},
  {id:"plinko",name:"Plinko",icon:"🔵"},
  {id:"blackjack",name:"Blackjack",icon:"🃏"},
  {id:"hilo",name:"HiLo",icon:"⬆️"},
  {id:"slots",name:"Slots",icon:"🎰"},
  {id:"birds",name:"Birds",icon:"🐦"},
  {id:"airboss",name:"AirBoss",icon:"✈️"},
  {id:"fruitparty",name:"Fruit",icon:"🍓"},
  {id:"bananafarm",name:"Banana",icon:"🍌"}
];

/* ================= RENDER ================= */

function render(){

  if(state.screen==="lobby"){
    root.innerHTML = `
      <h2>🎰 Bloxio Casino</h2>
      <div>Wallet: ${format(state.wallet)} BX</div>

      <div class="grid">
        ${games.map(g=>`
          <div class="card" data-game="${g.id}">
            ${g.icon} ${g.name}
          </div>
        `).join("")}
      </div>
    `;
  }

  if(state.screen==="game"){
    root.innerHTML = `
      <button data-action="back">← Back</button>

      <h2>${state.game.name}</h2>

      <div id="stage">...</div>

      <input id="bet" type="number" value="${state.bet}" min="1">

      <button data-action="play" ${state.phase==="PROCESSING"?"disabled":""}>
        ${state.phase==="PROCESSING"?"Processing...":"Play"}
      </button>
    `;
  }

}

/* ================= EVENTS ================= */

root.addEventListener("click", async (e)=>{

  const card = e.target.closest("[data-game]");
  if(card){
    state.game = games.find(g=>g.id===card.dataset.game);
    state.screen="game";
    render();
    return;
  }

  const action = e.target.dataset.action;

  if(action==="back"){
    state.screen="lobby";
    state.game=null;
    render();
    return;
  }

  if(action==="play"){
    if(state.phase==="PROCESSING") return;

    const bet = Number($("#bet").value);
    if(bet<1) return alert("Min 1 BX");

    state.phase="PROCESSING";
    state.wallet -= bet;
    render();

    try{
      const res = await API.play(state.game.id,{ bet });
      handleResult(res);
    }catch(e){
      alert("Server error");
    }

    state.phase="IDLE";
    render();
  }

});

/* ================= RESULT ================= */

function handleResult(res){

  const stage = $("#stage");
  if(!stage) return;

  if(res.roll) stage.textContent = res.roll.toFixed(2);
  if(res.multiplier) stage.textContent = res.multiplier.toFixed(2)+"x";
  if(res.symbols) stage.textContent = res.symbols.join(" ");
  if(res.card) stage.textContent = res.card;
  if(res.result) stage.textContent = res.result;

  if(res.payout){
    state.wallet += res.payout;
  }

}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded",()=>{
  if(!root) return;
  render();
});

})();
