/* =========================================================
   FILE: public/bx/notifications.js
   BLOXIO NOTIFICATIONS UI 2026
========================================================= */

window.BXNotifications=(function(){

let currentFilter="all";

/* =========================================================
   ELEMENTS
========================================================= */

const els={

badge:()=>document.getElementById("notificationBadge"),

count:()=>document.getElementById("notificationCount"),

list:()=>document.getElementById("notificationList"),

empty:()=>document.getElementById("notificationEmpty"),

clear:()=>document.getElementById("notificationClear"),

readAll:()=>document.getElementById("notificationReadAll"),

search:()=>document.getElementById("notificationSearch"),

filters:()=>document.querySelectorAll("[data-notification-filter]")

};

/* =========================================================
   ICONS
========================================================= */

const ICONS={

system:"⚙️",
success:"✅",
info:"ℹ️",
warning:"⚠️",
error:"❌",
wallet:"💳",
swap:"🔄",
market:"📈",
casino:"🎰",
mining:"⛏️",
airdrop:"🎁",
auth:"🔐",
vip:"👑"

};

/* =========================================================
   FORMAT
========================================================= */

function formatTime(timestamp){

const diff=
Math.floor(
(Date.now()-timestamp)/1000
);

if(diff<60){
return`${diff}s`;
}

if(diff<3600){
return`${Math.floor(diff/60)}m`;
}

if(diff<86400){
return`${Math.floor(diff/3600)}h`;
}

return`${Math.floor(diff/86400)}d`;

}

/* =========================================================
   FILTER
========================================================= */

function setFilter(type){

currentFilter=type;

render();

document
.querySelectorAll(
"[data-notification-filter]"
)
.forEach(btn=>{

btn.classList.toggle(
"active",
btn.dataset.notificationFilter===type
);

});

}

/* =========================================================
   SEARCH
========================================================= */

function getSearch(){

const input=
els.search();

if(!input){
return"";
}

return input.value
.toLowerCase()
.trim();

}

/* =========================================================
   DATA
========================================================= */

function getNotifications(){

if(
!window.NotificationFeed
){

return[];

}

const state=
NotificationFeed.getState();

let rows=
state.notifications||[];

if(
currentFilter!=="all"
){

rows=
rows.filter(item=>
item.type===currentFilter
);

}

const search=
getSearch();

if(search){

rows=
rows.filter(item=>

item.title
.toLowerCase()
.includes(search)

||

item.message
.toLowerCase()
.includes(search)

);

}

return rows;

}

/* =========================================================
   CARD
========================================================= */

function createCard(item){

return`
<div class="notification-card ${item.read?"read":"unread"}" data-id="${item.id}">
<div class="notification-icon">
${ICONS[item.type]||"🔔"}
</div>
<div class="notification-body">
<div class="notification-head">
<div class="notification-title">
${item.title}
</div>
<div class="notification-time">
${formatTime(item.createdAt)}
</div>
</div>
<div class="notification-message">
${item.message}
</div>
</div>
<div class="notification-actions">
<button class="notification-read" data-read="${item.id}">
✓
</button>
<button class="notification-delete" data-delete="${item.id}">
✕
</button>
</div>
</div>
`;

}

/* =========================================================
   RENDER
========================================================= */

function render(){

if(
!window.NotificationFeed
){
return;
}

const rows=
getNotifications();

const list=
els.list();

const empty=
els.empty();

const state=
NotificationFeed.getState();

if(
els.badge()
){

els.badge().textContent=
state.unread;

}

if(
els.count()
){

els.count().textContent=
`${state.total}`;

}

if(
!list
){
return;
}

if(
rows.length===0
){

list.innerHTML="";

if(empty){

empty.style.display="flex";

}

return;

}

if(empty){

empty.style.display="none";

}

list.innerHTML=
rows.map(
createCard
).join("");

bindCardActions();

}

/* =========================================================
   ACTIONS
========================================================= */

function bindCardActions(){

document
.querySelectorAll(
"[data-read]"
)
.forEach(btn=>{

btn.onclick=()=>{

NotificationFeed.markRead(
btn.dataset.read
);

render();

};

});

document
.querySelectorAll(
"[data-delete]"
)
.forEach(btn=>{

btn.onclick=()=>{

NotificationFeed.remove(
btn.dataset.delete
);

render();

};

});

}

/* =========================================================
   CLEAR
========================================================= */

function clearAll(){

NotificationFeed.clear();

render();

}

/* =========================================================
   READ ALL
========================================================= */

function readAll(){

NotificationFeed.markAllRead();

render();

}

/* =========================================================
   FILTER EVENTS
========================================================= */

function bindFilters(){

els.filters()
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

setFilter(
btn.dataset.notificationFilter
);

}
);

});

}

/* =========================================================
   SEARCH EVENTS
========================================================= */

function bindSearch(){

const input=
els.search();

if(!input){
return;
}

input.addEventListener(
"input",
render
);

}

/* =========================================================
   BUTTONS
========================================================= */

function bindButtons(){

els.clear()
?.addEventListener(
"click",
clearAll
);

els.readAll()
?.addEventListener(
"click",
readAll
);

}

/* =========================================================
   FEED
========================================================= */

function bindFeed(){

if(
!window.NotificationFeed
){
return;
}

NotificationFeed.subscribe(
()=>{

render();

}
);

}

/* =========================================================
   QUICK API
========================================================= */

function success(
title,
message
){

NotificationFeed.add({
type:"success",
title,
message
});

}

function error(
title,
message
){

NotificationFeed.add({
type:"error",
title,
message
});

}

function info(
title,
message
){

NotificationFeed.add({
type:"info",
title,
message
});

}

function warning(
title,
message
){

NotificationFeed.add({
type:"warning",
title,
message
});

}

/* =========================================================
   INIT
========================================================= */

function init(){

bindFilters();

bindSearch();

bindButtons();

bindFeed();

render();

console.log(
"🔔 BLOXIO NOTIFICATIONS UI READY"
);

}

/* =========================================================
   EXPORTS
========================================================= */

return{

init,

render,

success,

error,

info,

warning,

setFilter,

clearAll,

readAll

};

})();

/* =========================================================
   AUTO INIT
========================================================= */

document.readyState==="loading"

?document.addEventListener(
"DOMContentLoaded",
()=>BXNotifications.init()
)

:BXNotifications.init();
