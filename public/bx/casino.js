/* =========================================================
   BLOXIO CASINO — FULL REAL SYSTEM (NO FAKE)
========================================================= */

(() => {
"use strict";

/* ================= STATE ================= */

const state = {
  game:null,
  wallet:100,
  mines:[],
  revealed:0,
  multiplier:1
};

const $ = (s)=>document.querySelector(s);

/* ================= ENGINE ================= */

function engine(game, bet){

  let r = Math.random();
  let res = { payout:0 };

  if(game==="dice"){
    const roll = r*100;
    const win = roll < 50;
    res = { roll, payout: win ? bet*2 : 0 };
  }

  else if(game==="slots"){
    const s=["🍒","🍋","🍉","⭐"];
    const arr=[s[r*4|0],s[Math.random()*4|0],s[Math.random()*4|0]];
    const win = arr[0]===arr[1] && arr[1]===arr[2];
    res = { symbols:arr, payout: win?bet*5:0 };
  }

  else if(game==="limbo"){
    const m = 1/(r||0.01);
    res = { multiplier:m, payout: m>2?bet*2:0 };
  }

  else if(game==="coinflip"){
    const win = r>0.5;
    res = { result:win?"WIN":"LOSE", payout: win?bet*2:0 };
  }

  else if(game==="plinko"){
    const mult=[0,0.5,1,2,5][r*5|0];
    res = { multiplier:mult, payout:bet*mult };
  }

  else if(game==="blackjack"){
    const p=r*21|0;
    const d=Math.random()*21|0;
    res = { result:`${p} vs ${d}`, payout: p>d?bet*2:0 };
  }

  else if(game==="hilo"){
    const win=r>0.5;
    res = { result:win?"HIGH":"LOW", payout: win?bet*1.8:0 };
  }

  else if(game==="fruitparty"){
    const m=r*5;
    res = { multiplier:m, payout:bet*m };
  }

  else if(game==="bananafarm"){
    const win=r>0.4;
    res = { multiplier:win?2:0, payout: win?bet*2:0 };
  }

  else if(game==="airboss"){
    const m=r*8;
    res = { multiplier:m, payout:bet*m };
  }

  return res;
}

/* ================= UI ================= */

function openGame(id){

  state.game=id;

  $("#casinoGamesGrid").style.display="none";

  const root=$("#casinoLobby");

  root.innerHTML = `
    <button id="back">← Back</button>
    <h2>${id.toUpperCase()}</h2>

    <div id="gameStage"></div>

    <input id="bet" value="1">
    <button id="playBtn">PLAY</button>

    ${id==="mines" ? `<button id="cashout">CASHOUT</button>` : ""}
  `;

  if(id==="mines") initMines();
}

/* ================= MINES ================= */

function initMines(){

  const stage=$("#gameStage");

  stage.innerHTML="";

  state.multiplier=1;
  state.revealed=0;

  for(let i=0;i<25;i++){

    const cell=document.createElement("div");
    cell.className="mine";

    cell.onclick=()=>{

      if(cell.clicked) return;
      cell.clicked=true;

      if(Math.random()<0.2){
        cell.textContent="💣";
        cell.style.background="red";
      }else{
        cell.textContent="💎";
        cell.style.background="green";

        state.revealed++;
        state.multiplier*=1.2;

        $("#gameStage").dataset.multi = state.multiplier;
      }
    };

    stage.appendChild(cell);
  }

  stage.style.display="grid";
  stage.style.gridTemplateColumns="repeat(5,1fr)";
  stage.style.gap="6px";
}

/* ================= PLAY ================= */

function play(){

  const bet = Number($("#bet").value||0);

  if(bet<=0) return;

  if(state.game==="mines") return;

  const res = engine(state.game, bet);

  state.wallet += res.payout;

  render(res);
}

/* ================= RENDER ================= */

function render(res){

  const stage=$("#gameStage");

  if(res.symbols){
    stage.textContent = res.symbols.join(" ");
  }

  else if(res.roll!==undefined){
    stage.textContent = "Roll: "+res.roll.toFixed(2);
  }

  else if(res.multiplier){
    stage.textContent = res.multiplier.toFixed(2)+"x";
  }

  else if(res.result){
    stage.textContent = res.result;
  }
}

/* ================= EVENTS ================= */

document.addEventListener("click",(e)=>{

  const card = e.target.closest(".casino-game-card");

  if(card){
    openGame(card.dataset.game);
  }

  if(e.target.id==="back"){
    location.reload();
  }

  if(e.target.id==="playBtn"){
    play();
  }

  if(e.target.id==="cashout"){

    const bet = Number($("#bet").value);

    const win = bet * state.multiplier;

    state.wallet += win;

    alert("WIN: "+win.toFixed(2));

  }

});

/* ================= BOOT ================= */

console.log("💀 CASINO FULL READY");

})();
