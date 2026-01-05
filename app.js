const uid = Telegram.WebApp.initDataUnsafe.user.id;

function tab(id){
  ["home","market","casino","wallet","airdrop"].forEach(x=>{
    document.getElementById(x).style.display = x===id ? "block" : "none";
  });
  if(id==="airdrop") loadAirdrop();
}

async function load(){
  const r = await fetch(`/state?uid=${uid}`);
  const s = await r.json();
  bx.textContent = s.wallet.bx.toFixed(4);
  usdt.textContent = s.wallet.usdt.toFixed(2);
  ton.textContent = s.wallet.ton.toFixed(4);
  bxr.textContent = s.mining.bx;
  tonr.textContent = s.mining.ton;
}

async function sell(a){
  await fetch(`/market/sell?uid=${uid}&amount=${sellAmt.value}&against=${a}`,{method:"POST"});
  load();
}

async function play(g){
  const r = await fetch(`/casino/play?uid=${uid}&game=${g}&bet=${bet.value}`,{method:"POST"});
  const j = await r.json();
  res.textContent = j.win ? "WIN" : "LOSE";
  load();
}

async function claim(){
  await fetch(`/mining/claim?uid=${uid}`,{method:"POST"});
  load();
}

async function deposit(p,a){
  const r = await fetch(`/deposit/address?provider=${p}&asset=${a}`);
  const j = await r.json();
  depAddr.textContent = j.address;
}

async function withdraw(){
  await fetch("/withdraw",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      uid,
      provider:"ton",
      asset:"ton",
      amount:wdAmt.value,
      address:wdAddr.value
    })
  });
  load();
}

async function loadAirdrop(){
  const r = await fetch("/airdrop/tasks");
  const t = await r.json();
  airdropList.innerHTML = t.map(x=>`
    <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0">
      <span>${x.platform}</span>
      <button onclick="claimAirdrop(${x.id})">Claim</button>
    </div>
  `).join("");
}

async function claimAirdrop(id){
  const r = await fetch("/airdrop/claim",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ uid, task_id:id })
  });
  if(r.ok) load();
}

load();
