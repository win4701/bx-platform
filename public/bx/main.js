/* =========================================================
   BX MAIN (CLEAN INTEGRATION WITH CORE)
========================================================= */

window.APP_BOOT = {
  started:false
};

// ================= START =================

document.addEventListener("DOMContentLoaded", ()=>{

  if(APP_BOOT.started) return;

  console.log("🚀 MAIN START");

  initApp();

  APP_BOOT.started = true;

});

// ================= INIT =================

function initApp(){

  // ✅ Telegram auto login (اختياري)
  initTelegramLogin();

  // ✅ default view via core
  if(typeof switchView === "function"){
    switchView("wallet");
  }

  // ✅ visibility fix (mobile / telegram)
  handleVisibility();

}

// ================= TELEGRAM LOGIN =================

async function initTelegramLogin(){

  const tg = window.Telegram?.WebApp;

  if(!tg) return;

  const user = tg.initDataUnsafe?.user;

  if(!user) return;

  try{

    const res = await safeFetch("/auth/telegram",{
      method:"POST",
      body: JSON.stringify({
        telegram_id:user.id,
        username:user.username
      })
    });

    if(res?.token){
      localStorage.setItem("token", res.token);
    }

  }catch(e){
    console.warn("TG login fail");
  }

}

// ================= VISIBILITY =================

function handleVisibility(){

  document.addEventListener("visibilitychange", ()=>{

    if(document.visibilityState === "visible"){

      // reconnect WS إذا تقطع
      if(typeof connectWS === "function"){
        connectWS();
      }

    }

  });

}

// ================= SAFE GLOBAL =================

// fallback helpers (لو core ما حمّلش)
window.$ = window.$ || ((id)=>document.getElementById(id));
window.$$ = window.$$ || ((s)=>document.querySelectorAll(s));
