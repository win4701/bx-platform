"use strict"

import {API,STATE,UI,$,$$} from "./app.js"

window.MINING = {

coins:["BX","BNB","SOL"],

activeCoin:"BX",

plans:{},

active:[],

profitTimer:null,

/* ================= INIT ================= */

async init(){

this.bindTabs()

await this.loadPlans()

await this.loadActive()

this.startProfitLoop()

},

/* ================= COIN SWITCH ================= */

bindTabs(){

$$(".mining-tabs button").forEach(btn=>{

btn.onclick=()=>{

$$(".mining-tabs button")
.forEach(b=>b.classList.remove("active"))

btn.classList.add("active")

this.activeCoin = btn.dataset.coin

this.renderPlans()

}

})

},

/* ================= LOAD PLANS ================= */

async loadPlans(){

const res = await API.get("/mining/plans")

if(!res) return

this.plans = res

this.renderPlans()

},

/* ================= RENDER PLANS ================= */

renderPlans(){

const grid = $("miningGrid")

if(!grid) return

grid.innerHTML=""

const list = this.plans[this.activeCoin]

if(!list) return

list.forEach(plan=>{

const card=document.createElement("div")

card.className="min-card"

card.innerHTML=`

<h3>${plan.name}</h3>

<div class="roi">${plan.roi}%</div>

<ul>

<li>Time: ${plan.days} days</li>
<li>Min: ${plan.min} ${this.activeCoin}</li>
<li>Max: ${plan.max} ${this.activeCoin}</li>

</ul>

<button class="btn primary">Subscribe</button>

`

card.querySelector("button")
.onclick=()=>this.subscribe(plan)

grid.appendChild(card)

})

this.renderActive()

},

/* ================= SUBSCRIBE ================= */

async subscribe(plan){

const amount = prompt(
`Enter amount (${plan.min}-${plan.max})`
)

if(!amount) return

if(Number(amount) < plan.min){

UI.toast("Amount too small")
return

}

if(Number(amount) > plan.max){

UI.toast("Amount too large")
return

}

UI.toast("Starting mining...")

const res = await API.post("/mining/subscribe",{

coin:this.activeCoin,

plan:plan.id,

amount

})

if(!res){

UI.toast("Mining failed")
return

}

UI.toast("Mining started")

await this.loadActive()

},

/* ================= ACTIVE MINING ================= */

async loadActive(){

const res = await API.get("/mining/status")

if(!res) return

this.active = res

},

renderActive(){

const grid = $("miningGrid")

this.active
.filter(m=>m.coin===this.activeCoin)
.forEach(m=>{

const card=document.createElement("div")

card.className="user-mining"

card.innerHTML=`

<div class="plan-name">
${m.plan}
</div>

<div class="profit">

<span id="profit-${m.id}">
${m.profit}
</span>

${m.coin}

</div>

<button class="btn secondary">
Claim
</button>

`

card.querySelector("button")
.onclick=()=>this.claim(m.id)

grid.appendChild(card)

})

},

/* ================= CLAIM ================= */

async claim(id){

const res = await API.post("/mining/claim",{id})

if(!res){

UI.toast("Claim failed")
return

}

UI.toast("Rewards claimed")

await this.loadActive()

},

/* ================= PROFIT LOOP ================= */

startProfitLoop(){

if(this.profitTimer)
clearInterval(this.profitTimer)

this.profitTimer=setInterval(()=>{

this.updateProfits()

},10000)

},

/* ================= UPDATE PROFITS ================= */

async updateProfits(){

const res = await API.get("/mining/profits")

if(!res) return

res.forEach(p=>{

const el = $(`profit-${p.id}`)

if(el){

el.textContent = p.amount

}

})

}

}
