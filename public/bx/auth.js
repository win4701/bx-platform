// ========================================
// BLOXIO AUTH SYSTEM — PRODUCTION VERSION
// ========================================

window.AUTH = {

  API: "/api",
  tokenKey: "jwt",

  // ================= INIT =================
  init() {
    this.cache();
    this.bind();
    this.autoReferral();
    this.checkSession();
  },

  // ================= CACHE DOM =================
  cache() {
    this.overlay = document.getElementById("authOverlay");

    this.registerBox = document.getElementById("registerBox");
    this.loginBox = document.getElementById("loginBox");

    this.authTitle = document.getElementById("authTitle");
    this.switchText = document.getElementById("switchText");

    this.toggleBtn = document.getElementById("toggleAuth");

    this.registerBtn = document.getElementById("registerBtn");
    this.loginBtn = document.getElementById("loginBtn");

    // inputs
    this.regEmail = document.getElementById("regEmail");
    this.regPass = document.getElementById("regPass");
    this.regPhone = document.getElementById("regPhone");
    this.regRef = document.getElementById("regRef");

    this.loginEmail = document.getElementById("loginEmail");
    this.loginPass = document.getElementById("loginPass");

    this.rememberMe = document.getElementById("rememberMe");
  },

  // ================= EVENTS =================
  bind() {

    if (this.toggleBtn)
      this.toggleBtn.onclick = () => this.toggleMode();

    if (this.registerBtn)
      this.registerBtn.onclick = () => this.register();

    if (this.loginBtn)
      this.loginBtn.onclick = () => this.login();
  },

  // ================= TOGGLE =================
  toggleMode() {

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

  // ================= ENTER =================
  enter(){
  document.body.style.visibility = "visible";
  this.overlay.style.display = "none";

  if(window.BX && BX.init){
    BX.init();
   }
  
  }
  
  // ================= LOGOUT =================
  logout() {
    localStorage.removeItem(this.tokenKey);
    location.reload();
  },

  // ================= SESSION =================
  checkSession() {

    const token = localStorage.getItem(this.tokenKey);

    if (token) {
      this.enter();
    }
  },

  // ================= REFERRAL AUTO =================
  autoReferral() {

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref && this.regRef) {
      this.regRef.value = ref;
    }
  },

  // ================= HELPERS =================

  save(token) {

    if (this.rememberMe?.checked) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      sessionStorage.setItem(this.tokenKey, token);
    }
  },

  getToken() {
    return localStorage.getItem(this.tokenKey)
        || sessionStorage.getItem(this.tokenKey);
  },

  headers() {
    return {
      "Content-Type": "application/json"
    };
  },

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
    console.error("AUTH:", msg);
    alert(msg); // لاحقًا toast
  }

};
