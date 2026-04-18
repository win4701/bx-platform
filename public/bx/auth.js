// ==========================================
// BLOXIO AUTH SYSTEM — 2s LOADER VERSION
// ==========================================

window.AUTH = {

  API: "/api",
  tokenKey: "jwt",
  LOADER_TIME: 2000, // 🔥 2 seconds

  // ================= INIT =================
  init() {

    console.log("🔐 AUTH INIT");

    this.cache();
    this.bind();

    this.initParticles();
    this.autoReferral();

    this.setLoaderText("Initializing...");

    // 🔥 انتظر 2 ثانية ثم قرر
    setTimeout(() => {
      this.guard();
    }, this.LOADER_TIME);
  },

  // ================= CACHE =================
  cache() {

    this.loader = document.getElementById("appLoader");
    this.overlay = document.getElementById("authOverlay");

    this.registerBox = document.getElementById("registerBox");
    this.loginBox = document.getElementById("loginBox");

    this.authTitle = document.getElementById("authTitle");
    this.switchText = document.getElementById("switchText");

    this.toggleBtn = document.getElementById("toggleAuth");

    this.registerBtn = document.getElementById("registerBtn");
    this.loginBtn = document.getElementById("loginBtn");

    this.regEmail = document.getElementById("regEmail");
    this.regPass = document.getElementById("regPass");
    this.regPhone = document.getElementById("regPhone");
    this.regRef = document.getElementById("regRef");

    this.loginEmail = document.getElementById("loginEmail");
    this.loginPass = document.getElementById("loginPass");
  },

  // ================= EVENTS =================
  bind() {

    this.toggleBtn?.addEventListener("click", () => this.toggle());
    this.registerBtn?.addEventListener("click", () => this.register());
    this.loginBtn?.addEventListener("click", () => this.login());
  },

  // ================= GUARD =================
  guard() {

    const token = this.getToken();

    if (!token) {
      this.showAuth();
      return;
    }

    this.enter();
  },

  // ================= SHOW AUTH =================
  showAuth() {

    console.log("🔓 SHOW AUTH");

    window.AUTH_READY = false;

    this.setLoaderText("Loading login...");

    // 🔥 عرض الفورم
    if (this.overlay)
      this.overlay.style.display = "flex";

    // 🔥 إخفاء loader
    this.hideLoader();
  },

  // ================= ENTER =================
  enter() {

    console.log("✅ AUTH SUCCESS");

    window.AUTH_READY = true;

    this.setLoaderText("Entering platform...");

    // 🔥 إخفاء loader
    this.hideLoader();

    setTimeout(() => {

      if (this.overlay)
        this.overlay.style.display = "none";

      // 🔥 تشغيل النظام
      window.startBX?.();
      window.startMain?.();

    }, 300);
  },

  // ================= TOGGLE =================
  toggle() {

    this.registerBox.classList.toggle("hidden");
    this.loginBox.classList.toggle("hidden");

    const isLogin = !this.loginBox.classList.contains("hidden");

    this.authTitle.textContent = isLogin
      ? "Welcome Back"
      : "Create Account";

    this.switchText.textContent = isLogin
      ? "Don't have account?"
      : "Already have account?";
  },

  // ================= REGISTER =================
  async register() {

    const email = this.regEmail.value.trim();
    const password = this.regPass.value.trim();
    const phone = this.regPhone.value.trim();
    const referral = this.regRef?.value.trim();

    if (!email || !password)
      return this.error("Fill required fields");

    this.loading(this.registerBtn, true);

    try {

      const res = await fetch(this.API + "/auth/register", {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ email, password, phone, referral })
      });

      const data = await res.json();

      if (data.token) {
        this.save(data.token);
        this.enter();
      } else {
        this.error(data.error || "Register failed");
      }

    } catch {
      this.error("Network error");
    }

    this.loading(this.registerBtn, false);
  },

  // ================= LOGIN =================
  async login() {

    const email = this.loginEmail.value.trim();
    const password = this.loginPass.value.trim();

    if (!email || !password)
      return this.error("Enter email & password");

    this.loading(this.loginBtn, true);

    try {

      const res = await fetch(this.API + "/auth/login", {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.token) {
        this.save(data.token);
        this.enter();
      } else {
        this.error(data.error || "Login failed");
      }

    } catch {
      this.error("Network error");
    }

    this.loading(this.loginBtn, false);
  },

  // ================= LOADER =================
  hideLoader() {

    if (!this.loader) return;

    this.loader.classList.add("hide");

    setTimeout(() => {
      this.loader.style.display = "none";
    }, 500);
  },

  setLoaderText(txt) {
    const el = document.getElementById("loaderText");
    if (el) el.textContent = txt;
  },

  // ================= PARTICLES =================
  initParticles() {

    const canvas = document.getElementById("bxParticles");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    let particles = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2
      });
    }

    function draw() {

      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,.6)";
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    draw();
  },

  // ================= TOKEN =================
  save(token) {
    localStorage.setItem(this.tokenKey, token);
  },

  getToken() {
    return localStorage.getItem(this.tokenKey)
        || sessionStorage.getItem(this.tokenKey);
  },

  // ================= UI =================
  loading(btn, state) {

    if (!btn) return;

    btn.disabled = state;

    if (!btn.dataset.txt)
      btn.dataset.txt = btn.textContent;

    btn.textContent = state
      ? "Processing..."
      : btn.dataset.txt;
  },

  error(msg) {
    console.error("AUTH ERROR:", msg);
    alert(msg);
  },

  headers() {
    return {
      "Content-Type": "application/json"
    };
  }

};
