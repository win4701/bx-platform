// =======================================================
// [1/6] CASINO ENGINE (STATE + API)
// =======================================================

const CasinoEngine = {

  state: {
    game: null,
    running: false,
    bet: 0,
    multiplier: 1,
    wallet: 1000,
    history: [],
    players: 0,
    volume: 0,
    seed: Date.now(),
    nonce: 0
  },

  setGame(name){
    this.state.game = name;
    this.state.running = false;
    this.state.multiplier = 1;
  },

  start(bet){
    this.state.bet = bet;
    this.state.running = true;
    this.state.multiplier = 1;
    this.state.nonce++;
  },

  stop(){
    this.state.running = false;
  },

  win(amount){
    this.state.wallet += amount;
    this.state.history.push({type:"win",amount,nonce:this.state.nonce});
    this.state.volume += amount;
  },

  lose(){
    this.state.history.push({type:"lose",nonce:this.state.nonce});
  },

  tick(mult){
    this.state.multiplier = mult;
  },

  hash(){
    return btoa(this.state.seed + ":" + this.state.nonce);
  }

};


// =======================================================
// [1/6] 3D LOBBY (THREE.JS)
// =======================================================

const Lobby3D = {

  scene:null,
  camera:null,
  renderer:null,
  cubes:[],

  init(){

    const container = document.getElementById("casinoLobby");
    if(!container) return;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight,0.1,1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({alpha:true});
    this.renderer.setSize(window.innerWidth,300);

    container.prepend(this.renderer.domElement);

    for(let i=0;i<10;i++){
      const geo = new THREE.BoxGeometry();
      const mat = new THREE.MeshBasicMaterial({color:0x00ffcc,wireframe:true});
      const cube = new THREE.Mesh(geo,mat);

      cube.position.x = (Math.random()*6)-3;
      cube.position.y = (Math.random()*2)-1;

      this.scene.add(cube);
      this.cubes.push(cube);
    }

    this.loop();

  },

  loop(){
    this.cubes.forEach(c=>{
      c.rotation.x+=0.01;
      c.rotation.y+=0.01;
    });

    this.renderer.render(this.scene,this.camera);
    requestAnimationFrame(()=>this.loop());
  }

};


// =======================================================
// [1/6] CRASH GRAPH (PRO)
// =======================================================

const CrashGraph = {

  canvas:null,
  ctx:null,
  data:[],

  init(){
    this.canvas = document.createElement("canvas");
    this.canvas.height = 200;
    this.canvas.width = 400;

    this.ctx = this.canvas.getContext("2d");

    document.getElementById("casinoGameView")?.appendChild(this.canvas);
  },

  push(v){
    this.data.push(v);
    if(this.data.length>100) this.data.shift();
  },

  draw(){
    if(!this.ctx) return;

    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    this.ctx.beginPath();

    this.data.forEach((v,i)=>{
      const x = i*4;
      const y = this.canvas.height - v*20;
      if(i===0) this.ctx.moveTo(x,y);
      else this.ctx.lineTo(x,y);
    });

    this.ctx.strokeStyle="#00ffcc";
    this.ctx.stroke();
  }

};


// =======================================================
// [1/6] ROULETTE 3D
// =======================================================

const Roulette3D = {

  wheel:null,

  init(scene){
    const geo = new THREE.CylinderGeometry(2,2,0.5,32);
    const mat = new THREE.MeshBasicMaterial({color:0xff0000});
    this.wheel = new THREE.Mesh(geo,mat);
    scene.add(this.wheel);
  },

  spin(){
    if(!this.wheel) return;
    this.wheel.rotation.y += 0.3;
  }

};


// =======================================================
// [1/6] FX SYSTEM (PARTICLES)
// =======================================================

const FXParticles = {

  particles:[],

  spawn(x,y){
    this.particles.push({x,y,vx:Math.random()-0.5,vy:Math.random()-0.5,life:100});
  },

  update(ctx){
    this.particles.forEach(p=>{
      p.x+=p.vx;
      p.y+=p.vy;
      p.life--;
      ctx.fillRect(p.x,p.y,2,2);
    });

    this.particles = this.particles.filter(p=>p.life>0);
  }

};


