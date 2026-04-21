/* ================= HISTORY ================= */
pushHistory(win,val){

this.state.history.unshift({win,val});
if(this.state.history.length>20) this.state.history.pop();

this.renderTicker();
},

/* ================= LIVE FEED ================= */
initTicker(){
this.ticker = $("#casinoTickerTrack");
},

renderTicker(){

if(!this.ticker) return;

this.ticker.innerHTML = this.state.history.map(h=>`
<div class="${h.win?'win':'lose'}">${h.val}</div>
`).join("");

},

/* ================= BIG WINS ================= */
initBigWins(){

this.bigWins = $("#bigWinsTrack");

setInterval(()=>{
  const val = (RNG.f(5,200)).toFixed(2)+"x";

  const el = document.createElement("div");
  el.innerText = val;

  this.bigWins?.prepend(el);

  if(this.bigWins?.children.length>10){
    this.bigWins.removeChild(this.bigWins.lastChild);
  }

},2500);

},

/* ================= FAKE LIVE STATS ================= */
simulateStats(){

setInterval(()=>{
  $("#casinoOnlineText").innerText = RNG.i(120,450);
  $("#casinoVolumeText").innerText = RNG.i(1000,9000)+" BX";
},2000);

}

};
