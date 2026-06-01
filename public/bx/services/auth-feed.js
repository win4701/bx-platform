/* =========================================================
   FILE: public/bx/services/auth-feed.js
   BLOXIO AUTH ENGINE 2026
   Login | Register | Session | Profile | VIP
========================================================= */

export const AuthFeed=(function(){

const listeners=new Set();

let token=
localStorage.getItem(
"bx_token"
)||"";

let refreshToken=
localStorage.getItem(
"bx_refresh_token"
)||"";

const state={
authenticated:false,
loading:false,
user:null,
session:null,
vip:"Bronze",
verified:false,
lastLogin:null,
updatedAt:0
};

/* =========================================================
   USER MODEL
========================================================= */

function createUser(payload={}){

return{
id:payload.id||crypto.randomUUID(),
username:payload.username||"guest",
email:payload.email||"",
avatar:payload.avatar||"/assets/images/avatar/default.webp",
country:payload.country||"Global",
vip:payload.vip||"Bronze",
verified:Boolean(
payload.verified
),
balance:payload.balance||0,
createdAt:payload.createdAt||Date.now()
};

}

/* =========================================================
   HELPERS
========================================================= */

function emit(){

state.updatedAt=
Date.now();

listeners.forEach(callback=>{

try{

callback(
getState()
);

}catch(error){

console.error(
"AUTH_FEED",
error
);

}

});

updateUI();

saveSession();

}

function saveSession(){

localStorage.setItem(
"bx_auth",
JSON.stringify({
authenticated:state.authenticated,
user:state.user,
session:state.session
})
);

}

function loadSession(){

const raw=
localStorage.getItem(
"bx_auth"
);

if(!raw){
return;
}

try{

const session=
JSON.parse(raw);

state.authenticated=
session.authenticated||false;

state.user=
session.user||null;

state.session=
session.session||null;

}catch(error){

console.error(
error
);

}

}

/* =========================================================
   TOKEN
========================================================= */

function setToken(
access,
refresh=""
){

token=access||"";

refreshToken=refresh||"";

localStorage.setItem(
"bx_token",
token
);

localStorage.setItem(
"bx_refresh_token",
refreshToken
);

}

function clearToken(){

token="";
refreshToken="";

localStorage.removeItem(
"bx_token"
);

localStorage.removeItem(
"bx_refresh_token"
);

}

/* =========================================================
   SESSION
========================================================= */

function createSession(){

return{
id:crypto.randomUUID(),
device:navigator.userAgent,
ip:"0.0.0.0",
createdAt:Date.now(),
lastSeen:Date.now()
};

}

/* =========================================================
   REGISTER
========================================================= */

async function register(payload={}){

state.loading=true;

emit();

try{

const user=
createUser({
username:payload.username,
email:payload.email,
country:payload.country
});

state.authenticated=true;

state.user=user;

state.session=
createSession();

state.vip="Bronze";

state.verified=false;

state.lastLogin=
Date.now();

setToken(
crypto.randomUUID(),
crypto.randomUUID()
);

emit();

window.dispatchEvent(
new CustomEvent(
"bx:register-success",
{
detail:user
}
)
);

return{
success:true,
user
};

}catch(error){

return{
success:false,
error:error.message
};

}finally{

state.loading=false;

emit();

}

}

/* =========================================================
   LOGIN
========================================================= */

async function login(payload={}){

state.loading=true;

emit();

try{

const user=
createUser({
username:
payload.username||
"bloxio-user",
email:
payload.email||
"",
verified:true
});

state.authenticated=true;

state.user=user;

state.session=
createSession();

state.vip=
user.vip;

state.verified=
user.verified;

state.lastLogin=
Date.now();

setToken(
crypto.randomUUID(),
crypto.randomUUID()
);

emit();

window.dispatchEvent(
new CustomEvent(
"bx:login-success",
{
detail:user
}
)
);

return{
success:true,
user
};

}catch(error){

return{
success:false,
error:error.message
};

}finally{

state.loading=false;

emit();

}

}

/* =========================================================
   LOGOUT
========================================================= */

function logout(){

clearToken();

state.authenticated=false;

state.user=null;

state.session=null;

state.vip="Bronze";

state.verified=false;

emit();

window.dispatchEvent(
new CustomEvent(
"bx:logout"
)
);

}

/* =========================================================
   PROFILE
========================================================= */

function updateProfile(payload={}){

if(
!state.user
){
return;
}

Object.assign(
state.user,
payload
);

if(
payload.vip
){

state.vip=
payload.vip;

}

if(
typeof payload.verified===
"boolean"
){

state.verified=
payload.verified;

}

emit();

}

/* =========================================================
   VIP
========================================================= */

function setVIP(level){

state.vip=level;

if(state.user){

state.user.vip=
level;

}

emit();

}

function getVIP(){

return state.vip;

}

/* =========================================================
   VERIFY
========================================================= */

function verifyAccount(){

state.verified=true;

if(state.user){

state.user.verified=true;

}

emit();

}

/* =========================================================
   SOCKET
========================================================= */

function bindSocket(){

if(
!window.BXSocket
){
return;
}

window.BXSocket.on(
"auth:update",
payload=>{

updateProfile(
payload
);

}
);

}

/* =========================================================
   UI
========================================================= */

function updateUI(){

const title=
document.getElementById(
"authTitle"
);

const loginBtn=
document.getElementById(
"loginBtn"
);

const registerBtn=
document.getElementById(
"registerBtn"
);

const switchText=
document.getElementById(
"switchText"
);

if(
state.authenticated
){

if(title){

title.textContent=
`Welcome ${state.user.username}`;

}

if(loginBtn){

loginBtn.style.display=
"none";

}

if(registerBtn){

registerBtn.textContent=
"Logout";

}

if(switchText){

switchText.textContent=
`${state.vip} Member`;

}

}else{

if(title){

title.textContent=
"Authentication";

}

if(loginBtn){

loginBtn.style.display=
"inline-flex";

}

if(registerBtn){

registerBtn.textContent=
"Register";

}

if(switchText){

switchText.textContent=
"Create Account";

}

}

}

/* =========================================================
   DOM EVENTS
========================================================= */

function bindForms(){

const loginBtn=
document.getElementById(
"loginBtn"
);

const registerBtn=
document.getElementById(
"registerBtn"
);

loginBtn?.addEventListener(
"click",
()=>{

login({
username:"bloxio-user"
});

}
);

registerBtn?.addEventListener(
"click",
()=>{

if(
state.authenticated
){

logout();

return;

}

register({
username:"new-user"
});

}
);

}

/* =========================================================
   STORAGE RESTORE
========================================================= */

function restore(){

loadSession();

if(
state.authenticated
){

emit();

}

}

/* =========================================================
   SUBSCRIBE
========================================================= */

function subscribe(callback){

listeners.add(
callback
);

callback(
getState()
);

return()=>{

listeners.delete(
callback
);

};

}

/* =========================================================
   STATE
========================================================= */

function getState(){

return{
authenticated:
state.authenticated,
loading:
state.loading,
user:
state.user,
session:
state.session,
vip:
state.vip,
verified:
state.verified,
lastLogin:
state.lastLogin,
updatedAt:
state.updatedAt
};

}

/* =========================================================
   INIT
========================================================= */

function init(){

restore();

bindForms();

bindSocket();

emit();

console.log(
"🔐 BLOXIO AUTH READY"
);

}

/* =========================================================
   API
========================================================= */

return{
init,
login,
logout,
register,
subscribe,
getState,
updateProfile,
verifyAccount,
setVIP,
getVIP,
setToken
};

})();

window.AuthFeed=
AuthFeed;

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>AuthFeed.init()
)
:AuthFeed.init();