// =======================================================
// [1/6] BET PANEL (STAKE STYLE)
// =======================================================

const BetPanel = {

  init(){

    const input = document.createElement("input");
    input.id="betInput";
    input.type="number";
    input.value=1;

    const btn = document.createElement("button");
    btn.id="betBtn";
    btn.textContent="BET";

    document.getElementById("casinoGameView")?.append(input,btn);

  }

};
// =======================================================
// [2/6] GAME ENGINE (LOGIC WRAPPER)
// =======================================================

const GameEngine = {

  current: null,
  loopId: null,

  load(name){

    this.destroy();

    this.current = GameRegistry[name];

    CasinoEngine.setGame(name);

    this.current.init?.();

    this.startLoop();

  },

  startLoop(){

    const loop = () => {

      if(CasinoEngine.state.running){
        this.current?.update?.();
      }

      this.loopId = requestAnimationFrame(loop);
    };

    loop();
  },

  destroy(){

    cancelAnimationFrame(this.loopId);

    this.current?.destroy?.();

    this.current = null;

  },

  play(bet){

    CasinoEngine.start(bet);

    WSClient.send({
      type:"bet",
      game:CasinoEngine.state.game,
      amount:bet
    });

  },

  cashout(){

    this.current?.cashout?.();

    WSClient.send({
      type:"cashout",
      multiplier:CasinoEngine.state.multiplier
    });

  }

};



// =======================================================
// [2/6] DICE GRAPH (PRO LEVEL)
// =======================================================

const DiceGraph = {

  canvas:null,
  ctx:null,
  rolls:[],

  init(){

    this.canvas = document.createElement("canvas");
    this.canvas.width = 400;
    this.canvas.height = 200;

    this.ctx = this.canvas.getContext("2d");

    document.getElementById("casinoGameView")?.appendChild(this.canvas);

  },

  push(v){

    this.rolls.push(v);

    if(this.rolls.length>120){
      this.rolls.shift();
    }

  },

  draw(){

    if(!this.ctx) return;

    this.ctx.clearRect(0,0,400,200);

    this.ctx.beginPath();

    this.rolls.forEach((r,i)=>{

      const x = i*3;
      const y = 200 - r*200;

      if(i===0) this.ctx.moveTo(x,y);
      else this.ctx.lineTo(x,y);

    });

    this.ctx.strokeStyle="#ffaa00";
    this.ctx.stroke();

  }

};



// =======================================================
// [2/6] GAME LAYOUT SYSTEM
// =======================================================

const GameLayout = {

  container:null,

  init(){

    this.container = document.getElementById("casinoGameView");

  },

  clear(){

    if(!this.container) return;

    this.container.innerHTML = "";

  },

  mount(node){

    this.clear();

    this.container.appendChild(node);

  }

};



// =======================================================
// [2/6] RESULT ANIMATION SYSTEM
// =======================================================

const ResultFX = {

  flash(color="#00ffcc"){

    const el = document.getElementById("casinoGameView");

    if(!el) return;

    el.style.transition="0.2s";
    el.style.background=color;

    setTimeout(()=>el.style.background="transparent",200);

  },

  shake(){

    const el = document.getElementById("casinoGameView");

    if(!el) return;

    el.style.transform="translateX(5px)";

    setTimeout(()=>el.style.transform="translateX(0)",100);

  }

};



// =======================================================
// [2/6] UX FEEDBACK ENGINE
// =======================================================

const UXEngine = {

  notify(txt){

    const el = document.createElement("div");

    el.textContent = txt;
    el.style.position="fixed";
    el.style.bottom="20px";
    el.style.right="20px";
    el.style.background="#111";
    el.style.color="#0f0";
    el.style.padding="10px";

    document.body.appendChild(el);

    setTimeout(()=>el.remove(),2000);

  },

  error(txt){

    const el = document.createElement("div");

    el.textContent = txt;
    el.style.position="fixed";
    el.style.bottom="20px";
    el.style.right="20px";
    el.style.background="#300";
    el.style.color="#f00";
    el.style.padding="10px";

    document.body.appendChild(el);

    setTimeout(()=>el.remove(),2000);

  }

};
// =======================================================
// [3/6] UI ENGINE (RENDER SYSTEM)
// =======================================================

