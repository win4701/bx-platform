// ===============================
// AUTH SYSTEM PRO (BLOXIO)
// ===============================

const AUTH = {

  API: "https://api.bloxio.online",

  state: {
    loading: false,
    mode: "login"
  },

  // ================= INIT =================
  init(){
    this.cache();
    this.bind();
    this.guard();
  },

  cache(){
    this.el = {
      overlay: document.getElementById("authOverlay"),
      loginBox: document.getElementById("loginBox"),
      registerBox: document.getElementById("registerBox"),
      error: document.getElementById("authError"),

      btnLogin: document.getElementById("loginBtn"),
      btnRegister: document.getElementById("registerBtn"),
      toggle: document.getElementById("toggleAuth"),

      email: document.getElementById("loginEmail"),
      pass: document.getElementById("loginPass"),

      regEmail: document.getElementById("regEmail"),
      regPass: document.getElementById("regPass"),
      regPhone: document.getElementById("regPhone"),
      regRef: document.getElementById("regRef"),
    };
  },

  // ================= EVENTS =================
  bind(){

    this.el.toggle.onclick = ()=>this.toggleMode();

    this.el.btnLogin.onclick = ()=>this.login();
    this.el.btnRegister.onclick = ()=>this.register();

    // Enter submit
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        if(this.state.mode === "login") this.login();
        else this.register();
      }
    });

  },

  // ================= MODE =================
  toggleMode(){

    this.clearError();

    this.state.mode = this.state.mode === "login" ? "register" : "login";

    this.el.loginBox.classList.toggle("hidden");
    this.el.registerBox.classList.toggle("hidden");

  },

  // ================= VALIDATION =================
  validateEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validatePassword(pass){
    return pass.length >= 6;
  },

  validatePhone(phone){
    return phone.length >= 6;
  },

  // ================= UI =================
  setLoading(btn, state){

    this.state.loading = state;

    if(state){
      btn.dataset.original = btn.innerText;
      btn.innerText = "Loading...";
      btn.disabled = true;
    }else{
      btn.innerText = btn.dataset.original;
      btn.disabled = false;
    }

  },

  showError(msg){
    this.el.error.innerText = msg;
    this.el.error.classList.remove("hidden");

    // shake animation
    this.el.error.animate([
      { transform: "translateX(0)" },
      { transform: "translateX(-5px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(0)" }
    ], { duration: 300 });

  },

  clearError(){
    this.el.error.classList.add("hidden");
  },

  // ================= REQUEST =================
  async request(url, body){

    try{

      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), 8000);

      const res = await fetch(this.API + url, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await res.json();

      if(!res.ok){
        throw new Error(data.error || "Request failed");
      }

      return data;

    }catch(err){
      throw new Error(err.message || "Network error");
    }

  },

  // ================= LOGIN =================
  async login(){

    if(this.state.loading) return;

    const email = this.el.email.value.trim();
    const pass  = this.el.pass.value.trim();

    if(!this.validateEmail(email))
      return this.showError("Invalid email");

    if(!this.validatePassword(pass))
      return this.showError("Password must be at least 6 characters");

    this.setLoading(this.el.btnLogin, true);
    this.clearError();

    try{

      const data = await this.request("/auth/login", {
        email, password: pass
      });

      this.setSession(data);
      this.enter();

    }catch(err){
      this.showError(err.message);
    }

    this.setLoading(this.el.btnLogin, false);

  },

  // ================= REGISTER =================
  async register(){

    if(this.state.loading) return;

    const email = this.el.regEmail.value.trim();
    const pass  = this.el.regPass.value.trim();
    const phone = this.el.regPhone.value.trim();
    const ref   = this.el.regRef.value.trim();

    if(!this.validateEmail(email))
      return this.showError("Invalid email");

    if(!this.validatePassword(pass))
      return this.showError("Weak password");

    if(!this.validatePhone(phone))
      return this.showError("Invalid phone");

    this.setLoading(this.el.btnRegister, true);
    this.clearError();

    try{

      const data = await this.request("/auth/register", {
        email, password: pass, phone, referral: ref
      });

      this.setSession(data);
      this.enter();

    }catch(err){
      this.showError(err.message);
    }

    this.setLoading(this.el.btnRegister, false);

  },

  // ================= TELEGRAM =================
  async telegram(user){

    try{

      const data = await this.request("/auth/telegram", user);

      this.setSession(data);
      this.enter();

    }catch(err){
      this.showError("Telegram login failed");
    }

  },

  // ================= SESSION =================
  setSession(data){

    if(!data.token) throw new Error("Invalid token");

    localStorage.setItem("token", data.token);

    if(data.user){
      localStorage.setItem("user", JSON.stringify(data.user));
    }

  },

  logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    location.reload();
  },

  // ================= ACCESS =================
  guard(){

    const token = localStorage.getItem("token");

    if(!token){
      this.el.overlay.style.display = "flex";
    }else{
      this.enter();
    }

  },

  enter(){
    this.el.overlay.style.display = "none";
  }

};

// ================= TELEGRAM CALLBACK =================
window.onTelegramAuth = function(user){
  AUTH.telegram(user);
};

// ================= START =================
window.addEventListener("load", ()=>AUTH.init());
