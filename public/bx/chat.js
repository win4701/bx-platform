/* =========================================================
   FILE: public/bx/chat.js
   BLOXIO GLOBAL CHAT ENGINE 2026
========================================================= */

window.BXChat=(function(){

const listeners=new Set();

const messages=[];

const rooms=[
"global",
"arabic",
"english",
"vip",
"support"
];

const state={
room:"global",
online:0,
messages:0,
updatedAt:0
};

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
"CHAT_ENGINE",
error
);

}

});

render();

}

/* =========================================================
   MESSAGE
========================================================= */

function sendMessage(text){

if(!text){
return;
}

const user=
window.AuthFeed
?.getState()
?.user
?.username
||"guest";

messages.unshift({
id:crypto.randomUUID(),
user,
room:state.room,
text,
time:Date.now(),
vip:
window.BXVIP
?.getState()
?.name
||"Bronze"
});

state.messages++;

emit();

if(
window.BXSocket
){

BXSocket.emit(
"chat:message",
{
room:state.room,
text
}
);

}

}

/* =========================================================
   RECEIVE
========================================================= */

function receive(payload){

messages.unshift({
id:crypto.randomUUID(),
...payload
});

state.messages++;

emit();

}

/* =========================================================
   ROOM
========================================================= */

function joinRoom(room){

if(
!rooms.includes(room)
){
return;
}

state.room=room;

emit();

}

/* =========================================================
   RENDER
========================================================= */

function render(){

const container=
document.getElementById(
"chatMessages"
);

if(!container){
return;
}

container.innerHTML=
messages
.filter(
item=>
item.room===state.room
)
.slice(0,100)
.map(item=>`
<div class="chat-row">
<div class="chat-user">
${item.vip}
•
${item.user}
</div>
<div class="chat-text">
${item.text}
</div>
</div>
`).join("");

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

BXSocket.on(
"chat:message",
receive
);

}

/* =========================================================
   INPUT
========================================================= */

function bindInput(){

const input=
document.getElementById(
"chatInput"
);

const send=
document.getElementById(
"chatSend"
);

send?.addEventListener(
"click",
()=>{

sendMessage(
input.value
);

input.value="";

}
);

input?.addEventListener(
"keydown",
e=>{

if(
e.key==="Enter"
){

sendMessage(
input.value
);

input.value="";

}

}
);

}

/* =========================================================
   ROOMS
========================================================= */

function bindRooms(){

document
.querySelectorAll(
"[data-chat-room]"
)
.forEach(btn=>{

btn.onclick=()=>{

joinRoom(
btn.dataset.chatRoom
);

};

});

}

/* =========================================================
   MOCK
========================================================= */

function mock(){

setInterval(()=>{

receive({
user:`player${Math.floor(Math.random()*9999)}`,
vip:["Bronze","Silver","Gold","Diamond"][Math.floor(Math.random()*4)],
room:"global",
text:"BX TO THE MOON 🚀",
time:Date.now()
});

state.online=
100+
Math.floor(
Math.random()*5000
);

emit();

},8000);

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
...state,
messages:[...messages]
};

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindSocket();

bindInput();

bindRooms();

mock();

emit();

console.log(
"💬 BLOXIO CHAT READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

sendMessage,

joinRoom,

subscribe,

getState

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXChat.init()
)
:BXChat.init();
