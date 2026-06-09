/*=========================================================
FILE: public/bx/chat.js
BLOXIO CHAT ENGINE V2
=========================================================*/
window.BXChat=(function(){

const listeners=new Set();
const messages=[];
const mutedUsers=new Set();

const MAX_MESSAGES=500;
const MAX_LENGTH=300;
const COOLDOWN=1500;

let lastMessageAt=0;

const rooms=[
"global",
"casino",
"mining",
"trading",
"arabic",
"english",
"vip",
"support"
];

const state={
room:"global",
online:0,
messages:0,
updatedAt:0,
typing:0,
unread:0,
tips:0,
rains:0
};

/*=========================================================
HELPERS
=========================================================*/
function uuid(){
return crypto.randomUUID
?crypto.randomUUID()
:Math.random().toString(36).slice(2);
}

function escapeHTML(text){

return String(text||"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");
}

function emit(){

state.updatedAt=Date.now();

listeners.forEach(callback=>{

try{

callback(getState());

}catch(error){

console.error(
"CHAT_ENGINE",
error
);

}

});

render();

}

function pushMessage(message){

messages.unshift(message);

if(messages.length>MAX_MESSAGES){

messages.length=MAX_MESSAGES;

}

state.messages=messages.length;

emit();

}

/*=========================================================
MESSAGE
=========================================================*/
function sendMessage(text){

text=(text||"").trim();

if(!text)return;

if(text.length>MAX_LENGTH){

text=text.slice(
0,
MAX_LENGTH
);

}

if(
Date.now()-lastMessageAt<
COOLDOWN
){
return;
}

lastMessageAt=Date.now();

const user=
window.AuthFeed
?.getState()
?.user
?.username
||"guest";

const vip=
window.BXVIP
?.getState()
?.name
||"VIP0";

const payload={

id:uuid(),

user,

vip,

room:state.room,

text,

time:Date.now()

};

pushMessage(payload);

if(window.BXSocket){

BXSocket.emit(
"chat:message",
{
room:state.room,
text
}
);

}

}

/*=========================================================
SYSTEM
=========================================================*/
function systemMessage(
text,
room="global",
vip="SYSTEM"
){

pushMessage({

id:uuid(),

system:true,

user:"BLOXIO",

vip,

room,

text,

time:Date.now()

});

}

function createTip(
user,
amount,
coin="BX"
){

state.tips++;

systemMessage(
`${user} tipped ${amount} ${coin}`,
"global",
"TIP"
);

}

function createRain(
amount,
coin="BX",
players=1
){

state.rains++;

systemMessage(
`Rain ${amount} ${coin} for ${players} players`,
"global",
"RAIN"
);

}

function casinoWin(
user,
amount,
coin="BX"
){

systemMessage(
`${user} won ${amount} ${coin}`,
"casino",
"WIN"
);

}

function miningReward(
user,
amount,
coin="BX"
){

systemMessage(
`${user} mined ${amount} ${coin}`,
"mining",
"MINING"
);

}

/*=========================================================
RECEIVE
=========================================================*/
function receive(payload){

if(!payload)return;

if(
payload.user&&
mutedUsers.has(payload.user)
){
return;
}

pushMessage({

id:payload.id||uuid(),

user:payload.user||"guest",

vip:payload.vip||"VIP0",

room:payload.room||"global",

text:String(
payload.text||""
),

time:
payload.time||
Date.now()

});

}

/*=========================================================
ROOM
=========================================================*/
function joinRoom(room){

if(
!rooms.includes(room)
){
return;
}

state.room=room;

emit();

if(window.BXSocket){

BXSocket.emit(
"chat:join",
{
room
}
);

}

}

/*=========================================================
ONLINE
=========================================================*/
function updateOnline(total){

state.online=
Number(total)||0;

emit();

}

/*=========================================================
MODERATION
=========================================================*/
function mute(user){

if(!user)return;

mutedUsers.add(user);

}

function unmute(user){

mutedUsers.delete(user);

}

/*=========================================================
RENDER
=========================================================*/
function render(){

const container=
document.getElementById(
"chatMessages"
);

if(!container)return;

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

<span class="chat-vip">
${escapeHTML(item.vip)}
</span>

•

<span class="chat-name">
${escapeHTML(item.user)}
</span>

</div>

<div class="chat-text">
${escapeHTML(item.text)}
</div>

</div>

`)
.join("");

}

/*=========================================================
SOCKET
=========================================================*/
function bindSocket(){

if(!window.BXSocket){
return;
}

BXSocket.on(
"chat:message",
receive
);

BXSocket.on(
"chat:tip",
payload=>{

createTip(
payload.user,
payload.amount,
payload.coin
);

}
);

BXSocket.on(
"chat:rain",
payload=>{

createRain(
payload.amount,
payload.coin,
payload.players
);

}
);

BXSocket.on(
"chat:casinoWin",
payload=>{

casinoWin(
payload.user,
payload.amount,
payload.coin
);

}
);

BXSocket.on(
"chat:miningReward",
payload=>{

miningReward(
payload.user,
payload.amount,
payload.coin
);

}
);

BXSocket.on(
"chat:online",
updateOnline
);

}

/*=========================================================
INPUT
=========================================================*/
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
input?.value
);

if(input){
input.value="";
}

}
);

input?.addEventListener(
"keydown",
event=>{

if(event.key!=="Enter")
return;

sendMessage(
input.value
);

input.value="";

}
);

}

/*=========================================================
ROOMS
=========================================================*/
function bindRooms(){

document
.querySelectorAll(
"[data-chat-room]"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

joinRoom(
btn.dataset.chatRoom
);

}
);

});

}

/*=========================================================
MOCK
=========================================================*/
function mock(){

if(window.BXSocket)
return;

setInterval(()=>{

receive({

user:
`player${Math.floor(Math.random()*9999)}`,

vip:[
"VIP0",
"VIP1",
"VIP2",
"VIP3"
][Math.floor(Math.random()*4)],

room:"global",

text:"BX TO THE MOON 🚀",

time:Date.now()

});

updateOnline(
100+
Math.floor(
Math.random()*5000
)
);

},8000);

}

/*=========================================================
SUBSCRIBE
=========================================================*/
function subscribe(callback){

listeners.add(callback);

callback(
getState()
);

return()=>{

listeners.delete(
callback
);

};

}

/*=========================================================
STATE
=========================================================*/
function getState(){

return{

...state,

rooms:[...rooms],

messages:[...messages]

};

}

/*=========================================================
INIT
=========================================================*/
function init(){

bindSocket();

bindInput();

bindRooms();

mock();

emit();

console.log(
"💬 BLOXIO CHAT V2 READY"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

sendMessage,

receive,

joinRoom,

subscribe,

getState,

mute,

unmute,

createTip,

createRain,

casinoWin,

miningReward

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXChat.init()
)
:BXChat.init();
``` 0
