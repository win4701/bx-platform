/*=========================================================
BLOXIO CASINO V3.5 - FINAL BOOTSTRAP
Requires:
V3.1 Core Foundation
V3.2 UI Renderer
V3.3 Realtime Runtime
V3.4 Pixi/GSAP/Howler
=========================================================*/
"use strict";

/*=========================================================
VERSION
=========================================================*/
export const VERSION={
name:"BLOXIO CASINO",
version:"3.5.0",
build:"ENTERPRISE",
release:"2026"
};

/*=========================================================
HEALTH ENGINE
=========================================================*/
export const HealthEngine={

checks:[],

add(name,callback){

this.checks.push({
name,
callback
});

},

run(){

const report=[];

for(const check of this.checks){

try{

report.push({
name:check.name,
status:check.callback()
});

}catch(error){

report.push({
name:check.name,
status:false,
error
});

}

}

return report;

}

};

HealthEngine.add(
"Wallet",
()=>typeof Wallet!=="undefined"
);

HealthEngine.add(
"Registry",
()=>typeof Registry!=="undefined"
);

HealthEngine.add(
"SocketEngine",
()=>typeof SocketEngine!=="undefined"
);

HealthEngine.add(
"PixiEngine",
()=>typeof PixiEngine!=="undefined"
);

HealthEngine.add(
"AudioEngine",
()=>typeof AudioEngine!=="undefined"
);

HealthEngine.add(
"ChartsEngine",
()=>typeof ChartsEngine!=="undefined"
);

/*=========================================================
PROVIDER ENGINE
=========================================================*/
export const ProviderEngine={

providers:new Map(),

register(provider){

if(!provider?.id)
return;

this.providers.set(
provider.id,
provider
);

},

get(id){

return this.providers.get(id);

},

all(){

return[
...this.providers.values()
];

}

};

/*=========================================================
GAME LOADER
=========================================================*/
export const GameLoader={

load(){

const games=
Registry.all();

for(const game of games){

if(!game.provider){

game.provider=
"BLOXIO";

}

}

console.log(
`[CASINO] ${games.length} Games Loaded`
);

return games.length;

}

};

/*=========================================================
SYNC ENGINES
=========================================================*/
export const WalletSync={

start(){

WalletUI.update();

BUS.emit(
"wallet:sync",
STATE.wallet
);

}

};

export const FeedSync={

start(){

BUS.emit(
"feed:update",
STATE.feeds.live
);

BUS.emit(
"winner:update",
STATE.feeds.winners
);

}

};

export const JackpotSync={

start(){

BUS.emit(
"jackpot:update",
STATE.casino.jackpots
);

}

};

export const TournamentSync={

start(){

BUS.emit(
"tournament:update",
STATE.casino.tournaments
);

}

};

export const LeaderboardSync={

start(){

BUS.emit(
"leaderboard:update",
STATE.casino.leaderboard
);

}

};

/*=========================================================
PERFORMANCE ENGINE
=========================================================*/
export const PerformanceEngine={

fps:0,
frames:0,
last:performance.now(),
raf:null,

start(){

const loop=time=>{

this.frames++;

if(
time-this.last>=1000
){

this.fps=
this.frames;

this.frames=0;

this.last=time;

}

this.raf=
requestAnimationFrame(
loop
);

};

this.raf=
requestAnimationFrame(
loop
);

},

stop(){

cancelAnimationFrame(
this.raf
);

}

};

/*=========================================================
MEMORY ENGINE
=========================================================*/
export const MemoryEngine={

usage(){

if(
!performance.memory
){
return null;
}

return{

used:
Math.round(
performance.memory.usedJSHeapSize
/1024/1024
),

limit:
Math.round(
performance.memory.jsHeapSizeLimit
/1024/1024
)

};

}

};

/*=========================================================
CASINO ANALYTICS
=========================================================*/
export const CasinoAnalytics={

sessionStart:
Date.now(),

sessionDuration(){

return Math.floor(
(
Date.now()-
this.sessionStart
)/1000
);

},

snapshot(){

return{

version:
VERSION.version,

currency:
STATE.currency,

wallet:
STATE.wallet,

analytics:
STATE.analytics,

online:
STATE.casino.onlinePlayers,

games:
Registry.all().length,

fps:
PerformanceEngine.fps

};

}

};

/*=========================================================
HOTKEYS
=========================================================*/
export const Hotkeys={

init(){

document.addEventListener(

"keydown",

event=>{

if(event.key==="Escape"){

GameView.close();

}

if(event.key==="/"){

event.preventDefault();

document
.getElementById(
"casinoSearch"
)
?.focus();

}

}

);

}

};

/*=========================================================
VISIBILITY ENGINE
=========================================================*/
export const VisibilityEngine={

init(){

document.addEventListener(

"visibilitychange",

()=>{

if(document.hidden){

BUS.emit(
"app:hidden"
);

}else{

BUS.emit(
"app:visible"
);

}

}

);

}

};

/*=========================================================
MOBILE ENGINE
=========================================================*/
export const MobileEngine={

init(){

document
.getElementById(
"mobileCasinoSearch"
)
?.addEventListener(

"click",

()=>{

document
.getElementById(
"casinoSearch"
)
?.focus();

}

);

document
.getElementById(
"mobileCasinoWallet"
)
?.addEventListener(

"click",

()=>{

BUS.emit(
"wallet:open"
);

}

);

document
.getElementById(
"mobileCasinoLeaderboard"
)
?.addEventListener(

"click",

()=>{

document
.getElementById(
"casinoLeaderboard"
)
?.scrollIntoView({

behavior:"smooth"

});

}

);

}

};

/*=========================================================
DEVTOOLS
=========================================================*/
export const DevTools={

mount(){

window.BLOXIO={

VERSION,
STATE,
BUS,

Wallet,
Currency,

Registry,
Analytics,

SocketEngine,
AudioEngine,

CasinoAnalytics

};

}

};

/*=========================================================
APP ENGINE
=========================================================*/
export const CasinoApp={

started:false,

start(){

if(this.started)
return;

console.group(
`🚀 ${VERSION.name}`
);

console.log(
VERSION
);

CasinoCore.start();

GameLoader.load();

WalletSync.start();

FeedSync.start();

JackpotSync.start();

TournamentSync.start();

LeaderboardSync.start();

RealtimeRuntime.start();

VisualEngine.start();

PerformanceEngine.start();

Hotkeys.init();

VisibilityEngine.init();

MobileEngine.init();

DevTools.mount();

const report=
HealthEngine.run();

console.table(
report
);

console.groupEnd();

this.started=true;

BUS.emit(
"casino:started"
);

console.log(
"[CASINO V3.5] READY"
);

},

stop(){

PerformanceEngine.stop();

this.started=false;

BUS.emit(
"casino:stopped"
);

}

};

/*=========================================================
GLOBAL EXPORTS
=========================================================*/
window.CasinoApp=
CasinoApp;

window.CasinoVersion=
VERSION;

window.CasinoAnalytics=
CasinoAnalytics;

/*=========================================================
BOOTSTRAP
=========================================================*/
document.addEventListener(
"DOMContentLoaded",
()=>{
CasinoApp.start();
}
);

/*=========================================================
END OF BLOXIO CASINO V3.5
=========================================================*/
