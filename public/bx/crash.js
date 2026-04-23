// =======================================================
// 🎰 BLOXIO CASINO — PHASE 1 (WEBGL CORE ENGINE)
// SINGLE FILE • PRODUCTION READY • NO DOM ANIMATION
// =======================================================

if (window.__CASINO_ENGINE__) return;
window.__CASINO_ENGINE__ = true;

// =======================================================
// 🧠 CORE ENGINE
// =======================================================
const Engine = {
  
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  currentScene: null,
  container: null,

  init(containerId = "game-canvas") {

    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error("❌ game-canvas not found");
      return;
    }

    // 🎮 SCENE
    this.scene = new THREE.Scene();

    // 🎥 CAMERA
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    // ⚡ RENDERER (optimized)
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      alpha: true,
      stencil: false,
      depth: true
    });

    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );

    this.renderer.setPixelRatio(1); // 🔥 mobile safe
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // ⏱ CLOCK
    this.clock = new THREE.Clock();

    // 🌫 BACKGROUND
    this.scene.background = null;

    // 💡 LIGHT (global)
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    this.scene.add(light);

    // 🎬 LOOP
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    // 📱 RESIZE
    window.addEventListener("resize", () => this.resize());

    console.log("🔥 WebGL Engine Initialized");

  },

  loop() {

    const dt = this.clock.getDelta();

    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(dt);
    }

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.loop);
  },

  setScene(scene) {

    // 🧹 destroy old scene
    if (this.currentScene && this.currentScene.destroy) {
      this.currentScene.destroy();
    }

    this.clearScene();

    this.currentScene = scene;

    if (scene.init) {
      scene.init(this);
    }

  },

  clearScene() {

    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];

      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }

      this.scene.remove(obj);
    }

  },

  resize() {

    if (!this.container) return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);

  }

};

// =======================================================
// 🎮 SCENE MANAGER
// =======================================================
const SceneManager = {

  scenes: {},

  register(name, scene) {
    this.scenes[name] = scene;
  },

  load(name) {

    const scene = this.scenes[name];

    if (!scene) {
      console.error("❌ Scene not found:", name);
      return;
    }

    Engine.setScene(scene);

  }

};

// =======================================================
// 📈 CRASH 3D SCENE (PRODUCTION LEVEL)
// =======================================================
const CrashScene = {

  line: null,
  points: null,
  maxPoints: 2000,
  index: 0,

  multiplier: 1,
  crashPoint: 0,
  running: false,

  speed: 0.8,

  init(engine) {

    console.log("🚀 CrashScene Init");

    this.engine = engine;

    // 🎯 reset
    this.multiplier = 1;
    this.index = 0;
    this.running = true;

    // 🎯 crash point (later replace with provably fair)
    this.crashPoint = 1.5 + Math.random() * 3;

    // 📈 buffer
    this.points = new Float32Array(this.maxPoints * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.points, 3));

    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0x22c55e,
      linewidth: 2
    });

    this.line = new THREE.Line(geo, mat);

    engine.scene.add(this.line);

    // 🎥 camera reset
    engine.camera.position.set(0, 1, 6);

  },

  update(dt) {

    if (!this.running) return;

    // 📈 multiplier growth
    this.multiplier += dt * this.speed;

    // 📊 add point
    const x = this.index * 0.02;
    const y = this.multiplier;

    const i = this.index * 3;

    if (i >= this.points.length) return;

    this.points[i] = x;
    this.points[i + 1] = y;
    this.points[i + 2] = 0;

    this.index++;

    // update geometry
    this.line.geometry.setDrawRange(0, this.index);
    this.line.geometry.attributes.position.needsUpdate = true;

    // 🎥 camera follow
    this.engine.camera.position.x = x * 0.3;
    this.engine.camera.position.y = y * 0.5;

    // 💥 crash condition
    if (this.multiplier >= this.crashPoint) {
      this.crash();
    }

  },

  crash() {

    console.log("💥 CRASH AT:", this.multiplier.toFixed(2));

    this.running = false;

    // 🔴 change color
    this.line.material.color.set(0xff0000);

    // 💥 FX (simple pulse)
    this.engine.camera.position.z = 4;

  },

  destroy() {

    console.log("🧹 CrashScene Destroy");

    if (this.line) {
      this.line.geometry.dispose();
      this.line.material.dispose();
      this.engine.scene.remove(this.line);
    }

  }

};

