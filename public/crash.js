let crashWS;
let points = [];
let running = false;
let autoCashout = null;

const canvas = document.getElementById("crashChart");
const ctx = canvas.getContext("2d");

/* ================= SMOOTH DRAW ================= */

function draw(){

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

/* ================= UPDATE ================= */

function update(m){

  document.getElementById("crashMultiplier").innerText =
    m.toFixed(2) + "x";

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

/* ================= STATES ================= */

function start(){

  points = [];
  running = true;

  document.getElementById("crashStatus").innerText = "Running";
  document.getElementById("crashMultiplier").style.color = "#22c55e";

  draw();
}

function end(crash){

  running = false;

  document.getElementById("crashStatus").innerText = "Crashed";
  document.getElementById("crashMultiplier").innerText =
    crash.toFixed(2) + "x 💥";

  document.getElementById("crashMultiplier").style.color = "#ef4444";

}

/* ================= PLAYERS ================= */

function addPlayer(user, bet){

  const el = document.createElement("div");

  el.className = "player";
  el.innerText = `${user} → ${bet} BX`;

  document.getElementById("crashPlayers").prepend(el);
}

function playerWin(user, payout){

  const el = document.createElement("div");

  el.className = "player win";
  el.innerText = `${user} WON ${payout.toFixed(2)} BX`;

  document.getElementById("crashPlayers").prepend(el);
}

/* ================= WS ================= */

function connect(){

  if(crashWS) return;

  crashWS = new WebSocket("wss://api.bloxio.online");

  crashWS.onopen = ()=>{
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

    }

  };

}

/* ================= ACTIONS ================= */

async function bet(){

  const value = Number(document.getElementById("crashBet").value);

  autoCashout = Number(
    document.getElementById("autoCashout").value || 0
  );

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

/* ================= INIT ================= */

window.initCrash = function(){

  connect();

  document.getElementById("crashBetBtn").onclick = bet;
  document.getElementById("crashCashoutBtn").onclick = cashout;

};
