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
/* =========================================================
   CRASH GRAPH ENGINE (PRO CANVAS)
========================================================= */

const CRASH_GRAPH = {

  canvas:null,
  ctx:null,

  points:[],
  running:false,
  startTime:0,

  crashPoint:0,
  current:1,

  /* ================= INIT ================= */

  init(){

    this.canvas = document.getElementById("crashCanvas");
    if(!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");

    this.resize();

    window.addEventListener("resize", ()=>this.resize());

  },

  resize(){

    const rect = this.canvas.parentElement;

    this.canvas.width = rect.clientWidth;
    this.canvas.height = 220;

  },

  /* ================= START ================= */

  start(crashPoint){

    this.points = [];
    this.running = true;
    this.startTime = Date.now();
    this.crashPoint = crashPoint || (Math.random()*5 + 1.5);

    this.loop();
  },

  /* ================= LOOP ================= */

  loop(){

    if(!this.running) return;

    const t = (Date.now() - this.startTime) / 1000;

    // 🔥 exponential curve
    this.current = Math.exp(t * 0.6);

    this.points.push({
      x: t,
      y: this.current
    });

    if(this.current >= this.crashPoint){
      this.running = false;
      this.crash();
      return;
    }

    this.render();

    requestAnimationFrame(()=>this.loop());

  },

  /* ================= RENDER ================= */

  render(){

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0,0,w,h);

    if(this.points.length < 2) return;

    const maxX = this.points.at(-1).x;
    const maxY = Math.max(...this.points.map(p=>p.y));

    const scaleX = x => (x/maxX)*w;
    const scaleY = y => h - (y/maxY)*(h-20);

    // 🔥 gradient line
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,"#22c55e");
    grad.addColorStop(1,"#16a34a");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;

    ctx.beginPath();

    this.points.forEach((p,i)=>{

      const x = scaleX(p.x);
      const y = scaleY(p.y);

      i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);

    });

    ctx.stroke();

    // 🔥 glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#22c55e";

    // current dot
    const last = this.points.at(-1);

    ctx.beginPath();
    ctx.arc(scaleX(last.x), scaleY(last.y), 4, 0, Math.PI*2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();

    // update UI
    const el = document.getElementById("crashMultiplier");
    if(el){
      el.innerText = this.current.toFixed(2) + "x";
    }

  },

  /* ================= CRASH ================= */

  crash(){

    const el = document.getElementById("crashMultiplier");

    if(el){
      el.style.color = "#ef4444";
      el.innerText = this.crashPoint.toFixed(2) + "x";
    }

    // 💥 crash flash
    this.ctx.fillStyle = "rgba(255,0,0,0.2)";
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

  }

};
