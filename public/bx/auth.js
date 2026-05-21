/* =====================================================
BLOXIO AUTH ENGINE V5
BROWSER FIRST
OPTIONAL AUTH
OPTIONAL TELEGRAM
NO APP LOCK LOOP
===================================================== */

"use strict";

const AUTH={

state:{

loading:false,

mode:"login",

authenticated:false,

token:null,

browser:true

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

const token=

localStorage.getItem(
"token"
);

this.state.token=token;

/* Browser First */

this.unlockApp();

this.hideAuth();

/* Existing Session */

if(token){

this.restore();

}

/* Optional Telegram */

this.telegram();

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

window.Telegram
.WebApp
.ready();

window.Telegram
.WebApp
.expand();

console.log(

"Telegram Optional Ready"

);

}catch(e){

console.warn(

"TG Optional",

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
REF
===================================================== */

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

},

/* =====================================================
APP
===================================================== */

unlockApp(){

document.body.classList.remove(

"auth-lock"

);

document.body.classList.remove(

"loading"

);

document.body.classList.remove(

"app-preload"

);

document.body.classList.add(

"app-ready"

);

this.el.app
?.classList.remove(

"app-hidden"

);

},

lockApp(){

document.body.classList.add(

"auth-lock"

);

},

/* =====================================================
VIEW
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

hideAuth(){

if(

!this.el.overlay

)return;

this.el.overlay.classList.remove(

"visible"

);

setTimeout(()=>{

this.el.overlay.style.display=

"none";

},200);

},

toggle(){

const login=

this.state.mode==="login";

this.state.mode=

login

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

.test(v);

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

!res

||

res.error

){

throw new Error(

res?.error||

"Network Error"

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

"Password Short"

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

this.el.regEmail
?.value,

password:

this.el.regPass
?.value,

phone:

this.el.regPhone
?.value,

referral:

this.el.regRef
?.value

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

},

enter(){

this.unlockApp();

this.hideAuth();

window.WS
?.connect
?.();

window.API
?.syncAll
?.();

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
