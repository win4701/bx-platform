// app/pvp.js
function createMatch(bet){
  fetch("/api/pvp/create",{method:"POST",
    body:JSON.stringify({bet})});
}
function joinMatch(id){
  fetch("/api/pvp/join",{method:"POST",
    body:JSON.stringify({id})});
}
