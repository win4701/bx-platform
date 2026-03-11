"use strict"

/* =========================================================
   BLOXIO CASINO ENGINE
   Compatible with index.html casino layout
========================================================= */

import {API,STATE,CONFIG,UI,$,$$} from "./app.js"

/* ================= MODULE ================= */

window.CASINO = {

socket:null,

currentGame:null,

seed:localStorage.getItem("casino_seed") || Date.now().toString(),

nonce:0,

games:[
"coinflip",
"dice",
"limbo",
"crash",
"slot",
"plinko",
"hilo",
"airboss",
"banana_farm",
"fruit_party",
"birds_party",
"blackjack_fast"
],

/* ================= INIT ================= */

async init(){

this.bindGameGrid()

this.connectSocket()

this.startBigWins()

localStorage.setItem("casino_seed",this.seed)

},

/* ================= GAME GRID ================= */

bindGameGrid(){

$$(".casino-grid .game")
.forEach(card=>{

card.onclick=()=>{

const game=card.dataset.game

this.openGame(game)

}

})

},

/* ================= OPEN GAME ================= */

openGame(game){

this.currentGame=game

const box=$("casinoGameBox")

if(!box) return

box.innerHTML=`

<div class="casino-panel">

<h3>${this.formatName(game)}</h3>

<input id="casinoBet" type="number" placeholder="Bet BX">

<div class="casino-controls">

<button data-m="1">x1</button>
<button data-m="2">x2</button>
<button data-m="5">x5</button>
<button data-m="10">x10</button>

</div>

<button id="casinoPlay">Play</button>

</div>

`

this.bindGameControls()

},

bindGameControls(){

const betInput=$("#casinoBet")

$$(".casino-controls button")
.forEach(b=>{

b.onclick=()=>{

if(!betInput) return

const m=b.dataset.m

betInput.value = Number(betInput.value||0) * Number(m)

}

})

const play=$("#casinoPlay")

if(play){

play.onclick=()=>{

const bet=$("#casinoBet")?.value

if(!bet || Number(bet)<=0){

UI.toast("Invalid bet")

return

}

this.play(this.currentGame,bet)

}

}

},

/* ================= PLAY ================= */

play(game,bet){

if(!this.socket){

UI.toast("Casino disconnected")

return

}

const payload={

action:"play",
game,
bet,
seed:this.seed,
nonce:this.nonce++

}

this.socket.send(JSON.stringify(payload))

this.playSound("click")

},

/* ================= SOCKET ================= */

connectSocket(){

this.socket=new WebSocket(CONFIG.WS+"/ws/casino")

this.socket.onopen=()=>{

console.log("Casino connected")

}

this.socket.onmessage=e=>{

const data=JSON.parse(e.data)

this.handleResult(data)

}

this.socket.onclose=()=>{

setTimeout(()=>this.connectSocket(),2000)

}

},

/* ================= RESULT ================= */

handleResult(res){

if(!res) return

if(res.win){

UI.toast("WIN "+res.payout+" BX")

this.playSound("win")

}else{

UI.toast("LOSE")

this.playSound("lose")

}

this.updateBalance()

this.renderGameResult(res)

},

renderGameResult(res){

const box=$("casinoGameBox")

if(!box) return

const result=document.createElement("div")

result.className="casino-result"

result.innerHTML=`

<span class="${res.win?'win':'lose'}">
${res.win?'WIN':'LOSE'}
</span>

<div>Result: ${res.result || "-"}</div>

`

box.appendChild(result)

},

/* ================= BALANCE UPDATE ================= */

async updateBalance(){

try{

const res=await API.get("/finance/wallet")

if(!res) return

STATE.balances=res

CONFIG.COINS.forEach(c=>{

const el=$("bal-"+c.toLowerCase())

if(el){

el.textContent=Number(res[c]||0).toFixed(4)

}

})

}catch(e){

console.warn("wallet refresh failed")

}

},

/* ================= BIG WINS ================= */

startBigWins(){

const ws=new WebSocket(CONFIG.WS+"/ws/big-wins")

ws.onmessage=e=>{

const data=JSON.parse(e.data)

this.addBigWin(data)

}

},

addBigWin(data){

const track=$("bigWinsList")

if(!track) return

const row=document.createElement("div")

row.className="big-win-row"

row.innerHTML=`

<span class="user">${data.user}</span>
<span class="game">${this.formatName(data.game)}</span>
<span class="amount">+${data.amount} BX</span>

`

track.prepend(row)

if(track.children.length>20)
track.removeChild(track.lastChild)

},

/* ================= SOUND ================= */

playSound(type){

if(document.body.dataset.sound!=="on")
return

const el=$("#snd-"+type)

if(!el) return

try{
el.currentTime=0
el.play()
}catch{}

},

/* ================= UTILS ================= */

formatName(name){

return name
.replace(/_/g," ")
.replace(/\b\w/g,l=>l.toUpperCase())

}

}
