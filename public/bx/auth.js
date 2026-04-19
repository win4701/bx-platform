// =====================================================
// BLOXIO AUTH SYSTEM — FINAL PRO VERSION
// =====================================================

const AUTH = {

  API: "https://api.bloxio.online",

  state: {
    loading: false,
    mode: "login"
  },

  el: {},

  // ================= INIT =================
  init(){

    this.cache();
    this.bind();
    this.guard();

  },

  // ================= CACHE DOM =================
  cache(){

    this.el = {
      overlay: document.getElementById("authOverlay"),

      loginBox: document.getElementById("loginBox"),
      registerBox: document.getElementById("registerBox"),

      email: document.getElementById("loginEmail"),
      pass: document.getElementById("loginPass"),

      regEmail: document.getElementById("regEmail"),
      regPass: document.getElementById("regPass"),
      regPhone: document.getElementById("regPhone"),
      regRef: document.getElementById("regRef"),

      loginBtn: document.getElementById("loginBtn"),
      registerBtn: document.getElementById("registerBtn"),

      toggle: document.getElementById("toggleAuth"),

      title: document.getElementById("authTitle"),
      sub: document.getElementById("authSub"),
      switchText: document.getElementById("switchText"),

      error: document.getElementById("authError")
    };

  },

  // ================= EVENTS =================
  bind(){

    this.el.toggle.onclick = () => this.toggle();

    this.el.loginBtn.onclick = () => this.login();
    this.el.registerBtn.onclick = () => this.register();

    document.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        this.state.mode === "login" ? this.login() : this.register();
      }
    });

  },

  // ================= MODE =================
  toggle(){

    const isLogin = this.state.mode === "login";

    this.state.mode = isLogin ? "register" : "login";

    this.el.loginBox.classList.toggle("active");
    this.el.registerBox.classList.toggle("active");

    if(isLogin){
      this.el.title.innerText = "Create Account";
      this.el.sub.innerText = "Register new account";
      this.el.switchText.innerText = "Already have account?";
    }else{
      this.el.title.innerText = "Welcome Back";
      this.el.sub.innerText = "Login to your account";
      this.el.switchText.innerText = "Don't have account?";
    }

    this.clearError();

  },

  // ================= VALIDATION =================
  validateEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  },

  validatePassword(v){
    return v.length >= 6;
  },

  validatePhone(v){
    return v.length >= 6;
  },

  // ================= UI =================
  loading(btn, state){

    this.state.loading = state;

    if(state){
      btn.dataset.txt = btn.innerText;
      btn.innerText = "Loading...";
      btn.disabled = true;
    }else{
      btn.innerText = btn.dataset.txt;
      btn.disabled = false;
    }

  },

  error(msg){

    this.el.error.innerText = msg;
    this.el.error.style.opacity = "1";

    this.el.error.animate([
      { transform:"translateX(0)" },
      { transform:"translateX(-6px)" },
      { transform:"translateX(6px)" },
      { transform:"translateX(0)" }
    ],{ duration:300 });

  },

  clearError(){
    this.el.error.innerText = "";
    this.el.error.style.opacity = "0";
  },

  // ================= REQUEST =================
  async request(url, body){

    try{

      const controller = new AbortController();
      const t = setTimeout(()=>controller.abort(), 8000);

      const res = await fetch(this.API + url, {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(t);

      const data = await res.json();

      if(!res.ok){
        throw new Error(data.error || "Request failed");
      }

      return data;

    }catch(e){
      throw new Error(e.message || "Network error");
    }

  },

  // ================= LOGIN =================
  async login(){

    if(this.state.loading) return;

    const email = this.el.email.value.trim();
    const pass  = this.el.pass.value.trim();

    if(!this.validateEmail(email))
      return this.error("Invalid email");

    if(!this.validatePassword(pass))
      return this.error("Password must be at least 6 characters");

    this.loading(this.el.loginBtn, true);
    this.clearError();

    try{

      const data = await this.request("/auth/login", {
        email,
        password: pass
      });

      this.session(data);
      this.enter();

    }catch(e){
      this.error(e.message);
    }

    this.loading(this.el.loginBtn, false);

  },

  // ================= REGISTER =================
  async register(){

    if(this.state.loading) return;

    const email = this.el.regEmail.value.trim();
    const pass  = this.el.regPass.value.trim();
    const phone = this.el.regPhone.value.trim();
    const ref   = this.el.regRef.value.trim();

    if(!this.validateEmail(email))
      return this.error("Invalid email");

    if(!this.validatePassword(pass))
      return this.error("Weak password");

    if(!this.validatePhone(phone))
      return this.error("Invalid phone");

    this.loading(this.el.registerBtn, true);
    this.clearError();

    try{

      const data = await this.request("/auth/register", {
        email,
        password: pass,
        phone,
        referral: ref
      });

      this.session(data);
      this.enter();

    }catch(e){
      this.error(e.message);
    }

    this.loading(this.el.registerBtn, false);

  },

  // ================= SESSION =================
  session(data){

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

    // show app
    const app = document.getElementById("app");
    if(app) app.classList.remove("hidden");

  }

};

// ================= START =================
window.addEventListener("load", () => AUTH.init());
