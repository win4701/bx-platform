/*=========================================================
FILE: public/core/language.js
BLOXIO LANGUAGE ENGINE V4
=========================================================*/

"use strict";

window.BXLanguage=(function(){

const STORAGE_KEY="bx_language";

const DEFAULT_LANG="EN";

const SUPPORTED=[

"EN",
"AR",
"FR",
"ES",
"DE",
"RU",
"TR",
"ZH",
"JA"

];

const RTL_LANGS=[

"AR"

];

let current=DEFAULT_LANG;

let dictionary={};

let loaded=false;

/*=========================================================
HELPERS
=========================================================*/
function normalize(lang){

return String(
lang||DEFAULT_LANG
)
.toUpperCase();

}

function isSupported(lang){

return SUPPORTED.includes(
normalize(lang)
);

}

function isRTL(lang){

return RTL_LANGS.includes(
normalize(lang)
);

}

/*=========================================================
STORAGE
=========================================================*/
function save(lang){

localStorage.setItem(
STORAGE_KEY,
lang
);

}

function loadSaved(){

const saved=
localStorage.getItem(
STORAGE_KEY
);

if(
saved&&
isSupported(saved)
){

current=
normalize(saved);

}

}

/*=========================================================
LOCALE
=========================================================*/
async function loadLocale(lang){

lang=
normalize(lang);

if(
!isSupported(lang)
){

lang=
DEFAULT_LANG;

}

try{

const response=
await fetch(
`/locales/${lang.toLowerCase()}.json`,
{
cache:"no-cache"
}
);

if(
!response.ok
){

throw new Error(
`Locale ${lang}`
);

}

dictionary=
await response.json();

current=lang;

save(lang);

applyDirection();

translatePage();

emit(
"bx:language-change",
{
lang
}
);

return true;

}catch(error){

console.error(
"[BXLanguage]",
error
);

if(
lang!==DEFAULT_LANG
){

return loadLocale(
DEFAULT_LANG
);

}

return false;

}

}

/*=========================================================
GET
=========================================================*/
function get(path){

if(!path)
return "";

const keys=
path.split(".");

let value=
dictionary;

for(
const key of keys
){

value=
value?.[key];

if(
value===undefined
){
break;
}

}

return value??
path;

}

/*=========================================================
TRANSLATE
=========================================================*/
function translatePage(){

document
.querySelectorAll(
"[data-lang-key]"
)
.forEach(node=>{

const key=
node.dataset.langKey;

node.textContent=
get(key);

});

document
.querySelectorAll(
"[data-lang-html]"
)
.forEach(node=>{

const key=
node.dataset.langHtml;

node.innerHTML=
get(key);

});

document
.querySelectorAll(
"[data-lang-placeholder]"
)
.forEach(node=>{

const key=
node.dataset.langPlaceholder;

node.placeholder=
get(key);

});

document
.querySelectorAll(
"[data-lang-title]"
)
.forEach(node=>{

const key=
node.dataset.langTitle;

node.title=
get(key);

});

document
.querySelectorAll(
"[data-lang-value]"
)
.forEach(node=>{

const key=
node.dataset.langValue;

node.value=
get(key);

});

}

/*=========================================================
RTL
=========================================================*/
function applyDirection(){

const rtl=
isRTL(current);

document.documentElement.lang=
current.toLowerCase();

document.documentElement.dir=
rtl
?"rtl"
:"ltr";

document.body.classList.toggle(
"rtl",
rtl
);

document.body.classList.toggle(
"ltr",
!rtl
);

}

/*=========================================================
EVENTS
=========================================================*/
function emit(
name,
detail={}
){

window.dispatchEvent(

new CustomEvent(
name,
{
detail
}
)

);

}

function bindLanguageButtons(){

document
.querySelectorAll(
"[data-lang]"
)
.forEach(button=>{

button.addEventListener(
"click",
()=>{

set(
button.dataset.lang
);

}
);

});

}

/*=========================================================
PUBLIC
=========================================================*/
async function set(lang){

lang=
normalize(lang);

if(
!isSupported(lang)
){
return false;
}

return await loadLocale(
lang
);

}

function getCurrent(){

return current;

}

function getDictionary(){

return dictionary;

}

function reload(){

return loadLocale(
current
);

}

/*=========================================================
AUTO
=========================================================*/
async function detectLanguage(){

const browser=

navigator.language
||
navigator.userLanguage
||
"en";

const code=
browser
.slice(0,2)
.toUpperCase();

if(
SUPPORTED.includes(
code
)
){

current=code;

}

}

/*=========================================================
INIT
=========================================================*/
async function init(){

await detectLanguage();

loadSaved();

await loadLocale(
current
);

bindLanguageButtons();

loaded=true;

console.log(
`🌍 BX Language Ready (${current})`
);

}

/*=========================================================
READY
=========================================================*/
function ready(){

return loaded;

}

/*=========================================================
EXPORTS
=========================================================*/
return{

init,

set,

reload,

ready,

get,

getCurrent,

getDictionary,

translatePage,

loadLocale,

supported:
SUPPORTED,

rtl:
RTL_LANGS

};

})();

/*=========================================================
BOOT
=========================================================*/
document.addEventListener(
"DOMContentLoaded",
()=>{

BXLanguage.init();

});
