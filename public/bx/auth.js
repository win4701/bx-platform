/* =====================================================
   BLOXIO AUTH — FINAL PRO MAX
===================================================== */

"use strict";

const AUTH = {

  state:{
    loading:false,
    mode:"login"
  },

  el:{},

  /* ================= INIT ================= */

  init(){

    this.cache();
    this.bind();
    this.injectReferral();
    this.bindGlobalEvents();
    this.guard();

  },

  /* ================= DOM ================= */

  cache(){

    this.el = {
      overlay: $("authOverlay"),

      loginBox: $("loginBox"),
      registerBox: $("registerBox"),

      email: $("loginEmail"),
      pass: $("loginPass"),

      regEmail: $("regEmail"),
      regPass: $("regPass"),
      regPhone: $("regPhone"),
      regRef: $("regRef"),

      loginBtn: $("loginBtn"),
      registerBtn: $("registerBtn"),

      toggle: $("toggleAuth"),

      title: $("authTitle"),
      sub: $("authSub"),
      switchText: $("switchText"),

      error: $("authError")
    };

  },

  /* ================= GLOBAL EVENTS ================= */

  bindGlobalEvents(){

    // 🔥 logout من API
    if(window.API){
      API.on("auth:logout", ()=> this.forceLogout());
    }

  },

  /* ================= EVENTS ================= */

  bind(){

    this.el.toggle.onclick = () => this.toggle();

    this.el.loginBtn.onclick = () => this.login();
    this.el.registerBtn.onclick = () => this.register();

    document.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){
        this.state.mode==="login"
          ? this.login()
          : this.register();
      }
    });

  },

  /* ================= REFERRAL ================= */

  injectReferral(){

    const ref = new URLSearchParams(location.search).get("ref");

    if(ref && this.el.regRef){
      this.el.regRef.value = ref;
    }

  },

  /* ================= MODE ================= */

  toggle(){

    const isLogin = this.state.mode === "login";

    this.state.mode = isLogin ? "register" : "login";

    this.el.loginBox.classList.toggle("active");
    this.el.registerBox.classList.toggle("active");

    this.el.title.innerText = isLogin
      ? "Create Account"
      : "Welcome Back";

    this.el.sub.innerText = isLogin
      ? "Register new account"
      : "Login to your account";

    this.el.switchText.innerText = isLogin
      ? "Already have an account?"
      : "Don't have an account?";

    this.el.toggle.innerText = isLogin
      ? "Sign in"
      : "Sign up";

    this.clearError();

  },

  /* ================= VALIDATION ================= */

  validateEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  },

  validatePassword(v){
    return v.length >= 6;
  },

  validatePhone(v){
    return !v || v.length >= 6;
  },

  /* ================= UI ================= */

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

    if(!this.el.error) return;

    this.el.error.innerText = msg;
    this.el.error.style.opacity = "1";

  },

  clearError(){

    if(!this.el.error) return;

    this.el.error.innerText = "";
    this.el.error.style.opacity = "0";

  },

  /* ================= REQUEST ================= */

  async request(url, body){

    if(!window.API){
      throw new Error("API not loaded");
    }

    const res = await API.post(url, body);

    if(!res || res.error){
      throw new Error(res?.error || "Network error");
    }

    return res;

  },

  /* ================= LOGIN ================= */

  async login(){

    if(this.state.loading) return;

    const email = this.el.email.value.trim();
    const pass  = this.el.pass.value.trim();

    if(!this.validateEmail(email))
      return this.error("Invalid email");

    if(!this.validatePassword(pass))
      return this.error("Password too short");

    this.loading(this.el.loginBtn,true);
    this.clearError();

    try{

      const data = await this.request("/auth/login",{
        email,
        password: pass
      });

      this.session(data);
      this.enter();

    }catch(e){
      this.error(e.message);
    }

    this.loading(this.el.loginBtn,false);

  },

  /* ================= REGISTER ================= */

  async register(){

    if(this.state.loading) return;

    const email = this.el.regEmail.value.trim();
    const pass  = this.el.regPass.value.trim();
    const phone = this.el.regPhone?.value.trim() || "";
    const ref   = this.el.regRef?.value.trim() || "";

    if(!this.validateEmail(email))
      return this.error("Invalid email");

    if(!this.validatePassword(pass))
      return this.error("Weak password");

    if(!this.validatePhone(phone))
      return this.error("Invalid phone");

    this.loading(this.el.registerBtn,true);
    this.clearError();

    try{

      const data = await this.request("/auth/register",{
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

    this.loading(this.el.registerBtn,false);

  },

  /* ================= SESSION ================= */

  session(data){

    if(!data?.token){
      throw new Error("Invalid auth response");
    }

    localStorage.setItem("token", data.token);

    if(data.user){
      localStorage.setItem("user", JSON.stringify(data.user));
    }

  },

  /* ================= LOGOUT ================= */

  logout(){

    localStorage.clear();

    if(window.WS){
      WS.socket?.close();
    }

    location.reload();

  },

  forceLogout(){

    localStorage.clear();

    this.el.overlay.style.display = "flex";

  },

  /* ================= GUARD ================= */

  async guard(){

    const token = localStorage.getItem("token");

    if(!token){
      this.showAuth();
      return;
    }

    try{

      const res = await API.get("/auth/check");

      if(!res || res.error){
        throw new Error();
      }

      this.enter();

    }catch{

      localStorage.clear();
      this.showAuth();

    }

  },

  showAuth(){
    this.el.overlay.style.display = "flex";
  },

  /* ================= ENTER ================= */

  enter(){

    this.el.overlay.style.display = "none";

    const app = $("app");
    if(app) app.classList.remove("hidden");

    // 🔥 تشغيل WS
    if(window.WS){
      WS.connect();
    }

    // 🔥 sync كامل
    if(window.API){
      API.syncAll();
    }

  }

};

/* ================= HELPER ================= */

function $(id){
  return document.getElementById(id);
}

/* ================= START ================= */

window.addEventListener("load", ()=> AUTH.init());
