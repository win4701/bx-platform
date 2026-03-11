"use strict"

import {API,STATE,UI,$,$$} from "./app.js"

window.AIRDROP = {

status:null,

referralCode:null,

referralLink:null,

cooldown:false,

tasks:[],

leaderboard:[],

/* ================= INIT ================= */

async init(){

await this.loadStatus()

await this.loadReferral()

await this.loadTasks()

await this.loadLeaderboard()

this.bindButtons()

this.bindCopy()

this.checkReferralURL()

this.showReferralPopup()

},

/* ================= AIRDROP STATUS ================= */

async loadStatus(){

const res = await API.get("/airdrop/status")

if(!res) return

this.status = res

STATE.airdrop = res

this.renderStatus()

},

renderStatus(){

const el = $(".airdrop-status")

if(!el) return

const refs = this.status.referrals || 0
const reward = this.status.reward || 0.25
const claimed = this.status.claimed || 0

el.innerHTML = `
Referrals: ${refs} |
Reward: ${reward} BX |
Claimed: ${claimed}
`

},

/* ================= CLAIM ================= */

async claim(){

if(this.cooldown){

UI.toast("Please wait")
return

}

this.cooldown = true

UI.toast("Claiming reward...")

const res = await API.post("/airdrop/claim")

if(!res){

UI.toast("Claim failed")
this.cooldown=false
return

}

UI.toast("Airdrop claimed")

await this.loadStatus()

setTimeout(()=>{
this.cooldown=false
},3000)

},

/* ================= REFERRAL ================= */

async loadReferral(){

const res = await API.get("/airdrop/referral")

if(!res) return

this.referralCode = res.code

this.referralLink =
location.origin+"?ref="+this.referralCode

this.renderReferral()

},

renderReferral(){

const el = $(".ref-link")

if(!el) return

el.textContent = this.referralLink

},

/* ================= COPY LINK ================= */

bindCopy(){

const btn = $(".referral-box button")

if(!btn) return

btn.onclick = ()=>{

this.copyReferral()

}

},

copyReferral(){

if(!this.referralLink) return

navigator.clipboard.writeText(this.referralLink)

UI.toast("Referral copied")

},

/* ================= REF TRACK ================= */

checkReferralURL(){

const params = new URLSearchParams(location.search)

const ref = params.get("ref")

if(!ref) return

localStorage.setItem("bloxio_ref",ref)

},

/* ================= POPUP ================= */

showReferralPopup(){

const ref = localStorage.getItem("bloxio_ref")

if(!ref) return

const popup=document.createElement("div")

popup.className="ref-popup"

popup.innerHTML=`

<div class="popup-box">

<h3>Referral Bonus</h3>

<p>You joined using a referral link.</p>

<button id="closeRefPopup">
OK
</button>

</div>

`

document.body.appendChild(popup)

$("#closeRefPopup").onclick=()=>popup.remove()

},

/* ================= TASK SYSTEM ================= */

async loadTasks(){

const res = await API.get("/airdrop/tasks")

if(!res) return

this.tasks = res

this.renderTasks()

},

renderTasks(){

const box=$("#airdropTasks")

if(!box) return

box.innerHTML=""

this.tasks.forEach(task=>{

const row=document.createElement("div")

row.className="task-row"

row.innerHTML=`

<span>${task.name}</span>

<span>${task.reward} BX</span>

<button>Complete</button>

`

row.querySelector("button").onclick=()=>{

this.completeTask(task.id)

}

box.appendChild(row)

})

},

async completeTask(id){

UI.toast("Checking task...")

const res = await API.post("/airdrop/task",{id})

if(!res){

UI.toast("Task failed")
return

}

UI.toast("Task completed")

this.loadStatus()

},

/* ================= LEADERBOARD ================= */

async loadLeaderboard(){

const res = await API.get("/airdrop/leaderboard")

if(!res) return

this.leaderboard = res

this.renderLeaderboard()

},

renderLeaderboard(){

const el=$("#ref-leaderboard")

if(!el) return

el.innerHTML=""

this.leaderboard.forEach(user=>{

const li=document.createElement("li")

li.innerHTML=`
${user.user} — ${user.referrals}
`

el.appendChild(li)

})

},

/* ================= BUTTONS ================= */

bindButtons(){

const claimBtn=$("#claim-airdrop")

if(claimBtn){

claimBtn.onclick=()=>this.claim()

}

},

/* ================= DEBUG ================= */

debug(){

console.log("Airdrop status:",this.status)
console.log("Referral:",this.referralCode)
console.log("Tasks:",this.tasks)

}

}

/* ================= GLOBAL ================= */

window.copyReferral = ()=>AIRDROP.copyReferral()

window.claimAirdrop = ()=>AIRDROP.claim()
