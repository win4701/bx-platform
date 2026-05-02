"use strict";

const AUTH = {

  API: location.origin + "/api",

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

  /* ================= REFERRAL AUTO ================= */

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

    this.el.error.innerText = msg;
    this.el.error.style.opacity = "1";

  },

  clearError(){
    this.el.error.innerText = "";
    this.el.error.style.opacity = "0";
  },

  /* ================= FETCH WRAPPER ================= */

  async request(url, body){

    try{

      const token = localStorage.getItem("token");

      const res = await fetch(this.API + url, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization:"Bearer "+token } : {})
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if(!res.ok){
        throw new Error(data.error || "Request failed");
      }

      return data;

    }catch(e){
      throw new Error(e.message || "Network error");
    }

  },

  /* ================= LOGIN ================= */

  async login(){

    if(this.state.loading) return;

    const email = this.el.email.value.trim();
    const pass  = this.el.pass.value.trim();

    if(!this.validateEmail(email))
      return this.error("Invalid email");

    if(!this.validatePassword(pass))
      return this.error("Weak password");

    this.loading(this.el.loginBtn,true);
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

    this.loading(this.el.loginBtn,false);

  },

  /* ================= REGISTER ================= */

  async register(){

    if(this.state.loading) return;

    const email = this.el.regEmail.value.trim();
    const pass  = this.el.regPass.value.trim();
    const ref   = this.el.regRef.value.trim();

    if(!this.validateEmail(email))
      return this.error("Invalid email");

    if(!this.validatePassword(pass))
      return this.error("Weak password");

    this.loading(this.el.registerBtn,true);
    this.clearError();

    try{

      const data = await this.request("/auth/register", {
        email,
        password: pass,
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

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

  },

  logout(){

    localStorage.clear();
    location.reload();

  },

  /* ================= GUARD ================= */

  async guard(){

    const token = localStorage.getItem("token");

    if(!token){
      this.el.overlay.style.display = "flex";
      return;
    }

    try{

      const res = await fetch(this.API + "/auth/check", {
        headers:{
          Authorization:"Bearer "+token
        }
      });

      if(!res.ok) throw new Error();

      this.enter();

    }catch(e){

      localStorage.clear();
      this.el.overlay.style.display = "flex";

    }

  },

  /* ================= ENTER ================= */

  enter(){

    this.el.overlay.style.display = "none";

    const app = $("app");
    if(app) app.classList.remove("hidden");

    // 🔥 sync modules
    if(window.WALLET) WALLET.init?.();
    if(window.AIRDROP) loadAirdrop?.();

  }

};

/* ================= HELPER ================= */

function $(id){
  return document.getElementById(id);
}

/* ================= START ================= */

window.addEventListener("load", ()=> AUTH.init());