const UIEngine = {

  init(){

    document.querySelectorAll(".casino-game-card").forEach(card=>{

      card.onclick = ()=>{

        const game = card.dataset.game;

        GameEngine.load(game);

        document.getElementById("casinoGameView")?.classList.remove("hidden");

        FXEngine.click();

      };

    });

    document.getElementById("betBtn")?.addEventListener("click",()=>{

      const v = Number(document.getElementById("betInput")?.value || 0);

      if(!CasinoEngine.state.running){

        GameEngine.play(v);

      }else{

        GameEngine.cashout();

      }

    });

  },

  multiplier(v){

    const el = document.getElementById("multiplier");

    if(el) el.textContent = v.toFixed(2)+"x";

  },

  wallet(){

    const el = document.getElementById("casinoWalletText");

    if(el) el.textContent = CasinoEngine.state.wallet+" BX";

  },

  players(v){

    const el = document.getElementById("casinoOnlineText");

    if(el) el.textContent = v;

  },

  volume(v){

    const el = document.getElementById("casinoVolumeText");

    if(el) el.textContent = v.toFixed(2)+" BX";

  },

  feed(text){

    const container = document.getElementById("liveBets");

    if(!container) return;

    const el = document.createElement("div");

    el.textContent = text;

    el.className = "casino-live-row";

    container.prepend(el);

  }

};



// =======================================================
// [3/6] GAME VIEW RENDER (CANVAS + DOM)
// =======================================================

const GameView = {

  canvas:null,
  ctx:null,

  init(){

    this.canvas = document.createElement("canvas");

    this.canvas.width = 600;
    this.canvas.height = 300;

    this.ctx = this.canvas.getContext("2d");

    GameLayout.mount(this.canvas);

  },

  clear(){

    if(!this.ctx) return;

    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

  },

  rect(x,y,w,h,color="#0f0"){

    this.ctx.fillStyle = color;

    this.ctx.fillRect(x,y,w,h);

  },

  circle(x,y,r,color="#0ff"){

    this.ctx.beginPath();

    this.ctx.arc(x,y,r,0,Math.PI*2);

    this.ctx.fillStyle = color;

    this.ctx.fill();

  },

  text(txt,x,y,color="#fff"){

    this.ctx.fillStyle = color;

    this.ctx.fillText(txt,x,y);

  }

};



// =======================================================
// [3/6] GAME INPUT SYSTEM
// =======================================================

