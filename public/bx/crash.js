// =========================================================
// 🎰 BLOXIO CASINO ENGINE (FINAL PRO)
// =========================================================

if (window.BX_CASINO) return;
window.BX_CASINO = true;

// =========================================================
// 🧠 CasinoEngine (STATE + API)
// =========================================================
const CasinoEngine = {

  state: {
    user: null,
    balance: 0,
    currentGame: null,
    playing: false,
    room: "global"
  },

  config: {
    api: "/api/casino",
    ws: "wss://api.bloxio.online"
  },

  async play(game, payload) {

    const res = await fetch(this.config.api + "/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({
        game,
        bet: payload.bet,
        data: payload,
        room: this.state.room
      })
    });

    return res.json();
  }

};

// =========================================================
// 🌐 WS CLIENT (REALTIME + MULTIPLAYER)
// =========================================================
const WSClient = {

  ws: null,

  connect() {

    this.ws = new WebSocket(CasinoEngine.config.ws);

    this.ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      this.handle(d);
    };

  },

  send(data) {
    this.ws?.send(JSON.stringify(data));
  },

  handle(d) {

    // 🎯 LIVE BETS
    if (d.type === "live_bet") {
      Multiplayer.addBet(d);
    }

    // 👥 PLAYERS
    if (d.type === "room_players") {
      Multiplayer.updatePlayers(d.players);
    }

    // 📈 CRASH
    if (d.type === "crash_tick") {
      Crash3D.update(d.multiplier);
    }

    // 💰 BIG WIN
    if (d.type === "big_win") {
      FX.bigWin(`${d.user} won ${d.payout}`);
    }

    // 💳 WALLET
    if (d.type === "wallet_update") {
      UI.updateBalance(d.balance);
    }

  }

};

// =========================================================
// 🎮 GameEngine
// =========================================================
const GameEngine = {

  current:null,

  open(game){

    this.current = game;

    UI.enterGame();

    this.load(game);

  },

  load(game){

    const canvas = document.getElementById("game-canvas");
    canvas.innerHTML = "";

    // ================= 3D GAMES =================
    if(game === "crash"){
      Crash3D.init();
      return;
    }

    if(game === "roulette"){
      Roulette3D.init();
      return;
    }

    if(game === "slots"){
      Slots3D.init();
      return;
    }

    if(game === "mines"){
      Mines3D.init();
      return;
    }

    if(game === "plinko"){
      Plinko3D.init();
      return;
    }

    // ================= UI GAMES =================

    if(game === "dice"){
      canvas.innerHTML = `
        <h2>🎲 Dice</h2>
        <input id="diceTarget" value="50">
      `;
    }

    if(game === "coinflip"){
      canvas.innerHTML = `
        <h2>🪙 Coinflip</h2>
        <button onclick="GameEngine.setOption('heads')">Heads</button>
        <button onclick="GameEngine.setOption('tails')">Tails</button>
      `;
    }

    if(game === "limbo"){
      canvas.innerHTML = `
        <h2>🎯 Limbo</h2>
        <input id="limboTarget" value="2">
      `;
    }

    if(game === "hilo"){
      canvas.innerHTML = `
        <h2>⬆️ Hi-Lo</h2>
        <button onclick="GameEngine.setOption('high')">High</button>
        <button onclick="GameEngine.setOption('low')">Low</button>
      `;
    }

    if(game === "blackjack"){
      canvas.innerHTML = `<h2>🃏 Blackjack (API)</h2>`;
    }

    if(game === "keno"){
      canvas.innerHTML = `<h2>🔢 Keno</h2>`;
    }

    if(game === "wheel"){
      canvas.innerHTML = `<h2>🎡 Wheel</h2>`;
    }

  },

  option:null,

  setOption(v){
    this.option = v;
  },

  getPayload(){

    switch(this.current){

      case "dice":
        return {
          target: Number(document.getElementById("diceTarget").value)
        };

      case "coinflip":
        return {
          side: this.option
        };

      case "limbo":
        return {
          multiplier: Number(document.getElementById("limboTarget").value)
        };

      case "hilo":
        return {
          choice: this.option
        };

      default:
        return {};
    }

  },

  async play(bet){

    if(!this.current) return;

    FX.start();

    await delay(500);

    const payload = this.getPayload();

    const res = await CasinoEngine.play(this.current,{
      bet,
      ...payload
    });

    FX.reveal(res);

    if(res.result?.win){
      FX.win();
      Sound.play("win");
    }else{
      FX.lose();
      Sound.play("lose");
    }

  }

};
     
// =========================================================
// 🎛 UI ENGINE
// =========================================================
const UI = {

  init() {
    this.bindGames();
    this.bindBet();
    this.bindExit();
    this.bindRooms();
  },

  bindGames() {

    document.querySelectorAll(".game-card").forEach(btn => {
      btn.onclick = () => GameEngine.open(btn.dataset.game);
    });

  },

  bindBet() {

    let value = 10;

    betPlus.onclick = () => {
      value += 10;
      betInput.value = value;
    };

    betMinus.onclick = () => {
      value = Math.max(1, value - 10);
      betInput.value = value;
    };

    betBtn.onclick = () => {
      GameEngine.play(value);
    };

  },

  bindExit() {

    exitGame.onclick = () => {
      document.getElementById("casino-stage").classList.add("hidden");
      document.getElementById("casino-games").classList.remove("hidden");
    };

  },

  bindRooms() {

    const select = document.getElementById("roomSelect");

    if (!select) return;

    select.onchange = () => {

      const room = select.value;

      CasinoEngine.state.room = room;

      WSClient.send({
        type: "join_room",
        room
      });

    };

  },

  enterGame() {
    document.getElementById("casino-stage").classList.remove("hidden");
    document.getElementById("casino-games").classList.add("hidden");
  },

  updateBalance(bal) {
    document.getElementById("casinoWalletText").innerText = bal + " BX";
  }

};

