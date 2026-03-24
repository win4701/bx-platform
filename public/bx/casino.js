/* =========================================================
   CASINO REAL ENGINE (CLEAN + WORKING)
========================================================= */

window.CASINO = {

  current:null,
  playing:false,
  nonce:0,
  clientSeed:null,

  sounds:{
    win:new Audio("/assets/sounds/win.mp3"),
    lose:new Audio("/assets/sounds/lose.mp3"),
    click:new Audio("/assets/sounds/click.mp3")
  },

  /* ================= INIT ================= */

  init(){

    this.clientSeed = this.getClientSeed();
    this.bindGames();
    this.preloadSounds();

    console.log("🎰 CASINO READY");
  },

  /* ================= SEED ================= */

  getClientSeed(){

    let s = localStorage.getItem("client_seed");

    if(!s){
      s = Math.random().toString(36).slice(2);
      localStorage.setItem("client_seed", s);
    }

    return s;
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

      card.onclick = ()=>{

        const game = card.dataset.game;

        this.playSound("click");
        this.open(game);

      };

    });

  },

  /* ================= OPEN ================= */

  open(game){

    this.current = game;

    const grid = document.querySelector(".casino-grid");
    const box  = document.getElementById("casinoGameBox");

    // hide grid
    grid.style.display = "none";

    // show game
    box.style.display = "block";

    // active UI
    document.querySelectorAll(".game")
      .forEach(g=>g.classList.remove("active"));

    document.querySelector(`[data-game="${game}"]`)
      ?.classList.add("active");

    this.render(game);
  },

  /* ================= CLOSE ================= */

  close(){

    const grid = document.querySelector(".casino-grid");
    const box  = document.getElementById("casinoGameBox");

    box.innerHTML = "";
    box.style.display = "none";

    grid.style.display = "grid";

    this.current = null;
  },

  /* ================= RENDER ================= */

  render(game){

    const box = document.getElementById("casinoGameBox");

    box.innerHTML = `
      <button id="exitGame">← Back</button>

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
      <button id="seedBtn">New Seed</button>

      <div id="gameResult"></div>

      ${game === "crash" ? `<div id="crashMultiplier">1.00x</div>` : ""}
    `;

    document.getElementById("exitGame").onclick = ()=> this.close();
    document.getElementById("playBtn").onclick = ()=> this.play();
    document.getElementById("seedBtn").onclick = ()=> this.rotateSeed();

    if(game === "crash"){
      this.initCrash();
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
      alert("No balance");
      return;
    }

    this.playing = true;

    const res = await safeFetch("/casino/play",{
      method:"POST",
      body: JSON.stringify({
        game:this.current,
        bet,
        multiplier:Number(document.getElementById("multiplier")?.value || null),
        choice:document.getElementById("choice")?.value || null,
        client_seed:this.clientSeed,
        nonce:this.nonce++
      })
    });

    this.playing = false;

    if(!res){
      alert("Error");
      return;
    }

    this.handle(res);
  },

  /* ================= HANDLE ================= */

  handle(res){

    const win = res.win;
    const payout = res.payout || 0;
    const bet = res.bet || 0;

    if(window.WALLET){
      WALLET.BX += (payout - bet);
      if(typeof renderWallet === "function") renderWallet();
    }

    const el = document.getElementById("gameResult");

    if(el){
      el.innerHTML = `
        <div class="${win ? "win":"lose"}">
          ${win ? "+"+payout : "-"+bet} BX
        </div>
      `;
    }

    this.playSound(win ? "win":"lose");

    this.animate(win);

    if(this.current === "crash"){
      this.stopCrash(res.crash_point || 2);
    }
  },

  /* ================= CRASH ================= */

  initCrash(){

    this.crashRunning = true;
    this.crashMulti = 1;

    const el = document.getElementById("crashMultiplier");

    const loop = ()=>{

      if(!this.crashRunning) return;

      this.crashMulti += this.crashMulti * 0.02;

      if(el){
        el.innerText = this.crashMulti.toFixed(2) + "x";
      }

      this.crashFrame = requestAnimationFrame(loop);
    };

    loop();
  },

  stopCrash(point){

    this.crashRunning = false;

    const el = document.getElementById("crashMultiplier");

    if(el){
      el.innerText = point.toFixed(2) + "x";
      el.style.color = "red";
    }

    cancelAnimationFrame(this.crashFrame);
  },

  /* ================= FX ================= */

  animate(win){

    const el = document.querySelector(`[data-game="${this.current}"]`);

    if(!el) return;

    el.classList.add(win ? "win":"lose");

    setTimeout(()=>{
      el.classList.remove("win","lose");
    },500);
  }

};
