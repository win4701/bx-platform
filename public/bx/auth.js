/*!
 * BLOXIO AUTH ENGINE — V10
 * Guest-first • Email/password • Optional OAuth providers
 * Compatible with legacy authOverlay markup and API Engine V7/V8 patterns.
 *
 * Exposes: window.AUTH
 * Does not enforce login on public pages.
 *
 * SECURITY:
 * - Existing API Engine compatibility may require a browser-stored access token.
 * - Prefer HttpOnly, Secure, SameSite cookies for production sessions.
 * - OAuth routes and backend behavior must be configured server-side.
 */
(function (window, document) {
  "use strict";

  if (window.AUTH && window.AUTH.__BLOXIO_AUTH_V10__) return;

  const DEFAULTS = Object.freeze({
    endpoints: {
      login: "/auth/login",
      register: "/auth/register",
      me: "/auth/me",
      logout: "/auth/logout",
      oauth: {
        google: "/auth/oauth/google",
        apple: "/auth/oauth/apple",
        telegram: "/auth/oauth/telegram"
      }
    },
    requestTimeout: 15000,
    verifyOnLoad: true,
    guestFirst: true,
    oauthProviders: ["google", "apple", "telegram"]
  });

  const state = {
    initialized: false,
    loading: false,
    verifying: false,
    authenticated: false,
    mode: "login",
    token: null,
    refreshToken: null,
    user: null,
    modalOpen: false,
    lastError: null
  };

  const el = {};

  const AUTH = {
    __BLOXIO_AUTH_V10__: true,
    VERSION: "10.0.0",
    config: DEFAULTS,
    state,
    el,

    configure(options) {
      const input = options || {};
      const endpoints = input.endpoints || {};
      this.config = {
        ...DEFAULTS,
        ...input,
        endpoints: {
          ...DEFAULTS.endpoints,
          ...endpoints,
          oauth: {
            ...DEFAULTS.endpoints.oauth,
            ...(endpoints.oauth || {})
          }
        },
        oauthProviders: Array.isArray(input.oauthProviders)
          ? input.oauthProviders.slice()
          : DEFAULTS.oauthProviders.slice()
      };
      return this.config;
    },

    cache() {
      const ids = {
        app: "app",
        overlay: "authOverlay",
        close: "authClose",
        guestToolbar: "guestToolbar",
        userToolbar: "userToolbar",
        headerLogin: "headerLoginBtn",
        headerRegister: "headerRegisterBtn",
        userMenuTrigger: "userMenuTrigger",
        userDropdown: "userDropdown",
        logoutBtn: "logoutBtn",
        vipTier: "vipTier",
        loginTab: "loginBtn",
        registerTab: "registerBtn",
        loginBox: "loginBox",
        registerBox: "registerBox",
        loginForm: "loginForm",
        registerForm: "registerForm",
        email: "loginEmail",
        pass: "loginPassword",
        rememberDevice: "rememberDevice",
        regName: "registerName",
        regEmail: "registerEmail",
        regPhone: "registerPhone",
        regPass: "registerPassword",
        regConfirm: "registerConfirm",
        regRef: "inviteCode",
        agreeTerms: "agreeTerms",
        toggleAuth: "toggleAuth",
        switchText: "switchText",
        title: "authTitle",
        subtitle: "authSubtitle",
        error: "authError"
      };

      Object.entries(ids).forEach(([key, id]) => {
        el[key] = document.getElementById(id);
      });

      // Compatibility: the uploaded auth.html used an authStatus element.
      el.status = document.getElementById("authStatus") || el.error;
      el.loginSubmit = el.loginForm?.querySelector('button[type="submit"]') || null;
      el.registerSubmit = el.registerForm?.querySelector('button[type="submit"]') || null;
      el.backdrop = el.overlay?.querySelector(".auth-backdrop") || null;
      return el;
    },

    init() {
      if (state.initialized) return this;
      this.cache();
      state.initialized = true;
      this.bindEvents();
      this.injectReferral();
      this.restoreLocalSession();

      if (this.config.guestFirst) {
        this.unlockApp();
        this.hideAuth(true);
      }

      this.updateToolbar();
      this.syncProviderButtons();

      if (state.token && this.config.verifyOnLoad) {
        this.verifySession().catch(error => {
          console.warn("[BLOXIO AUTH] Session verification failed:", error);
        });
      }

      window.dispatchEvent(new CustomEvent("bloxio:auth-ready", {
        detail: { version: this.VERSION, authenticated: this.isAuthenticated() }
      }));
      console.info("[BLOXIO AUTH] Ready", this.VERSION);
      return this;
    },

    /* ---------- Storage and session ---------- */

    getToken() {
      try {
        return localStorage.getItem("token") ||
          localStorage.getItem("accessToken") || null;
      } catch (_) { return null; }
    },

    getRefreshToken() {
      try { return localStorage.getItem("refreshToken"); }
      catch (_) { return null; }
    },

    getStoredUser() {
      try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
      } catch (_) { return null; }
    },

    writeStorage(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn("[BLOXIO AUTH] Storage write failed:", error);
        return false;
      }
    },

    removeStorage(key) {
      try { localStorage.removeItem(key); } catch (_) {}
    },

    restoreLocalSession() {
      state.token = this.getToken();
      state.refreshToken = this.getRefreshToken();
      state.user = this.getStoredUser();
      state.authenticated = Boolean(state.token);
      return state.authenticated;
    },

    setSession(token, refreshToken, user) {
      if (!token) throw new Error("Authentication response did not include an access token.");

      // Preserve API Engine V7/V8 integration when available.
      if (window.API && typeof window.API.setToken === "function") {
        window.API.setToken(token);
      }

      // Legacy API engines read these keys. Production deployments should
      // migrate to server-managed HttpOnly cookies where possible.
      const saved = this.writeStorage("token", token);
      this.writeStorage("accessToken", token);
      if (refreshToken) this.writeStorage("refreshToken", refreshToken);
      if (user) this.writeStorage("user", JSON.stringify(user));
      if (!saved && !(window.API && typeof window.API.setToken === "function")) {
        throw new Error("Unable to persist the session for this browser.");
      }

      state.token = token;
      state.refreshToken = refreshToken || null;
      state.user = user || this.getStoredUser();
      state.authenticated = true;
      this.updateToolbar();
      this.dispatchSessionEvent("auth:login");
      return true;
    },

    normalizeResponse(response) {
      const outer = response || {};
      const data = outer.data && typeof outer.data === "object" ? outer.data : outer;
      const nested = data.data && typeof data.data === "object" ? data.data : data;
      return {
        token: nested.accessToken || nested.access_token || nested.token ||
          data.accessToken || data.access_token || data.token || outer.accessToken || outer.token || null,
        refreshToken: nested.refreshToken || nested.refresh_token ||
          data.refreshToken || data.refresh_token || outer.refreshToken || null,
        user: nested.user || data.user || outer.user || null,
        raw: nested
      };
    },

    dispatchSessionEvent(type) {
      const detail = {
        authenticated: state.authenticated,
        user: state.user || null
      };
      window.dispatchEvent(new CustomEvent(type, { detail }));
      window.dispatchEvent(new CustomEvent(type === "auth:login" ? "bloxio:login" : "bloxio:logout", { detail }));
    },

    isAuthenticated() {
      return Boolean(state.authenticated && (state.token || this.getToken()));
    },

    getUser() {
      return state.user || this.getStoredUser();
    },

    /* ---------- Public app and modal ---------- */

    unlockApp() {
      document.body.classList.remove(
        "auth-lock", "auth-loading", "loading",
        "app-preload", "auth-modal-open"
      );
      document.body.classList.add("app-ready");

      if (el.app) {
        el.app.classList.remove("app-hidden");
        el.app.style.opacity = "1";
        el.app.style.visibility = "visible";
        el.app.style.pointerEvents = "auto";
      }
    },

    lockApp() {
      // Kept for legacy callers: public browsing remains available.
      this.unlockApp();
    },

    openAuth(mode) {
      if (!el.overlay || state.loading) return false;
      state.mode = mode === "register" ? "register" : "login";
      state.modalOpen = true;
      this.unlockApp();
      this.renderMode();
      this.clearError();

      el.overlay.classList.remove("hidden");
      el.overlay.style.display = "flex";
      document.body.classList.add("auth-modal-open");

      window.requestAnimationFrame(() => el.overlay?.classList.add("visible"));
      const target = state.mode === "login" ? el.email : (el.regName || el.regEmail);
      window.setTimeout(() => target?.focus(), 80);
      return true;
    },

    showAuth(mode) { return this.openAuth(mode); },

    hideAuth(force) {
      if (!el.overlay) return;
      state.modalOpen = false;
      el.overlay.classList.remove("visible");
      document.body.classList.remove("auth-modal-open");

      const finish = () => {
        if (!state.modalOpen) {
          el.overlay.classList.add("hidden");
          el.overlay.style.display = "none";
        }
      };

      if (force) finish();
      else window.setTimeout(finish, 220);
      this.unlockApp();
    },

    closeAuth() {
      if (state.loading) return;
      this.clearError();
      this.hideAuth(false);
    },

    setMode(mode) {
      if (state.loading) return;
      state.mode = mode === "register" ? "register" : "login";
      this.renderMode();
      this.clearError();
    },

    toggle() {
      this.setMode(state.mode === "login" ? "register" : "login");
    },

    renderMode() {
      const login = state.mode === "login";
      el.loginBox?.classList.toggle("hidden", !login);
      el.registerBox?.classList.toggle("hidden", login);
      if (el.loginBox) el.loginBox.hidden = !login;
      if (el.registerBox) el.registerBox.hidden = login;

      el.loginTab?.classList.toggle("active", login);
      el.registerTab?.classList.toggle("active", !login);
      el.loginTab?.setAttribute("aria-selected", String(login));
      el.registerTab?.setAttribute("aria-selected", String(!login));

      if (el.title) {
        el.title.textContent = login ? "Welcome To BLOXIO" : "Create Your BLOXIO Account";
      }
      if (el.subtitle) {
        el.subtitle.textContent = login
          ? "Sign in to continue to your BLOXIO account."
          : "Create your account and join the BLOXIO ecosystem.";
      }
      if (el.switchText) {
        el.switchText.textContent = login ? "Need account?" : "Already have an account?";
      }
      if (el.toggleAuth) {
        el.toggleAuth.textContent = login ? "Register" : "Login";
      }
    },

    /* ---------- Events ---------- */

    bindEvents() {
      el.headerLogin?.addEventListener("click", () => this.openAuth("login"));
      el.headerRegister?.addEventListener("click", () => this.openAuth("register"));
      el.close?.addEventListener("click", () => this.closeAuth());
      el.loginTab?.addEventListener("click", () => this.setMode("login"));
      el.registerTab?.addEventListener("click", () => this.setMode("register"));
      el.toggleAuth?.addEventListener("click", () => this.toggle());

      el.loginForm?.addEventListener("submit", event => {
        event.preventDefault();
        this.login();
      });
      el.registerForm?.addEventListener("submit", event => {
        event.preventDefault();
        this.register();
      });

      el.logoutBtn?.addEventListener("click", () => this.logout());
      el.userMenuTrigger?.addEventListener("click", () => this.toggleUserMenu());

      // Support both the old .auth-backdrop overlay and a direct overlay click.
      el.overlay?.addEventListener("click", event => {
        if (event.target === el.overlay || event.target?.classList.contains("auth-backdrop")) {
          this.closeAuth();
        }
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && state.modalOpen && !state.loading) this.closeAuth();
      });

      document.querySelectorAll("[data-auth-provider]").forEach(button => {
        button.addEventListener("click", () => this.startOAuth(button.dataset.authProvider));
      });

      window.API?.on?.("auth:logout", () => {
        this.clearSession(false);
        this.unlockApp();
        this.hideAuth(true);
      });
    },

    toggleUserMenu() {
      if (!el.userMenuTrigger) return;
      const open = el.userMenuTrigger.getAttribute("aria-expanded") === "true";
      el.userMenuTrigger.setAttribute("aria-expanded", String(!open));
      if (el.userDropdown) {
        el.userDropdown.hidden = open;
        el.userDropdown.classList.toggle("open", !open);
      }
    },

    updateToolbar() {
      const authenticated = this.isAuthenticated();
      el.guestToolbar?.classList.toggle("hidden", authenticated);
      el.userToolbar?.classList.toggle("hidden", !authenticated);

      if (el.vipTier && state.user) {
        const user = state.user;
        el.vipTier.textContent = user.vip
          ? `VIP ${user.vip}`
          : (user.role ? String(user.role).toUpperCase() : (user.email || "ACCOUNT"));
      }
      el.userMenuTrigger?.setAttribute("aria-expanded", "false");
    },

    /* ---------- Validation and feedback ---------- */

    validEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    },

    validPassword(value, minimum) {
      return typeof value === "string" && value.length >= (minimum || 6);
    },

    setFeedback(message, kind) {
      state.lastError = kind === "error" ? message : null;
      const node = el.status;
      if (!node) {
        if (kind === "error") console.warn("[BLOXIO AUTH]", message);
        return;
      }
      node.textContent = message || "";
      node.dataset.kind = kind || "info";
      node.classList.toggle("active", Boolean(message));
      node.hidden = !message;
    },

    error(message) { this.setFeedback(this.friendlyMessage(message), "error"); },
    clearError() { this.setFeedback("", ""); },

    friendlyMessage(error) {
      const raw = String(error?.message || error || "Authentication failed");
      const known = {
        unauthorized: "Your session has expired. Please sign in again.",
        invalid_token: "Your session has expired. Please sign in again.",
        network: "Network connection failed. Please try again.",
        timeout: "The request timed out. Please try again.",
        email_exists: "This email address is already registered.",
        weak_password: "Your password does not meet the security requirements.",
        invalid_credentials: "The email or password is incorrect.",
        invalid_email: "Please enter a valid email address.",
        missing_fields: "Please complete the required fields.",
        account_blocked: "This account is currently unavailable.",
        registration_failed: "Registration failed. Please try again.",
        "API service unavailable": "The authentication service is unavailable.",
        "Token Missing": "The server response did not include a session token."
      };
      return known[raw] || raw;
    },

    setLoading(button, loading) {
      state.loading = Boolean(loading);
      if (button) {
        button.disabled = Boolean(loading);
        button.classList.toggle("loading", Boolean(loading));
        button.setAttribute("aria-busy", String(Boolean(loading)));
      }
      if (el.close) el.close.disabled = Boolean(loading);
      [el.loginTab, el.registerTab].forEach(tab => {
        if (tab) tab.disabled = Boolean(loading);
      });
    },

    /* ---------- API adapter ---------- */

    async request(path, body, options) {
      const opts = options || {};
      const timeout = Number(opts.timeout || this.config.requestTimeout);

      if (window.API && typeof window.API.post === "function" && opts.useApiEngine !== false) {
        // The existing BLOXIO API Engine owns base URL, headers and response parsing.
        return window.API.post(path, body || {}, {
          auth: opts.auth === true,
          cache: false
        });
      }

      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller ? window.setTimeout(() => controller.abort(), timeout) : null;
      try {
        const response = await fetch(path, {
          method: opts.method || "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(opts.headers || {})
          },
          body: opts.method === "GET" ? undefined : JSON.stringify(body || {}),
          signal: controller?.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false || payload.error) {
          throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
        }
        return payload;
      } catch (error) {
        if (error.name === "AbortError") throw new Error("timeout");
        throw error;
      } finally {
        if (timer) window.clearTimeout(timer);
      }
    },

    unwrap(response) {
      if (!response) throw new Error("Request failed");
      if (response.error) throw new Error(response.error);
      const data = response.data ?? response;
      if (data?.success === false || data?.error) {
        throw new Error(data.error || data.message || "Request failed");
      }
      return data;
    },

    /* ---------- Email/password flows ---------- */

    async login() {
      if (state.loading) return;
      const email = el.email?.value?.trim() || "";
      const password = el.pass?.value || "";

      if (!this.validEmail(email)) {
        this.error("invalid_email");
        el.email?.focus();
        return;
      }
      if (!this.validPassword(password, 6)) {
        this.error("Password must contain at least 6 characters.");
        el.pass?.focus();
        return;
      }

      this.clearError();
      this.setLoading(el.loginSubmit, true);
      try {
        const response = this.unwrap(await this.request(this.config.endpoints.login, {
          email,
          password,
          remember: Boolean(el.rememberDevice?.checked)
        }, { auth: false }));
        this.acceptAuthResponse(response);
        this.enter();
      } catch (error) {
        this.error(error);
      } finally {
        this.setLoading(el.loginSubmit, false);
      }
    },

    async register() {
      if (state.loading) return;
      const email = el.regEmail?.value?.trim() || "";
      const phone = el.regPhone?.value?.trim() || "";
      const password = el.regPass?.value || "";
      const confirm = el.regConfirm?.value || "";
      const referral = el.regRef?.value?.trim() || "";
      const name = el.regName?.value?.trim() || "";

      if (!this.validEmail(email)) {
        this.error("invalid_email");
        el.regEmail?.focus();
        return;
      }
      if (!this.validPassword(password, 8)) {
        this.error("Use a password with at least 8 characters.");
        el.regPass?.focus();
        return;
      }
      if (password !== confirm) {
        this.error("Passwords do not match.");
        el.regConfirm?.focus();
        return;
      }
      if (el.agreeTerms && !el.agreeTerms.checked) {
        this.error("Please accept Terms & Privacy.");
        return;
      }

      this.clearError();
      this.setLoading(el.registerSubmit, true);
      try {
        const payload = { email, password, phone, referral };
        if (name) payload.name = name;
        if (el.agreeTerms) payload.acceptedTerms = Boolean(el.agreeTerms.checked);

        const response = this.unwrap(await this.request(this.config.endpoints.register, payload, { auth: false }));
        this.acceptAuthResponse(response);
        this.enter();
      } catch (error) {
        this.error(error);
      } finally {
        this.setLoading(el.registerSubmit, false);
      }
    },

    acceptAuthResponse(response) {
      const normalized = this.normalizeResponse(response);
      if (!normalized.token) {
        // Some systems require email verification before issuing a session.
        if (response?.requiresVerification || response?.data?.requiresVerification) {
          this.setFeedback(
            response.message || response.data?.message || "Check your email to verify your account.",
            "success"
          );
          return false;
        }
        throw new Error("Token Missing");
      }
      this.setSession(normalized.token, normalized.refreshToken, normalized.user);
      return true;
    },

    /* ---------- OAuth providers ---------- */

    syncProviderButtons() {
      document.querySelectorAll("[data-auth-provider]").forEach(button => {
        const provider = String(button.dataset.authProvider || "").toLowerCase();
        const enabled = this.config.oauthProviders.includes(provider) &&
          Boolean(this.config.endpoints.oauth[provider]);
        button.hidden = !enabled;
        button.disabled = !enabled;
        button.setAttribute("aria-disabled", String(!enabled));
      });
    },

    startOAuth(provider) {
      const name = String(provider || "").toLowerCase();
      if (!this.config.oauthProviders.includes(name)) {
        this.error(`The ${name || "selected"} sign-in provider is not enabled.`);
        return false;
      }
      const endpoint = this.config.endpoints.oauth[name];
      if (!endpoint) {
        this.error(`No ${name} sign-in endpoint has been configured.`);
        return false;
      }

      // The backend must create state/nonce, redirect to the provider,
      // validate the callback and establish the BLOXIO session.
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const target = new URL(endpoint, window.location.origin);
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        target.searchParams.set("returnTo", returnTo);
      }
      window.location.assign(target.toString());
      return true;
    },

    /* ---------- Session verification / logout ---------- */

    async verifySession() {
      if (state.verifying || !state.token) return false;
      state.verifying = true;
      try {
        let response;
        if (window.API && typeof window.API.get === "function") {
          response = await window.API.get(this.config.endpoints.me, {
            auth: true,
            cache: false
          });
        } else {
          response = await this.request(this.config.endpoints.me, {}, {
            method: "GET",
            auth: true,
            useApiEngine: false
          });
        }

        const data = this.unwrap(response);
        if (data.valid === false || data.authenticated === false) {
          this.clearSession(false);
          return false;
        }
        if (data.user) {
          state.user = data.user;
          this.writeStorage("user", JSON.stringify(data.user));
        }
        state.authenticated = true;
        this.updateToolbar();
        this.enter();
        return true;
      } catch (error) {
        // Do not block guest/public browsing during API outages.
        console.warn("[BLOXIO AUTH] Could not verify saved session:", error);
        return false;
      } finally {
        state.verifying = false;
      }
    },

    enter() {
      state.authenticated = Boolean(state.token || this.getToken());
      this.unlockApp();
      this.hideAuth(true);
      this.updateToolbar();
      this.clearError();

      if (state.authenticated) {
        try { window.WS?.connect?.(); } catch (error) {
          console.warn("[BLOXIO AUTH] WebSocket connect failed:", error);
        }
        try { window.API?.syncAll?.(); } catch (error) {
          console.warn("[BLOXIO AUTH] API sync failed:", error);
        }
      }
      return state.authenticated;
    },

    clearSession(notify) {
      const hadSession = Boolean(state.token || this.getToken() || state.authenticated || state.user);
      try { window.API?.setToken?.(null); } catch (_) {}

      ["token", "accessToken", "refreshToken", "user"].forEach(key => this.removeStorage(key));
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.authenticated = false;
      this.updateToolbar();
      if (notify !== false && hadSession) this.dispatchSessionEvent("auth:logout");
      return hadSession;
    },

    async logout(notifyServer) {
      if (state.loading) return false;
      const shouldNotify = notifyServer !== false;
      const hadSession = Boolean(state.token || this.getToken());

      if (shouldNotify && hadSession) {
        try {
          await this.request(this.config.endpoints.logout, {}, { auth: true });
        } catch (error) {
          // Local logout still completes if the server is unreachable.
          console.warn("[BLOXIO AUTH] Server logout request failed:", error);
        }
      }

      this.clearSession(true);
      try { window.WS?.refreshAuth?.(); } catch (_) {}
      this.unlockApp();
      this.hideAuth(true);
      this.clearError();
      el.userMenuTrigger?.setAttribute("aria-expanded", "false");
      return true;
    },

    /* ---------- Referral / deep link ---------- */

    injectReferral() {
      try {
        const params = new URLSearchParams(window.location.search);
        const referral = params.get("ref") || params.get("invite");
        if (referral && el.regRef && !el.regRef.value) el.regRef.value = referral;
      } catch (_) {}
    }
  };

  // Legacy public aliases used by existing BLOXIO UI handlers.
  AUTH.open = AUTH.openAuth.bind(AUTH);
  AUTH.close = AUTH.closeAuth.bind(AUTH);
  AUTH.isLoggedIn = AUTH.isAuthenticated.bind(AUTH);

  window.AUTH = AUTH;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => AUTH.init(), { once: true });
  } else {
    AUTH.init();
  }
})(window, document);