// =======================================================
// ✈️ AIRBOSS 3D (AVIATOR STYLE)
// =======================================================
const AirBossScene = {

  plane: null,
  trail: null,

  multiplier: 1,
  crashPoint: 0,
  running: false,
  cashedOut: false,

  speed: 0.9,

  init(engine) {

    console.log("✈️ AirBoss Init");

    this.engine = engine;

    this.multiplier = 1;
    this.running = true;
    this.cashedOut = false;

    // 🎯 crash point (later WS / provably fair)
    this.crashPoint = 1.5 + Math.random() * 3;

    // ✈️ plane
    const geo = new THREE.BoxGeometry(1.2, 0.3, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    this.plane = new THREE.Mesh(geo, mat);
    engine.scene.add(this.plane);

    // 📈 trail
    const points = [];
    for (let i = 0; i < 1000; i++) {
      points.push(new THREE.Vector3(0, 0, 0));
    }

    const geoLine = new THREE.BufferGeometry().setFromPoints(points);
    const matLine = new THREE.LineBasicMaterial({ color: 0x22c55e });

    this.trail = new THREE.Line(geoLine, matLine);
    engine.scene.add(this.trail);

    // 🎥 camera
    engine.camera.position.set(0, 1, 6);

  },

  update(dt) {

    if (!this.running) return;

    // 📈 multiplier
    this.multiplier += dt * this.speed;

    const x = this.multiplier * 1.2;
    const y = this.multiplier * 0.6;

    // ✈️ move plane
    this.plane.position.x = x;
    this.plane.position.y = y;

    // 🎯 rotate plane
    this.plane.rotation.z = -Math.atan2(1, 2);

    // 📈 update trail
    const positions = this.trail.geometry.attributes.position.array;

    for (let i = positions.length - 3; i > 0; i--) {
      positions[i] = positions[i - 3];
    }

    positions[0] = x;
    positions[1] = y;
    positions[2] = 0;

    this.trail.geometry.attributes.position.needsUpdate = true;

    // 🎥 camera follow
    this.engine.camera.position.x = x * 0.2;
    this.engine.camera.position.y = y * 0.3;

    // 💥 crash
    if (this.multiplier >= this.crashPoint) {
      this.crash();
    }

    // 🧠 UI update
    this.updateUI();

  },

  updateUI() {

    const el = document.getElementById("multiplier");

    if (el) {
      el.textContent = this.multiplier.toFixed(2) + "x";
    }

  },

  // 💰 CASHOUT
  cashout() {

    if (!this.running || this.cashedOut) return;

    this.cashedOut = true;

    console.log("💰 CASHOUT AT:", this.multiplier.toFixed(2));

    // 🟢 visual feedback
    this.plane.material.color.set(0x22c55e);

  },

  crash() {

    console.log("💥 CRASH AT:", this.multiplier.toFixed(2));

    this.running = false;

    // 🔴 visual
    this.plane.material.color.set(0xff0000);

    // 💥 camera punch
    this.engine.camera.position.z = 4;

  },

  destroy() {

    console.log("🧹 AirBoss Destroy");

    if (this.plane) {
      this.plane.geometry.dispose();
      this.plane.material.dispose();
      this.engine.scene.remove(this.plane);
    }

    if (this.trail) {
      this.trail.geometry.dispose();
      this.trail.material.dispose();
      this.engine.scene.remove(this.trail);
    }

  }

};

// =======================================================
// 🌐 WS CLIENT (FULL MULTIPLAYER ENGINE)
// =======================================================
const WSClient = {

  ws: null,
  connected: false,
  room: "airboss-1",

  queue: [],

  connect() {

    this.ws = new WebSocket("ws://localhost:3000");

    this.ws.onopen = () => {
      console.log("🌐 Connected");
      this.connected = true;

      this.send({
        type: "join_room",
        room: this.room
      });
    };

    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      this.queue.push(data);
    };

    this.ws.onclose = () => {
      console.log("❌ WS Closed");
      this.connected = false;
    };

    // ⚡ batching updates (performance)
    setInterval(() => {
      if (this.queue.length) {
        this.processBatch(this.queue.splice(0, 20));
      }
    }, 100);

  },

  send(data) {
    if (this.connected) {
      this.ws.send(JSON.stringify(data));
    }
  },

  processBatch(list) {
    list.forEach(d => this.handle(d));
  },

  handle(d) {

    switch (d.type) {

      case "players":
        UI.updatePlayers(d.count);
      break;

      case "bet":
        Multiplayer.addBet(d);
      break;

      case "cashout":
        Multiplayer.cashout(d);
      break;

      case "round_start":
        SceneManager.load("airboss");
      break;

      case "crash":
        Engine.currentScene?.crash();
      break;

    }

  }

};


