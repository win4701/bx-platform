window.AUTH = {

  API: "/api",

  init() {
    this.bindUI();
    this.checkSession();
  },

  bindUI() {

    toggleAuth.onclick = () => {
      registerBox.classList.toggle("hidden");
      loginBox.classList.toggle("hidden");
    };

    registerBtn.onclick = () => this.register();
    loginBtn.onclick = () => this.login();
  },

  async register() {

    const res = await fetch(this.API + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: regFirst.value,
        lastName: regLast.value,
        email: regEmail.value,
        phone: regPhone.value,
        password: regPass.value
      })
    });

    const data = await res.json();

    if(data.token){
      localStorage.setItem("jwt", data.token);
      this.enter();
    }
  },

  async login() {

    const res = await fetch(this.API + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPass.value
      })
    });

    const data = await res.json();

    if(data.token){
      localStorage.setItem("jwt", data.token);
      this.enter();
    }
  },

  enter() {
    document.getElementById("authOverlay").style.display = "none";

    // 🔥 تشغيل النظام كامل بعد auth
    if(window.BX && BX.init){
      BX.init();
    }
  },

  logout() {
    localStorage.removeItem("jwt");
    location.reload();
  },

  checkSession() {
    if(localStorage.getItem("jwt")){
      this.enter();
    }
  }

};
