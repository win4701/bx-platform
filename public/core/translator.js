/*=========================================================
FILE: public/core/translator.js
BLOXIO TRANSLATOR ENGINE V4
REQUIRES:
- BXLanguage
=========================================================*/

"use strict";

window.BXTranslator=(function(){

let observer=null;

/*=========================================================
HELPERS
=========================================================*/
function text(key){

return BXLanguage.get(key);

}

function applyText(node){

const key=
node.dataset.langKey;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.textContent=
value;

}

}

function applyHTML(node){

const key=
node.dataset.langHtml;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.innerHTML=
value;

}

}

function applyPlaceholder(node){

const key=
node.dataset.langPlaceholder;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.placeholder=
value;

}

}

function applyTitle(node){

const key=
node.dataset.langTitle;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.title=
value;

}

}

function applyValue(node){

const key=
node.dataset.langValue;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.value=
value;

}

}

function applyAria(node){

const key=
node.dataset.langAria;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.setAttribute(
"aria-label",
value
);

}

}

function applyAlt(node){

const key=
node.dataset.langAlt;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.alt=
value;

}

}

function applyDataset(node){

const key=
node.dataset.langDataset;

if(!key)
return;

const value=
text(key);

if(
value!==undefined
){

node.dataset.translation=
value;

}

}

/*=========================================================
NODE
=========================================================*/
function translateNode(node){

if(
!node||
node.nodeType!==1
){
return;
}

applyText(node);

applyHTML(node);

applyPlaceholder(node);

applyTitle(node);

applyValue(node);

applyAria(node);

applyAlt(node);

applyDataset(node);

}

/*=========================================================
ALL
=========================================================*/
function translate(root=document){

root
.querySelectorAll(
"[data-lang-key]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-html]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-placeholder]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-title]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-value]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-aria]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-alt]"
)
.forEach(
translateNode
);

root
.querySelectorAll(
"[data-lang-dataset]"
)
.forEach(
translateNode
);

}

/*=========================================================
LIVE DOM
=========================================================*/
function observe(){

if(observer)
return;

observer=
new MutationObserver(
mutations=>{

for(
const mutation
of mutations
){

mutation
.addedNodes
.forEach(node=>{

if(
node.nodeType!==1
){
return;
}

translateNode(
node
);

translate(
node
);

});

}

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
FORMATTERS
=========================================================*/
function currency(
amount,
currency="USD"
){

try{

return new Intl.NumberFormat(

BXLanguage.getCurrent(),

{

style:"currency",

currency

}

).format(amount);

}catch{

return amount;

}

}

function number(value){

try{

return new Intl.NumberFormat(

BXLanguage.getCurrent()

).format(value);

}catch{

return value;

}

}

function percent(value){

try{

return new Intl.NumberFormat(

BXLanguage.getCurrent(),

{

style:"percent",

minimumFractionDigits:2

}

).format(value);

}catch{

return value;

}

}

function date(value){

try{

return new Intl.DateTimeFormat(

BXLanguage.getCurrent(),

{

dateStyle:"medium",

timeStyle:"short"

}

).format(
new Date(value)
);

}catch{

return value;

}

}

/*=========================================================
MANUAL
=========================================================*/
function register(
selector,
callback
){

document
.querySelectorAll(
selector
)
.forEach(node=>{

callback(
node,
text
);

});

}

/*=========================================================
REFRESH
=========================================================*/
function refresh(){

translate();

}

/*=========================================================
EVENTS
=========================================================*/
function bind(){

window.addEventListener(

"bx:language-change",

()=>{

refresh();

}

);

}

/*=========================================================
INIT
=========================================================*/
function init(){

translate();

observe();

bind();

console.log(
"🌍 BX Translator Ready"
);

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

translate,

translateNode,

refresh,

register,

text,

currency,

number,

percent,

date

};

})();

/*=========================================================
BOOT
=========================================================*/
document.addEventListener(
"DOMContentLoaded",
()=>{

BXTranslator.init();

});
