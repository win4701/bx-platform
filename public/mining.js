"use strict"

import {API,STATE,UI,$,$$} from "./app.js"

window.MINING = {

activeCoin:"BX",

plans:{},

activePlans:[],

profitTimer:null,

/* ================= INIT ================= */

async init(){

this.bindTabs()

await this.loadPlans()

await this.loadUserPlans()

this.startProfitUpdater()

},

/* ================= COIN TABS ================= */

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

const coinPlans = this.plans[this.activeCoin]

if(!coinPlans) return

coinPlans.forEach(plan=>{

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

card.querySelector("button").onclick=()=>{

this.subscribe(plan)

}

grid.appendChild(card)

})

this.renderActivePlans()

},

/* ================= SUBSCRIBE ================= */

async subscribe(plan){

const amount = prompt(
`Enter amount (${plan.min} - ${plan.max})`
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

await this.loadUserPlans()

},

/* ================= USER PLANS ================= */

async loadUserPlans(){

const res = await API.get("/mining/status")

if(!res) return

this.activePlans = res

},

renderActivePlans(){

const grid = $("miningGrid")

this.activePlans
.filter(p=>p.coin===this.activeCoin)
.forEach(p=>{

const row=document.createElement("div")

row.className="user-mining"

row.innerHTML=`

<div class="plan-name">${p.plan}</div>

<div class="profit">

<span id="profit-${p.id}">
${p.profit}
</span>

${p.coin}

</div>

<button class="btn secondary">
Claim
</button>

`

row.querySelector("button").onclick=()=>{

this.claim(p.id)

}

grid.appendChild(row)

})

},

/* ================= CLAIM ================= */

async claim(id){

UI.toast("Claiming reward...")

const res = await API.post("/mining/claim",{id})

if(!res){

UI.toast("Claim failed")
return

}

UI.toast("Reward claimed")

await this.loadUserPlans()

},

/* ================= PROFIT LOOP ================= */

startProfitUpdater(){

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
