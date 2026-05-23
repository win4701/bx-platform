/* =====================================================
BLOXIO AUTH ENGINE V6
STABLE AUTH
ANDROID SAFE
NO OVERLAY LOOP
NO APP FREEZE
===================================================== */

"use strict";

const AUTH={

state:{

loading:false,

mode:"login",

authenticated:false,

token:null,

browser:true,

ready:false

},

el:{},

/* =====================================================
INIT
===================================================== */

init(){

this.cache();

this.bind();

this.bindGlobal();

this.injectReferral();

this.bootstrap();

},

/* =====================================================
DOM
===================================================== */

cache(){

this.el={

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

error:$("authError"),

title:$("authTitle"),

sub:$("authSub"),

switch:$("switchText")

};

},

/* =====================================================
BOOT
===================================================== */

bootstrap(){

try{

this.state.token=

localStorage.getItem(
"token"
);

}catch{

this.state.token=null;

}

if(

this.state.token

){

this.restore();

this.enter();

}else{

this.unlockApp();

this.hideAuth(true);

}

this.telegram();

this.state.ready=true;

},

/* =====================================================
TG
===================================================== */

telegram(){

if(

!window.Telegram
?.WebApp

){

return;

}

try{

Telegram.WebApp.ready();

Telegram.WebApp.expand();

}catch(e){

console.warn(

"TG",

e

);

}

},

/* =====================================================
GLOBAL
===================================================== */

bindGlobal(){

window.addEventListener(

"storage",

e=>{

if(

e.key==="token"

&&

!e.newValue

){

this.logout();

}

}

);

window.API?.on?.(

"auth:logout",

()=>{

this.logout();

}

);

window.addEventListener(

"pageshow",

()=>{

this.unlockApp();

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

e.key!=="Enter"

)return;

if(

this.state.loading

)return;

this.state.mode==="login"

?this.login()

:this.register();

}

);

},

/* =====================================================
APP
===================================================== */

unlockApp(){

document.body.classList.remove(

"auth-lock",

"auth-loading",

"loading",

"app-preload"

);

document.body.classList.add(

"app-ready"

);

this.el.app
?.classList.remove(

"app-hidden"

);

if(

this.el.app

){

this.el.app.style.opacity="1";

this.el.app.style.visibility=

"visible";

this.el.app.style.pointerEvents=

"auto";

}

},

lockApp(){

document.body.classList.add(

"auth-lock"

);

},

/* =====================================================
AUTH VIEW
===================================================== */

showAuth(){

if(

!this.el.overlay

)return;

this.lockApp();

this.el.overlay.style.display=

"flex";

requestAnimationFrame(()=>{

this.el.overlay.classList.add(

"visible"

);

});

},

hideAuth(force=false){

if(

!this.el.overlay

)return;

this.el.overlay.classList.remove(

"visible"

);

if(

force

){

this.el.overlay.style.display=

"none";

return;

}

setTimeout(()=>{

if(

!this.el.overlay
.classList
.contains(
"visible"
)

){

this.el.overlay.style.display=

"none";

}

},220);

},

toggle(){

this.state.mode=

this.state.mode==="login"

?"register"

:"login";

this.el.loginBox
?.classList.toggle(
"active"
);

this.el.registerBox
?.classList.toggle(
"active"
);

this.clearError();

},

/* =====================================================
VALIDATE
===================================================== */

email(v){

return

/^[^\s@]+@[^\s@]+\.[^\s@]+$/

.test(v||"");

},

password(v){

return(

typeof v==="string"

&&

v.length>=6

);

},

/* =====================================================
REQUEST
===================================================== */

async request(

url,
body={}

){

if(

!window.API

){

throw new Error(

"API Missing"

);

}

const res=

await API.post(

url,
body

);

if(

!res||

res.error

){

throw new Error(

res?.error||

"Request Failed"

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

)return;

const email=

this.el.email
?.value
?.trim();

const pass=

this.el.pass
?.value
?.trim();

if(

!this.email(email)

){

return this.error(

"Invalid Email"

);

}

if(

!this.password(pass)

){

return this.error(

"Password Too Short"

);

}

try{

this.loading(

this.el.loginBtn,
true

);

const data=

await this.request(

"/auth/login",

{

email,

password:pass

}

);

this.session(data);

this.enter();

}catch(e){

this.error(

e.message

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

)return;

try{

this.loading(

this.el.registerBtn,
true

);

const data=

await this.request(

"/auth/register",

{

email:

this.el.regEmail?.value,

password:

this.el.regPass?.value,

phone:

this.el.regPhone?.value,

referral:

this.el.regRef?.value

}

);

this.session(data);

this.enter();

}catch(e){

this.error(

e.message

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

"Token Missing"

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

this.state.authenticated=true;

this.state.token=

data.token;

},

restore(){

this.state.authenticated=true;

},

logout(){

localStorage.removeItem(
"token"
);

localStorage.removeItem(
"user"
);

this.state.authenticated=false;

this.state.token=null;

this.showAuth();

},

enter(){

this.unlockApp();

this.hideAuth(true);

window.WS
?.connect?.();

window.API
?.syncAll?.();

},

/* =====================================================
UI
===================================================== */

loading(btn,state){

this.state.loading=state;

if(!btn)return;

btn.disabled=state;

btn.classList.toggle(

"loading",

state

);

},

error(msg){

if(!this.el.error)

return;

this.el.error.innerText=msg;

this.el.error.classList.add(

"active"

);

},

clearError(){

if(!this.el.error)

return;

this.el.error.innerText="";

this.el.error.classList.remove(

"active"

);

},

injectReferral(){

const ref=

new URLSearchParams(

location.search

).get("ref");

if(

ref

&&

this.el.regRef

){

this.el.regRef.value=ref;

}

}

};

function $(id){

return document
.getElementById(id);

}

document.addEventListener(

"DOMContentLoaded",

()=>{

AUTH.init();

}
);
