/* =========================================================
BLOXIO STATE ENGINE V5
ENTERPRISE STATE SYSTEM
========================================================= */

"use strict";

window.STATE=(function(){

const VERSION="5.0.0";

const STORAGE_KEY="BX_STATE";

const listeners=new Map();

const middleware=[];

let saveTimer=null;

const defaults=()=>({

meta:{

version:VERSION,

booted:false,

updatedAt:Date.now()

},

user:null,

wallet:{

balance:0,

currency:"USD",

transactions:[]

},

market:{

prices:{},

favorites:[],

lastSync:0

},

mining:{

active:false,

subscription:null,

hashrate:0,

reward:0

},

casino:{

games:{},

history:[]

},

airdrop:{

reward:0,

claimed:false

},

ui:{

view:"wallet",

theme:"dark",

sidebar:false,

loading:false,

mobile:false

},

system:{

online:navigator.onLine,

ws:false,

latency:0

}

});

let data=hydrate();

/* =====================================================
HYDRATE
===================================================== */

function hydrate(){

try{

const raw=

localStorage.getItem(
STORAGE_KEY
);

if(!raw){

return defaults();

}

const parsed=

JSON.parse(raw);

return merge(

defaults(),
parsed

);

}catch(e){

console.error(
"STATE LOAD",
e
);

return defaults();

}

}

/* =====================================================
MERGE
===================================================== */

function merge(a,b){

for(const k in b){

if(

typeof b[k]==="object"

&&

b[k]

&&

!Array.isArray(b[k])

){

a[k]=merge(

a[k]||{},
b[k]

);

}else{

a[k]=b[k];

}

}

return a;

}

/* =====================================================
PATH
===================================================== */

function get(path){

if(!path){

return data;

}

return path
.split(".")
.reduce(

(o,k)=>o?.[k],

data

);

}

function set(path,value){

const keys=

path.split(".");

let obj=data;

for(

let i=0;

i<keys.length-1;

i++

){

const key=keys[i];

if(

typeof obj[key]
!=="object"

||

!obj[key]

){

obj[key]={};

}

obj=obj[key];

}

const last=

keys.at(-1);

const old=

obj[last];

if(

Object.is(
old,
value
)

){

return;

}

obj[last]=value;

data.meta.updatedAt=

Date.now();

runMiddleware(

path,
value,
old

);

notify(

path,
value,
old

);

persist();

}

/* =====================================================
UPDATE
===================================================== */

function update(

path,
fn

){

const current=

get(path);

set(

path,

fn(current)

);

}

/* =====================================================
BATCH
===================================================== */

function batch(fn){

try{

fn();

persist();

}catch(e){

console.error(

"BATCH",

e

);

}

}

/* =====================================================
SUBSCRIBE
===================================================== */

function subscribe(

path,
callback

){

if(

!listeners.has(path)

){

listeners.set(

path,

new Set()

);

}

listeners
.get(path)
.add(callback);

return()=>{

listeners
.get(path)
?.delete(callback);

};

}

/* =====================================================
NOTIFY
===================================================== */

function notify(

path,
value,
old

){

listeners.forEach(

(set,key)=>{

if(

path===key

||

path.startsWith(

key+"."

)

){

set.forEach(

fn=>{

try{

fn(

value,
old,
path

);

}catch(e){

console.error(

"STATE LISTENER",

e

);

}

}

);

}

}

);

}

/* =====================================================
MIDDLEWARE
===================================================== */

function use(fn){

middleware.push(fn);

}

function runMiddleware(

path,
value,
old

){

middleware.forEach(

fn=>{

try{

fn({

path,

value,

old,

state:data

});

}catch(e){

console.error(

"MIDDLEWARE",

e

);

}

}

);

}

/* =====================================================
PERSIST
===================================================== */

function persist(){

clearTimeout(

saveTimer

);

saveTimer=

setTimeout(()=>{

try{

localStorage.setItem(

STORAGE_KEY,

JSON.stringify(data)

);

}catch(e){

console.error(

"SAVE",

e

);

}

},150);

}

/* =====================================================
RESET
===================================================== */

function reset(){

data=defaults();

persist();

notify(

"*",

data,
null

);

}

/* =====================================================
SYNC
===================================================== */

window.addEventListener(

"storage",

e=>{

if(

e.key
!==STORAGE_KEY

)return;

try{

data=hydrate();

notify(

"*",

data,
null

);

}catch{}

}

);

/* =====================================================
ONLINE
===================================================== */

window.addEventListener(

"online",

()=>{

set(

"system.online",

true

);

}

);

window.addEventListener(

"offline",

()=>{

set(

"system.online",

false

);

}

);

/* =====================================================
BOOT
===================================================== */

set(

"meta.booted",

true

);

return{

VERSION,

get,

set,

update,

batch,

subscribe,

reset,

use,

persist,

hydrate:()=>{

data=hydrate();

},

dump:()=>{

return structuredClone(

data

);

}

};

})();
