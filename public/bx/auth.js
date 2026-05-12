/* =====================================================
   BLOXIO AUTH — GLOBAL PRODUCTION SYSTEM
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

      console.error(
        "AUTH overlay missing"
      );

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

      app:
        $("app"),

      overlay:
        $("authOverlay"),

      loginBox:
        $("loginBox"),

      registerBox:
        $("registerBox"),

      email:
        $("loginEmail"),

      pass:
        $("loginPass"),

      regEmail:
        $("regEmail"),

      regPass:
        $("regPass"),

      regPhone:
        $("regPhone"),

      regRef:
        $("regRef"),

      loginBtn:
        $("loginBtn"),

      registerBtn:
        $("registerBtn"),

      toggle:
        $("toggleAuth"),

      title:
        $("authTitle"),

      sub:
        $("authSub"),

      switchText:
        $("switchText"),

      error:
        $("authError")

    };

  },

  /* =====================================================
     GLOBAL EVENTS
  ===================================================== */

  bindGlobalEvents(){

    if(window.API?.on){

      API.on(
        "auth:logout",
        ()=>{

          this.forceLogout();

        }
      );

    }

    window.addEventListener(
      "storage",
      e=>{

        if(
          e.key === "token" &&
          !e.newValue
        ){

          this.forceLogout();

        }

      }
    );

  },

  /* =====================================================
     EVENTS
  ===================================================== */

  bind(){

    this.el.toggle
    ?.addEventListener(
      "click",
      ()=>{

        this.toggle();

      }
    );

    this.el.loginBtn
    ?.addEventListener(
      "click",
      ()=>{

        this.login();

      }
    );

    this.el.registerBtn
    ?.addEventListener(
      "click",
      ()=>{

        this.register();

      }
    );

    document.addEventListener(
      "keydown",
      e=>{

        if(
          e.key !== "Enter"
        ) return;

        if(
          this.state.loading
        ) return;

        this.state.mode === "login"
          ? this.login()
          : this.register();

      }
    );

  },

  /* =====================================================
     REFERRAL
  ===================================================== */

  injectReferral(){

    const ref =
      new URLSearchParams(
        location.search
      ).get("ref");

    if(
      ref &&
      this.el.regRef
    ){

      this.el.regRef.value =
        ref;

    }

  },

  /* =====================================================
     APP LOCK
  ===================================================== */

  lockApp(){

  document.body.classList.add(
    "auth-lock"
  );

  if(this.el.app){

    this.el.app.classList.add(
      "app-hidden"
    );
  }

  },
   
  unlockApp(){

  document.body.classList.remove(
    "auth-lock"
  );

  document.body.classList.remove(
    "app-preload"
  );

  if(this.el.app){

    this.el.app.classList.remove(
      "app-hidden"
    );

    requestAnimationFrame(()=>{

      this.el.app.style.opacity =
        "1";

      this.el.app.style.visibility =
        "visible";

    });

  }

  },

  /* =====================================================
     MODE
  ===================================================== */

  toggle(){

    const isLogin =
      this.state.mode ===
      "login";

    this.state.mode =
      isLogin
        ? "register"
        : "login";

    this.el.loginBox
    ?.classList.toggle(
      "active"
    );

    this.el.registerBox
    ?.classList.toggle(
      "active"
    );

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
        ? "Already have account?"
        : "Don't have account?";

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

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(v);

  },

  validatePassword(v){

    return (
      typeof v === "string" &&
      v.length >= 6
    );

  },

  validatePhone(v){

    return (
      !v ||
      v.length >= 6
    );

  },

  /* =====================================================
     UI
  ===================================================== */

  loading(
    btn,
    state
  ){

    this.state.loading =
      state;

    if(!btn) return;

    if(state){

      btn.disabled = true;

      btn.classList.add(
        "loading"
      );

      btn.setAttribute(
        "aria-busy",
        "true"
      );

    }else{

      btn.disabled = false;

      btn.classList.remove(
        "loading"
      );

      btn.removeAttribute(
        "aria-busy"
      );

    }

  },

  error(msg){

    if(!this.el.error)
      return;

    this.el.error.innerText =
      msg ||
      "Unexpected error";

    this.el.error.style.opacity =
      "1";

    this.el.error.classList.add(
      "active"
    );

  },

  clearError(){

    if(!this.el.error)
      return;

    this.el.error.innerText =
      "";

    this.el.error.style.opacity =
      "0";

    this.el.error.classList.remove(
      "active"
    );

  },

  /* =====================================================
     REQUEST
  ===================================================== */

  async request(
    url,
    body = {}
  ){

    if(!window.API){

      throw new Error(
        "API not loaded"
      );

    }

    const timeout =
      new Promise(
        (_,reject)=>{

          setTimeout(()=>{

            reject(
              new Error(
                "Request timeout"
              )
            );

          },10000);

        }
      );

    let res;

    try{

      res =
        await Promise.race([

          API.post(
            url,
            body
          ),

          timeout

        ]);

    }catch(e){

      throw new Error(

        e.message ||
        "Network error"

      );

    }

    if(
      !res ||
      res.error
    ){

      throw new Error(

        res?.error ||
        "Network error"

      );

    }

    return res;

  },

  /* =====================================================
     LOGIN
  ===================================================== */

  async login(){

    if(
      this.state.loading
    ) return;

    const email =
      this.el.email
      ?.value
      .trim();

    const pass =
      this.el.pass
      ?.value
      .trim();

    if(
      !this.validateEmail(
        email
      )
    ){

      return this.error(
        "Invalid email"
      );

    }

    if(
      !this.validatePassword(
        pass
      )
    ){

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

      const data =
        await this.request(
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

        e.message ||
        "Login failed"

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

    if(
      this.state.loading
    ) return;

    const email =
      this.el.regEmail
      ?.value
      .trim();

    const pass =
      this.el.regPass
      ?.value
      .trim();

    const phone =
      this.el.regPhone
      ?.value
      .trim() || "";

    const ref =
      this.el.regRef
      ?.value
      .trim() || "";

    if(
      !this.validateEmail(
        email
      )
    ){

      return this.error(
        "Invalid email"
      );

    }

    if(
      !this.validatePassword(
        pass
      )
    ){

      return this.error(
        "Weak password"
      );

    }

    if(
      !this.validatePhone(
        phone
      )
    ){

      return this.error(
        "Invalid phone"
      );

    }

    this.loading(
      this.el.registerBtn,
      true
    );

    this.clearError();

    try{

      const data =
        await this.request(
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

        e.message ||
        "Register failed"

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

    if(
      !data?.token
    ){

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
        JSON.stringify(
          data.user
        )
      );

    }

    this.state.authenticated =
      true;

  },

  /* =====================================================
     LOGOUT
  ===================================================== */

  logout(){

    localStorage.clear();

    this.state.authenticated =
      false;

    if(window.WS){

      WS.socket?.close();

    }

    this.showAuth();

  },

  forceLogout(){

    localStorage.clear();

    this.state.authenticated =
      false;

    this.showAuth();

  },

  /* =====================================================
     GUARD
  ===================================================== */

  async guard(){

    const token =
      localStorage.getItem(
        "token"
      );

    if(!token){

      this.showAuth();

      return;

    }

    try{

      const timeout =
        new Promise(
          (_,reject)=>{

            setTimeout(()=>{

              reject(
                new Error(
                  "Session timeout"
                )
              );

            },8000);

          }
        );

      const res =
        await Promise.race([

          API.get(
            "/auth/check"
          ),

          timeout

        ]);

      if(
        !res ||
        res.error
      ){

        throw new Error();

      }

      await this.enter();

    }catch(e){

      console.error(
        "AUTH GUARD:",
        e.message
      );

      localStorage.clear();

      this.showAuth();

    }

  },

  /* =====================================================
     AUTH VIEW
  ===================================================== */

  showAuth(){

  this.lockApp();

  if(!this.el.overlay)
    return;

  this.el.overlay.classList.remove(
    "auth-boot"
  );

  this.el.overlay.style.display =
    "flex";

  requestAnimationFrame(()=>{

    this.el.overlay.classList.add(
      "visible"
    );
     });
   },
   
  hideAuth(){

  if(!this.el.overlay)
    return;

  this.el.overlay.classList.remove(
    "visible"
  );

  this.el.overlay.classList.add(
    "auth-boot"
  );

  setTimeout(()=>{

    this.el.overlay.style.display =
      "none";

    },220);

  },
   
  /* =====================================================
     ENTER APP
  ===================================================== */

  async enter(){

    this.unlockApp();

    this.hideAuth();

    requestAnimationFrame(()=>{

      window.scrollTo({

        top:0,

        behavior:"instant"

      });

    });

    if(window.WS){

      try{

        WS.connect();

      }catch(e){

        console.error(
          "WS:",
          e
        );

      }

    }

    if(window.API){

      try{

        API.syncAll();

      }catch(e){

        console.error(
          "SYNC:",
          e
        );

      }

    }

  }

};

/* =====================================================
   HELPER
===================================================== */

function $(id){

  return document
    .getElementById(id);

}

/* =====================================================
   START
===================================================== */

document.addEventListener(

  "DOMContentLoaded",

  ()=>{

    AUTH.init();

  }

);
