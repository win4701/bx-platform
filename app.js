const uid = Telegram.WebApp.initDataUnsafe.user.id;

async function load(){
  const r = await fetch(`/state?uid=${uid}`);
  const s = await r.json();
  bx.textContent = s.wallet.bx.toFixed(4);
  usdt.textContent = s.wallet.usdt.toFixed(2);
  ton.textContent = s.wallet.ton.toFixed(4);
  bxr.textContent = s.mining.bx_rate;
  tonr.textContent = s.mining.ton_rate;
}

async function sell(type){
  await fetch(`/market/sell?uid=${uid}&amount=${sell.value}&against=${type}`,{method:"POST"});
  load();
}

async function play(){
  await fetch(`/casino/play?uid=${uid}&game=dice&bet=${bet.value}`,{method:"POST"});
  load();
}

load();
setInterval(load,5000);
