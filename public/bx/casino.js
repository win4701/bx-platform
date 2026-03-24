/* =========================================================
   CASINO ULTRA FINAL SYSTEM (CLEAN + MODULAR)
========================================================= */

window.CASINO = {

  /* ================= STATE ================= */

  state:{
    view:"grid",
    current:null,
    playing:false
  },

  clientSeed:null,
  nonce:0,

  /* ================= INIT ================= */

  init(){
    this.clientSeed = this.getSeed();
    this.bind();
    console.log("🎰 CASINO READY");
  },

  getSeed(){
    let s = localStorage.getItem("seed");
    if(!s){
      s = Math.random().toString(36).slice(2);
      localStorage.setItem("seed", s);
    }
    return s;
  },

  hash(){
    const str = this.clientSeed + ":" + this.nonce++;
    let h = 0;
    for(let i=0;i<str.length;i++){
      h = Math.imul(31,h)+str.charCodeAt(i)|0;
    }
    return Math.abs(h);
  },

  /* ================= BIND ================= */

  bind(){
    document.querySelectorAll(".game").forEach(card=>{
      card.onclick = ()=>{
        if(this.state.view === "game") return;
        this.open(card.dataset.game);
      };
    });
  },

  /* ================= OPEN ================= */

  open(game){

    this.state.view = "game";
    this.state.current = game;

    const grid = document.querySelector(".casino-grid");
    const box  = document.getElementById("casinoGameBox");

    grid.classList.add("hide");

    setTimeout(()=>{
      grid.style.display = "none";

      this.render(game);

      box.style.display = "block";

      setTimeout(()=>box.classList.add("show"),20);
    },250);

  },

  /* ================= CLOSE ================= */

  close(){

    this.state.view = "grid";
    this.state.current = null;

    const grid = document.querySelector(".casino-grid");
    const box  = document.getElementById("casinoGameBox");

    box.classList.remove("show");

    setTimeout(()=>{
      box.style.display = "none";
      box.innerHTML = "";

      grid.style.display = "grid";

      setTimeout(()=>grid.classList.remove("hide"),20);
    },250);

  },

  /* ================= RENDER ================= */

  render(game){

    const g = this.GAMES[game];
    const box = document.getElementById("casinoGameBox");

    if(!g){
      box.innerHTML = "Game not found";
      return;
    }

    box.innerHTML = `
      <div class="casino-header">
        <button class="casino-back">←</button>
        <h3>${game.toUpperCase()}</h3>
      </div>

      ${g.render()}
    `;

    document.querySelector(".casino-back").onclick = ()=>this.close();

    document.getElementById("playBtn").onclick = ()=>{
      if(this.state.playing) return;
      this.state.playing = true;
      g.play(this);
      setTimeout(()=>this.state.playing=false,300);
    };

    if(g.init) g.init(this);

  },

  /* ================= HANDLE ================= */

  handle({win,payout,bet}){

    if(window.WALLET){
      WALLET.BX += (payout - bet);
      if(window.renderWallet) renderWallet();
    }

    const el = document.getElementById("gameResult");

    if(el){
      el.innerHTML = win
        ? `<div class="win">+${payout}</div>`
        : `<div class="lose">-${bet}</div>`;
    }

  },

  /* ================= GAMES ================= */

   GAMES:{

  /* ===== 1. DICE ===== */
  dice:{
    render:()=>`
      <input id="bet">
      <div id="diceResult">🎲</div>
      <button id="playBtn">ROLL</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;
      const v = ctx.hash()%100;

      animateNumber("diceResult", v, ()=>{
        ctx.handle({win:v>50,payout:v>50?bet*2:0,bet});
      });
    }
  },

  /* ===== 2. SLOT ===== */
  slot:{
    render:()=>`
      <input id="bet">
      <div id="slotReels">🍒 🍋 🍉</div>
      <button id="playBtn">SPIN</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      const s=["🍒","🍋","🍉","⭐","💎"];
      const h=ctx.hash();

      const r1=s[h%5], r2=s[(h>>3)%5], r3=s[(h>>5)%5];

      spinReels(()=>{
        slotSet(r1,r2,r3);
        const win=r1===r2&&r2===r3;
        ctx.handle({win,payout:win?bet*5:0,bet});
      });
    }
  },

  /* ===== 3. PLINKO ===== */
  plinko:{
    render:()=>`
      <input id="bet">
      <canvas id="plinkoCanvas" width="300" height="300"></canvas>
      <button id="playBtn">DROP</button>
      <div id="gameResult"></div>
    `,
    init(){
      this.ctx = document.getElementById("plinkoCanvas").getContext("2d");
    },
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      let x=150,y=0,h=ctx.hash(),step=0;

      const loop=()=>{
        this.ctx.clearRect(0,0,300,300);

        drawBall(this.ctx,x,y);

        y+=6;
        x += ((h>>step)&1)?8:-8;
        step++;

        if(y<280) requestAnimationFrame(loop);
        else{
          const m=1+((h%200)/100);
          ctx.handle({win:m>1.2,payout:bet*m,bet});
        }
      };

      loop();
    }
  },

  /* ===== 4. CRASH ===== */
  crash:{
    render:()=>`
      <input id="bet">
      <div id="crashMultiplier">1.00x</div>
      <button id="playBtn">START</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      let m=1,target=1+((ctx.hash()%400)/100);
      const el=elId("crashMultiplier");

      const loop=()=>{
        m+=m*0.02;
        el.innerText=m.toFixed(2)+"x";

        if(m>=target){
          el.innerText=target.toFixed(2)+"x";
          ctx.handle({win:false,payout:0,bet});
          return;
        }
        requestAnimationFrame(loop);
      };

      loop();
    }
  },

  /* ===== 5. COINFLIP ===== */
  coinflip:{
    render:()=>`
      <input id="bet">
      <div id="coin">🪙</div>
      <button id="playBtn">FLIP</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;
      const win = ctx.hash()%2===0;

      animateFlip("coin", ()=>{
        ctx.handle({win,payout:win?bet*2:0,bet});
      });
    }
  },

  /* ===== 6. LIMBO ===== */
  limbo:{
    render:()=>`
      <input id="bet">
      <input id="multiplier" placeholder="Target">
      <button id="playBtn">PLAY</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;
      const target = +elId("multiplier").value||2;

      const r=1+((ctx.hash()%500)/100);

      ctx.handle({win:r>=target,payout:r>=target?bet*target:0,bet});
    }
  },

  /* ===== 7. HILO ===== */
  hilo:{
    render:()=>`
      <input id="bet">
      <select id="choice">
        <option value="high">High</option>
        <option value="low">Low</option>
      </select>
      <button id="playBtn">PLAY</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      const c=elId("choice").value;
      const v=ctx.hash()%13;

      const win=(c==="high"&&v>6)||(c==="low"&&v<=6);

      ctx.handle({win,payout:win?bet*1.8:0,bet});
    }
  },

  /* ===== 8. BLACKJACK ===== */
  blackjack_fast:{
    render:()=>`
      <input id="bet">
      <button id="playBtn">DEAL</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      const p=(ctx.hash()%11)+10;
      const d=(ctx.hash()%11)+10;

      ctx.handle({win:p>d,payout:p>d?bet*2:0,bet});
    }
  },

  /* ===== 9. AIRBOSS ===== */
  airboss:{
    render:()=>`
      <input id="bet">
      <div id="air">✈️ 1.00x</div>
      <button id="playBtn">FLY</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      let m=1,target=1+((ctx.hash()%300)/100);
      const el=elId("air");

      const loop=()=>{
        m+=0.05;
        el.innerText="✈️ "+m.toFixed(2)+"x";

        if(m>=target){
          ctx.handle({win:false,payout:0,bet});
          return;
        }

        requestAnimationFrame(loop);
      };

      loop();
    }
  },

  /* ===== 10. BANANA ===== */
  banana_farm:{
    render:()=>`
      <input id="bet">
      <button id="playBtn">HARVEST</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      const m=1+((ctx.hash()%300)/100);

      ctx.handle({win:m>1.5,payout:m>1.5?bet*m:0,bet});
    }
  },

  /* ===== 11. BIRDS ===== */
  birds_party:{
    render:()=>`
      <input id="bet">
      <button id="playBtn">PLAY</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      const hits=ctx.hash()%5;

      ctx.handle({win:hits>=3,payout:hits>=3?bet*3:0,bet});
    }
  },

  /* ===== 12. FRUIT ===== */
  fruit_party:{
    render:()=>`
      <input id="bet">
      <button id="playBtn">PLAY</button>
      <div id="gameResult"></div>
    `,
    play(ctx){
      const bet = +betInput(); if(!bet) return;

      const m=1+((ctx.hash()%200)/100);

      ctx.handle({win:m>1.3,payout:m>1.3?bet*m:0,bet});
    }
  }

   }
      
/* ================= HELPERS ================= */

function elId(id){ return document.getElementById(id); }

function betInput(){
  return elId("bet").value || 0;
}

function slotSet(a,b,c){
  elId("slotReels").innerText = `${a} ${b} ${c}`;
}

function drawBall(ctx,x,y){
  ctx.beginPath();
  ctx.arc(x,y,6,0,Math.PI*2);
  ctx.fillStyle="#22c55e";
  ctx.fill();
}

function animateFlip(id,cb){
  const el = elId(id);
  el.style.transform="rotateY(720deg)";
  setTimeout(cb,400);
}

function animateNumber(id,target,cb){
  let i=0,el=elId(id);
  const loop=()=>{
    el.innerText=Math.floor(Math.random()*100);
    if(i++<15) requestAnimationFrame(loop);
    else{ el.innerText=target; cb(); }
  };
  loop();
}

function spinReels(cb){
  let i=0,s=["🍒","🍋","🍉","⭐","💎"];
  const loop=()=>{
    slotSet(rand(s),rand(s),rand(s));
    if(i++<20) requestAnimationFrame(loop);
    else cb();
  };
  loop();
}

function rand(a){
  return a[Math.floor(Math.random()*a.length)];
}}