const InputEngine = {

  keys:{},
  mouse:{x:0,y:0,down:false},

  init(){

    window.addEventListener("keydown",e=>{
      this.keys[e.key]=true;
    });

    window.addEventListener("keyup",e=>{
      this.keys[e.key]=false;
    });

    window.addEventListener("mousemove",e=>{
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener("mousedown",()=>{
      this.mouse.down = true;
    });

    window.addEventListener("mouseup",()=>{
      this.mouse.down = false;
    });

  }

};



// =======================================================
// [3/6] GAME UI PANELS (STAKE STYLE)
// =======================================================

const UIPanels = {

  init(){

    const panel = document.createElement("div");

    panel.id="casinoPanel";

    panel.innerHTML = `
      <div>Balance: <span id="casinoWalletText">0</span></div>
      <div>Multiplier: <span id="multiplier">1.00x</span></div>
      <div>Players: <span id="casinoOnlineText">0</span></div>
      <div>Volume: <span id="casinoVolumeText">0</span></div>
    `;

    document.body.appendChild(panel);

  }

};



// =======================================================
// [3/6] LIVE FEED SYSTEM
// =======================================================

const LiveFeed = {

  push(user,bet,mult){

    UIEngine.feed(`${user} bet ${bet} → ${mult}x`);

  }

};
// =======================================================
// [4/6] FX ENGINE (ANIMATIONS + SOUND SYSTEM)
// =======================================================

const FXEngine = {

  sounds: {},

  init(){

    ["click","win","lose","spin"].forEach(name=>{
      const el = document.getElementById("snd-"+name);
      if(el) this.sounds[name] = el;
    });

  },

  play(name){

    const snd = this.sounds[name];

    if(!snd) return;

    snd.currentTime = 0;
    snd.play();

  },

  click(){ this.play("click"); },
  win(){ this.play("win"); },
  lose(){ this.play("lose"); },
  spin(){ this.play("spin"); }

};



// =======================================================
// [4/6] PARTICLE SYSTEM (PRO FX)
// =======================================================

const ParticleSystem = {

  particles:[],

  spawn(x,y,count=10){

    for(let i=0;i<count;i++){

      this.particles.push({
        x,y,
        vx:(Math.random()-0.5)*2,
        vy:(Math.random()-0.5)*2,
        life:60
      });

    }

  },

  update(ctx){

    this.particles.forEach(p=>{

      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      ctx.fillStyle = "#0ff";
      ctx.fillRect(p.x,p.y,2,2);

    });

    this.particles = this.particles.filter(p=>p.life>0);

  }

};



// =======================================================
// [4/6] GLOW EFFECT SYSTEM
// =======================================================

const GlowFX = {

  apply(el){

    if(!el) return;

    el.style.boxShadow = "0 0 25px #00ffcc";

    setTimeout(()=>{
      el.style.boxShadow = "none";
    },300);

  }

};



// =======================================================
// [4/6] RESULT EFFECT SYSTEM
// =======================================================

const ResultEffects = {

  win(){

    FXEngine.win();

    GlowFX.apply(document.getElementById("casinoGameView"));

    ParticleSystem.spawn(300,150,30);

  },

  lose(){

    FXEngine.lose();

    const el = document.getElementById("casinoGameView");

    if(!el) return;

    el.style.transform="scale(0.95)";

    setTimeout(()=>{
      el.style.transform="scale(1)";
    },200);

  }

};



// =======================================================
// [4/6] CANVAS FX RENDER LOOP
// =======================================================

const FXRenderer = {

  ctx:null,

  init(){

    const canvas = document.createElement("canvas");

    canvas.width = 600;
    canvas.height = 300;

    this.ctx = canvas.getContext("2d");

    document.getElementById("casinoGameView")?.appendChild(canvas);

    this.loop();

  },

  loop(){

    if(!this.ctx) return;

    this.ctx.clearRect(0,0,600,300);

    ParticleSystem.update(this.ctx);

    requestAnimationFrame(()=>this.loop());

  }

};
// =======================================================
// [5/6] WS CLIENT (LIVE DATA + MULTIPLAYER)
// =======================================================

const WSClient = {

  ws:null,
  connected:false,

  connect(){

    try{

      this.ws = new WebSocket("ws://localhost:3000");

      this.ws.onopen = ()=>{
        this.connected = true;
      };

      this.ws.onclose = ()=>{
        this.connected = false;
      };

      this.ws.onerror = ()=>{
        this.connected = false;
      };

      this.ws.onmessage = (e)=>{

        const data = JSON.parse(e.data);

        this.handle(data);

      };

    }catch(e){
      console.error("WS ERROR",e);
    }

  },

  send(data){

    if(!this.connected) return;

    this.ws.send(JSON.stringify(data));

  },

  handle(data){

    if(data.type==="players"){

      CasinoEngine.state.players = data.count;

      UIEngine.players(data.count);

    }

    if(data.type==="bet"){

      CasinoEngine.state.volume += data.amount;

      UIEngine.volume(CasinoEngine.state.volume);

      LiveFeed.push(data.user || "P", data.amount, data.mult || 1);

    }

    if(data.type==="cashout"){

      LiveFeed.push(data.user || "P", data.amount, data.mult);

    }

  }

};



// =======================================================
// [5/6] LIVE BETS STREAM ENGINE
// =======================================================

const LiveStream = {

  list:[],

  push(entry){

    this.list.unshift(entry);

    if(this.list.length>50){
      this.list.pop();
    }

    UIEngine.feed(`${entry.user} ${entry.type} ${entry.amount}`);

  }

};



// =======================================================
// [5/6] MULTIPLAYER ROOM SYSTEM
// =======================================================

const RoomSystem = {

  room:"global",
  users:[],

  join(name){

    this.room = name;

    WSClient.send({
      type:"join",
      room:name
    });

  },

  leave(){

    WSClient.send({
      type:"leave",
      room:this.room
    });

    this.room = "global";

  },

  updateUsers(list){

    this.users = list;

  }

};



// =======================================================
// [5/6] PROVABLY FAIR SYSTEM (BASIC)
// =======================================================

const FairSystem = {

  serverSeed:"server",
  clientSeed:"client",
  nonce:0,

  next(){

    this.nonce++;

    const str = this.serverSeed + this.clientSeed + this.nonce;

    let hash = 0;

    for(let i=0;i<str.length;i++){
      hash = (hash<<5)-hash + str.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash/2147483647);

  }

};



// =======================================================
// [5/6] BET SYSTEM (STAKE STYLE)
// =======================================================

const BetSystem = {

  place(amount){

    if(amount <= 0) return;

    if(amount > CasinoEngine.state.wallet){
      UXEngine.error("No balance");
      return;
    }

    CasinoEngine.state.wallet -= amount;

    CasinoEngine.start(amount);

    UIEngine.wallet();

    WSClient.send({
      type:"bet",
      amount
    });

  },

  cashout(mult){

    const win = CasinoEngine.state.bet * mult;

    CasinoEngine.win(win);

    UIEngine.wallet();

    WSClient.send({
      type:"cashout",
      amount:win,
      mult
    });

  }

};
// =======================================================
// [6/6] GAME REGISTRY (12 GAMES FULL SYSTEM)
// =======================================================

const GameRegistry = {

  crash: createCrash(),
  dice: createDice(),
  roulette: createRoulette(),
  slots: createSlots(),
  mines: createMines(),
  plinko: createPlinko(),
  airboss: createAirboss(),
  limbo: createLimbo(),
  coinflip: createCoinflip(),
  hilo: createHilo(),
  blackjack: createBlackjack(),
  fruitparty: createFruitParty(),
  bananafarm: createBananaFarm()

};


// =======================================================
// 🎰 GAME FACTORIES
// =======================================================

function createCrash(){

  return {

    m:1,
    crash:0,

    init(){
      this.m = 1;
      this.crash = 1.2 + FairSystem.next() * 5;
    },

    update(){

      this.m += 0.02;

      CasinoEngine.tick(this.m);

      UIEngine.multiplier(this.m);

      CrashGraph.push(this.m);
      CrashGraph.draw();

      if(this.m >= this.crash){

        ResultEffects.lose();
        CasinoEngine.lose();
        CasinoEngine.stop();

      }

    },

    cashout(){

      BetSystem.cashout(this.m);

      ResultEffects.win();

      CasinoEngine.stop();

    }

  };

}



function createDice(){

  return {

    roll:0,

    init(){
      this.roll = FairSystem.next();
    },

    update(){
      DiceGraph.push(this.roll);
      DiceGraph.draw();
    },

    cashout(){

      if(this.roll > 0.5){
        ResultEffects.win();
      }else{
        ResultEffects.lose();
      }

      CasinoEngine.stop();

    }

  };

}



function createRoulette(){

  return {

    value:0,

    init(){
      this.value = Math.floor(FairSystem.next()*37);
    },

    update(){

      Roulette3D.spin();

    },

    cashout(){

      if(this.value % 2 === 0){
        ResultEffects.win();
      }else{
        ResultEffects.lose();
      }

      CasinoEngine.stop();

    }

  };

}



function createSlots(){

  return {

    reels:[],

    init(){

      this.reels = [
        Math.floor(FairSystem.next()*5),
        Math.floor(FairSystem.next()*5),
        Math.floor(FairSystem.next()*5)
      ];

    },

    update(){

      GameView.clear();

      this.reels.forEach((r,i)=>{
        GameView.rect(100+i*120,120,80,80,"#0ff");
        GameView.text(r,130+i*120,160);
      });

    },

    cashout(){

      if(this.reels[0]===this.reels[1] && this.reels[1]===this.reels[2]){
        ResultEffects.win();
      }else{
        ResultEffects.lose();
      }

      CasinoEngine.stop();

    }

  };

}



function createMines(){

  return {

    grid:[],
    revealed:[],

    init(){

      this.grid = Array(25).fill(0).map(()=>FairSystem.next()>0.8?1:0);
      this.revealed = Array(25).fill(false);

    },

    update(){

      GameView.clear();

      for(let i=0;i<25;i++){

        const x = (i%5)*60;
        const y = Math.floor(i/5)*60;

        GameView.rect(x,y,50,50,this.revealed[i]?"#0f0":"#333");

      }

    },

    cashout(){

      ResultEffects.win();

      CasinoEngine.stop();

    }

  };

}



function createPlinko(){

  return {

    balls:[],

    init(){

      this.balls = [{x:300,y:0,vx:0,vy:2}];

    },

    update(){

      GameView.clear();

      this.balls.forEach(b=>{

        b.y += b.vy;

        GameView.circle(b.x,b.y,5,"#ff0");

      });

    },

    cashout(){

      ResultEffects.win();

      CasinoEngine.stop();

    }

  };

}



function createAirboss(){
  return createCrash();
}



function createLimbo(){
  return createCrash();
}



function createCoinflip(){

  return {

    init(){},

    update(){},

    cashout(){

      if(FairSystem.next()>0.5){
        ResultEffects.win();
      }else{
        ResultEffects.lose();
      }

      CasinoEngine.stop();

    }

  };

}



function createHilo(){

  return {

    value:0,

    init(){
      this.value = Math.floor(FairSystem.next()*13);
    },

    update(){

      GameView.clear();

      GameView.text("Card: "+this.value,250,150);

    },

    cashout(){

      ResultEffects.win();

      CasinoEngine.stop();

    }

  };

}



function createBlackjack(){

  return {

    player:0,
    dealer:0,

    init(){

      this.player = Math.floor(FairSystem.next()*21);
      this.dealer = Math.floor(FairSystem.next()*21);

    },

    update(){

      GameView.clear();

      GameView.text("P:"+this.player,200,120);
      GameView.text("D:"+this.dealer,200,180);

    },

    cashout(){

      if(this.player >= this.dealer){
        ResultEffects.win();
      }else{
        ResultEffects.lose();
      }

      CasinoEngine.stop();

    }

  };

}



function createFruitParty(){

  return {

    init(){},

    update(){

      GameView.clear();

      GameView.text("🍓🍌🍉",250,150);

    },

    cashout(){

      ResultEffects.win();

      CasinoEngine.stop();

    }

  };

}



function createBananaFarm(){

  return {

    bananas:0,

    init(){
      this.bananas = Math.floor(FairSystem.next()*10);
    },

    update(){

      GameView.clear();

      GameView.text("🍌 x "+this.bananas,250,150);

    },

    cashout(){

      ResultEffects.win();

      CasinoEngine.stop();

    }

  };

}



// =======================================================
// 🚀 FINAL INIT SYSTEM
// =======================================================

document.addEventListener("DOMContentLoaded",()=>{

  UIEngine.init();
  InputEngine.init();

  Lobby3D.init();
  BetPanel.init();

  DiceGraph.init();
  CrashGraph.init();

  FXEngine.init();
  FXRenderer.init();

  WSClient.connect();

  function loop(){

    GameEngine.update();

    UIEngine.wallet();
    UIEngine.volume(CasinoEngine.state.volume);

    requestAnimationFrame(loop);

  }

  loop();

});
