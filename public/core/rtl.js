/*=========================================================
FILE: public/core/rtl.js
BLOXIO RTL ENGINE V4
REQUIRES:
- BXLanguage
=========================================================*/

"use strict";

window.BXRTL=(function(){

const RTL_LANGS=[

"AR",
"FA",
"UR",
"HE"

];

const RTL_CLASSES=[

"rtl"

];

const LTR_CLASSES=[

"ltr"

];

/*=========================================================
HELPERS
=========================================================*/
function normalize(lang){

return String(
lang||"EN"
)
.toUpperCase();

}

function isRTL(lang){

return RTL_LANGS.includes(
normalize(lang)
);

}

function current(){

if(
window.BXLanguage
){

return BXLanguage
.getCurrent();

}

return "EN";

}

/*=========================================================
DOCUMENT
=========================================================*/
function applyDocument(lang){

const rtl=
isRTL(lang);

document.documentElement.dir=
rtl
?"rtl"
:"ltr";

document.documentElement.lang=
lang.toLowerCase();

document.body.classList.remove(
...RTL_CLASSES,
...LTR_CLASSES
);

document.body.classList.add(
rtl
?"rtl"
:"ltr"
);

}

/*=========================================================
SWAP ATTRIBUTES
=========================================================*/
function applyDirectionAttributes(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"[data-rtl]"
)
.forEach(node=>{

const rtlValue=
node.dataset.rtl;

const ltrValue=
node.dataset.ltr;

if(rtl){

if(rtlValue){

node.textContent=
rtlValue;

}

}else{

if(ltrValue){

node.textContent=
ltrValue;

}

}

});

}

/*=========================================================
ALIGNMENTS
=========================================================*/
function applyTextAlign(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"[data-auto-align]"
)
.forEach(node=>{

node.style.textAlign=
rtl
?"right"
:"left";

});

}

/*=========================================================
ICONS
=========================================================*/
function applyIconMirroring(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"[data-rtl-flip]"
)
.forEach(node=>{

node.style.transform=
rtl
?"scaleX(-1)"
:"scaleX(1)";

});

}

/*=========================================================
FLEX
=========================================================*/
function applyFlexDirection(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"[data-auto-flex]"
)
.forEach(node=>{

node.style.flexDirection=
rtl
?"row-reverse"
:"row";

});

}

/*=========================================================
GRID
=========================================================*/
function applyGridDirection(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"[data-auto-grid]"
)
.forEach(node=>{

node.style.direction=
rtl
?"rtl"
:"ltr";

});

}

/*=========================================================
INPUTS
=========================================================*/
function applyInputs(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"input,textarea"
)
.forEach(node=>{

node.dir=
rtl
?"rtl"
:"ltr";

});

}

/*=========================================================
TABLES
=========================================================*/
function applyTables(lang){

const rtl=
isRTL(lang);

document
.querySelectorAll(
"table"
)
.forEach(node=>{

node.dir=
rtl
?"rtl"
:"ltr";

});

}

/*=========================================================
LIVE DOM
=========================================================*/
function observe(){

const observer=

new MutationObserver(
()=>{

apply(
current()
);

}
);

observer.observe(
document.body,
{
childList:true,
subtree:true
}
);

}

/*=========================================================
APPLY
=========================================================*/
function apply(lang=current()){

lang=
normalize(lang);

applyDocument(
lang
);

applyDirectionAttributes(
lang
);

applyTextAlign(
lang
);

applyIconMirroring(
lang
);

applyFlexDirection(
lang
);

applyGridDirection(
lang
);

applyInputs(
lang
);

applyTables(
lang
);

window.dispatchEvent(

new CustomEvent(
"bx:rtl-change",
{
detail:{
lang,
rtl:isRTL(lang)
}
}
)

);

}

/*=========================================================
TOGGLE
=========================================================*/
function toggle(){

const lang=
current();

apply(
isRTL(lang)
?"EN"
:"AR"
);

}

/*=========================================================
BIND
=========================================================*/
function bind(){

window.addEventListener(

"bx:language-change",

event=>{

apply(
event.detail.lang
);

}

);

}

/*=========================================================
INIT
=========================================================*/
function init(){

bind();

apply(
current()
);

observe();

console.log(
"↔️ BX RTL Ready"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

apply,

toggle,

isRTL,

current,

languages:
RTL_LANGS

};

})();

/*=========================================================
BOOT
=========================================================*/
document.addEventListener(
"DOMContentLoaded",
()=>{

BXRTL.init();

});
