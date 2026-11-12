
/* =========================================================
   BLOXIO AUTH ENGINE V8
   public/bx/auth.js

   Login / Register / Logout
   Session Restore / Verification
   Header Controls / UI Integration
   API Engine Integration
========================================================= */

"use strict";

(function () {

const AUTH = {

  /* =====================================================
     CONFIG
  ===================================================== */

  config: {
    loginEndpoint: "/auth/login",
    registerEndpoint: "/auth/register",
    meEndpoint: "/auth/me",
    logoutEndpoint: "/auth/logout",

    minPasswordLength: 6,
    animationDuration: 220,

    rememberKey: "rememberDevice"
  },

  /* =====================================================
     STATE
  ===================================================== */

  state: {
    initialized: false,
    loading: false,
    authenticated: false,
    verifying: false,

    mode: "login",

    token: null,
    refreshToken: null,
    user: null
  },

  /* =====================================================
     ELEMENTS
  ===================================================== */

  el: {},

  cache() {

    const ids = {
      overlay: "authOverlay",

      loginTab: "loginBtn",
      registerTab: "registerBtn",

      loginBox: "loginBox",
      registerBox: "registerBox",

      loginForm: "loginForm",
      registerForm: "registerForm",

      email: "loginEmail",
      pass: "loginPassword",

      regEmail: "registerEmail",
      regPhone: "registerPhone",
      regPass: "registerPassword",
      regConfirm: "registerConfirm",

      regRef: "inviteCode",
      agreeTerms: "agreeTerms",

      guestToolbar: "guestToolbar",
      userToolbar: "userToolbar",

      headerLoginBtn: "headerLoginBtn",
      headerRegisterBtn: "headerRegisterBtn",

      logoutBtn: "logoutBtn",

      userMenuTrigger: "userMenuTrigger",
      userDropdown: "userDropdown",

      app: "app",
      error: "authError",
      authTitle: "authTitle",
      vipTier: "vipTier"
    };

    Object.entries(ids).forEach(([key, id]) => {
      this.el[key] = document.getElementById(id);
    });

    // Compatibility with previous AUTH integrations.
    this.el.loginBtn = this.el.loginForm?.querySelector(
      'button[type="submit"]'
    );

    this.el.registerBtnSubmit =
      this.el.registerForm?.querySelector(
        'button[type="submit"]'
      );

  },

  /* =====================================================
     STORAGE
  ===================================================== */

  readStorage(key) {

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }

  },

  writeStorage(key, value, remember = true) {

    try {

      if (remember) {
        localStorage.setItem(key, value);
      } else {
        sessionStorage.setItem(key, value);
      }

      return true;

    } catch (error) {

      console.warn("[AUTH STORAGE]", error);

      return false;

    }

  },

  removeStorage(key) {

    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn("[AUTH STORAGE]", error);
    }

  },

  getToken() {

    return (
      this.readStorage("token") ||
      this.readStorage("accessToken") ||
      this.readStorage("sessionToken")
    );

  },

  /* =====================================================
     SESSION
  ===================================================== */

  session(response, remember = true) {

    const data =
      response?.data &&
      typeof response.data === "object"
        ? response.data
        : response;

    const token =
      data?.accessToken ||
      data?.token ||
      response?.accessToken ||
      response?.token;

    const refreshToken =
      data?.refreshToken ||
      response?.refreshToken ||
      null;

    const user =
      data?.user ||
      response?.user ||
      null;

    if (!token) {
      throw new Error("Token Missing");
    }

    if (!this.writeStorage("token", token, remember)) {
      throw new Error("Unable to save session");
    }

    this.writeStorage(
      "accessToken",
      token,
      remember
    );

    if (refreshToken) {
      this.writeStorage(
        "refreshToken",
        refreshToken,
        remember
      );
    }

    if (user) {
      this.writeStorage(
        "user",
        JSON.stringify(user),
        remember
      );
    }

    if (window.API?.setToken) {
      window.API.setToken(token);
    }

    this.state.token = token;
    this.state.refreshToken = refreshToken;
    this.state.user = user;
    this.state.authenticated = true;

    return user;

  },

  clearSession() {

    [
      "token",
      "accessToken",
      "refreshToken",
      "sessionToken",
      "user"
    ].forEach(key => this.removeStorage(key));

    if (window.API?.setToken) {
      window.API.setToken(null);
    }

    this.state.token = null;
    this.state.refreshToken = null;
    this.state.user = null;
    this.state.authenticated = false;

  },

  /* =====================================================
     USER RESTORE
  ===================================================== */

  restoreUser() {

    try {

      const value = this.readStorage("user");

      if (value) {
        this.state.user = JSON.parse(value);
      }

    } catch {
      this.state.user = null;
    }

  },

  /* =====================================================
     API REQUEST
  ===================================================== */

  async request(url, body = {}, options = {}) {

    if (
      !window.API ||
      typeof window.API.post !== "function"
    ) {
      throw new Error("API service unavailable");
    }

    const response = await window.API.post(
      url,
      body,
      {
        auth: options.auth ?? false,
        cache: false
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
        "request_failed"
      );

    }

    return response;

  },

  async get(url) {

    if (!window.API?.get) {
      throw new Error("API service unavailable");
    }

    const response = await window.API.get(
      url,
      {
        cache: false
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
        "request_failed"
      );
    }

    return response;

  },

  /* =====================================================
     VALIDATION
  ===================================================== */

  email(value) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(value || "").trim()
    );

  },

  password(value) {

    return (
      typeof value === "string" &&
      value.length >= this.config.minPasswordLength
    );

  },

  /* =====================================================
     ERROR MESSAGES
  ===================================================== */

  message(error) {

    const message = String(
      error?.message || error || ""
    );

    const known = {

      unauthorized: "Session expired. Please login again",
      invalid_token: "Session expired",
      invalid_credentials: "Invalid email or password",

      email_exists: "Email already registered",
      weak_password: "Password is too weak",

      network: "Network connection failed",
      timeout: "Request timed out",

      request_failed: "Request failed. Try again",
      auth_rate_limit: "Too many attempts. Try again later",

      ACCOUNT_BLOCKED: "Your account is restricted",
      USER_NOT_FOUND: "Account not found",

      "API service unavailable":
        "Connection service unavailable",

      "Token Missing":
        "Authentication response is incomplete",

      "Unable to save session":
        "Unable to save login session"

    };

    return known[message] || message || "Authentication failed";

  },

  /* =====================================================
     ERROR UI
  ===================================================== */

  error(message) {

    if (!this.el.error) {

      console.warn("[AUTH]", message);

      return;

    }

    this.el.error.textContent = message;

    this.el.error.classList.add("active");

  },

  clearError() {

    if (!this.el.error) return;

    this.el.error.textContent = "";

    this.el.error.classList.remove("active");

  },

  /* =====================================================
     LOADING
  ===================================================== */

  loading(button, state) {

    this.state.loading = state;

    if (!button) return;

    if (state) {

      button.dataset.originalText =
        button.textContent;

    } else if (button.dataset.originalText) {

      button.textContent =
        button.dataset.originalText;

    }

    button.disabled = state;

    button.classList.toggle("loading", state);

    button.setAttribute(
      "aria-busy",
      String(state)
    );

  },

  /* =====================================================
     MODE
  ===================================================== */

  setMode(mode) {

    if (
      mode !== "login" &&
      mode !== "register"
    ) {
      return;
    }

    this.state.mode = mode;

    const login = mode === "login";
    const register = mode === "register";

    this.el.loginBox?.classList.toggle(
      "active",
      login
    );

    this.el.registerBox?.classList.toggle(
      "active",
      register
    );

    this.el.loginBox?.classList.toggle(
      "hidden",
      !login
    );

    this.el.registerBox?.classList.toggle(
      "hidden",
      !register
    );

    this.el.loginTab?.classList.toggle(
      "active",
      login
    );

    this.el.registerTab?.classList.toggle(
      "active",
      register
    );

    this.el.loginTab?.setAttribute(
      "aria-selected",
      String(login)
    );

    this.el.registerTab?.setAttribute(
      "aria-selected",
      String(register)
    );

    if (this.el.authTitle) {
      this.el.authTitle.textContent = login
        ? "Welcome To BLOXIO"
        : "Create Your BLOXIO Account";
    }

    this.clearError();

  },

  toggle() {

    this.setMode(
      this.state.mode === "login"
        ? "register"
        : "login"
    );

  },

  /* =====================================================
     AUTH OVERLAY
  ===================================================== */

  showAuth(mode = "login") {

    const overlay = this.el.overlay;

    if (!overlay) return;

    this.setMode(mode);

    this.lockApp();

    // Remove hidden because .hidden uses !important.
    overlay.classList.remove("hidden");

    overlay.style.display = "flex";

    requestAnimationFrame(() => {

      overlay.classList.add("visible");

    });

  },

  hideAuth(force = false) {

    const overlay = this.el.overlay;

    if (!overlay) return;

    overlay.classList.remove("visible");

    const hide = () => {

      if (overlay.classList.contains("visible")) {
        return;
      }

      overlay.style.display = "none";
      overlay.classList.add("hidden");

    };

    if (force) {
      hide();
      return;
    }

    setTimeout(
      hide,
      this.config.animationDuration
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
     TOOLBARS
  ===================================================== */

  updateUI() {

    const authenticated =
      this.state.authenticated;

    this.el.guestToolbar?.classList.toggle(
      "hidden",
      authenticated
    );

    this.el.userToolbar?.classList.toggle(
      "hidden",
      !authenticated
    );

    if (this.el.vipTier && this.state.user) {

      this.el.vipTier.textContent =
        this.state.user.vipTier ||
        this.state.user.role ||
        "VIP 1";

    }

    this.el.userMenuTrigger?.setAttribute(
      "aria-expanded",
      "false"
    );

    this.el.userDropdown?.classList.remove("active");

  },

  /* =====================================================
     ENTER APP
  ===================================================== */

  enter() {

    this.state.authenticated = true;

    this.unlockApp();

    this.hideAuth(true);

    this.updateUI();

    window.WS?.connect?.();

    if (window.API?.syncAll) {
      window.API.syncAll().catch(error => {
        console.warn("[AUTH SYNC]", error);
      });
    }

    document.dispatchEvent(
      new CustomEvent("bloxio:authenticated", {
        detail: {
          user: this.state.user
        }
      })
    );

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
      this.el.email?.focus();
      return;
    }

    if (!this.password(password)) {
      this.error("Password Too Short");
      this.el.pass?.focus();
      return;
    }

    this.clearError();

    const button = this.el.loginBtn;

    this.loading(button, true);

    try {

      const response = await this.request(
        this.config.loginEndpoint,
        {
          email,
          password
        }
      );

      const remember =
        this.el.rememberDevice?.checked !== false;

      this.session(response, remember);

      this.enter();

    } catch (error) {

      this.error(this.message(error));

    } finally {

      this.loading(button, false);

    }

  },

  /* =====================================================
     REGISTER
  ===================================================== */

  async register() {

    if (this.state.loading) return;

    const email =
      this.el.regEmail?.value?.trim() || "";

    const phone =
      this.el.regPhone?.value?.trim() || "";

    const password =
      this.el.regPass?.value || "";

    const confirm =
      this.el.regConfirm?.value || "";

    const inviteCode =
      this.el.regRef?.value?.trim() || "";

    if (!this.email(email)) {
      this.error("Invalid Email");
      this.el.regEmail?.focus();
      return;
    }

    if (!phone) {
      this.error("Phone number is required");
      this.el.regPhone?.focus();
      return;
    }

    if (!this.password(password)) {
      this.error("Password must contain at least 6 characters");
      this.el.regPass?.focus();
      return;
    }

    if (password !== confirm) {
      this.error("Passwords do not match");
      this.el.regConfirm?.focus();
      return;
    }

    if (!this.el.agreeTerms?.checked) {
      this.error("Please accept Terms & Privacy");
      return;
    }

    this.clearError();

    const button = this.el.registerBtnSubmit;

    this.loading(button, true);

    try {

      const response = await this.request(
        this.config.registerEndpoint,
        {
          email,
          phone,
          password,
          inviteCode
        }
      );

      const data =
        response?.data &&
        typeof response.data === "object"
          ? response.data
          : response;

      // Some backends require login after registration.
      if (
        data?.accessToken ||
        data?.token ||
        response?.accessToken ||
        response?.token
      ) {

        this.session(response, true);

        this.enter();

      } else {

        this.setMode("login");

        if (this.el.email) {
          this.el.email.value = email;
        }

        this.error(
          "Account created. Please login."
        );

      }

    } catch (error) {

      this.error(this.message(error));

    } finally {

      this.loading(button, false);

    }

  },

  /* =====================================================
     VERIFY SESSION
  ===================================================== */

  async verifySession() {

    if (this.state.verifying) return false;

    const token = this.getToken();

    if (!token) {
      return false;
    }

    this.state.verifying = true;
    this.state.token = token;

    if (window.API?.setToken) {
      window.API.setToken(token);
    }

    try {

      const response = await this.get(
        this.config.meEndpoint
      );

      const data =
        response?.data &&
        typeof response.data === "object"
          ? response.data
          : response;

      const user = data?.user || response?.user;

      if (!user) {
        throw new Error("session_invalid");
      }

      this.state.user = user;
      this.state.authenticated = true;

      this.writeStorage(
        "user",
        JSON.stringify(user),
        true
      );

      this.enter();

      return true;

    } catch (error) {

      console.warn(
        "[AUTH VERIFY]",
        this.message(error)
      );

      this.clearSession();

      return false;

    } finally {

      this.state.verifying = false;

    }

  },

  /* =====================================================
     LOGOUT
  ===================================================== */

  async logout(notify = true) {

    if (this.state.loading) return;

    const hadSession = Boolean(
      this.state.token || this.getToken()
    );

    if (notify && hadSession) {

      try {

        await this.request(
          this.config.logoutEndpoint,
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

    this.updateUI();

    this.lockApp();

    this.showAuth("login");

    this.clearError();

    document.dispatchEvent(
      new CustomEvent("bloxio:logout")
    );

  },

  /* =====================================================
     HEADER EVENTS
  ===================================================== */

  bindHeader() {

    this.el.headerLoginBtn?.addEventListener(
      "click",
      () => this.showAuth("login")
    );

    this.el.headerRegisterBtn?.addEventListener(
      "click",
      () => this.showAuth("register")
    );

    this.el.logoutBtn?.addEventListener(
      "click",
      () => this.logout()
    );

    this.el.userMenuTrigger?.addEventListener(
      "click",
      () => {

        const dropdown = this.el.userDropdown;

        if (!dropdown) return;

        const open =
          dropdown.classList.toggle("active");

        this.el.userMenuTrigger.setAttribute(
          "aria-expanded",
          String(open)
        );

      }
    );

    document.addEventListener(
      "click",
      event => {

        if (
          !this.el.userToolbar?.contains(event.target)
        ) {

          this.el.userDropdown?.classList.remove(
            "active"
          );

          this.el.userMenuTrigger?.setAttribute(
            "aria-expanded",
            "false"
          );

        }

      }
    );

  },

  /* =====================================================
     FORM EVENTS
  ===================================================== */

  bindForms() {

    this.el.loginTab?.addEventListener(
      "click",
      () => this.setMode("login")
    );

    this.el.registerTab?.addEventListener(
      "click",
      () => this.setMode("register")
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

    this.el.overlay?.addEventListener(
      "click",
      event => {

        if (
          event.target.classList.contains("auth-backdrop")
        ) {

          // Keep authentication overlay open.
          this.clearError();

        }

      }
    );

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

  },

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async init() {

    if (this.state.initialized) {
      return;
    }

    this.state.initialized = true;

    this.cache();

    this.bindHeader();

    this.bindForms();

    this.injectReferral();

    this.restoreUser();

    this.setMode("login");

    const token = this.getToken();

    if (token) {

      const valid = await this.verifySession();

      if (!valid) {

        this.unlockApp();

        this.updateUI();

        this.showAuth("login");

      }

    } else {

      this.state.authenticated = false;

      this.unlockApp();

      this.updateUI();

      this.showAuth("login");

    }

    console.log(
      "[BLOXIO AUTH] V8 INITIALIZED"
    );

    return true;

  }

};

/* =========================================================
   GLOBAL EXPORT
========================================================= */

window.AUTH = AUTH;

/* =========================================================
   BOOT
========================================================= */

function boot() {

  AUTH.init().catch(error => {

    console.error(
      "[BLOXIO AUTH BOOT]",
      error
    );

    AUTH.showAuth("login");

  });

}

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    boot,
    { once: true }
  );

} else {

  boot();

}

})();
