// ===============================
// CASINO REAL ENGINE (12 GAMES)
// ===============================

window.CASINO = {

  current:null,
  active:false,
  seed:null,
  nonce:0,

  games:[
    "coinflip","banana_farm","limbo","fruit_party",
    "dice","crash","slot","birds_party",
    "blackjack_fast","airboss","hilo","plinko"
  ],

  // ================= INIT =================
  init(){

    if(this.active) return;

    console.log("🎰 Casino REAL 12 GAMES");

    this.seed = Math.random().toString(36).slice(2);
    this.nonce = 0;

    this.bindGames();

    this.active = true;
  },

  // ================= BIND =================
  bindGames(){

    document.querySelectorAll(".game").forEach(card=>{
      const game = card.dataset.game;
      card.onclick = ()=> this.open(game);
    });

  },

  // ================= OPEN =================
  open(game){

    this.current = game;

    document.querySelectorAll(".game")
      .forEach(g=>g.classList.remove("active"));

    document.querySelector(`[data-game="${game}"]`)
      ?.classList.add("active");

    this.render(game);
  },

  // ================= UI =================
  render(game){

    const box = document.getElementById("casinoGameBox");

    if(!box) return;

    box.innerHTML = `
      <h3>${game.toUpperCase()}</h3>

      <input id="bet" type="number" placeholder="Bet BX">

      ${
        ["dice","limbo","plinko","airboss","crash"]
        .includes(game)
        ? `<input id="multiplier" placeholder="Multiplier">`
        : ""
      }

      ${
        game === "hilo"
        ? `<select id="choice">
             <option value="high">High</option>
             <option value="low">Low</option>
           </select>`
        : ""
      }

      <button id="playBtn">Play</button>

      <div id="gameResult"></div>

      ${game === "crash" ? `<div id="crashMultiplier">1.00x</div>` : ""}
    `;

    document.getElementById("playBtn").onclick = ()=> this.play();

    if(game === "crash"){
      this.startCrashVisual();
    }
  },

  // ================= PLAY =================
  async play(){

    const bet = Number(document.getElementById("bet")?.value);

    if(!bet || bet <= 0){
      alert("Invalid bet");
      return;
    }

    const payload = {
      game:this.current,
      bet,
      multiplier:Number(document.getElementById("multiplier")?.value || null),
      choice:document.getElementById("choice")?.value || null,
      client_seed:this.seed,
      nonce:this.nonce++
    };

    const res = await safeFetch("/casino/play",{
      method:"POST",
      body:payload
    });

    if(!res){
      alert("Game failed");
      return;
    }

    this.handle(res);
  },

  // ================= RESULT =================
  handle(res){

    const win = res.win;
    const payout = res.payout || 0;
    const bet = res.bet || 0;

    // 💰 wallet sync
    if(window.WALLET){
      WALLET.BX += (payout - bet);
      if(typeof renderWallet === "function"){
        renderWallet();
      }
    }

    // 🎯 UI
    const box = document.getElementById("gameResult");

    if(box){
      box.innerHTML = win
        ? `<span style="color:#22c55e">WIN +${payout}</span>`
        : `<span style="color:#ef4444">LOSE -${bet}</span>`;
    }

    // 🔊 sound
    const snd = document.getElementById(win ? "snd-win" : "snd-lose");
    snd?.play().catch(()=>{});

    // ✨ animation
    this.animate(win);
  },

  // ================= CRASH =================
  startCrashVisual(){

    let multi = 1;
    const el = document.getElementById("crashMultiplier");

    if(!el) return;

    if(this.crashLoop) cancelAnimationFrame(this.crashLoop);

    const loop = ()=>{

      multi += multi * 0.01;

      el.innerText = multi.toFixed(2) + "x";

      this.crashLoop = requestAnimationFrame(loop);
    };

    loop();
  },

  // ================= ANIMATION =================
  animate(win){

    const el = document.querySelector(`[data-game="${this.current}"]`);

    if(!el) return;

    el.classList.add(win ? "win" : "lose");

    setTimeout(()=>{
      el.classList.remove("win","lose");
    },500);
  }

};
