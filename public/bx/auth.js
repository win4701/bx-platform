
/* =========================================================
   BLOXIO AUTH ENGINE V9
   Guest First • Optional Login / Register
   Compatible with index(3).html and API Engine V7/V8
========================================================= */

"use strict";

(function () {

    if (window.AUTH?.__BLOXIO_AUTH_V9__) return;

    const AUTH = {

        __BLOXIO_AUTH_V9__: true,

        VERSION: "9.0.0",

        state: {
            initialized: false,
            loading: false,
            authenticated: false,
            mode: "login",
            token: null,
            refreshToken: null,
            user: null,
            modalOpen: false,
            verifying: false
        },

        el: {},

        /* =================================================
           DOM CACHE
        ================================================= */

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

                regEmail: "registerEmail",
                regPhone: "registerPhone",
                regPass: "registerPassword",
                regConfirm: "registerConfirm",
                regRef: "inviteCode",
                agreeTerms: "agreeTerms",

                toggleAuth: "toggleAuth",
                switchText: "switchText",
                title: "authTitle",

                error: "authError"
            };

            Object.entries(ids).forEach(([key, id]) => {
                this.el[key] = document.getElementById(id);
            });

            this.el.loginSubmit =
                this.el.loginForm?.querySelector(
                    'button[type="submit"]'
                );

            this.el.registerSubmit =
                this.el.registerForm?.querySelector(
                    'button[type="submit"]'
                );

        },

        /* =================================================
           INITIALIZATION
        ================================================= */

        init() {

            if (this.state.initialized) return;

            this.cache();

            this.state.initialized = true;

            this.bindEvents();

            this.injectReferral();

            // Always allow public browsing.
            this.unlockApp();

            // Never open authentication automatically.
            this.hideAuth(true);

            this.restoreLocalSession();

            this.updateToolbar();

            if (this.state.token) {
                this.verifySession();
            }

            console.log(
                "[BLOXIO AUTH]",
                "Guest-first authentication ready",
                this.VERSION
            );

        },

        /* =================================================
           STORAGE
        ================================================= */

        getToken() {

            try {
                return (
                    localStorage.getItem("token") ||
                    localStorage.getItem("accessToken") ||
                    null
                );
            } catch {
                return null;
            }

        },

        getRefreshToken() {

            try {
                return localStorage.getItem("refreshToken");
            } catch {
                return null;
            }

        },

        getStoredUser() {

            try {

                const raw = localStorage.getItem("user");

                return raw ? JSON.parse(raw) : null;

            } catch {
                return null;
            }

        },

        writeStorage(key, value) {

            try {

                localStorage.setItem(key, value);

                return true;

            } catch (error) {

                console.warn(
                    "[AUTH STORAGE]",
                    error
                );

                return false;

            }

        },

        removeStorage(key) {

            try {
                localStorage.removeItem(key);
            } catch {}
        },

        restoreLocalSession() {

            this.state.token = this.getToken();

            this.state.refreshToken =
                this.getRefreshToken();

            this.state.user = this.getStoredUser();

            this.state.authenticated =
                Boolean(this.state.token);

        },

        /* =================================================
           APP VISIBILITY
        ================================================= */

        unlockApp() {

            document.body.classList.remove(
                "auth-lock",
                "auth-loading",
                "loading",
                "app-preload",
                "auth-modal-open"
            );

            document.body.classList.add("app-ready");

            if (this.el.app) {

                this.el.app.classList.remove("app-hidden");

                this.el.app.style.opacity = "1";
                this.el.app.style.visibility = "visible";
                this.el.app.style.pointerEvents = "auto";

            }

        },

        // Kept for compatibility.
        // Authentication must never lock public browsing.
        lockApp() {
            this.unlockApp();
        },

        /* =================================================
           AUTH MODAL
        ================================================= */

        openAuth(mode = "login") {

            if (!this.el.overlay || this.state.loading) {
                return false;
            }

            this.unlockApp();

            this.state.mode =
                mode === "register"
                    ? "register"
                    : "login";

            this.state.modalOpen = true;

            this.renderMode();

            this.clearError();

            this.el.overlay.classList.remove("hidden");

            this.el.overlay.style.display = "flex";

            document.body.classList.add("auth-modal-open");

            requestAnimationFrame(() => {

                this.el.overlay?.classList.add("visible");

            });

            const target =
                this.state.mode === "login"
                    ? this.el.email
                    : this.el.regEmail;

            setTimeout(() => {
                target?.focus();
            }, 100);

            return true;

        },

        showAuth(mode = "login") {
            return this.openAuth(mode);
        },

        hideAuth(force = false) {

            if (!this.el.overlay) return;

            this.state.modalOpen = false;

            this.el.overlay.classList.remove("visible");

            document.body.classList.remove(
                "auth-modal-open"
            );

            const finish = () => {

                if (!this.state.modalOpen) {

                    this.el.overlay.classList.add("hidden");

                    this.el.overlay.style.display = "none";

                }

            };

            if (force) {
                finish();
            } else {
                setTimeout(finish, 220);
            }

            // Never hide the public application.
            this.unlockApp();

        },

        closeAuth() {

            if (this.state.loading) return;

            this.clearError();

            this.hideAuth();

        },

        /* =================================================
           MODE SWITCH
        ================================================= */

        renderMode() {

            const isLogin =
                this.state.mode === "login";

            this.el.loginBox?.classList.toggle(
                "hidden",
                !isLogin
            );

            this.el.registerBox?.classList.toggle(
                "hidden",
                isLogin
            );

            this.el.loginBox?.classList.toggle(
                "active",
                isLogin
            );

            this.el.registerBox?.classList.toggle(
                "active",
                !isLogin
            );

            this.el.loginTab?.classList.toggle(
                "active",
                isLogin
            );

            this.el.registerTab?.classList.toggle(
                "active",
                !isLogin
            );

            if (this.el.title) {

                this.el.title.textContent = isLogin
                    ? "Welcome To BLOXIO"
                    : "Create Your BLOXIO Account";

            }

            if (this.el.switchText) {

                this.el.switchText.textContent = isLogin
                    ? "Need account?"
                    : "Already have an account?";

            }

            if (this.el.toggleAuth) {

                this.el.toggleAuth.textContent = isLogin
                    ? "Register"
                    : "Login";

            }

        },

        setMode(mode) {

            if (this.state.loading) return;

            this.state.mode =
                mode === "register"
                    ? "register"
                    : "login";

            this.renderMode();

            this.clearError();

        },

        toggle() {

            this.setMode(
                this.state.mode === "login"
                    ? "register"
                    : "login"
            );

        },

        /* =================================================
           EVENTS
        ================================================= */

        bindEvents() {

            this.el.headerLogin?.addEventListener(
                "click",
                () => this.openAuth("login")
            );

            this.el.headerRegister?.addEventListener(
                "click",
                () => this.openAuth("register")
            );

            this.el.close?.addEventListener(
                "click",
                () => this.closeAuth()
            );

            this.el.loginTab?.addEventListener(
                "click",
                () => this.setMode("login")
            );

            this.el.registerTab?.addEventListener(
                "click",
                () => this.setMode("register")
            );

            this.el.toggleAuth?.addEventListener(
                "click",
                () => this.toggle()
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

            this.el.logoutBtn?.addEventListener(
                "click",
                () => this.logout()
            );

            this.el.userMenuTrigger?.addEventListener(
                "click",
                () => this.toggleUserMenu()
            );

            // Clicking the dark backdrop closes the modal.
            this.el.overlay?.addEventListener(
                "click",
                event => {

                    if (
                        event.target?.classList.contains(
                            "auth-backdrop"
                        )
                    ) {
                        this.closeAuth();
                    }

                }
            );

            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Escape" &&
                        this.state.modalOpen &&
                        !this.state.loading
                    ) {
                        this.closeAuth();
                    }

                }
            );

            // API session expiration.
            window.API?.on?.(
                "auth:logout",
                () => {

                    this.clearSession(false);

                    this.unlockApp();

                    this.hideAuth(true);

                    this.updateToolbar();

                }
            );

        },

        /* =================================================
           USER MENU
        ================================================= */

        toggleUserMenu() {

            const trigger = this.el.userMenuTrigger;
            const dropdown = this.el.userDropdown;

            if (!trigger || !dropdown) return;

            const isOpen =
                trigger.getAttribute("aria-expanded") === "true";

            trigger.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

        },

        /* =================================================
           TOOLBAR
        ================================================= */

        updateToolbar() {

            const authenticated =
                Boolean(
                    this.state.authenticated &&
                    this.state.token
                );

            this.el.guestToolbar?.classList.toggle(
                "hidden",
                authenticated
            );

            this.el.userToolbar?.classList.toggle(
                "hidden",
                !authenticated
            );

            if (this.el.vipTier && this.state.user) {

                const user = this.state.user;

                this.el.vipTier.textContent =
                    user.vip
                        ? `VIP ${user.vip}`
                        : user.role
                            ? String(user.role).toUpperCase()
                            : user.email || "ACCOUNT";

            }

            this.el.userMenuTrigger?.setAttribute(
                "aria-expanded",
                "false"
            );

        },

        /* =================================================
           VALIDATION
        ================================================= */

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

        /* =================================================
           LOADING STATE
        ================================================= */

        loading(button, state) {

            this.state.loading = state;

            if (button) {

                button.disabled = state;

                button.classList.toggle(
                    "loading",
                    state
                );

                button.setAttribute(
                    "aria-busy",
                    String(state)
                );

            }

            if (this.el.close) {
                this.el.close.disabled = state;
            }

        },

        /* =================================================
           ERROR HANDLING
        ================================================= */

        message(error) {

            const message = String(
                error?.message ||
                error?.error ||
                "Authentication failed"
            );

            const known = {

                unauthorized:
                    "Session expired",

                invalid_token:
                    "Session expired",

                network:
                    "Network connection failed",

                timeout:
                    "Request timed out",

                retry_failed:
                    "Request failed. Try again",

                request_failed:
                    "Request failed",

                email_exists:
                    "Email already registered",

                weak_password:
                    "Password is too weak",

                invalid_credentials:
                    "Invalid email or password",

                invalid_email:
                    "Invalid email address",

                missing_fields:
                    "Please complete the required fields",

                account_blocked:
                    "This account is currently unavailable",

                registration_failed:
                    "Registration failed. Please try again",

                login_error:
                    "Login failed. Please try again",

                "API service unavailable":
                    "Connection service unavailable",

                "Token Missing":
                    "Authentication response is incomplete",

                "Unable to save session":
                    "Unable to save login session"

            };

            return known[message] || message;

        },

        error(message) {

            if (!this.el.error) {

                console.warn("[AUTH]", message);

                return;

            }

            this.el.error.textContent =
                this.message({
                    message
                });

            this.el.error.classList.add("active");

        },

        clearError() {

            if (!this.el.error) return;

            this.el.error.textContent = "";

            this.el.error.classList.remove("active");

        },

        /* =================================================
           API REQUEST
        ================================================= */

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
                    auth: false,
                    cache: false
                }
            );

            if (!response) {

                throw new Error("Request failed");

            }

            if (response.error) {

                throw new Error(response.error);

            }

            const data = response.data ?? response;

            if (
                data?.success === false ||
                data?.error
            ) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Request failed"
                );

            }

            return data;

        },

        /* =================================================
           RESPONSE NORMALIZATION
        ================================================= */

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

        /* =================================================
           SESSION SAVE
        ================================================= */

        session(response) {

            const data =
                this.normalizeResponse(response);

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

            if (!token) {
                throw new Error("Token Missing");
            }

            // API Engine V7 stores the token in localStorage.
            if (window.API?.setToken) {

                window.API.setToken(token);

            } else {

                const saved =
                    this.writeStorage("token", token);

                if (!saved) {
                    throw new Error("Unable to save session");
                }

            }

            this.writeStorage(
                "accessToken",
                token
            );

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

            this.state.refreshToken =
                refreshToken || null;

            this.state.user = user || null;

            this.state.authenticated = true;

            this.updateToolbar();

        },

        /* =================================================
           LOGIN
        ================================================= */

        async login() {

            if (this.state.loading) return;

            const email =
                this.el.email?.value?.trim() || "";

            const password =
                this.el.pass?.value || "";

            if (!this.email(email)) {

                this.error("Invalid email address");

                this.el.email?.focus();

                return;

            }

            if (!this.password(password)) {

                this.error("Password Too Short");

                this.el.pass?.focus();

                return;

            }

            this.clearError();

            this.loading(
                this.el.loginSubmit,
                true
            );

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

                this.loading(
                    this.el.loginSubmit,
                    false
                );

            }

        },

        /* =================================================
           REGISTER
        ================================================= */

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

            const referral =
                this.el.regRef?.value?.trim() || "";

            if (!this.email(email)) {

                this.error("Invalid email address");

                this.el.regEmail?.focus();

                return;

            }

            if (!this.password(password)) {

                this.error("Password Too Short");

                this.el.regPass?.focus();

                return;

            }

            if (password !== confirm) {

                this.error("Passwords do not match");

                this.el.regConfirm?.focus();

                return;

            }

            if (
                this.el.agreeTerms &&
                !this.el.agreeTerms.checked
            ) {

                this.error(
                    "Please accept Terms & Privacy"
                );

                return;

            }

            this.clearError();

            this.loading(
                this.el.registerSubmit,
                true
            );

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

                this.loading(
                    this.el.registerSubmit,
                    false
                );

            }

        },

        /* =================================================
           VERIFY EXISTING SESSION
        ================================================= */

        async verifySession() {

            if (
                this.state.verifying ||
                !this.state.token
            ) {
                return;
            }

            this.state.verifying = true;

            try {

                if (
                    !window.API ||
                    typeof window.API.get !== "function"
                ) {
                    return;
                }

                const response =
                    await window.API.get(
                        "/auth/me",
                        {
                            auth: true,
                            cache: false
                        }
                    );

                if (
                    !response ||
                    response.error ||
                    response.status === 401
                ) {

                    this.clearSession(false);

                    return;

                }

                const data =
                    response.data ?? response;

                if (data?.success === false) {

                    this.clearSession(false);

                    return;

                }

                if (data?.user) {

                    this.state.user = data.user;

                    this.writeStorage(
                        "user",
                        JSON.stringify(data.user)
                    );

                }

                this.state.authenticated = true;

                this.updateToolbar();

                this.enter();

            } catch (error) {

                // Network failure does not block public browsing.
                console.warn(
                    "[AUTH VERIFY]",
                    error
                );

            } finally {

                this.state.verifying = false;

            }

        },

        /* =================================================
           ENTER AUTHENTICATED APP
        ================================================= */

        enter() {

            this.state.authenticated =
                Boolean(this.state.token);

            this.unlockApp();

            this.hideAuth(true);

            this.updateToolbar();

            if (this.state.token) {

                try {
                    window.WS?.connect?.();
                } catch (error) {
                    console.warn("[AUTH WS]", error);
                }

                try {
                    window.API?.syncAll?.();
                } catch (error) {
                    console.warn("[AUTH SYNC]", error);
                }

            }

            this.clearError();

        },

        /* =================================================
           CLEAR SESSION
        ================================================= */

        clearSession(notifyAPI = true) {

            if (notifyAPI && window.API?.setToken) {

                window.API.setToken(null);

            } else {

                this.removeStorage("token");
                this.removeStorage("accessToken");
                this.removeStorage("refreshToken");

            }

            this.removeStorage("token");
            this.removeStorage("accessToken");
            this.removeStorage("refreshToken");
            this.removeStorage("user");

            this.state.authenticated = false;

            this.state.token = null;
            this.state.refreshToken = null;
            this.state.user = null;

            this.updateToolbar();

        },

        /* =================================================
           LOGOUT
        ================================================= */

        async logout(notify = true) {

            if (this.state.loading) return;

            const hadSession =
                Boolean(
                    this.state.token ||
                    this.getToken()
                );

            if (notify && hadSession) {

                try {

                    await window.API?.post?.(
                        "/auth/logout",
                        {},
                        {
                            auth: true
                        }
                    );

                } catch (error) {

                    console.warn(
                        "[AUTH LOGOUT]",
                        error
                    );

                }

            }

            this.clearSession(true);

            try {
                window.WS?.disconnect?.();
            } catch (error) {
                console.warn("[AUTH WS]", error);
            }

            // Logout returns to guest browsing.
            this.unlockApp();

            this.hideAuth(true);

            this.clearError();

            this.el.userMenuTrigger?.setAttribute(
                "aria-expanded",
                "false"
            );

            console.log(
                "[BLOXIO AUTH] Logged out — guest mode active"
            );

        },

        /* =================================================
           REFERRAL
        ================================================= */

        injectReferral() {

            try {

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

            } catch {}

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
            {
                once: true
            }
        );

    } else {

        AUTH.init();

    }

})();
