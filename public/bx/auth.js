// ==========================================
// BLOXIO AUTH SYSTEM — ULTRA STABLE FINAL
// ==========================================

window.AUTH = {

  API: "/api",
  tokenKey: "jwt",

  // ================= INIT =================
  init() {

    console.log("🔐 AUTH INIT");

    this.cache();
    this.bind();
    this.autoReferral();

    // 🔥 أهم شيء
    this.guard();
  },

  // ================= CACHE =================
  cache() {

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

    if (this.overlay)
      this.overlay.style.display = "flex";

    // 🔥 مهم: أظهر الصفحة
    document.body.style.visibility = "visible";
  },

  // ================= ENTER =================
  enter() {

    console.log("✅ AUTH SUCCESS");

    window.AUTH_READY = true;

    // hide auth
    if (this.overlay)
      this.overlay.style.display = "none";

    // show app
    document.body.style.visibility = "visible";

    // 🔥 تشغيل الأنظمة بالترتيب الصحيح
    if (window.startBX) {
      window.startBX();
    }

    if (window.startMain) {
      window.startMain();
    }
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
        body: JSON.stringify({
          email,
          password,
          phone,
          referral
        })
      });

      const data = await res.json();

      if (data.token) {
        this.save(data.token);
        this.enter();
      } else {
        this.error(data.error || "Register failed");
      }

    } catch (e) {
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

    } catch (e) {
      this.error("Network error");
    }

    this.loading(this.loginBtn, false);
  },

  // ================= LOGOUT =================
  logout() {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    location.reload();
  },

  // ================= REFERRAL =================
  autoReferral() {

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref && this.regRef) {
      this.regRef.value = ref;
    }
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
