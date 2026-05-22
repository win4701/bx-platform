/* =========================================================
BLOXIO API ENGINE V6
ENTERPRISE NETWORK LAYER
========================================================= */

"use strict";

(function(){

/* =====================================================
CONFIG
===================================================== */

const CONFIG={

BASE:

location.hostname==="localhost"

?

"http://localhost:3000/api"

:

location.origin+"/api",

TIMEOUT:12000,

RETRIES:3,

BACKOFF:500,

CACHE:20000,

QUEUE:4

};

/* =====================================================
STATE
===================================================== */

const cache=new Map();

const pending=new Map();

const listeners=new Map();

const controllers=new Set();

const queue=[];

let active=0;

const metrics={

success:0,

failed:0,

network:0,

cached:0

};

/* =====================================================
BUS
===================================================== */

function emit(

event,
payload

){

(listeners.get(event)||[])
.forEach(fn=>{

try{

fn(payload);

}catch(e){

console.warn(e);

}

});

}

function on(

event,
fn

){

if(

!listeners.has(event)

){

listeners.set(

event,
[]

);

}

listeners
.get(event)
.push(fn);

}

/* =====================================================
TOKEN
===================================================== */

function token(){

return localStorage
.getItem(

"token"

);

}

/* =====================================================
HEADERS
===================================================== */

function headers(extra={}){

return{

"Content-Type":

"application/json",

...(token()

?{

Authorization:

`Bearer ${token()}`

}

:{}),

...extra

};

}

/* =====================================================
QUEUE
===================================================== */

function enqueue(fn){

return new Promise(

(resolve,reject)=>{

queue.push({

fn,

resolve,

reject

});

pump();

}

);

}

function pump(){

if(

active>=CONFIG.QUEUE

)return;

const job=

queue.shift();

if(!job)return;

active++;

job.fn()

.then(job.resolve)

.catch(job.reject)

.finally(()=>{

active--;

pump();

});

}

/* =====================================================
CACHE
===================================================== */

function key(

url,
opt

){

return JSON.stringify({

url,

method:

opt.method||

"GET",

body:

opt.body||

null

});

}

function cached(k){

const c=

cache.get(k);

if(!c)return null;

if(

Date.now()

>

c.expire

){

cache.delete(k);

return null;

}

metrics.cached++;

return c.value;

}

/* =====================================================
FETCH
===================================================== */

async function request(

url,
opt={}

){

const method=

opt.method||

"GET";

const k=

key(url,opt);

if(

method==="GET"

){

const hit=

cached(k);

if(hit){

return hit;

}

}

if(

pending.has(k)

){

return pending.get(k);

}

const promise=

enqueue(

()=>attempt(

url,
opt

)

);

pending.set(

k,
promise

);

try{

const res=

await promise;

if(

method==="GET"

&&

!res.error

){

cache.set(

k,

{

value:res,

expire:

Date.now()

+

CONFIG.CACHE

}

);

}

return res;

}finally{

pending.delete(k);

}

}

/* =====================================================
RETRY
===================================================== */

async function attempt(

url,
opt

){

let tries=0;

while(

tries<=

CONFIG.RETRIES

){

const res=

await raw(

url,
opt

);

if(

!res.error

){

metrics.success++;

return res;

}

tries++;

await wait(

CONFIG.BACKOFF
*tries

);

}

metrics.failed++;

return{

error:

"retry_failed"

};

}

/* =====================================================
RAW
===================================================== */

async function raw(

url,
opt

){

const controller=

new AbortController();

controllers.add(

controller

);

const timer=

setTimeout(

()=>{

controller.abort();

},

CONFIG.TIMEOUT

);

try{

const res=

await fetch(

CONFIG.BASE
+url,

{

method:

opt.method||

"GET",

headers:

headers(

opt.headers

),

credentials:

"include",

signal:

controller.signal,

body:

opt.body

}

);

clearTimeout(

timer

);

controllers.delete(

controller

);

let data=null;

try{

data=

await res.json();

}catch{}

if(

res.status===401

){

localStorage
.removeItem(

"token"

);

emit(

"auth:logout"

);

return{

error:

"unauthorized"

};

}

if(

!res.ok

){

emit(

"api:error",

{

url,

status:

res.status

}

);

return{

error:

data?.error||

"request_failed"

};

}

return data;

}catch(e){

clearTimeout(

timer

);

controllers.delete(

controller

);

metrics.network++;

if(

e.name===

"AbortError"

){

return{

error:

"timeout"

};

}

return{

error:

"network"

};

}

}

/* =====================================================
UTIL
===================================================== */

function wait(ms){

return new Promise(

r=>setTimeout(r,ms)

);

}

/* =====================================================
SYNC
===================================================== */

function syncAll(){

wallet();

mining();

market();

airdrop();

}

/* =====================================================
API
===================================================== */

function get(url){

return request(url);

}

function post(

url,
body={}

){

return request(

url,

{

method:"POST",

body:

JSON.stringify(

body

)

}

);

}

function put(

url,
body={}

){

return request(

url,

{

method:"PUT",

body:

JSON.stringify(body)

}

);

}

function del(url){

return request(

url,

{

method:

"DELETE"

}

);

}

/* =====================================================
MODULES
===================================================== */

function wallet(){

return get(

"/wallet"

);

}

function market(){

return get(

"/market"

);

}

function mining(){

return get(

"/mining/status"

);

}

function casino(){

return get(

"/casino"

);

}

function airdrop(){

return get(

"/airdrop/status"

);

}

/* =====================================================
CANCEL
===================================================== */

function cancelAll(){

controllers
.forEach(c=>{

c.abort();

});

controllers.clear();

}

/* =====================================================
EXPORT
===================================================== */

window.API={

get,

post,

put,

delete:del,

wallet,

market,

mining,

casino,

airdrop,

syncAll,

on,

emit,

cancelAll,

metrics

};

})();
