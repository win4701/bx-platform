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

    SceneManager.register("crash", CrashScene);
     
    SceneManager.load("crash");

    console.log("🎰 CASINO ENGINE READY");

  }

});
