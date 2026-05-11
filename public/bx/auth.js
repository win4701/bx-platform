/* =====================================================
   BLOXIO AUTH — GLOBAL FINAL SYSTEM
===================================================== */

"use strict";

const AUTH = {

  state:{
    loading:false,
    mode:"login",
    authenticated:false
  },

  el:{},

  /* =====================================================
     INIT
  ===================================================== */

  init(){

    this.cache();

    if(!this.el.overlay){
      console.error("AUTH overlay missing");
      return;
    }

    this.lockApp();

    this.bind();

    this.injectReferral();

    this.bindGlobalEvents();

    this.guard();

  },

  /* =====================================================
     DOM
  ===================================================== */

  cache(){

    this.el = {

      app:$("app"),

      overlay:$("authOverlay"),

      loginBox:$("loginBox"),
      registerBox:$("registerBox"),

      email:$("loginEmail"),
      pass:$("loginPass"),

      regEmail:$("regEmail"),
      regPass:$("regPass"),
      regPhone:$("regPhone"),
      regRef:$("regRef"),

      loginBtn:$("loginBtn"),
      registerBtn:$("registerBtn"),

      toggle:$("toggleAuth"),

      title:$("authTitle"),
      sub:$("authSub"),
      switchText:$("switchText"),

      error:$("authError")
    };

  },

  /* =====================================================
     GLOBAL EVENTS
  ===================================================== */

  bindGlobalEvents(){

    if(window.API){

      API.on("auth:logout", ()=>{

        this.forceLogout();

      });

    }

    window.addEventListener("storage",(e)=>{

      if(e.key === "token" && !e.newValue){

        this.forceLogout();

      }

    });

  },

  /* =====================================================
     EVENTS
  ===================================================== */

  bind(){

    this.el.toggle?.addEventListener("click",()=>{

      this.toggle();

    });

    this.el.loginBtn?.addEventListener("click",()=>{

      this.login();

    });

    this.el.registerBtn?.addEventListener("click",()=>{

      this.register();

    });

    document.addEventListener("keydown",(e)=>{

      if(e.key !== "Enter") return;

      if(this.state.loading) return;

      this.state.mode === "login"
        ? this.login()
        : this.register();

    });

  },

  /* =====================================================
     REFERRAL
  ===================================================== */

  injectReferral(){

    const ref =
      new URLSearchParams(location.search)
      .get("ref");

    if(ref && this.el.regRef){

      this.el.regRef.value = ref;

    }

  },

  /* =====================================================
     APP LOCK
  ===================================================== */

  lockApp(){

    document.body.classList.add("auth-lock");

    if(this.el.app){

      this.el.app.classList.add("hidden");

    }

  },

  unlockApp(){

    document.body.classList.remove("auth-lock");

    if(this.el.app){

      this.el.app.classList.remove("hidden");

    }

  },

  /* =====================================================
     MODE
  ===================================================== */

  toggle(){

    const isLogin =
      this.state.mode === "login";

    this.state.mode =
      isLogin
        ? "register"
        : "login";

    this.el.loginBox?.classList.toggle("active");

    this.el.registerBox?.classList.toggle("active");

    this.el.title.innerText =
      isLogin
        ? "Create Account"
        : "Welcome Back";

    this.el.sub.innerText =
      isLogin
        ? "Register new account"
        : "Login to your account";

    this.el.switchText.innerText =
      isLogin
        ? "Already have an account?"
        : "Don't have an account?";

    this.el.toggle.innerText =
      isLogin
        ? "Sign in"
        : "Sign up";

    this.clearError();

  },

  /* =====================================================
     VALIDATION
  ===================================================== */

  validateEmail(v){

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  },

  validatePassword(v){

    return typeof v === "string"
      && v.length >= 6;

  },

  validatePhone(v){

    return !v || v.length >= 6;

  },

  /* =====================================================
     UI
  ===================================================== */

  loading(btn,state){

    this.state.loading = state;

    if(!btn) return;

    if(state){

      btn.dataset.txt = btn.innerText;

      btn.innerText = "Loading...";

      btn.disabled = true;

      btn.style.opacity = ".8";

    }else{

      btn.innerText =
        btn.dataset.txt || "Continue";

      btn.disabled = false;

      btn.style.opacity = "1";

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

  /* =====================================================
     REQUEST
  ===================================================== */

  async request(url,body){

    if(!window.API){

      throw new Error("API not loaded");

    }

    const res = await API.post(url,body);

    if(!res || res.error){

      throw new Error(
        res?.error || "Network error"
      );

    }

    return res;

  },

  /* =====================================================
     LOGIN
  ===================================================== */

  async login(){

    if(this.state.loading) return;

    const email =
      this.el.email?.value.trim();

    const pass =
      this.el.pass?.value.trim();

    if(!this.validateEmail(email)){

      return this.error("Invalid email");

    }

    if(!this.validatePassword(pass)){

      return this.error(
        "Password too short"
      );

    }

    this.loading(
      this.el.loginBtn,
      true
    );

    this.clearError();

    try{

      const data = await this.request(
        "/auth/login",
        {
          email,
          password:pass
        }
      );

      this.session(data);

      await this.enter();

    }catch(e){

      this.error(
        e.message || "Login failed"
      );

    }

    this.loading(
      this.el.loginBtn,
      false
    );

  },

  /* =====================================================
     REGISTER
  ===================================================== */

  async register(){

    if(this.state.loading) return;

    const email =
      this.el.regEmail?.value.trim();

    const pass =
      this.el.regPass?.value.trim();

    const phone =
      this.el.regPhone?.value.trim() || "";

    const ref =
      this.el.regRef?.value.trim() || "";

    if(!this.validateEmail(email)){

      return this.error("Invalid email");

    }

    if(!this.validatePassword(pass)){

      return this.error("Weak password");

    }

    if(!this.validatePhone(phone)){

      return this.error("Invalid phone");

    }

    this.loading(
      this.el.registerBtn,
      true
    );

    this.clearError();

    try{

      const data = await this.request(
        "/auth/register",
        {
          email,
          password:pass,
          phone,
          referral:ref
        }
      );

      this.session(data);

      await this.enter();

    }catch(e){

      this.error(
        e.message || "Register failed"
      );

    }

    this.loading(
      this.el.registerBtn,
      false
    );

  },

  /* =====================================================
     SESSION
  ===================================================== */

  session(data){

    if(!data?.token){

      throw new Error(
        "Invalid auth response"
      );

    }

    localStorage.setItem(
      "token",
      data.token
    );

    if(data.user){

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

    }

    this.state.authenticated = true;

  },

  /* =====================================================
     LOGOUT
  ===================================================== */

  logout(){

    localStorage.clear();

    this.state.authenticated = false;

    if(window.WS){

      WS.socket?.close();

    }

    this.showAuth();

  },

  forceLogout(){

    localStorage.clear();

    this.state.authenticated = false;

    this.showAuth();

  },

  /* =====================================================
     GUARD
  ===================================================== */

  async guard(){

    const token =
      localStorage.getItem("token");

    if(!token){

      this.showAuth();

      return;

    }

    try{

      const res =
        await API.get("/auth/check");

      if(!res || res.error){

        throw new Error();

      }

      await this.enter();

    }catch{

      localStorage.clear();

      this.showAuth();

    }

  },

  /* =====================================================
     AUTH VIEW
  ===================================================== */

  showAuth(){

    this.lockApp();

    this.el.overlay.style.display =
      "flex";

  },

  hideAuth(){

    this.el.overlay.style.display =
      "none";

  },

  /* =====================================================
     ENTER APP
  ===================================================== */

  async enter(){

    this.unlockApp();

    this.hideAuth();

    requestAnimationFrame(()=>{

      document.body.scrollTop = 0;

      document.documentElement.scrollTop = 0;

    });

    if(window.WS){

      try{

        WS.connect();

      }catch(e){

        console.error(e);

      }

    }

    if(window.API){

      try{

        API.syncAll();

      }catch(e){

        console.error(e);

      }

    }

  }

};

/* =====================================================
   HELPER
===================================================== */

function $(id){

  return document.getElementById(id);

}

/* =====================================================
   START
===================================================== */

window.addEventListener("load",()=>{

  AUTH.init();

});
