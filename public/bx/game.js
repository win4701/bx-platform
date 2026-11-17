/* BLOXIO GAME PAGE — standalone HTML adapter */
"use strict";
import { Registry, CasinoAPI } from "./casino.js";
(() => {
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function resolveGame(){
    const params=new URLSearchParams(location.search);
    const id=params.get("game")||params.get("id")||sessionStorage.getItem("bloxio:selected-game");
    return id ? Registry.get(id) : null;
  }
  function render(){
    const host=$("casinoGameContainer"),status=$("casinoRuntimeStatus");if(!host)return;
    const game=resolveGame();
    if(!game){
      host.innerHTML='<div class="bx-empty-state"><div><h2>No game selected</h2><p>Return to Casino and choose a game to open a standalone session.</p><a class="header-btn secondary" href="/pages/casino.html">Open Casino</a></div></div>';
      if(status)status.textContent="Select a game from the Casino lobby.";return;
    }
    host.innerHTML=`<div class="card"><div class="bx-page-intro"><div><h2>${esc(game.name)}</h2><p>${esc(game.provider||"BLOXIO")} · ${esc(game.category||"Game")}</p></div><a class="header-btn secondary" href="/pages/casino.html">Back to Casino</a></div><p>This game is registered in the Casino catalog. The game-specific runtime must be supplied by its verified engine before play can be enabled.</p></div>`;
    if(status)status.textContent="Game catalog loaded; game runtime availability depends on its registered engine.";
  }
  function init(){try{render();}catch(e){console.error("[BLOXIO GAME]",e);const s=$("casinoRuntimeStatus");if(s)s.textContent="Unable to initialize game session.";}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();