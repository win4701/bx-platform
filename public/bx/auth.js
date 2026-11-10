
/* =====================================================
   BLOXIO AUTH ENGINE V7
   STABLE AUTHENTICATION
   API COMPATIBLE
   ANDROID SAFE
   UI PRESERVED
===================================================== */

"use strict";

const AUTH = {

  state: {
    loading: false,
    mode: "login",
    authenticated: false,
    token: null,
    browser: true,
    ready: false
  },

  el: {},

  /* =====================================================
     INIT
  ===================================================== */

  init() {

    if (this.state.ready) return;

    this.cache();
    this.bind();
    this.bindGlobal();
    this.injectReferral();
    this.bootstrap();

  },

  /* =====================================================
     DOM
  ===================================================== */

  getElement(...ids) {

    for (const id of ids) {

      const element =
        document.getElementById(id);

      if (element) return element;

    }

    return null;

  },

  cache() {

    this.el = {

      app: this.getElement("app"),

      overlay: this.getElement("authOverlay"),

      loginBox: this.getElement("loginBox"),

      registerBox: this.getElement("registerBox"),

      loginForm: this.getElement("loginForm"),

      registerForm: this.getElement("registerForm"),

      email: this.getElement(
        "loginEmail"
      ),

      pass: this.getElement(
        "loginPassword",
        "loginPass"
      ),

      regEmail: this.getElement(
        "registerEmail",
        "regEmail"
      ),

      regPass: this.getElement(
        "registerPassword",
        "regPass"
      ),

      regPhone: this.getElement(
        "registerPhone",
        "regPhone"
      ),

      regRef: this.getElement(
        "inviteCode",
        "regRef"
      ),

      loginBtn: this.getElement(
        "loginBtn"
      ),

      registerBtn: this.getElement(
        "registerBtn"
      ),

      toggle: this.getElement(
        "toggleAuth"
      ),

      error: this.getElement(
        "authError"
      ),

      title: this.getElement(
        "authTitle"
      ),

      sub: this.getElement(
        "authSub"
      ),

      switch: this.getElement(
        "switchText"
      )

    };

  },

  /* =====================================================
     BOOTSTRAP
  ===================================================== */

  bootstrap() {

    let token = null;

    try {

      token = localStorage.getItem("token");

    } catch (error) {

      console.warn(
        "AUTH STORAGE:",
        error
      );

    }

    if (
      token &&
      !this.isTokenExpired(token)
    ) {

      this.state.token = token;

      this.state.authenticated = true;

      this.enter();

    } else {

      this.clearSession();

      this.state.authenticated = false;

      this.unlockApp();

      this.hideAuth(true);

    }

    this.telegram();

    this.state.ready = true;

  },

  /* =====================================================
     TOKEN CHECK
     Client-side expiry check only.
     Server must verify JWT signature.
  ===================================================== */

  isTokenExpired(token) {

    try {

      const parts = token.split(".");

      if (parts.length !== 3) {
        return true;
      }

      const payload = JSON.parse(
        atob(
          parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
      );

      if (!payload.exp) {
        return false;
      }

      return (
        Number(payload.exp) * 1000
        <= Date.now()
      );

    } catch {

      return true;

    }

  },

  /* =====================================================
     TELEGRAM
  ===================================================== */

  telegram() {

    if (!window.Telegram?.WebApp) {
      return;
    }

    try {

      window.Telegram.WebApp.ready();

      window.Telegram.WebApp.expand();

    } catch (error) {

      console.warn(
        "AUTH TELEGRAM:",
        error
      );

    }

  },

  /* =====================================================
     GLOBAL EVENTS
  ===================================================== */

  bindGlobal() {

    window.addEventListener(
      "storage",
      event => {

        if (
          event.key === "token" &&
          !event.newValue
        ) {

          this.logout(false);

        }

      }
    );

    window.API?.on?.(
      "auth:logout",
      () => {

        this.logout(false);

      }
    );

    window.addEventListener(
      "pageshow",
      () => {

        this.unlockApp();

      }
    );

  },

  /* =====================================================
     EVENTS
  ===================================================== */

  bind() {

    this.el.toggle?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        this.toggle();

      }
    );

    this.el.loginBtn?.addEventListener(
      "click",
      event => {

        if (
          this.el.loginBtn.type !== "submit"
        ) {

          event.preventDefault();

          this.login();

        }

      }
    );

    this.el.registerBtn?.addEventListener(
      "click",
      event => {

        if (
          this.el.registerBtn.type !== "submit"
        ) {

          event.preventDefault();

          this.register();

        }

      }
    );

    this.el.loginForm?.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        this.login();

      }
    );

    this.el.registerForm?.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        this.register();

      }
    );

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key !== "Enter" ||
          this.state.loading
        ) {
          return;
        }

        if (
          event.target?.tagName === "TEXTAREA"
        ) {
          return;
        }

        if (this.state.mode === "login") {
          this.login();
        } else {
          this.register();
        }

      }
    );

  },

  /* =====================================================
     APP VISIBILITY
  ===================================================== */

  unlockApp() {

    document.body.classList.remove(
      "auth-lock",
      "auth-loading",
      "loading",
      "app-preload"
    );

    document.body.classList.add(
      "app-ready"
    );

    this.el.app?.classList.remove(
      "app-hidden"
    );

    if (this.el.app) {

      this.el.app.style.opacity = "1";

      this.el.app.style.visibility = "visible";

      this.el.app.style.pointerEvents = "auto";

    }

  },

  lockApp() {

    document.body.classList.add(
      "auth-lock"
    );

  },

  /* =====================================================
     AUTH VIEW
  ===================================================== */

  showAuth() {

    if (!this.el.overlay) return;

    this.lockApp();

    this.el.overlay.style.display = "flex";

    requestAnimationFrame(() => {

      this.el.overlay.classList.add(
        "visible"
      );

    });

  },

  hideAuth(force = false) {

    if (!this.el.overlay) return;

    this.el.overlay.classList.remove(
      "visible"
    );

    if (force) {

      this.el.overlay.style.display = "none";

      return;

    }

    setTimeout(() => {

      if (
        !this.el.overlay.classList.contains(
          "visible"
        )
      ) {

        this.el.overlay.style.display = "none";

      }

    }, 220);

  },

  /* =====================================================
     TOGGLE
  ===================================================== */

  toggle() {

    if (this.state.loading) return;

    this.state.mode =
      this.state.mode === "login"
        ? "register"
        : "login";

    this.el.loginBox?.classList.toggle(
      "active",
      this.state.mode === "login"
    );

    this.el.registerBox?.classList.toggle(
      "active",
      this.state.mode === "register"
    );

    this.clearError();

  },

  /* =====================================================
     VALIDATION
  ===================================================== */

  email(value) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(String(value || "").trim());

  },

  password(value) {

    return (
      typeof value === "string" &&
      value.length >= 6
    );

  },

  /* =====================================================
     API REQUEST
  ===================================================== */

  async request(url, body = {}) {

    if (
      !window.API ||
      typeof window.API.post !== "function"
    ) {

      throw new Error(
        "API service unavailable"
      );

    }

    const response = await window.API.post(
      url,
      body
    );

    if (
      !response ||
      response.error ||
      response.success === false
    ) {

      throw new Error(
        response?.error ||
        response?.message ||
        "Request failed"
      );

    }

    return response;

  },

  /* =====================================================
     RESPONSE NORMALIZATION
  ===================================================== */

  normalizeResponse(response) {

    const data =
      response?.data &&
      typeof response.data === "object"
        ? response.data
        : response;

    return {

      token:
        data?.token ||
        response?.token ||
        null,

      user:
        data?.user ||
        response?.user ||
        null

    };

  },

  /* =====================================================
     LOGIN
  ===================================================== */

  async login() {

    if (this.state.loading) return;

    const email =
      this.el.email?.value?.trim() || "";

    const password =
      this.el.pass?.value || "";

    if (!this.email(email)) {

      this.error("Invalid Email");

      return;

    }

    if (!this.password(password)) {

      this.error("Password Too Short");

      return;

    }

    this.clearError();

    this.loading(this.el.loginBtn, true);

    try {

      const response = await this.request(
        "/auth/login",
        {
          email,
          password
        }
      );

      this.session(response);

      this.enter();

    } catch (error) {

      this.error(
        this.message(error)
      );

    } finally {

      this.loading(this.el.loginBtn, false);

    }

  },

  /* =====================================================
     REGISTER
  ===================================================== */

  async register() {

    if (this.state.loading) return;

    const email =
      this.el.regEmail?.value?.trim() || "";

    const password =
      this.el.regPass?.value || "";

    const phone =
      this.el.regPhone?.value?.trim() || "";

    const referral =
      this.el.regRef?.value?.trim() || "";

    if (!this.email(email)) {

      this.error("Invalid Email");

      return;

    }

    if (!this.password(password)) {

      this.error("Password Too Short");

      return;

    }

    this.clearError();

    this.loading(this.el.registerBtn, true);

    try {

      const response = await this.request(
        "/auth/register",
        {
          email,
          password,
          phone,
          referral
        }
      );

      this.session(response);

      this.enter();

    } catch (error) {

      this.error(
        this.message(error)
      );

    } finally {

      this.loading(this.el.registerBtn, false);

    }

  },

  /* =====================================================
     SESSION
  ===================================================== */

  session(response) {

    const data =
      this.normalizeResponse(response);

    if (!data.token) {

      throw new Error(
        "Token Missing"
      );

    }

    try {

      localStorage.setItem(
        "token",
        data.token
      );

      if (data.user) {

        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

      }

    } catch {

      throw new Error(
        "Unable to save session"
      );

    }

    this.state.authenticated = true;

    this.state.token = data.token;

  },

  clearSession() {

    try {

      localStorage.removeItem("token");

      localStorage.removeItem("user");

    } catch (error) {

      console.warn(
        "AUTH STORAGE:",
        error
      );

    }

    this.state.authenticated = false;

    this.state.token = null;

  },

  /* =====================================================
     LOGOUT
  ===================================================== */

  logout(notify = true) {

    this.clearSession();

    if (notify) {

      window.WS?.disconnect?.();

    }

    this.showAuth();

    this.clearError();

  },

  /* =====================================================
     ENTER APP
  ===================================================== */

  enter() {

    this.unlockApp();

    this.hideAuth(true);

    if (this.state.token) {

      window.WS?.connect?.();

      window.API?.syncAll?.();

    }

  },

  /* =====================================================
     LOADING
  ===================================================== */

  loading(button, state) {

    this.state.loading = state;

    if (!button) return;

    button.disabled = state;

    button.classList.toggle(
      "loading",
      state
    );

  },

  /* =====================================================
     ERROR
  ===================================================== */

  message(error) {

    const message =
      String(error?.message || "");

    const known = {

      unauthorized: "Session expired",

      invalid_token: "Session expired",

      network: "Network connection failed",

      timeout: "Request timed out",

      retry_failed: "Request failed. Try again",

      request_failed: "Request failed",

      "API service unavailable":
        "Connection service unavailable",

      "Token Missing":
        "Authentication response is incomplete"

    };

    return known[message] || message || "Authentication failed";

  },

  error(message) {

    if (!this.el.error) {

      console.warn("AUTH:", message);

      return;

    }

    this.el.error.innerText = message;

    this.el.error.classList.add(
      "active"
    );

  },

  clearError() {

    if (!this.el.error) return;

    this.el.error.innerText = "";

    this.el.error.classList.remove(
      "active"
    );

  },

  /* =====================================================
     REFERRAL
  ===================================================== */

  injectReferral() {

    const referral =
      new URLSearchParams(
        location.search
      ).get("ref");

    if (
      referral &&
      this.el.regRef &&
      !this.el.regRef.value
    ) {

      this.el.regRef.value = referral;

    }

  }

};

/* =====================================================
   GLOBAL EXPORT
===================================================== */

window.AUTH = AUTH;

/* =====================================================
   BOOT
===================================================== */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    () => AUTH.init(),
    { once: true }
  );

} else {

  AUTH.init();

}
