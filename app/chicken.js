let step=0, alive=true;
export function next(){
  if(!alive) return;
  step++;
  const p = 0.15 + step*0.04; // مخاطرة تصاعدية
  if(Math.random()<p){ alive=false; lose(); }
  else document.getElementById("step").innerText=step;
}
export function cashout(){
  if(!alive) return;
  fetch("/api/games/chicken/cashout",{method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({step})
  });
}
function lose(){ document.body.classList.add("lose"); }
