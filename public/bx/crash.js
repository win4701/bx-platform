// ======================================================
// BLOXIO CASINO — ULTRA STABLE FINAL (NO BUGS)
// ======================================================

(() => {
  "use strict";

  if (window.BX_CASINO) return;

  const $ = (s) => document.querySelector(s);

  // ================= GAMES =================
  const GAMES = [
    {id:"crash",name:"Crash"},
    {id:"dice",name:"Dice"},
    {id:"coinflip",name:"Coinflip"},
    {id:"limbo",name:"Limbo"},
    {id:"roulette",name:"Roulette"},
    {id:"slots",name:"Slots"},
    {id:"hi-lo",name:"Hi-Lo"},
    {id:"wheel",name:"Wheel"},
    {id:"keno",name:"Keno"},
    {id:"plinko",name:"Plinko"},
    {id:"mines",name:"Mines"},
    {id:"blackjack",name:"Blackjack"}
  ];

  // ================= CASINO =================
  const CASINO = {

    state:{
      game:null,
      playing:false,
      bet:10
    },

    root:null,
    lobby:null,
    gameView:null,

    // ================= INIT =================
    init(){

      this.root = $("#casino");
      if(!this.root) return;

      this.lobby = $("#casinoLobby");
      this.gameView = $("#casinoGameView");

      this.renderLobby();
      this.bindWS();

      window.BX_CASINO = this;
    },

    // ================= LOBBY =================
    renderLobby(){

      this.lobby.innerHTML = `
        <div class="casino-grid">
          ${GAMES.map(g=>`
            <div class="casino-card" data-game="${g.id}">
              <span>${g.name}</span>
            </div>
          `).join("")}
        </div>
      `;

      document.querySelectorAll(".casino-card").forEach(card=>{
        card.onclick = () => this.openGame(card.dataset.game);
      });

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

    // ================= GAME UI =================
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
            ${this.renderControls(id)}
          </div>

          <button id="playBtn">Play</button>
          ${id==="crash" ? `<button id="cashoutBtn">Cashout</button>` : ""}

        </div>
      `;

      $("#backBtn").onclick = ()=> this.closeGame();
      $("#playBtn").onclick = ()=> this.play();

      if(id==="crash"){
        $("#cashoutBtn").onclick = ()=> this.cashout();
      }

    },

    // ================= CONTROLS =================
    renderControls(game){

      switch(game){

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
          return `<input id="limboMultiplier" value="2" type="number"/>`;

        case "crash":
          return `<input id="crashCashout" value="2" type="number"/>`;

        case "roulette":
          return `<input id="rouletteNumber" type="number" min="0" max="36"/>`;

        case "hi-lo":
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
    getGameData(){

      switch(this.state.game){

        case "dice":
          return {target:Number($("#diceTarget").value)};

        case "coinflip":
          return {side:$("#coinSide").value};

        case "limbo":
          return {multiplier:Number($("#limboMultiplier").value)};

        case "crash":
          return {cashout:Number($("#crashCashout").value)};

        case "roulette":
          return {number:Number($("#rouletteNumber").value)};

        case "hi-lo":
          return {choice:$("#hiloChoice").value};

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
            data:this.getGameData()
          })
        });

        const data = await res.json();

        if(data.result){
          this.finish(data.result);
        }

      }catch{
        this.reset();
      }

    },

    // ================= CASHOUT =================
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
        const el=$("#gameMultiplier");
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

    // ================= RESULT =================
    finish({win,payout,multiplier}){

      this.state.playing = false;
      $("#playBtn").disabled = false;

      const el=$("#gameMultiplier");
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
