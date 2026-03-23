/* =========================================================
   CASINO ULTRA ENGINE (12 GAMES + PROVABLY FAIR + SOUND)
========================================================= */

window.CASINO = {

  current:null,
  active:false,

  serverHash:null,
  clientSeed:null,
  nonce:0,

  playing:false,

  sounds:{
    win:new Audio("/assets/sounds/win.mp3"),
    lose:new Audio("/assets/sounds/lose.mp3"),
    click:new Audio("/assets/sounds/click.mp3")
  },

  games:[
    "coinflip","banana_farm","limbo","fruit_party",
    "dice","crash","slot","birds_party",
    "blackjack_fast","airboss","hilo","plinko"
  ],

  /* ================= INIT ================= */

  init(){

    if(this.active) return;

    console.log("🎰 CASINO ULTRA START");

    this.clientSeed = this.getClientSeed();
    this.nonce = 0;

    this.preloadSounds();
    this.bindGames();

    this.active = true;
  },

  /* ================= SEED ================= */

  getClientSeed(){

    let seed = localStorage.getItem("client_seed");

    if(!seed){
      seed = Math.random().toString(36).slice(2);
      localStorage.setItem("client_seed", seed);
    }

    return seed;
  },

  rotateSeed(){

    this.clientSeed = Math.random().toString(36).slice(2);
    localStorage.setItem("client_seed", this.clientSeed);
    this.nonce = 0;
  },

  /* ================= SOUND ================= */

  preloadSounds(){
    Object.values(this.sounds).forEach(s=>{
      s.volume = 0.5;
      s.load();
    });
  },

  playSound(type){
    const s = this.sounds[type];
    if(!s) return;
    s.currentTime = 0;
    s.play().catch(()=>{});
  },

  /* ================= BIND ================= */

  bindGames(){

    document.querySelectorAll(".game").forEach(card=>{

      const game = card.dataset.game;

      card.onclick = ()=>{
        this.playSound("click");
        this.open(game);
      };

    });

  },

  /* ================= OPEN ================= */

  open(game){

    this.current = game;

    document.querySelectorAll(".game")
      .forEach(g=>g.classList.remove("active"));

    document.querySelector(`[data-game="${game}"]`)
      ?.classList.add("active");

    this.render(game);
  },

  /* ================= UI ================= */

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

      <button id="rotateSeedBtn">New Seed</button>

      <div id="gameResult"></div>

      ${
        game === "crash"
        ? `<div id="crashMultiplier">1.00x</div>`
        : ""
      }
    `;

    document.getElementById("playBtn").onclick = ()=> this.play();
    document.getElementById("rotateSeedBtn").onclick = ()=> this.rotateSeed();

    if(game === "crash"){
      this.startCrashVisual();
    }

  },

  /* ================= PLAY ================= */

  async play(){

    if(this.playing) return;

    const bet = Number(document.getElementById("bet")?.value);

    if(!bet || bet <= 0){
      alert("Invalid bet");
      return;
    }

    if(window.WALLET && WALLET.BX < bet){
      alert("Insufficient balance");
      return;
    }

    this.playing = true;

    const payload = {
      game:this.current,
      bet,
      multiplier:Number(document.getElementById("multiplier")?.value || null),
      choice:document.getElementById("choice")?.value || null,
      client_seed:this.clientSeed,
      nonce:this.nonce++
    };

    const res = await safeFetch("/casino/play",{
      method:"POST",
      body: JSON.stringify(payload)
    });

    this.playing = false;

    if(!res){
      alert("Game failed");
      return;
    }

    this.serverHash = res.server_seed_hash;

    this.handle(res);
  },

  /* ================= RESULT ================= */

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

    const box = document.getElementById("gameResult");

    if(box){
      box.innerHTML = `
        <div class="${win ? "win":"lose"}">
          ${win ? "+"+payout : "-"+bet} BX
        </div>
        <small>Nonce: ${this.nonce-1}</small>
      `;
    }

    this.playSound(win ? "win" : "lose");
    this.animate(win);
    this.specialEffects(res);
  },

  /* ================= EFFECTS ================= */

  specialEffects(res){

    switch(this.current){

      case "dice":
        console.log("🎲", res.roll);
        break;

      case "limbo":
        console.log("🎯", res.multiplier);
        break;

      case "plinko":
        console.log("🔵", res.path);
        break;

      case "slot":
        console.log("🎰", res.symbols);
        break;

      case "coinflip":
        console.log("🪙", res.side);
        break;

    }

  },

  /* ================= CRASH ================= */

  startCrashVisual(){

    let multi = 1;
    const el = document.getElementById("crashMultiplier");

    if(!el) return;

    if(this.crashLoop){
      cancelAnimationFrame(this.crashLoop);
    }

    const loop = ()=>{

      multi += multi * 0.015;
      el.innerText = multi.toFixed(2) + "x";

      this.crashLoop = requestAnimationFrame(loop);
    };

    loop();
  },

  /* ================= ANIMATION ================= */

  animate(win){

    const el = document.querySelector(`[data-game="${this.current}"]`);
    if(!el) return;

    el.classList.add(win ? "win" : "lose");

    setTimeout(()=>{
      el.classList.remove("win","lose");
    },600);
  }

};
