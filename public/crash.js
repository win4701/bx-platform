// ===============================
// CRASH ENGINE PRO 🔥
// ===============================

let crashWS = null;
let points = [];
let running = false;
let autoCashout = null;

let ctx = null;
let canvas = null;
let animationFrame = null;

/* ================= DOM ================= */

function el(id){
  return document.getElementById(id);
}

/* ================= CANVAS ================= */

function initCanvas(){

  canvas = el("crashChart");

  if(!canvas) return false;

  // responsive size
  canvas.width = canvas.offsetWidth;
  canvas.height = 250;

  ctx = canvas.getContext("2d");

  return true;
}

/* ================= DRAW ================= */

function draw(){

  if(!ctx || !canvas) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.beginPath();

  points.forEach((p,i)=>{
    const x = i * 5;
    const y = canvas.height - Math.log(p) * 100;

    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.stroke();

  if(running){
    animationFrame = requestAnimationFrame(draw);
  }
}

/* ================= UPDATE ================= */

function update(m){

  const mult = el("crashMultiplier");

  if(mult){
    mult.innerText = m.toFixed(2) + "x";
  }

  points.push(m);

  if(points.length > 150){
    points.shift();
  }

  if(autoCashout && m >= autoCashout){
    cashout();
    autoCashout = null;
  }
}

/* ================= STATES ================= */

function start(){

  points = [];
  running = true;

  const mult = el("crashMultiplier");

  if(mult){
    mult.style.color = "#22c55e";
    mult.innerText = "1.00x";
  }

  clearPlayers();

  draw();
}

function end(crash){

  running = false;

  cancelAnimationFrame(animationFrame);

  const mult = el("crashMultiplier");

  if(mult){
    mult.innerText = crash.toFixed(2) + "x 💥";
    mult.style.color = "#ef4444";
  }
}

/* ================= PLAYERS ================= */

function clearPlayers(){
  const box = el("crashPlayers");
  if(box) box.innerHTML = "";
}

function addPlayer(user, bet){

  const box = el("crashPlayers");
  if(!box) return;

  const row = document.createElement("div");
  row.className = "player";
  row.innerText = `${user} → ${bet} BX`;

  box.prepend(row);
}

function playerWin(user, payout){

  const box = el("crashPlayers");
  if(!box) return;

  const row = document.createElement("div");
  row.className = "player win";
  row.innerText = `🚀 ${user} ${payout.toFixed(2)} BX`;

  box.prepend(row);
}

/* ================= WS ================= */

function connect(){

  if(crashWS && crashWS.readyState === 1) return;

  crashWS = new WebSocket("wss://bx-9m3n.onrender.com");

  crashWS.onopen = ()=>{
    console.log("🔥 Crash WS connected");
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
    }

  };

  crashWS.onclose = ()=>{
    setTimeout(connect, 2000);
  };
}

/* ================= ACTIONS ================= */

async function bet(){

  const value = Number(el("crashBet")?.value || 0);

  autoCashout = Number(el("autoCashout")?.value || 0);

  if(value <= 0) return;

  await fetch("https://bx-9m3n.onrender.com/casino/crash/join",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+localStorage.getItem("token")
    },
    body:JSON.stringify({ bet:value })
  });

}

async function cashout(){

  await fetch("https://bx-9m3n.onrender.com/casino/crash/cashout",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+localStorage.getItem("token")
    }
  });

}

/* ================= CLEANUP ================= */

function stopCrash(){

  running = false;

  cancelAnimationFrame(animationFrame);

  if(crashWS){
    crashWS.close();
    crashWS = null;
  }
}

/* ================= INIT ================= */

window.initCrash = function(){

  if(!initCanvas()){
    console.error("Crash canvas missing");
    return;
  }

  connect();

  const betBtn = el("crashBetBtn");
  const cashBtn = el("crashCashoutBtn");

  if(betBtn) betBtn.onclick = bet;
  if(cashBtn) cashBtn.onclick = cashout;

};
