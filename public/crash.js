let crashWS;
let crashPoints = [];

const canvas = document.getElementById("crashChart");
const ctx = canvas.getContext("2d");

/* ================= DRAW ================= */

function drawCrash(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.beginPath();

  crashPoints.forEach((p,i)=>{
    const x = i * 5;
    const y = canvas.height - (p * 20);

    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.strokeStyle = "#22c55e";
  ctx.stroke();
}

/* ================= UPDATE ================= */

function updateCrash(m){

  document.getElementById("crashMultiplier").innerText =
    m.toFixed(2) + "x";

  crashPoints.push(m);

  if(crashPoints.length > 100){
    crashPoints.shift();
  }

  drawCrash();
}

/* ================= START ================= */

function startCrashUI(){

  crashPoints = [];

  document.getElementById("crashMultiplier").style.color = "#22c55e";

}

/* ================= END ================= */

function endCrash(crash){

  document.getElementById("crashMultiplier").innerText =
    crash.toFixed(2) + "x 💥";

  document.getElementById("crashMultiplier").style.color = "#ef4444";

}

/* ================= WS ================= */

function connectCrashWS(){

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

    if(msg.type === "crash_start"){
      startCrashUI();
    }

    if(msg.type === "crash_tick"){
      updateCrash(msg.multiplier);
    }

    if(msg.type === "crash_end"){
      endCrash(msg.crash);
    }

  };

}

/* ================= ACTIONS ================= */

document.getElementById("crashBetBtn").onclick = async ()=>{

  await fetch("/api/v1/casino/crash/join",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+localStorage.getItem("token")
    },
    body:JSON.stringify({ bet:10 })
  });

};

document.getElementById("crashCashoutBtn").onclick = async ()=>{

  await fetch("/api/v1/casino/crash/cashout",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+localStorage.getItem("token")
    }
  });

};

/* ================= EXPORT ================= */

window.initCrash = function(){

  document.getElementById("crashGame").classList.remove("hidden");

  connectCrashWS();

};
