const API = import.meta.env.VITE_API;

export const getState = (uid) =>
  fetch(`${API}/state?uid=${uid}`).then(r=>r.json());

export const sellBX = (uid, amount, against) =>
  fetch(`${API}/market/sell?uid=${uid}&amount=${amount}&against=${against}`,{method:"POST"});

export const playCasino = (payload) =>
  fetch(`${API}/casino/play`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
