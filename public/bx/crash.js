// ======================================================
// BLOXIO CASINO — FINAL MATCHED ENGINE
// ======================================================

(() => {
  "use strict";

  if (window.BX_CASINO) return;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const CASINO = {

    state:{
      game:null,
      playing:false,
      bet:10
    },

    init(){

      this.lobby = $("#casinoLobby");
      this.gameView = $("#casinoGameView");

      if(!this.lobby || !this.gameView) return;

      this.bindGames();
      this.bindWS();
      this.bindTop();

      window.BX_CASINO = this;
    },

    // ================= BIND GAMES =================
    bindGames(){

      $$(".casino-game-card").forEach(card=>{
        card.addEventListener("click",()=>{
          const game = card.dataset.game;
          this.openGame(game);
        });
      });

    },

    // ================= TOP BAR =================
    bindTop(){

      const refresh = $("#casinoRefreshBtn");

      if(refresh){
        refresh.onclick = ()=>{
          this.refreshStats();
        };
      }

    },

    refreshStats(){
      console.log("Refresh Casino Stats");
    },

    // ================= NAV =================
    openGame(id){

      this.state.game = id;

      this.lobby.classList.add("hidden");
      this.gameView.classList.remove("hidden");

      this.renderGame(id);
    },

    closeGame(){

      this.state.game = null;

      this.gameView.classList.add("hidden");
      this.lobby.classList.remove("hidden");

    },

    // ================= UI =================
    renderGame(id){

      this.gameView.innerHTML = `
        <div class="game-shell">

          <button id="backBtn">←</button>
          <h2>${id.toUpperCase()}</h2>

          <div id="gameStage">
            <div id="gameMultiplier">1.00x</div>
          </div>

          <input id="betInput" type="number" value="${this.state.bet}" />

          <div id="gameControls">
            ${this.controls(id)}
          </div>

          <button id="playBtn">Play</button>
          ${id==="crash" ? `<button id="cashoutBtn">Cashout</button>` : ""}

        </div>
      `;

      $("#backBtn").onclick = ()=> this.closeGame();
      $("#playBtn").onclick = ()=> this.play();

      if(id==="crash"){
        $("#cashoutBtn").onclick = ()=> this.cashout();
        this.startCrashGraph();
      }

    },

    // ================= CONTROLS =================
    controls(g){

      switch(g){

        case "dice":
          return `<input id="diceTarget" type="range" min="1" max="99" value="50"/>`;

        case "coinflip":
          return `
            <select id="coinSide">
              <option value="heads">Heads</option>
              <option value="tails">Tails</option>
            </select>
          `;

        case "limbo":
          return `<input id="limboMultiplier" type="number" value="2"/>`;

        case "crash":
          return `<input id="crashCashout" type="number" value="2"/>`;

        case "roulette":
          return `<input id="rouletteNumber" type="number" min="0" max="36"/>`;

        case "hilo":
          return `
            <select id="hiloChoice">
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          `;

        default:
          return `<div class="game-note">Auto Game</div>`;
      }

    },

    // ================= DATA =================
    getData(){

      switch(this.state.game){

        case "dice":
          return { target:Number($("#diceTarget").value) };

        case "coinflip":
          return { side:$("#coinSide").value };

        case "limbo":
          return { multiplier:Number($("#limboMultiplier").value) };

        case "crash":
          return { cashout:Number($("#crashCashout").value) };

        case "roulette":
          return { number:Number($("#rouletteNumber").value) };

        case "hilo":
          return { choice:$("#hiloChoice").value };

        default:
          return {};
      }

    },

    // ================= PLAY =================
    async play(){

      if(this.state.playing) return;

      const bet = Number($("#betInput").value);
      if(!bet || bet<=0) return;

      this.state.playing = true;
      $("#playBtn").disabled = true;

      try{

        const res = await fetch("/casino/play",{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({
            game:this.state.game,
            bet,
            data:this.getData()
          })
        });

        const data = await res.json();

        if(data.result){
          this.finish(data.result);
        }

      }catch(e){
        console.error(e);
        this.reset();
      }

    },

    async cashout(){
      await fetch("/casino/crash/cashout",{method:"POST"});
    },

    // ================= WS =================
    bindWS(){

      if(!window.BX) return;

      BX.on("ws:game",(d)=>{
        if(d.game !== this.state.game) return;

        this.finish({
          win:d.payout>0,
          payout:d.payout,
          multiplier:d.payout>0?2:0
        });
      });

      BX.on("ws:crash_tick",(d)=>{
        const el = $("#gameMultiplier");
        if(el) el.innerText = d.multiplier.toFixed(2)+"x";
      });

      BX.on("ws:crash_end",(d)=>{
        this.finish({
          win:false,
          payout:0,
          multiplier:d.crash
        });
      });

    },

    // ================= CRASH GRAPH =================
    startCrashGraph(){

      const canvas = document.createElement("canvas");
      const stage = $("#gameStage");

      stage.appendChild(canvas);

      const ctx = canvas.getContext("2d");

      canvas.width = stage.clientWidth;
      canvas.height = stage.clientHeight;

      let pts=[], start=performance.now();

      const loop = ()=>{
        const t=(performance.now()-start)/1000;
        const y=Math.exp(0.06*t);

        pts.push(y);

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();

        pts.forEach((p,i)=>{
          const x=i/pts.length*canvas.width;
          const py=canvas.height-p*20;
          i?ctx.lineTo(x,py):ctx.moveTo(x,py);
        });

        ctx.strokeStyle="#0ecb81";
        ctx.stroke();

        requestAnimationFrame(loop);
      };

      loop();
    },

    // ================= RESULT =================
    finish({win,payout,multiplier}){

      this.state.playing = false;
      $("#playBtn").disabled = false;

      const el = $("#gameMultiplier");
      if(el) el.innerText = multiplier.toFixed(2)+"x";

      console.log(win ? "WIN +" + payout : "LOSE");

    },

    reset(){
      this.state.playing = false;
      $("#playBtn").disabled = false;
    }

  };

  document.addEventListener("DOMContentLoaded",()=> CASINO.init());

})();
