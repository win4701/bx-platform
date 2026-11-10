
/* =========================================================
   BLOXIO AUTH ENGINE V8
   SECURE SESSION MANAGEMENT
   API V7 COMPATIBLE
   ROUTES V8 COMPATIBLE
   UI PRESERVED
========================================================= */

"use strict";

const AUTH = {

  state: {
    loading: false,
    mode: "login",
    authenticated: false,
    token: null,
    refreshToken: null,
    user: null,
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

    this.state.ready = true;

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

      email: this.getElement("loginEmail"),

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

      loginBtn: this.getElement("loginBtn"),

      registerBtn: this.getElement("registerBtn"),

      toggle: this.getElement("toggleAuth"),

      error: this.getElement("authError"),

      title: this.getElement("authTitle"),

      sub: this.getElement("authSub"),

      switch: this.getElement("switchText")

    };

  },

  /* =====================================================
     STORAGE
  ===================================================== */

  readStorage(key) {

    try {

      return localStorage.getItem(key);

    } catch (error) {

      console.warn("[AUTH STORAGE]", error);

      return null;

    }

  },

  writeStorage(key, value) {

    try {

      localStorage.setItem(key, value);

      return true;

    } catch (error) {

      console.warn("[AUTH STORAGE]", error);

      return false;

    }

  },

  removeStorage(key) {

    try {

      localStorage.removeItem(key);

    } catch (error) {

      console.warn("[AUTH STORAGE]", error);

    }

  },

  getToken() {

    return (
      this.readStorage("accessToken") ||
      this.readStorage("token")
    );

  },

  /* =====================================================
     BOOTSTRAP
  ===================================================== */

  async bootstrap() {

    const accessToken = this.getToken();

    const refreshToken =
      this.readStorage("refreshToken");

    const storedUser =
      this.readStorage("user");

    if (storedUser) {

      try {

        this.state.user = JSON.parse(storedUser);

      } catch {

        this.removeStorage("user");

      }

    }

    if (
      accessToken &&
      !this.isTokenExpired(accessToken)
    ) {

      this.setSession(
        accessToken,
        refreshToken,
        this.state.user
      );

      this.enter();

      // Verify session against the server.
      this.verifySession();

    } else {

      this.clearSession();

      this.state.authenticated = false;

      this.unlockApp();

      this.showAuth();

    }

    this.telegram();

  },

  /* =====================================================
     TOKEN EXPIRY
  ===================================================== */

  isTokenExpired(token) {

    try {

      const parts = token.split(".");

      if (parts.length !== 3) {

        return true;

      }

      const base64 = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const payload = JSON.parse(
        atob(base64)
      );

      if (!payload.exp) {

        return false;

      }

      return (
        Number(payload.exp) * 1000 <= Date.now()
      );

    } catch {

      return true;

    }

  },

  /* =====================================================
     VERIFY SESSION
  ===================================================== */

  async verifySession() {

    if (!this.state.token) return false;

    try {

      const response = await window.API.get(
        "/auth/me"
      );

      if (
        !response ||
        response.error ||
        response.success === false
      ) {

        throw new Error(
          response?.error || "session_invalid"
        );

      }

      const data = response.data || response;

      if (data.user) {

        this.state.user = data.user;

        this.writeStorage(
          "user",
          JSON.stringify(data.user)
        );

      }

      this.state.authenticated = true;

      return true;

    } catch (error) {

      console.warn(
        "[AUTH VERIFY]",
        error.message
      );

      this.logout(false);

      return false;

    }

  },

  /* =====================================================
     TELEGRAM
  ===================================================== */

  telegram() {

    if (!window.Telegram?.WebApp) return;

    try {

      window.Telegram.WebApp.ready();

      window.Telegram.WebApp.expand();

    } catch (error) {

      console.warn(
        "[AUTH TELEGRAM]",
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
          event.key === "token" ||
          event.key === "accessToken"
        ) {

          if (!event.newValue) {

            this.logout(false);

          } else {

            this.state.token = event.newValue;

          }

        }

      }
    );

    window.API?.on?.(
      "auth:logout",
      () => {

        if (this.state.authenticated) {

          this.logout(false);

        }

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

        if (
          event.target?.tagName === "BUTTON"
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

    document.body.classList.add("app-ready");

    this.el.app?.classList.remove("app-hidden");

    if (this.el.app) {

      this.el.app.style.opacity = "1";

      this.el.app.style.visibility = "visible";

      this.el.app.style.pointerEvents = "auto";

    }

  },

  lockApp() {

    document.body.classList.add("auth-lock");

  },

  /* =====================================================
     AUTH VIEW
  ===================================================== */

  showAuth() {

    if (!this.el.overlay) return;

    this.lockApp();

    this.el.overlay.style.display = "flex";

    requestAnimationFrame(() => {

      this.el.overlay.classList.add("visible");

    });

  },

  hideAuth(force = false) {

    if (!this.el.overlay) return;

    this.el.overlay.classList.remove("visible");

    if (force) {

      this.el.overlay.style.display = "none";

      return;

    }

    setTimeout(() => {

      if (
        !this.el.overlay.classList.contains("visible")
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
      body,
      {
        auth: false
      }
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
        data?.accessToken ||
        data?.token ||
        response?.accessToken ||
        response?.token ||
        null,

      refreshToken:
        data?.refreshToken ||
        response?.refreshToken ||
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

      this.error(this.message(error));

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

      this.error(this.message(error));

    } finally {

      this.loading(this.el.registerBtn, false);

    }

  },

  /* =====================================================
     SESSION
  ===================================================== */

  session(response) {

    const data = this.normalizeResponse(response);

    if (!data.token) {

      throw new Error("Token Missing");

    }

    this.setSession(
      data.token,
      data.refreshToken,
      data.user
    );

  },

  setSession(token, refreshToken, user) {

    const saved = window.API?.setToken
      ? (window.API.setToken(token), true)
      : this.writeStorage("token", token);

    if (!saved) {

      throw new Error("Unable to save session");

    }

    this.writeStorage("accessToken", token);

    if (refreshToken) {

      this.writeStorage(
        "refreshToken",
        refreshToken
      );

    }

    if (user) {

      this.writeStorage(
        "user",
        JSON.stringify(user)
      );

    }

    this.state.token = token;

    this.state.refreshToken = refreshToken || null;

    this.state.user = user || null;

    this.state.authenticated = true;

  },

  /* =====================================================
     CLEAR SESSION
  ===================================================== */

  clearSession() {

    if (window.API?.setToken) {

      window.API.setToken(null);

    } else {

      this.removeStorage("token");

      this.removeStorage("accessToken");

    }

    this.removeStorage("refreshToken");

    this.removeStorage("user");

    this.state.authenticated = false;

    this.state.token = null;

    this.state.refreshToken = null;

    this.state.user = null;

  },

  /* =====================================================
     LOGOUT
  ===================================================== */

  async logout(notify = true) {

    const hadSession = Boolean(
      this.state.token || this.getToken()
    );

    if (notify && hadSession) {

      try {

        await window.API?.post?.(
          "/auth/logout",
          {},
          { auth: true }
        );

      } catch (error) {

        console.warn(
          "[AUTH LOGOUT]",
          error
        );

      }

    }

    this.clearSession();

    window.WS?.disconnect?.();

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
     ERROR MESSAGES
  ===================================================== */

  message(error) {

    const message = String(
      error?.message || ""
    );

    const known = {

      unauthorized: "Session expired",

      invalid_token: "Session expired",

      network: "Network connection failed",

      timeout: "Request timed out",

      retry_failed: "Request failed. Try again",

      request_failed: "Request failed",

      email_exists: "Email already registered",

      weak_password: "Password is too weak",

      invalid_credentials: "Invalid email or password",

      session_invalid: "Session expired. Please log in again",

      "API service unavailable":
        "Connection service unavailable",

      "Token Missing":
        "Authentication response is incomplete",

      "Unable to save session":
        "Unable to save login session"

    };

    return known[message] ||
      message ||
      "Authentication failed";

  },

  /* =====================================================
     ERROR UI
  ===================================================== */

  error(message) {

    if (!this.el.error) {

      console.warn("[AUTH]", message);

      return;

    }

    this.el.error.innerText = message;

    this.el.error.classList.add("active");

  },

  clearError() {

    if (!this.el.error) return;

    this.el.error.innerText = "";

    this.el.error.classList.remove("active");

  },

  /* =====================================================
     REFERRAL
  ===================================================== */

  injectReferral() {

    const referral =
      new URLSearchParams(location.search).get("ref");

    if (
      referral &&
      this.el.regRef &&
      !this.el.regRef.value
    ) {

      this.el.regRef.value = referral;

    }

  }

};

/* =========================================================
   GLOBAL EXPORT
========================================================= */

window.AUTH = AUTH;

/* =========================================================
   BOOT
========================================================= */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    () => AUTH.init(),
    { once: true }
  );

} else {

  AUTH.init();

}
