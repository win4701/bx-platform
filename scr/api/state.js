export async function fetchState(uid){
  const r = await fetch(`/state?uid=${uid}`);
  if(!r.ok) throw new Error("state");
  return r.json();
}