// =======================================================
// 👥 MULTIPLAYER SYSTEM
// =======================================================
const Multiplayer = {

  addBet(d) {

    const el = document.createElement("div");
    el.className = "bet-item";

    el.innerHTML = `
      <b>${d.user}</b> bet ${d.bet}
    `;

    document.getElementById("liveBets")?.prepend(el);

    // auto remove
    setTimeout(() => el.remove(), 4000);

  },

  cashout(d) {

    const el = document.createElement("div");

    el.innerHTML = `
      💰 <b>${d.user}</b> cashed out ${d.multiplier}x
    `;

    document.getElementById("liveBets")?.prepend(el);

  }

};


// =======================================================
// 🎯 UI SYSTEM (PHASE 4)
// =======================================================
const UI = {

  updatePlayers(count) {
    const el = document.getElementById("casinoOnlineText");
    if (el) el.textContent = count;
  },

  updateMultiplier(v) {
    const el = document.getElementById("multiplier");
    if (el) el.textContent = v.toFixed(2) + "x";
  }

};


// =======================================================
// 💰 BET SYSTEM (SERVER SYNC)
// =======================================================
const BetSystem = {

  place(bet) {

    WSClient.send({
      type: "bet",
      game: "airboss",
      bet
    });

  },

  cashout(multiplier) {

    WSClient.send({
      type: "cashout",
      multiplier
    });

  }

};


// =======================================================
// 🔗 PATCH AIRBOSS (CONNECT WITH WS)
// =======================================================
const oldUpdate = AirBossScene.update;

AirBossScene.update = function (dt) {

  oldUpdate.call(this, dt);

  UI.updateMultiplier(this.multiplier);

};

AirBossScene.cashout = function () {

  if (!this.running || this.cashedOut) return;

  this.cashedOut = true;

  BetSystem.cashout(this.multiplier);

  this.plane.material.color.set(0x22c55e);

};


// =======================================================
// 🎛 BUTTON HOOK
// =======================================================
const bindControls = () => {

  const btn = document.getElementById("betBtn");

  if (!btn) return;

  btn.onclick = () => {

    const bet = Number(document.getElementById("betInput").value);

    if (Engine.currentScene === AirBossScene) {

      if (!AirBossScene.cashedOut && AirBossScene.running) {
        // CASHOUT
        AirBossScene.cashout();
      } else {
        // BET
        BetSystem.place(bet);
      }

    }

  };

};


// =======================================================
// 🚀 INIT PATCH (PHASE 4)
// =======================================================


// =======================================================
// 🧪 TEST SCENE (DEBUG + VALIDATION)
// =======================================================
const TestScene = {

  cube: null,
  group: null,

  init(engine) {

    console.log("🎮 TestScene Init");

    this.group = new THREE.Group();

    // cube
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.4,
      metalness: 0.2
    });

    this.cube = new THREE.Mesh(geo, mat);

    this.group.add(this.cube);

    // floor
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -1.5;

    this.group.add(floor);

    engine.scene.add(this.group);

  },

  update(dt) {

    if (!this.cube) return;

    this.cube.rotation.x += dt;
    this.cube.rotation.y += dt * 1.2;

  },

  destroy() {

    console.log("🧹 TestScene Destroyed");

  }

};

// =======================================================
// 🧰 UTILS
// =======================================================
const Utils = {

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  rand(min, max) {
    return Math.random() * (max - min) + min;
  }

};

// =======================================================
// 🚀 INIT SYSTEM (HOOK WITH YOUR APP)
// =======================================================
document.addEventListener("bloxio:view", (e) => {

  if (e.detail === "casino") {

    Engine.init("game-canvas");

    SceneManager.register("airboss", AirBossScene);

    WSClient.connect(); // 🔥 multiplayer start

    bindControls();

    console.log("🔥 PHASE 4 READY (MULTIPLAYER)");

  }

});
