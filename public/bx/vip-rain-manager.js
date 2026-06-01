/* =========================================================
   FILE: public/bx/vip-rain-manager.js
   BLOXIO VIP + RAIN + TIPS + CHAT INTEGRATION
========================================================= */

window.BXVIPRainManager=(function(){

const state={
lastRain:0,
lastTip:0,
activeRain:false
};

/* =========================================================
   VIP AUTO RAIN
========================================================= */

function createVIPRain(){

if(
!window.BXVIP||
!window.BXRain
){
return;
}

const vip=
BXVIP.getState();

const rewards={
Bronze:0,
Silver:25,
Gold:50,
Platinum:100,
Diamond:250,
Master:500,
Legend:1000
};

const amount=
rewards[
vip.name
]||0;

if(
amount<=0
){
return;
}

BXRain.createRain(
amount,
60
);

state.lastRain=
Date.now();

state.activeRain=true;

}

/* =========================================================
   CHAT COMMANDS
========================================================= */

function parseChatCommand(message){

if(
!message.startsWith("/")
){
return false;
}

const parts=
message.split(" ");

const command=
parts[0]
.toLowerCase();

if(
command==="/rain"
){

const amount=
Number(
parts[1]
)||0;

if(
amount>0
){

BXRain.createRain(
amount,
60
);

}

return true;

}

if(
command==="/tip"
){

const user=
parts[1];

const amount=
Number(
parts[2]
)||0;

if(
user&&amount>0
){

BXTips.sendTip(
user,
amount,
"BX"
);

}

return true;

}

if(
command==="/join"
){

BXRain.joinRain();

return true;

}

return false;

}

/* =========================================================
   EVENTS
========================================================= */

function bindVIPEvents(){

window.addEventListener(
"bx:vip-upgrade",
e=>{

const level=
e.detail?.name;

if(
level==="Silver"||
level==="Gold"||
level==="Platinum"||
level==="Diamond"||
level==="Master"||
level==="Legend"
){

createVIPRain();

}

}
);

}

/* =========================================================
   CHAT EVENTS
========================================================= */

function bindChatEvents(){

if(
!window.BXChat
){
return;
}

const original=
BXChat.sendMessage;

BXChat.sendMessage=
function(message){

if(
parseChatCommand(
message
)
){

return;
}

return original.call(
BXChat,
message
);

};

}

/* =========================================================
   TOURNAMENT REWARDS
========================================================= */

function bindTournamentEvents(){

window.addEventListener(
"bx:tournament-win",
e=>{

const amount=
Number(
e.detail?.reward||0
);

if(
amount<=0
){
return;
}

if(
window.BXRewards
){

BXRewards.addReward(
amount,
"tournament",
"Tournament Reward"
);

}

}
);

}

/* =========================================================
   ACHIEVEMENTS
========================================================= */

function bindAchievementEvents(){

window.addEventListener(
"bx:tip-sent",
()=>{

if(
window.BXAchievements
){

BXAchievements.unlock(
"social_tipper"
);

}

}
);

window.addEventListener(
"bx:tip-received",
()=>{

if(
window.BXAchievements
){

BXAchievements.unlock(
"community_member"
);

}

}
);

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
"rain:create",
payload=>{

BXRain.createRain(
payload.amount,
payload.seconds
);

}
);

BXSocket.on(
"tip:send",
payload=>{

BXTips.receiveTip(
payload.user,
payload.amount,
payload.asset
);

}
);

}

/* =========================================================
   AUTO RAIN
========================================================= */

function autoRainLoop(){

setInterval(()=>{

const vip=
window.BXVIP
?.getState();

if(
!vip
){
return;
}

if(
vip.level<3
){
return;
}

const elapsed=
Date.now()-
state.lastRain;

if(
elapsed<
3600000
){
return;
}

createVIPRain();

},60000);

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindVIPEvents();

bindChatEvents();

bindTournamentEvents();

bindAchievementEvents();

bindSocket();

autoRainLoop();

console.log(
"🚀 BLOXIO VIP RAIN MANAGER READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

createVIPRain,

parseChatCommand

};

})();

document.readyState==="loading"
?document.addEventListener(
"DOMContentLoaded",
()=>BXVIPRainManager.init()
)
:BXVIPRainManager.init();