// =========================================================
// 💥 FX ENGINE
// =========================================================
const FX = {

  start() {
    document.body.classList.add("playing");
  },

  reveal(res) {
    console.log("RESULT:", res);
  },

  win() {
    this.flash("win");
    Particles.spawn(window.innerWidth / 2, 200);
  },

  lose() {
    this.flash("lose");
  },

  flash(type) {
    document.body.classList.add(type);
    setTimeout(() => document.body.classList.remove(type), 1500);
  },

  bigWin(txt) {

    const el = document.createElement("div");
    el.className = "big-win";
    el.innerText = txt;

    document.body.appendChild(el);

    setTimeout(() => el.remove(), 3000);

  }

};

// =========================================================
// 🔊 SOUND
// =========================================================
const Sound = {
  play(type) {
    const map = {
      win: "snd-win",
      lose: "snd-lose",
      spin: "snd-spin",
      click: "snd-click"
    };
    document.getElementById(map[type])?.play();
  }
};

// =========================================================
// 🎡 3D SYSTEM
// =========================================================
const ThreeEngine = {

  init() {

    const container = document.getElementById("game-canvas");

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    this.camera.position.z = 8;

    const light = new THREE.PointLight(0xffffff, 2);
    light.position.set(5, 5, 5);
    this.scene.add(light);

    this.animate();

  },

  animate() {

    requestAnimationFrame(() => this.animate());

    if (this.update) this.update();

    this.renderer.render(this.scene, this.camera);

  }

};

// =========================================================
// 🎡 ROULETTE 3D
// =========================================================
const Roulette3D = {

  init() {

    ThreeEngine.init();

    const geo = new THREE.CylinderGeometry(3, 3, 0.5, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0x7c2d12 });

    this.wheel = new THREE.Mesh(geo, mat);

    ThreeEngine.scene.add(this.wheel);

    ThreeEngine.update = () => {
      this.wheel.rotation.y += 0.01;
    };

  }

};

// =========================================================
// 🎰 SLOTS 3D
// =========================================================
const Slots3D = {

  init() {

    ThreeEngine.init();

    for (let i = 0; i < 3; i++) {

      const geo = new THREE.BoxGeometry(1, 3, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x111 });

      const reel = new THREE.Mesh(geo, mat);
      reel.position.x = (i - 1) * 2;

      ThreeEngine.scene.add(reel);
    }

  }

};

// =========================================================
// 💣 MINES 3D
// =========================================================
const Mines3D = {

  init() {

    ThreeEngine.init();

    for (let i = 0; i < 25; i++) {

      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );

      cube.position.x = (i % 5) - 2;
      cube.position.y = Math.floor(i / 5) - 2;

      ThreeEngine.scene.add(cube);
    }

  }

};

// =========================================================
// 🔻 PLINKO 3D
// =========================================================
const Plinko3D = {

  init() {

    ThreeEngine.init();

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    ThreeEngine.scene.add(ball);

    ThreeEngine.update = () => {
      ball.position.y -= 0.05;
      ball.position.x += (Math.random() - 0.5) * 0.1;
    };

  }

};

// =========================================================
// 📈 CRASH 3D
// =========================================================
const Crash3D = {

  points: [],

  init() {

    ThreeEngine.init();

    const mat = new THREE.LineBasicMaterial({ color: 0x22c55e });
    const geo = new THREE.BufferGeometry();

    this.line = new THREE.Line(geo, mat);

    ThreeEngine.scene.add(this.line);

  },

  update(m) {

    this.points.push(new THREE.Vector3(this.points.length * 0.2, m, 0));

    this.line.geometry.setFromPoints(this.points);

  }

};

// =========================================================
// 👥 MULTIPLAYER
// =========================================================
const Multiplayer = {

  addBet(d) {

    const el = document.createElement("div");
    el.innerText = `${d.user} → ${d.bet}`;
    document.getElementById("casinoFeed")?.prepend(el);

  },

  updatePlayers(p) {

    document.getElementById("casinoOnlineText").innerText = p.length;

  }

};

// =========================================================
// 🎯 PARTICLES
// =========================================================
const Particles = {

  spawn(x, y) {

    for (let i = 0; i < 10; i++) {

      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = x + "px";
      p.style.top = y + "px";

      document.body.appendChild(p);

      setTimeout(() => p.remove(), 1000);

    }

  }

};

// =========================================================
// ⏱ UTILS
// =========================================================
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// =========================================================
// 🚀 INIT
// =========================================================
document.addEventListener("bloxio:view", (e) => {

  if (e.detail === "casino") {

    UI.init();
    WSClient.connect();

    console.log("🎰 CASINO FULL SYSTEM READY");

  }

});
