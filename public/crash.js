"use strict";

/* =========================================
STATE
========================================= */

let crashWS = null;
let points = [];
let running = false;
let autoCashout = null;
let reconnectTimer = null;

let ctx = null;
let canvas = null;

/* =========================================
SAFE DOM GETTER
========================================= */

function el(id){
  return document.getElementById(id);
}

/* =========================================
INIT CANVAS (DYNAMIC SAFE)
========================================= */

function initCanvas(){

  canvas = el("crashChart");

  if(!canvas) return false;

  ctx = canvas.getContext("2d");

  return true;
}

/* =========================================
DRAW (SMOOTH)
========================================= */

function draw(){

  if(!ctx || !canvas) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.beginPath();

  points.forEach((p,i)=>{
    const x = i * 6;
    const y = canvas.height - Math.log(p) * 120;

    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.stroke();

  if(running) requestAnimationFrame(draw);
}

/* =========================================
UPDATE GRAPH
========================================= */

function update(m){

  const mult = el("crashMultiplier");

  if(mult){
    mult.innerText = m.toFixed(2) + "x";
  }

  points.push(m);

  if(points.length > 120){
    points.shift();
  }

  /* AUTO CASHOUT */

  if(autoCashout && m >= autoCashout){
    cashout();
    autoCashout = null;
  }
}

/* =========================================
STATE HANDLERS
========================================= */

function start(){

  points = [];
  running = true;

  const status = el("crashStatus");
  const mult = el("crashMultiplier");

  if(status) status.innerText = "Running";
  if(mult) mult.style.color = "#22c55e";

  clearPlayers();

  draw();
}

function end(crash){

  running = false;

  const status = el("crashStatus");
  const mult = el("crashMultiplier");

  if(status) status.innerText = "Crashed";

  if(mult){
    mult.innerText = crash.toFixed(2) + "x 💥";
    mult.style.color = "#ef4444";
  }
}

/* =========================================
PLAYERS UI
========================================= */

function clearPlayers(){
  const box = el("crashPlayers");
  if(box) box.innerHTML = "";
}

function addPlayer(user, bet){

  const box = el("crashPlayers");
  if(!box) return;

  const elx = document.createElement("div");

  elx.className = "player";
  elx.innerText = `${user} → ${bet} BX`;

  box.prepend(elx);
}

function playerWin(user, payout){

  const box = el("crashPlayers");
  if(!box) return;

  const elx = document.createElement("div");

  elx.className = "player win";
  elx.innerText = `🚀 ${user} WON ${payout.toFixed(2)} BX`;

  elx.style.animation = "pop 0.3s ease";

  box.prepend(elx);
}

/* =========================================
BIG WINS
========================================= */

function bigWin(user, amount){

  const box = el("crashPlayers");
  if(!box) return;

  const elx = document.createElement("div");

  elx.className = "player win";
  elx.innerText = `💰 BIG WIN ${user} +${amount.toFixed(2)} BX`;

  elx.style.fontWeight = "bold";
  elx.style.color = "#facc15";

  box.prepend(elx);
}

/* =========================================
WS CONNECT (AUTO RECONNECT)
========================================= */

function connect(){

  if(crashWS && crashWS.readyState === 1) return;

  const url = location.protocol === "https:"
    ? "wss://" + location.host
    : "ws://" + location.host;

  crashWS = new WebSocket(url);

  crashWS.onopen = ()=>{

    console.log("🔥 Crash WS connected");

    crashWS.send(JSON.stringify({
      type:"subscribe",
      channel:"casino"
    }));

  };

  crashWS.onmessage = (e)=>{

    const msg = JSON.parse(e.data);

    switch(msg.type){

      case "crash_start":
        start();
        break;

      case "crash_tick":
        update(msg.multiplier);
        break;

      case "crash_end":
        end(msg.crash);
        break;

      case "player_join":
        addPlayer(msg.user, msg.bet);
        break;

      case "cashout":
        playerWin(msg.user, msg.payout);
        break;

      case "big_win":
        bigWin(msg.user, msg.amount);
        break;
    }

  };

  crashWS.onclose = ()=>{

    console.log("❌ WS disconnected");

    reconnectTimer = setTimeout(connect, 2000);

  };

}

/* =========================================
API ACTIONS
========================================= */

async function bet(){

  const value = Number(el("crashBet")?.value || 0);

  autoCashout = Number(el("autoCashout")?.value || 0);

  if(value <= 0) return;

  await fetch("/api/v1/casino/crash/join",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+localStorage.getItem("token")
    },
    body:JSON.stringify({ bet:value })
  });

}

async function cashout(){

  await fetch("/api/v1/casino/crash/cashout",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+localStorage.getItem("token")
    }
  });

}

/* =========================================
INIT
========================================= */

window.initCrash = function(){

  if(!initCanvas()){
    console.error("Crash canvas not ready");
    return;
  }

  connect();

  const betBtn = el("crashBetBtn");
  const cashBtn = el("crashCashoutBtn");

  if(betBtn) betBtn.onclick = bet;
  if(cashBtn) cashBtn.onclick = cashout;

};
