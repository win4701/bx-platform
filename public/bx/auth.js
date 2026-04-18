// ===============================
// BLOXIO AUTH SYSTEM (PRO)
// ===============================

window.AUTH = {

  API: "/api",
  tokenKey: "jwt",

  // ================= INIT =================
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.checkSession();
  },

  // ================= CACHE =================
  cacheDOM() {
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

    this.loginEmail = document.getElementById("loginEmail");
    this.loginPass = document.getElementById("loginPass");
  },

  // ================= EVENTS =================
  bindEvents() {

    if(this.toggleBtn){
      this.toggleBtn.onclick = () => this.toggleMode();
    }

    if(this.registerBtn){
      this.registerBtn.onclick = () => this.register();
    }

    if(this.loginBtn){
      this.loginBtn.onclick = () => this.login();
    }
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

    if(!email || !password){
      return this.showError("Fill all required fields");
    }

    this.setLoading(this.registerBtn, true);

    try {

      const res = await fetch(this.API + "/auth/register", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password, phone })
      });

      const data = await res.json();

      if(data.token){
        this.saveToken(data.token);
        this.enter();
      } else {
        this.showError(data.error || "Register failed");
      }

    } catch(err){
      this.showError("Network error");
    }

    this.setLoading(this.registerBtn, false);
  },

  // ================= LOGIN =================
  async login() {

    const email = this.loginEmail.value.trim();
    const password = this.loginPass.value.trim();

    if(!email || !password){
      return this.showError("Enter email & password");
    }

    this.setLoading(this.loginBtn, true);

    try {

      const res = await fetch(this.API + "/auth/login", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if(data.token){
        this.saveToken(data.token);
        this.enter();
      } else {
        this.showError(data.error || "Login failed");
      }

    } catch(err){
      this.showError("Network error");
    }

    this.setLoading(this.loginBtn, false);
  },

  // ================= ENTER APP =================
  enter() {

    if(this.overlay){
      this.overlay.style.display = "none";
    }

    // تشغيل النظام الأساسي
    if(window.BX && typeof BX.init === "function"){
      BX.init();
    }
  },

  // ================= LOGOUT =================
  logout() {
    localStorage.removeItem(this.tokenKey);
    location.reload();
  },

  // ================= SESSION =================
  checkSession() {
    const token = localStorage.getItem(this.tokenKey);

    if(token){
      this.enter();
    }
  },

  // ================= HELPERS =================

  saveToken(token){
    localStorage.setItem(this.tokenKey, token);
  },

  getHeaders(){
    return {
      "Content-Type": "application/json"
    };
  },

  setLoading(btn, state){
    if(!btn) return;

    btn.disabled = state;
    btn.dataset.original = btn.dataset.original || btn.textContent;
    btn.textContent = state ? "Processing..." : btn.dataset.original;
  },

  showError(msg){
    console.error("AUTH ERROR:", msg);
    alert(msg); // لاحقًا نحولها toast
  }

};
